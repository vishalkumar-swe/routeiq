import httpx
import logging
import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.models import Vehicle, Telemetry
from app.services.telemetry_service import TelemetryService

logger = logging.getLogger("routeiq.sparkgps")

class SparkGPSService:
    """
    Service for integrating with the SparkGPS (Roadcast) API.
    Handles real-time telemetry syncing for active cargo vehicles.
    """

    @staticmethod
    async def fetch_and_sync(db: AsyncSession):
        """
        Polls SparkGPS API and updates internal telemetry.
        """
        # 1. Ensure we have a token
        token = settings.SPARK_GPS_API_TOKEN
        if not token and settings.SPARK_GPS_USERNAME and settings.SPARK_GPS_PASSWORD:
            token = await SparkGPSService._get_access_token()
            
        if not token:
            logger.warning("SparkGPS API Token or credentials missing. Falling back to mock sync.")
            await SparkGPSService.mock_sync_for_demo(db)
            return

        try:
            # 1. Fetch from SparkGPS
            external_data = await SparkGPSService._fetch_from_api()
            if not external_data:
                return

            # 2. Get all RouteIQ vehicles to map by spark_id or plate number
            result = await db.execute(select(Vehicle))
            internal_vehicles = result.scalars().all()
            
            # Map spark_id -> Vehicle and plate_number -> Vehicle
            spark_map = {v.spark_id: v for v in internal_vehicles if v.spark_id}
            plate_map = {v.plate_number.replace("-", "").upper(): v for v in internal_vehicles}

            # 3. Process and ingest
            synced_count = 0
            for item in external_data:
                # Roadcast typically returns 'device_id' or 'imei' for spark_id
                device_id = item.get("device_id") or item.get("imei")
                plate = item.get("reg_no", "").replace("-", "").upper()
                
                vehicle = None
                if device_id and device_id in spark_map:
                    vehicle = spark_map[device_id]
                elif plate in plate_map:
                    vehicle = plate_map[plate]

                if vehicle:
                    # Create telemetry record
                    telemetry_data = {
                        "vehicle_id": str(vehicle.id),
                        "latitude": float(item.get("lat", 0)),
                        "longitude": float(item.get("lng", 0)),
                        "speed_kmph": float(item.get("speed", 0)),
                        "heading": float(item.get("heading", 0)),
                        "fuel_level_pct": float(item.get("fuel", 100)),
                        "timestamp": datetime.now(timezone.utc)
                    }
                    
                    # Update vehicle state directly for quick UI updates
                    vehicle.latitude = telemetry_data["latitude"]
                    vehicle.longitude = telemetry_data["longitude"]
                    vehicle.last_sync = telemetry_data["timestamp"]
                    
                    # Store in DB and broadcast via WebSockets
                    await TelemetryService.ingest_telemetry(db, telemetry_data)
                    synced_count += 1

            if synced_count > 0:
                logger.info(f"Successfully synced {synced_count} vehicles from SparkGPS.")

        except Exception as e:
            logger.error(f"Error syncing SparkGPS data: {str(e)}")

    @staticmethod
    async def _get_access_token() -> Optional[str]:
        """
        Authenticates with SparkGPS using credentials to get a temporary token.
        """
        url = f"{settings.SPARK_GPS_API_URL}/auth/login"
        payload = {
            "username": settings.SPARK_GPS_USERNAME,
            "password": settings.SPARK_GPS_PASSWORD
        }
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(url, json=payload, timeout=10.0)
                if response.status_code == 200:
                    data = response.json()
                    # Cache token in memory settings for subsequent calls
                    token = data.get("access_token") or data.get("token")
                    if token:
                        settings.SPARK_GPS_API_TOKEN = token
                        return token
                logger.error(f"SparkGPS Auth Failed: {response.status_code} - {response.text}")
            except Exception as e:
                logger.error(f"SparkGPS Auth Exception: {str(e)}")
        return None

    @staticmethod
    async def _fetch_from_api() -> List[Dict[str, Any]]:
        """
        Internal helper to perform the HTTP request.
        """
        url = f"{settings.SPARK_GPS_API_URL}/vehicles/live"
        headers = {
            "Authorization": f"Bearer {settings.SPARK_GPS_API_TOKEN}",
            "Content-Type": "application/json"
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url, headers=headers, timeout=10.0)
                if response.status_code == 200:
                    return response.json().get("data", [])
                elif response.status_code == 401:
                    # Token might have expired, clear it
                    settings.SPARK_GPS_API_TOKEN = ""
                    logger.error("SparkGPS API Unauthorized. Clearing token for refresh.")
                else:
                    logger.error(f"SparkGPS API Error: {response.status_code} - {response.text}")
            except Exception as e:
                logger.error(f"HTTP Request to SparkGPS failed: {str(e)}")
        
        return []

    @staticmethod
    async def mock_sync_for_demo(db: AsyncSession):
        """
        Simulates SparkGPS data if no token is available (for local testing).
        """
        result = await db.execute(select(Vehicle).where(Vehicle.status == "on_route"))
        active_vehicles = result.scalars().all()

        for vehicle in active_vehicles:
            # Small jitter around New Delhi (Saket area)
            lat = 28.5244 + (uuid.uuid4().int % 1000) / 100000
            lng = 77.2167 + (uuid.uuid4().int % 1000) / 100000
            
            telemetry_data = {
                "vehicle_id": str(vehicle.id),
                "latitude": lat,
                "longitude": lng,
                "speed_kmph": 25.0 + (uuid.uuid4().int % 20),
                "heading": uuid.uuid4().int % 360,
                "timestamp": datetime.now(timezone.utc)
            }
            await TelemetryService.ingest_telemetry(db, telemetry_data)
