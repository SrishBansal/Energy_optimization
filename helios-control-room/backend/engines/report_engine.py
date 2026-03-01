"""
engines/report_engine.py
========================
Generates a multi-sheet Excel report for Project HELIOS.
"""
from __future__ import annotations
import io
import pandas as pd
from engines import merit_order, financial_engine, demand_forecaster, asset_health
from models.plant import DispatchRequest
from models.financial import FinancialRequest
from models.demand import ForecastRequest
from models.asset_health import AssetHealthRequest

def generate_appendix_csv(state: Optional[str] = None) -> io.BytesIO:
    """
    Generates a CSV 'Technical Appendix' containing high-fidelity audit data.
    """
    # 1. Fetch recomputed financials
    fin_req = FinancialRequest(state=state)
    fin_res = financial_engine.compute_financials(fin_req)
    fin_df = pd.DataFrame([s.dict() for s in fin_res.states])
    
    # 2. Fetch recomputed dispatch (latest merit order)
    dispatch_req = merit_order.DispatchRequest(target_demand_mw=30000, state=state)
    dispatch_res = merit_order.run_dispatch(dispatch_req)
    dispatch_df = pd.DataFrame([e.dict() for e in dispatch_res.dispatch])
    
    # Merge or concat for the appendix
    # We'll provide a multi-section CSV format (concatenated with headers)
    output = io.StringIO()
    output.write("--- PROJECT HELIOS TECHNICAL APPENDIX ---\n")
    output.write(f"--- MARKET: {state if state else 'SYSTEM_WIDE'} ---\n\n")
    
    output.write("SECTION 1: FINANCIAL AUDIT TRAJECTORY\n")
    fin_df.to_csv(output, index=False)
    output.write("\nSECTION 2: MERIT-ORDER DISPATCH AUDIT\n")
    dispatch_df.to_csv(output, index=False)
    
    byte_io = io.BytesIO(output.getvalue().encode('utf-8'))
    byte_io.seek(0)
    return byte_io

