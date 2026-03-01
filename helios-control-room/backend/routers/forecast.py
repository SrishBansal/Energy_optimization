"""routers/forecast.py — POST /api/forecast (24-month demand forecasting)."""
from fastapi import APIRouter, HTTPException
from models.demand import ForecastRequest, ForecastResponse
from engines.demand_forecaster import run_forecast

router = APIRouter()


@router.post("/api/forecast", response_model=ForecastResponse)
def forecast(req: ForecastRequest):
    """
    Generate a state-wise 24-month demand forecast.

    - **state**: Optional. If omitted, forecasts all states.
    - **months**: 1–24 (default 24).
    - **shock_params**: Optional overrides for demand growth and seasonal index.
    """
    try:
        return run_forecast(req)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Forecast engine error: {e}")
