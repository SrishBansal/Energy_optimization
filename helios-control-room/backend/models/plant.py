"""models/plant.py — Pydantic schemas for merit-order dispatch."""
from __future__ import annotations
from typing import Optional, List
from pydantic import BaseModel, Field


class DispatchShockParams(BaseModel):
    capacity_derate: Optional[float] = Field(
        None, ge=0.0, le=1.0,
        description="Additional derate fraction on top of Forced_Outage_Rate (0–1)"
    )
    cost_multiplier: Optional[float] = Field(
        None, gt=0.0,
        description="Multiply all Variable_Cost_per_MWh values by this factor"
    )


class DispatchRequest(BaseModel):
    state: Optional[str] = Field(None, description="Restrict dispatch to a single state; None = system-wide")
    target_demand_mw: float = Field(..., gt=0, description="Demand to satisfy in MW")
    shock_params: Optional[DispatchShockParams] = None


class DispatchEntry(BaseModel):
    plant_id: str
    state: str
    plant_type: str
    installed_capacity_mw: float
    available_capacity_mw: float
    dispatched_mw: float
    variable_cost_per_mwh: float
    emission_per_mwh: float
    total_emission_tonnes: float
    merit_order_rank: int


class DispatchSummary(BaseModel):
    total_dispatched_mw: float
    target_demand_mw: float
    demand_met: bool
    unmet_demand_mw: float
    system_weighted_emission_intensity: float
    total_emission_tonnes: float
    plants_dispatched: int


class DispatchResponse(BaseModel):
    dispatch: List[DispatchEntry]
    summary: DispatchSummary
    shock_applied: bool
