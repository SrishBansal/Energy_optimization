"""
engines/emission_calculator.py
================================
Historical emission intensity calculator.

Algorithm:
  1. Join Generation data with Plant Master on Plant_ID to get Emission_per_MWh.
  2. Compute per-record: emission_tonnes = Generation_MWh × Emission_per_MWh.
  3. Aggregate to state level; compute weighted intensity = Σ(emission) / Σ(generation).
  4. Join with Emission_Regulation to compute cap utilisation and renewable target vs actual.
  5. Aggregate to system level.
"""
from __future__ import annotations

from typing import List, Optional

import pandas as pd

from data.loader import store
from models.emission import StateEmission, SystemEmissionResponse, EmissionRequest, PlantEmission


def _filter_date(df: pd.DataFrame, date_from: Optional[str], date_to: Optional[str]) -> pd.DataFrame:
    if date_from:
        df = df[df["Date"] >= pd.to_datetime(date_from)]
    if date_to:
        df = df[df["Date"] <= pd.to_datetime(date_to)]
    return df


def calculate_emissions(req: EmissionRequest = EmissionRequest()) -> SystemEmissionResponse:
    gen = store.generation.copy()
    plant = store.plant_master[["Plant_ID", "Plant_Type", "Emission_per_MWh"]].copy()
    reg = store.emission_reg.copy()

    # ── date filter ──────────────────────────────────────────────────────────
    gen = _filter_date(gen, req.date_from, req.date_to)
    reg = _filter_date(reg, req.date_from, req.date_to)

    if req.state:
        gen = gen[gen["State"] == req.state]
        reg = reg[reg["State"] == req.state]

    # ── join generation with emission factor ─────────────────────────────────
    merged = gen.merge(plant, on="Plant_ID", how="left")
    merged["Emission_per_MWh"] = merged["Emission_per_MWh"].fillna(0.0)
    merged["emission_tonnes"] = merged["Generation_MWh"] * merged["Emission_per_MWh"]
    merged["is_renewable"] = merged["Plant_Type"].isin(["Solar", "Wind", "Hydro"])

    # ── state-level aggregation ───────────────────────────────────────────────
    state_gen = (
        merged.groupby("State")
        .agg(
            total_gen=("Generation_MWh", "sum"),
            total_em=("emission_tonnes", "sum"),
            renewable_gen=("Generation_MWh", lambda x: x[merged.loc[x.index, "is_renewable"]].sum()),
        )
        .reset_index()
    )
    state_gen["weighted_intensity"] = (
        state_gen["total_em"] / state_gen["total_gen"].replace(0, float("nan"))
    ).fillna(0.0)
    state_gen["renewable_pct"] = (
        100.0 * state_gen["renewable_gen"] / state_gen["total_gen"].replace(0, float("nan"))
    ).fillna(0.0)

    # ── latest regulatory targets per state ──────────────────────────────────
    if not reg.empty:
        latest_reg = reg.sort_values("Date").groupby("State").last().reset_index()
        state_gen = state_gen.merge(
            latest_reg[["State", "Emission_Cap", "Renewable_Target_%"]].rename(
                columns={"Renewable_Target_%": "ren_target"}
            ),
            on="State",
            how="left",
        )
    else:
        state_gen["Emission_Cap"] = None
        state_gen["ren_target"] = None

    # ── build per-state response objects ─────────────────────────────────────
    state_results: List[StateEmission] = []
    
    # Check for shock params
    ren_override = None
    if req.shock_params and req.shock_params.renewable_target_pct_override is not None:
        ren_override = req.shock_params.renewable_target_pct_override

    for s, s_grp in merged.groupby("State"):
        # Reg data for this state
        st_reg = state_gen[state_gen["State"] == s].iloc[0] if not state_gen[state_gen["State"] == s].empty else {}
        
        cap = st_reg.get("Emission_Cap")
        total_gen = st_reg.get("total_gen", 0.0)
        total_em = st_reg.get("total_em", 0.0)
        
        cap_util = None
        excess = 0.0
        cap_per_mwh = None
        if cap and cap > 0 and not pd.isna(cap):
            cap_util = round(100.0 * total_em / float(cap), 2)
            excess = max(0.0, float(total_em) - float(cap))
            if total_gen > 0:
                cap_per_mwh = float(cap) / total_gen

        ren_target = ren_override if ren_override is not None else st_reg.get("ren_target")
        
        # Plant level details for audit
        plant_results: List[PlantEmission] = []
        for pid, p_grp in s_grp.groupby("Plant_ID"):
            p_gen = p_grp["Generation_MWh"].sum()
            p_em = p_grp["emission_tonnes"].sum()
            plant_results.append(
                PlantEmission(
                    plant_id=str(pid),
                    plant_type=str(p_grp["Plant_Type"].iloc[0]),
                    generation_mwh=round(float(p_gen), 2),
                    emission_tonnes=round(float(p_em), 4),
                    emission_per_mwh=round(float(p_grp["Emission_per_MWh"].iloc[0]), 4)
                )
            )

        state_results.append(
            StateEmission(
                state=str(s),
                total_generation_mwh=round(float(total_gen), 2),
                total_emission_tonnes=round(float(total_em), 4),
                weighted_emission_intensity=round(float(st_reg["weighted_intensity"]), 6),
                emission_cap=float(cap) if cap and not pd.isna(cap) else None,
                emission_cap_per_mwh=cap_per_mwh,
                cap_utilisation_pct=cap_util,
                excess_emission_tonnes=round(excess, 4),
                renewable_target_pct=float(ren_target) if ren_target and not pd.isna(ren_target) else None,
                renewable_actual_pct=round(float(st_reg["renewable_pct"]), 2),
                plants=plant_results
            )
        )

    # ── system-level rollup ───────────────────────────────────────────────────
    sys_gen = state_gen["total_gen"].sum()
    sys_em = state_gen["total_em"].sum()
    sys_intensity = round(sys_em / sys_gen, 6) if sys_gen > 0 else 0.0

    return SystemEmissionResponse(
        date_from=req.date_from,
        date_to=req.date_to,
        system_weighted_emission_intensity=sys_intensity,
        system_total_emission_tonnes=round(float(sys_em), 4),
        system_total_generation_mwh=round(float(sys_gen), 2),
        states=state_results,
    )
