"""models/financial.py — Pydantic schemas for EBITDA / DSCR engine."""
from __future__ import annotations
from typing import List, Optional
from pydantic import BaseModel, Field

class FinancialShockParams(BaseModel):
    carbon_cost_multiplier: Optional[float] = Field(
        None, description="Multiplier for carbon prices"
    )
    excess_emission_penalty: Optional[float] = Field(
        None, description="Total absolute $ penalty deducted from EBITDA"
    )
    coal_cost_multiplier: Optional[float] = Field(
        None, description="Multiplier for coal prices"
    )
    gas_cost_multiplier: Optional[float] = Field(
        None, description="Multiplier for gas prices"
    )
    spot_price_multiplier: Optional[float] = Field(
        None, description="Multiplier for spot market revenue"
    )

class FinancialRequest(BaseModel):
    state: Optional[str] = None
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    shock_params: Optional[FinancialShockParams] = None

class FinancialMetrics(BaseModel):
    state: str
    period_start: str
    period_end: str
    total_revenue: float
    total_fuel_cost: float
    total_carbon_cost: float
    computed_ebitda: float = Field(..., description="Revenue - Fuel_Cost - Carbon_Cost")
    ebitda_margin_pct: float = Field(..., description="computed_ebitda / Revenue × 100")
    excess_emission_deduction: float = Field(0.0, description="Deduction applied to EBITDA from penalties")
    avg_debt_outstanding: float
    avg_interest_rate: float
    annual_debt_service: float = Field(..., description="avg_debt_outstanding × avg_interest_rate")
    computed_dscr: float = Field(
        ..., description="computed_ebitda / annual_debt_service; capped at 9999 if debt_service ≈ 0"
    )
    dataset_dscr_avg: float = Field(..., description="Average DSCR from raw dataset column")
    records: int


class FinancialResponse(BaseModel):
    date_from: Optional[str]
    date_to: Optional[str]
    states: List[FinancialMetrics]

