"""
engines/demand_forecaster.py
============================
24-month state-wise demand forecasting engine.

Algorithm:
  1. Compute the baseline peak load per state = trailing 12-month average.
  2. Compute Seasonal_Index per state × month from historical data.
  3. Apply compounded Demand_Growth_% month-over-month.
  4. Output = baseline × Seasonal_Index(month) × (1 + monthly_growth) ^ n

Shock-ready: pass shock_params to override growth rate or seasonal index.
"""
from __future__ import annotations

import calendar
from datetime import date
from typing import List, Optional

import pandas as pd

from data.loader import store
from models.demand import ForecastPoint, ForecastRequest, ForecastResponse


def _monthly_growth(annual_pct: float) -> float:
    """Convert annual growth % to equivalent monthly growth factor."""
    return (1 + annual_pct / 100) ** (1 / 12) - 1


def run_forecast(req: ForecastRequest) -> ForecastResponse:
    df = store.demand.copy()

    # ── filter by state ──────────────────────────────────────────────────────
    states = sorted(df["State"].unique().tolist())
    if req.state:
        df = df[df["State"] == req.state]
        states = [req.state]
    if df.empty:
        raise ValueError(f"No demand data found for state '{req.state}'")

    # ── compute per-state seasonal indices (month 1-12) ──────────────────────
    df["_month"] = df["Date"].dt.month
    seasonal = (
        df.groupby(["State", "_month"])["Peak_Load_MW"]
        .mean()
        .reset_index()
        .rename(columns={"Peak_Load_MW": "_month_avg"})
    )
    annual_avg = df.groupby("State")["Peak_Load_MW"].mean().rename("_annual_avg").reset_index()
    seasonal = seasonal.merge(annual_avg, on="State")
    seasonal["Seasonal_Index"] = seasonal["_month_avg"] / seasonal["_annual_avg"]

    # ── last known growth % per state ────────────────────────────────────────
    growth_by_state = (
        df.groupby("State")["Demand_Growth_pct"].mean()
        if "Demand_Growth_pct" in df.columns
        else pd.Series(dtype=float)
    )

    # ── baseline: last 12-month average peak per state ───────────────────────
    df_sorted = df.sort_values("Date")
    recent = df_sorted.groupby("State").tail(365)  # ~last 12 months (daily data)
    baseline = recent.groupby("State")["Peak_Load_MW"].mean().to_dict()

    # ── compute total installed capacity per state ───────────────────────────
    pm = store.plant_master
    installed_cap = {}
    if not pm.empty and "State" in pm.columns and "Installed_Capacity_MW" in pm.columns:
        installed_cap = pm.groupby("State")["Installed_Capacity_MW"].sum().to_dict()

    # ── forecast origin: month after last data point ─────────────────────────
    last_date: pd.Timestamp = df["Date"].max()
    origin_year = last_date.year + (last_date.month // 12)
    origin_month = (last_date.month % 12) + 1

    points: List[ForecastPoint] = []
    shock_applied = req.shock_params is not None

    for state in states:
        base_mw = baseline.get(state, df[df["State"] == state]["Peak_Load_MW"].mean())
        annual_growth = (
            req.shock_params.demand_growth_override
            if shock_applied and req.shock_params.demand_growth_override is not None
            else float(growth_by_state.get(state, 5.0))
        )
        mg = _monthly_growth(annual_growth)

        seasonal_map = (
            seasonal[seasonal["State"] == state]
            .set_index("_month")["Seasonal_Index"]
            .to_dict()
        )

        for n in range(req.months):
            current_month = ((origin_month - 1 + n) % 12) + 1
            current_year = origin_year + (origin_month - 1 + n) // 12
            period = f"{current_year}-{current_month:02d}"

            si = seasonal_map.get(current_month, 1.0)
            if shock_applied and req.shock_params.seasonal_multiplier is not None:
                si *= req.shock_params.seasonal_multiplier

            growth_factor = (1 + mg) ** (n + 1)
            forecasted_mw = round(base_mw * si * growth_factor, 2)

            points.append(
                ForecastPoint(
                    period=period,
                    state=state,
                    forecasted_peak_mw=forecasted_mw,
                    seasonal_index=round(si, 4),
                    applied_growth_pct=round(annual_growth, 4),
                    baseline_mw=round(base_mw, 2),
                    capacity_exceeded=forecasted_mw > (installed_cap.get(state, 0.0) if installed_cap else 999999.0),
                )
            )

    return ForecastResponse(
        forecast=points,
        states=states,
        months=req.months,
        shock_applied=shock_applied,
    )
