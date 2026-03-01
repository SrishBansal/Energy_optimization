"""models/demand.py — Pydantic schemas for demand forecasting."""
from __future__ import annotations
from typing import Optional, List
from pydantic import BaseModel, Field


class ShockParams(BaseModel):
    demand_growth_override: Optional[float] = Field(
        None, description="Override Demand_Growth_% for all states (absolute %, e.g. 5.0)"
    )
    seasonal_multiplier: Optional[float] = Field(
        None, description="Multiply computed Seasonal_Index by this factor"
    )


class ForecastRequest(BaseModel):
    state: Optional[str] = Field(None, description="Filter to a single state; None = all states")
    months: int = Field(24, ge=1, le=24, description="Forecast horizon in months (1–24)")
    shock_params: Optional[ShockParams] = None


class ForecastPoint(BaseModel):
    period: str = Field(..., description="ISO month label, e.g. '2025-03'")
    state: str
    forecasted_peak_mw: float
    seasonal_index: float
    applied_growth_pct: float
    baseline_mw: float
    capacity_exceeded: bool = Field(False, description="True if forecasted peak exceeds available installed capacity")


class ForecastResponse(BaseModel):
    forecast: List[ForecastPoint]
    states: List[str]
    months: int
    shock_applied: bool
