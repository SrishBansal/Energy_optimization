"""routers/financial.py — GET /api/financials (EBITDA + DSCR)."""
from typing import Optional
from fastapi import APIRouter, HTTPException, Query, Body
from models.financial import FinancialResponse, FinancialRequest
from engines.financial_engine import compute_financials

router = APIRouter()


@router.get("/api/financials", response_model=FinancialResponse)
def financials(
    state: Optional[str] = Query(None, description="Filter to a single state"),
    date_from: Optional[str] = Query(None, description="Start date YYYY-MM-DD"),
    date_to: Optional[str] = Query(None, description="End date YYYY-MM-DD"),
):
    """
    Compute and return state-level EBITDA, EBITDA margin, and DSCR.
    Both engine-computed and dataset-sourced values are returned for comparison.
    """
    try:
        req = FinancialRequest(state=state, date_from=date_from, date_to=date_to)
        return compute_financials(req)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Financial engine error: {e}")

@router.post("/api/financials", response_model=FinancialResponse)
def financials_post(req: FinancialRequest = Body(...)):
    """
    Compute EBITDA, Margin, and DSCR applying structural shocks.
    """
    try:
        return compute_financials(req)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Financial engine error: {e}")
