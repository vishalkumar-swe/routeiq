from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Any

from app.core.database import get_db
from app.core.security import get_current_user
from app.schemas.schemas import TokenData
from app.services.analytics_service import AnalyticsService

router = APIRouter()

@router.get("/insights", response_model=List[Dict[str, Any]])
async def get_ai_insights(
    db: AsyncSession = Depends(get_db),
    token: TokenData = Depends(get_current_user)
):
    """
    Get real-time AI insights for the fleet.
    Only authorized for managers and admins.
    """
    if token.role not in ["admin", "superadmin", "manager"]:
        raise HTTPException(status_code=403, detail="Not authorized to view fleet insights")
        
    return await AnalyticsService.get_live_insights(db)

@router.get("/metrics", response_model=Dict[str, Any])
async def get_fleet_metrics(
    db: AsyncSession = Depends(get_db),
    token: TokenData = Depends(get_current_user)
):
    """
    Get high-level fleet performance metrics.
    Only authorized for managers and admins.
    """
    if token.role not in ["admin", "superadmin", "manager"]:
        raise HTTPException(status_code=403, detail="Not authorized to view fleet metrics")
        
    return await AnalyticsService.get_fleet_stats(db)

@router.get("/active-missions", response_model=List[Dict[str, Any]])
async def get_active_missions(
    db: AsyncSession = Depends(get_db),
    token: TokenData = Depends(get_current_user)
):
    """
    Get all active vehicle missions for the 'Routing Incubator'.
    """
    if token.role not in ["admin", "superadmin", "manager"]:
        raise HTTPException(status_code=403, detail="Not authorized to view mission incubator")
        
    return await AnalyticsService.get_active_missions(db)

@router.post("/sync-sparkgps")
async def sync_sparkgps(
    db: AsyncSession = Depends(get_db),
    _: TokenData = Depends(get_current_user)
):
    """
    Manually triggers SparkGPS / Roadcast telemetry sync.
    Falls back to mock data if no token is configured.
    """
    from app.services.spark_gps_service import SparkGPSService
    from app.core.config import settings
    
    if settings.SPARK_GPS_API_TOKEN:
        await SparkGPSService.fetch_and_sync(db)
        return {"status": "success", "message": "SparkGPS live sync complete"}
    else:
        await SparkGPSService.mock_sync_for_demo(db)
        return {"status": "success", "message": "SparkGPS Mock Sync (Demostration Mode) complete"}
