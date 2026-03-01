"""
engines/merit_order.py
======================
Economic merit-order dispatch engine.

Algorithm:
  1. Filter Plant Master by state (optional).
  2. Compute available capacity: Installed_Capacity_MW × (1 - Forced_Outage_Rate) × (1 - shock_derate).
  3. Sort plants ascending by Variable_Cost_per_MWh (× shock cost_multiplier).
  4. Dispatch plants sequentially, respecting Min_Load_pct floor, until target_demand_mw is met.
  5. Compute per-plant emissions: dispatched_mw × Emission_per_MWh.
  6. Return ordered dispatch list + system summary.

Shock-ready: capacity_derate (0-1) and cost_multiplier can be overridden per call.
"""
from __future__ import annotations

from typing import List

import pandas as pd

from data.loader import store
from models.plant import (
    DispatchEntry,
    DispatchRequest,
    DispatchResponse,
    DispatchSummary,
)


def run_dispatch(req: DispatchRequest) -> DispatchResponse:
    df = store.plant_master.copy()

    # ── filter by state ──────────────────────────────────────────────────────
    if req.state:
        df = df[df["State"] == req.state]
    if df.empty:
        raise ValueError(f"No plants found for state '{req.state}'")

    # ── shock parameters ─────────────────────────────────────────────────────
    shock_applied = req.shock_params is not None
    extra_derate = 0.0
    cost_mult = 1.0
    if shock_applied:
        extra_derate = req.shock_params.capacity_derate or 0.0
        cost_mult = req.shock_params.cost_multiplier or 1.0

    # ── available capacity after derate ─────────────────────────────────────
    df["Forced_Outage_Rate"] = df["Forced_Outage_Rate"].fillna(0.0)
    df["_effective_derate"] = (df["Forced_Outage_Rate"] + extra_derate).clip(upper=1.0)
    df["Available_Capacity_MW"] = df["Installed_Capacity_MW"] * (1 - df["_effective_derate"])

    # ── apply cost shock ─────────────────────────────────────────────────────
    df["_adj_cost"] = df["Variable_Cost_per_MWh"] * cost_mult

    # ── sort by adjusted variable cost (merit order) ─────────────────────────
    df = df.sort_values("_adj_cost").reset_index(drop=True)

    # ── dispatch loop ─────────────────────────────────────────────────────────
    remaining = req.target_demand_mw
    dispatch_entries: List[DispatchEntry] = []

    for rank, (_, row) in enumerate(df.iterrows(), start=1):
        if remaining <= 0:
            break

        avail = row["Available_Capacity_MW"]
        min_load = (row.get("Min_Load_pct", 0) or 0) / 100.0 * row["Installed_Capacity_MW"]

        # skip if available capacity is negligible
        if avail < 1.0:
            continue

        dispatched = min(avail, remaining)
        # ensure we respect min_load floor if partially dispatching
        if dispatched < min_load and remaining < min_load:
            dispatched = remaining  # partial ok if demand < min_load
        elif dispatched < min_load:
            dispatched = min_load

        dispatched = round(dispatched, 2)
        emission_mwh = float(row.get("Emission_per_MWh", 0))
        total_emission = round(dispatched * emission_mwh, 4)

        dispatch_entries.append(
            DispatchEntry(
                plant_id=str(row["Plant_ID"]),
                state=str(row["State"]),
                plant_type=str(row["Plant_Type"]),
                installed_capacity_mw=round(float(row["Installed_Capacity_MW"]), 2),
                available_capacity_mw=round(float(avail), 2),
                dispatched_mw=dispatched,
                variable_cost_per_mwh=round(float(row["Variable_Cost_per_MWh"]), 2),
                emission_per_mwh=emission_mwh,
                total_emission_tonnes=total_emission,
                merit_order_rank=rank,
            )
        )
        remaining -= dispatched

    # ── system summary ───────────────────────────────────────────────────────
    total_dispatched = sum(e.dispatched_mw for e in dispatch_entries)
    total_emission = sum(e.total_emission_tonnes for e in dispatch_entries)
    unmet = max(0.0, round(req.target_demand_mw - total_dispatched, 2))

    if total_dispatched > 0:
        weighted_intensity = round(total_emission / total_dispatched, 6)
    else:
        weighted_intensity = 0.0

    summary = DispatchSummary(
        total_dispatched_mw=round(total_dispatched, 2),
        target_demand_mw=req.target_demand_mw,
        demand_met=unmet < 0.01,
        unmet_demand_mw=unmet,
        system_weighted_emission_intensity=weighted_intensity,
        total_emission_tonnes=round(total_emission, 4),
        plants_dispatched=len(dispatch_entries),
    )

    return DispatchResponse(
        dispatch=dispatch_entries,
        summary=summary,
        shock_applied=shock_applied,
    )
