import asyncio
from app.core.database import AsyncSessionLocal
from app.models.models import Vehicle, Route, Telemetry, DeliveryPoint
from sqlalchemy import select
from sqlalchemy.orm import selectinload
import uuid

async def diagnose():
    async with AsyncSessionLocal() as session:
        # 1. Total vehicles
        v_res = await session.execute(select(Vehicle).limit(10))
        vehicles = v_res.scalars().all()
        print(f"--- VEHICLES (limit 10) ---")
        for v in vehicles:
            print(f"ID: {v.id} | Plate: {v.plate_number} | Status: {v.status}")

        # 2. Total active routes
        r_res = await session.execute(
            select(Route)
            .where(Route.status == "active")
        )
        active_routes = r_res.scalars().all()
        print(f"\n--- ACTIVE ROUTES ({len(active_routes)}) ---")
        for r in active_routes[:5]:
            print(f"ID: {r.id} | Vehicle: {r.vehicle_id} | Status: {r.status}")

        # 3. Specific vehicle from screenshot (if exists)
        plate = "DL-1C-FR-0001"
        v_res = await session.execute(select(Vehicle).where(Vehicle.plate_number == plate))
        v = v_res.scalar_one_or_none()
        if v:
            print(f"\n--- TARGET VEHICLE FOUND ---")
            print(f"ID: {v.id} | Status: {v.status}")
            
            # Check for route
            r_res = await session.execute(
                select(Route)
                .where(Route.vehicle_id == v.id)
                .order_by(Route.id.desc())
                .limit(1)
            )
            route = r_res.scalar_one_or_none()
            if route:
                print(f"Last Route ID: {route.id} | Status: {route.status}")
            else:
                print(f"No route found for this vehicle.")
        else:
            print(f"\n--- TARGET VEHICLE {plate} NOT FOUND ---")

if __name__ == "__main__":
    asyncio.run(diagnose())
