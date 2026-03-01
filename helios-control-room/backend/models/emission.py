"""models/emission.py — Pydantic schemas for emission intensity."""
from __future__ import annotations
from typing import List, Optional
from pydantic import BaseModel, Field

class EmissionShockParams(BaseModel):
    renewable_target_pct_override: Optional[float] = Field(
        None, description="Override the state dataset Renewable_Target_%"
    )

class EmissionRequest(BaseModel):
    state: Optional[str] = None
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    shock_params: Optional[EmissionShockParams] = None

class PlantEmission(BaseModel):
    plant_id: str
    plant_type: str
    generation_mwh: float
    emission_tonnes: float
    emission_per_mwh: float

class StateEmission(BaseModel):
    state: str
    total_generation_mwh: float
    total_emission_tonnes: float
    weighted_emission_intensity: float = Field(
        ..., description="tCO2 / MWh — weighted average across all plants in state"
    )
    emission_cap: Optional[float] = Field(None, description="Regulatory cap from emission_reg dataset")
    emission_cap_per_mwh: Optional[float] = Field(None, description="Cap expressed as tCO2/MWh")
    cap_utilisation_pct: Optional[float] = Field(None, description="total_emission / cap × 100")
    excess_emission_tonnes: float = Field(0.0, description="max(0, total_emission - cap)")
    renewable_target_pct: Optional[float] = None
    renewable_actual_pct: Optional[float] = None
    plants: List[PlantEmission] = Field(default_factory=list)


class SystemEmissionResponse(BaseModel):
    date_from: Optional[str]
    date_to: Optional[str]
    system_weighted_emission_intensity: float
    system_total_emission_tonnes: float
    system_total_generation_mwh: float
    states: List[StateEmission]
