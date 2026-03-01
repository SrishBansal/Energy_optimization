"""
routers/demand.py
=================
Re-implements existing frontend-compatible demand endpoints so the pre-built
frontend/lib/api.ts continues to work out of the box.

Endpoints:
  GET /api/summary       — KPI summary across all states
  GET /api/states        — list of unique states
  GET /api/state/{state} — per-state summary
  GET /api/trend         — peak load trend (daily / monthly / yearly)
  GET /api/records       — paginated raw records
  GET /api/heatmap       — state × month avg peak load heatmap
"""
from typing import Optional, Literal
from fastapi import APIRouter, HTTPException, Query, Path
import pandas as pd

from data.loader import store

router = APIRouter()


def _df() -> pd.DataFrame:
    return store.demand.copy()


# ── /api/summary ─────────────────────────────────────────────────────────────

@router.get("/api/summary")
def summary():
    df = _df()
    return {
        "total_peak_load_mw": round(float(df["Peak_Load_MW"].sum()), 2),
        "avg_peak_load_mw": round(float(df["Peak_Load_MW"].mean()), 2),
        "max_peak_load_mw": round(float(df["Peak_Load_MW"].max()), 2),
        "min_peak_load_mw": round(float(df["Peak_Load_MW"].min()), 2),
        "avg_base_load_mw": round(float(df["Base_Load_MW"].mean()), 2),
        "avg_temperature": round(float(df["Temperature"].mean()), 2),
        "avg_ev_load_mw": round(float(df["EV_Load_MW"].mean()), 2),
        "avg_demand_growth_pct": round(float(df["Demand_Growth_pct"].mean()), 4),
        "total_records": len(df),
        "date_range_start": str(df["Date"].min().date()),
        "date_range_end": str(df["Date"].max().date()),
        "states": sorted(df["State"].unique().tolist()),
    }


# ── /api/states ──────────────────────────────────────────────────────────────

@router.get("/api/states")
def states():
    return {"states": sorted(store.demand["State"].unique().tolist())}


# ── /api/state/{state} ───────────────────────────────────────────────────────

@router.get("/api/state/{state}")
def state_summary(state: str = Path(...)):
    df = _df()
    sdf = df[df["State"] == state]
    if sdf.empty:
        raise HTTPException(status_code=404, detail=f"State '{state}' not found")
    return {
        "state": state,
        "avg_peak_load_mw": round(float(sdf["Peak_Load_MW"].mean()), 2),
        "max_peak_load_mw": round(float(sdf["Peak_Load_MW"].max()), 2),
        "min_peak_load_mw": round(float(sdf["Peak_Load_MW"].min()), 2),
        "avg_base_load_mw": round(float(sdf["Base_Load_MW"].mean()), 2),
        "avg_temperature": round(float(sdf["Temperature"].mean()), 2),
        "avg_ev_load_mw": round(float(sdf["EV_Load_MW"].mean()), 2),
        "avg_industrial_pct": round(float(sdf["Industrial_pct"].mean()), 2),
        "avg_residential_pct": round(float(sdf["Residential_pct"].mean()), 2),
        "avg_demand_growth_pct": round(float(sdf["Demand_Growth_pct"].mean()), 4),
        "total_records": len(sdf),
    }


# ── /api/trend ───────────────────────────────────────────────────────────────

@router.get("/api/trend")
def trend(
    state: Optional[str] = Query(None),
    granularity: Literal["daily", "monthly", "yearly"] = Query("monthly"),
):
    df = _df()
    if state:
        df = df[df["State"] == state]

    if granularity == "daily":
        df["_period"] = df["Date"].dt.strftime("%Y-%m-%d")
    elif granularity == "monthly":
        df["_period"] = df["Date"].dt.strftime("%Y-%m")
    else:
        df["_period"] = df["Date"].dt.year.astype(str)

    agg = (
        df.groupby("_period")
        .agg(
            avg_peak_load_mw=("Peak_Load_MW", "mean"),
            avg_base_load_mw=("Base_Load_MW", "mean"),
            avg_ev_load_mw=("EV_Load_MW", "mean"),
            avg_temperature=("Temperature", "mean"),
            total_records=("Peak_Load_MW", "count"),
        )
        .reset_index()
        .rename(columns={"_period": "period"})
        .sort_values("period")
    )
    return agg.round(2).to_dict(orient="records")


# ── /api/records ─────────────────────────────────────────────────────────────

@router.get("/api/records")
def records(
    state: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
):
    df = _df()
    if state:
        df = df[df["State"] == state]
    df = df.sort_values("Date")
    total = len(df)
    start = (page - 1) * page_size
    end = start + page_size
    page_df = df.iloc[start:end].copy()
    page_df["date"] = page_df["Date"].dt.strftime("%Y-%m-%d")

    cols_map = {
        "date": "date",
        "State": "state",
        "Peak_Load_MW": "peak_load_mw",
        "Base_Load_MW": "base_load_mw",
        "Industrial_pct": "industrial_pct",
        "Residential_pct": "residential_pct",
        "EV_Load_MW": "ev_load_mw",
        "Temperature": "temperature",
        "Demand_Growth_pct": "demand_growth_pct",
    }
    out = page_df.rename(columns=cols_map)
    available = [v for v in cols_map.values() if v in out.columns]
    out = out[available].copy()

    return {
        "records": out.round(4).to_dict(orient="records"),
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


# ── /api/heatmap ─────────────────────────────────────────────────────────────

MONTH_NAMES = [
    "", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]


@router.get("/api/heatmap")
def heatmap():
    df = _df()
    df["_month"] = df["Date"].dt.month
    agg = (
        df.groupby(["State", "_month"])["Peak_Load_MW"]
        .mean()
        .reset_index()
        .rename(columns={"_month": "month", "Peak_Load_MW": "avg_peak_load_mw"})
    )
    agg["month_name"] = agg["month"].apply(lambda m: MONTH_NAMES[m])
    agg = agg.rename(columns={"State": "state"})
    cells = agg[["state", "month", "month_name", "avg_peak_load_mw"]].round(2).to_dict(orient="records")
    return {
        "cells": cells,
        "min_value": round(float(agg["avg_peak_load_mw"].min()), 2),
        "max_value": round(float(agg["avg_peak_load_mw"].max()), 2),
    }
