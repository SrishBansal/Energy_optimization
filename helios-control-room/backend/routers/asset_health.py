"""routers/asset_health.py — GET /api/asset-health"""
from typing import Optional
from fastapi import APIRouter, HTTPException, Query, Body
from models.asset_health import AssetHealthResponse, AssetHealthRequest
from engines.asset_health import compute_asset_health

router = APIRouter()

@router.get("/api/asset-health", response_model=AssetHealthResponse)
def get_asset_health(
    state: Optional[str] = Query(None, description="Filter to a single state"),
    date_from: Optional[str] = Query(None, description="Start date YYYY-MM-DD"),
    date_to: Optional[str] = Query(None, description="End date YYYY-MM-DD"),
):
    try:
        req = AssetHealthRequest(state=state, date_from=date_from, date_to=date_to)
        return compute_asset_health(req)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Asset Health error: {e}")
