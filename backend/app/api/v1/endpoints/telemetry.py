"""Telemetry endpoints — live GPS & vehicle data ingestion."""
import uuid
from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, Query, HTTPException, WebSocket
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import Telemetry, Vehicle, VehicleStoppage
from app.schemas.schemas import TelemetryCreate, TelemetryResponse, TokenData

router = APIRouter()


@router.post("/", response_model=TelemetryResponse, status_code=201)
async def ingest_telemetry(
    payload: TelemetryCreate,
    db: AsyncSession = Depends(get_db),
    token: TokenData = Depends(get_current_user),
):
    from app.services.telemetry_service import TelemetryService
    
    try:
        t = await TelemetryService.ingest_telemetry(db, payload.model_dump())
        return t
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Telemetry Ingestion Failed: {str(e)}")


@router.websocket("/ws")
async def telemetry_websocket(websocket: WebSocket):
    from app.core.websocket import manager
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive
            await websocket.receive_text()
    except Exception:
        manager.disconnect(websocket)


@router.get("/{vehicle_id}/history", response_model=List[TelemetryResponse])
async def telemetry_history(
    vehicle_id: uuid.UUID,
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
    token: TokenData = Depends(get_current_user),
):
    if token.role == "driver":
        # Check if vehicle belongs to driver
        v_result = await db.execute(select(Vehicle).where(Vehicle.id == vehicle_id))
        vehicle = v_result.scalar_one_or_none()
        if not vehicle or vehicle.driver_id != uuid.UUID(token.user_id):
            raise HTTPException(status_code=403, detail="Not authorized to view this history")

    result = await db.execute(
        select(Telemetry)
        .where(Telemetry.vehicle_id == vehicle_id)
        .order_by(desc(Telemetry.timestamp))
        .limit(limit)
    )
    return result.scalars().all()


@router.get("/{vehicle_id}/live")
async def live_position(
    vehicle_id: uuid.UUID, 
    db: AsyncSession = Depends(get_db),
    token: TokenData = Depends(get_current_user)
):
    if token.role == "driver":
        v_result = await db.execute(select(Vehicle).where(Vehicle.id == vehicle_id))
        vehicle = v_result.scalar_one_or_none()
        if not vehicle or vehicle.driver_id != uuid.UUID(token.user_id):
            raise HTTPException(status_code=403, detail="Not authorized to view live data")

    from app.core.redis import cache_get
    data = await cache_get(f"vehicle:live:{vehicle_id}")
    return data or {"error": "No live data available"}


@router.post("/stoppages", status_code=201)
async def log_stoppage(
    payload: dict,
    db: AsyncSession = Depends(get_db),
    token: TokenData = Depends(get_current_user),
):
    """
    Log a driver-reported stoppage.
    Payload: { vehicle_id, lat, lng, reason }
    """
    if token.role != "driver":
        raise HTTPException(status_code=403, detail="Only drivers can report stoppages")

    stoppage = VehicleStoppage(
        vehicle_id=uuid.UUID(payload["vehicle_id"]),
        latitude=payload["lat"],
        longitude=payload["lng"],
        reason=payload.get("reason", "unknown"),
        start_time=datetime.now()
    )
    db.add(stoppage)
    await db.commit()
    return {"status": "stoppage_logged", "id": stoppage.id}
