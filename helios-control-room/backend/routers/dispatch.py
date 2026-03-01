"""routers/dispatch.py — POST /api/dispatch (merit-order economic dispatch)."""
from fastapi import APIRouter, HTTPException
from models.plant import DispatchRequest, DispatchResponse
from engines.merit_order import run_dispatch

router = APIRouter()


@router.post("/api/dispatch", response_model=DispatchResponse)
def dispatch(req: DispatchRequest):
    """
    Run merit-order economic dispatch to meet a target demand.

    - **state**: Optional. If omitted, uses all plants system-wide.
    - **target_demand_mw**: Demand to satisfy in MW.
    - **shock_params.capacity_derate**: Extra derate fraction (0–1) on available capacity.
    - **shock_params.cost_multiplier**: Multiply all variable costs by this factor.
    """
    try:
        return run_dispatch(req)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Dispatch engine error: {e}")
