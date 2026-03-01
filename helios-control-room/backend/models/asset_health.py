"""models/asset_health.py — Pydantic schemas for Asset Health tracking."""
from __future__ import annotations
from typing import List, Optional
from pydantic import BaseModel, Field

class AssetHealthRequest(BaseModel):
    state: Optional[str] = None
    date_from: Optional[str] = None
    date_to: Optional[str] = None

class AssetHealthMetrics(BaseModel):
    plant_id: str
    state: str
    plant_type: str
    installed_capacity_mw: float
    forced_outage_rate: float
    total_generation_mwh: float
    capacity_utilization_pct: float
    is_underperforming: bool = Field(False, description="True if utilization is unusually low or outage rate is high")

class AssetHealthResponse(BaseModel):
    date_from: Optional[str]
    date_to: Optional[str]
    assets: List[AssetHealthMetrics]
