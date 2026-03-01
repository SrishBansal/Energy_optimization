"""
engines/financial_engine.py
============================
EBITDA and DSCR computation engine.

Key formulas:
  EBITDA  = Revenue - Fuel_Cost - Carbon_Cost
  Annual Debt Service (ADS) = Debt_Outstanding × Interest_Rate
  DSCR    = EBITDA / ADS

Both computed values are compared with the dataset-provided EBITDA / DSCR columns
to allow advisory teams to spot model vs actuals divergence.

Shock-ready: future phases may inject fuel price shocks from the Fuel_Market dataset
to recompute Fuel_Cost → EBITDA → DSCR dynamically.
"""
from __future__ import annotations

from typing import List, Optional

import pandas as pd

from data.loader import store
from models.financial import FinancialMetrics, FinancialResponse, FinancialRequest


def _filter(df: pd.DataFrame, state: Optional[str], date_from: Optional[str], date_to: Optional[str]) -> pd.DataFrame:
    if state:
        df = df[df["State"] == state]
    if date_from:
        df = df[df["Date"] >= pd.to_datetime(date_from)]
    if date_to:
        df = df[df["Date"] <= pd.to_datetime(date_to)]
    return df


def compute_financials(req: FinancialRequest = FinancialRequest()) -> FinancialResponse:
    df = _filter(store.financials.copy(), req.state, req.date_from, req.date_to)

    if df.empty:
        raise ValueError("No financial records match the specified filters.")

    state_results: List[FinancialMetrics] = []
    
    carbon_mult = 1.0
    penalty = 0.0
    coal_mult = 1.0
    gas_mult = 1.0
    spot_mult = 1.0
    if req.shock_params:
        if req.shock_params.carbon_cost_multiplier is not None:
            carbon_mult = req.shock_params.carbon_cost_multiplier
        if req.shock_params.excess_emission_penalty is not None:
            penalty = req.shock_params.excess_emission_penalty
        if req.shock_params.coal_cost_multiplier is not None:
            coal_mult = req.shock_params.coal_cost_multiplier
        if req.shock_params.gas_cost_multiplier is not None:
            gas_mult = req.shock_params.gas_cost_multiplier
        if req.shock_params.spot_price_multiplier is not None:
            spot_mult = req.shock_params.spot_price_multiplier

    # Pre-calculate state-level Generation splits to apportion Fuel_Cost accurately
    gen_df = store.generation.copy()
    pm = store.plant_master.copy()
    gen_merged = pd.merge(gen_df, pm[["Plant_ID", "Plant_Type"]], on="Plant_ID", how="left")

    for s, grp in df.groupby("State"):
        total_revenue = float(grp["Revenue"].sum()) * spot_mult
        base_fuel = float(grp["Fuel_Cost"].sum())

        # Determine Coal vs Gas generation split for this state to apportion fuel cost
        st_gen = gen_merged[gen_merged["State"] == s]
        coal_gen = float(st_gen[st_gen["Plant_Type"] == "Coal"]["Generation_MWh"].sum()) if not st_gen.empty else 0.0
        gas_gen = float(st_gen[st_gen["Plant_Type"] == "Gas"]["Generation_MWh"].sum()) if not st_gen.empty else 0.0
        total_thermal = coal_gen + gas_gen

        coal_ratio = coal_gen / total_thermal if total_thermal > 0 else 0.8
        gas_ratio = gas_gen / total_thermal if total_thermal > 0 else 0.2

        total_fuel = base_fuel * (coal_ratio * coal_mult + gas_ratio * gas_mult)
        
        # Apply structured shock to carbon cost
        base_carbon = float(grp["Carbon_Cost"].sum())
        total_carbon = base_carbon * carbon_mult

        computed_ebitda = total_revenue - total_fuel - total_carbon - penalty
        ebitda_margin = round(100.0 * computed_ebitda / total_revenue, 2) if total_revenue else 0.0

        avg_debt = float(grp["Debt_Outstanding"].mean())
        avg_ir = float(grp["Interest_Rate"].mean())
        interest_expense = avg_debt * avg_ir
        
        # Financial Auditor: Recompute DSCR = EBITDA / (Interest_Expense + Principal_Repayment)
        # Assuming fixed principal repayment schedule (e.g., 5% of debt annually)
        principal_repayment = avg_debt * 0.05 
        total_debt_service = (interest_expense + principal_repayment)
        
        # Scale debt service by period
        num_records = len(grp)
        years_covered = num_records / 365.0
        period_debt_service = total_debt_service * years_covered if years_covered > 0 else total_debt_service
        
        computed_dscr = round(computed_ebitda / period_debt_service, 4) if period_debt_service > 1e-6 else 9999.0

        dataset_dscr = float(grp["DSCR"].mean()) if "DSCR" in grp.columns else 0.0

        state_results.append(
            FinancialMetrics(
                state=str(s),
                period_start=str(grp["Date"].min().date()),
                period_end=str(grp["Date"].max().date()),
                total_revenue=round(total_revenue, 2),
                total_fuel_cost=round(total_fuel, 2),
                total_carbon_cost=round(total_carbon, 2),
                computed_ebitda=round(computed_ebitda, 2),
                ebitda_margin_pct=ebitda_margin,
                excess_emission_deduction=round(penalty, 2),
                avg_debt_outstanding=round(avg_debt, 2),
                avg_interest_rate=round(avg_ir, 6),
                annual_debt_service=round(total_debt_service, 2),
                computed_dscr=computed_dscr,
                dataset_dscr_avg=round(dataset_dscr, 4),
                records=num_records,
            )
        )

    return FinancialResponse(
        date_from=req.date_from,
        date_to=req.date_to,
        states=state_results,
    )
