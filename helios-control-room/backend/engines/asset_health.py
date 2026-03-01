"""
engines/asset_health.py
=======================
Asset Health Tracker Engine.
Calculates Capacity Utilization % and Forced Outage Rates.
"""
from __future__ import annotations
from typing import List, Optional
import pandas as pd
from data.loader import store
from models.asset_health import AssetHealthRequest, AssetHealthResponse, AssetHealthMetrics

def _filter(df: pd.DataFrame, state: Optional[str], date_from: Optional[str], date_to: Optional[str]) -> pd.DataFrame:
    if state:
        df = df[df["State"] == state]
    if date_from:
        df = df[df["Date"] >= pd.to_datetime(date_from)]
    if date_to:
        df = df[df["Date"] <= pd.to_datetime(date_to)]
    return df

def compute_asset_health(req: AssetHealthRequest) -> AssetHealthResponse:
    gen_df = _filter(store.generation.copy(), req.state, req.date_from, req.date_to)
    pm = store.plant_master.copy()

    if req.state:
        pm = pm[pm["State"] == req.state]

    if gen_df.empty or pm.empty:
        return AssetHealthResponse(date_from=req.date_from, date_to=req.date_to, assets=[])

    # Calculate Total Generation per plant
    total_gen = gen_df.groupby("Plant_ID")["Generation_MWh"].sum().reset_index()

    # Determine the number of days in the period to calculate max theoretical generation
    num_days = gen_df["Date"].nunique()
    if num_days == 0:
        num_days = 1

    # Merge with Plant Master
    merged = pd.merge(pm, total_gen, on="Plant_ID", how="left")
    merged["Generation_MWh"] = merged["Generation_MWh"].fillna(0)
    merged["Forced_Outage_Rate"] = merged.get("Forced_Outage_Rate", pd.Series([0.0]*len(merged))).fillna(0.0)

    assets = []
    for _, row in merged.iterrows():
        cap_mw = float(row["Installed_Capacity_MW"])
        gen_mwh = float(row["Generation_MWh"])
        
        # Max generation possible in the period
        max_possible_mwh = cap_mw * 24.0 * num_days
        
        util_pct = (gen_mwh / max_possible_mwh) * 100.0 if max_possible_mwh > 0 else 0.0
        outage_rate = float(row["Forced_Outage_Rate"])

        # Define underperforming: e.g., utilization < 20% OR outage > 15% (for Coal/Gas mainly, but flag anyway)
        is_under = (util_pct < 20.0 and row["Plant_Type"] in ["Coal", "Gas"]) or (outage_rate > 0.15)

        assets.append(
            AssetHealthMetrics(
                plant_id=str(row["Plant_ID"]),
                state=str(row["State"]),
                plant_type=str(row["Plant_Type"]),
                installed_capacity_mw=cap_mw,
                forced_outage_rate=round(outage_rate, 4),
                total_generation_mwh=round(gen_mwh, 2),
                capacity_utilization_pct=round(util_pct, 2),
                is_underperforming=is_under,
            )
        )

    # Sort so underperforming ones stand out, or simply by lowest utilization
    assets.sort(key=lambda x: (not x.is_underperforming, x.capacity_utilization_pct))

    return AssetHealthResponse(
        date_from=req.date_from,
        date_to=req.date_to,
        assets=assets
    )
