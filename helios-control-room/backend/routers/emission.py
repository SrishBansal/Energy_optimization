"""routers/emission.py — GET /api/emissions (historical emission intensity)."""
from typing import Optional
from fastapi import APIRouter, HTTPException, Query, Body
from models.emission import SystemEmissionResponse, EmissionRequest
from engines.emission_calculator import calculate_emissions

router = APIRouter()


@router.get("/api/emissions", response_model=SystemEmissionResponse)
def emissions(
    state: Optional[str] = Query(None, description="Filter to a single state"),
    date_from: Optional[str] = Query(None, description="Start date YYYY-MM-DD"),
    date_to: Optional[str] = Query(None, description="End date YYYY-MM-DD"),
):
    """
    Return historical weighted emission intensity (tCO2/MWh) for the system
    and each state, including cap utilisation and renewable penetration.
    """
    try:
        req = EmissionRequest(state=state, date_from=date_from, date_to=date_to)
        return calculate_emissions(req)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Emission engine error: {e}")

@router.post("/api/emissions", response_model=SystemEmissionResponse)
def emissions_post(req: EmissionRequest = Body(...)):
    """
    Calculate weighted emission intensity with structural shocks.
    """
    try:
        return calculate_emissions(req)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Emission engine error: {e}")
