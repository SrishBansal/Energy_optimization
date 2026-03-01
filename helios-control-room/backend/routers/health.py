"""
routers/health.py — Competition-grade KPI endpoint
"""
from fastapi import APIRouter
from data.loader import store
from engines import merit_order, financial_engine, demand_forecaster

router = APIRouter()

@router.get("/api/metrics")
def get_competition_metrics():
    """
    Returns high-stakes system-wide and state-wise KPIs for competition.
    """
    # System-wide averages
    fin_summary = financial_engine.compute_financials()
    avg_ebitda = sum(s.computed_ebitda for s in fin_summary.states)
    avg_dscr = sum(s.computed_dscr for s in fin_summary.states) / len(fin_summary.states) if fin_summary.states else 0
    
    return {
        "system_status": "PRO_ACTIVE",
        "total_system_ebitda": round(avg_ebitda, 2),
        "aggregate_dscr": round(avg_dscr, 2),
        "state_wise_analysis": [s.dict() for s in fin_summary.states]
    }

@router.get("/api/health")
def health():
    return {"status": "ok", "engine": "HELIOS v2.0"}
