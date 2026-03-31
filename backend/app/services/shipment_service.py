import uuid
from datetime import datetime
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload, joinedload
from app.models.models import Shipment, Parcel, DeliveryPoint, ShipmentLog
from app.schemas.schemas import ShipmentCreate, ShipmentUpdate
from app.services.security_service import SecurityService

class ShipmentService:
    @staticmethod
    async def record_shipment_log(db: AsyncSession, shipment_id: uuid.UUID, status: str, lat: float = None, lng: float = None, metadata: dict = None) -> ShipmentLog:
        """
        Records a tamper-evident log for a shipment status change.
        """
        # 1. Fetch the last log to get previous hash and index
        result = await db.execute(
            select(ShipmentLog)
            .where(ShipmentLog.shipment_id == shipment_id)
            .order_by(ShipmentLog.index.desc())
            .limit(1)
        )
        last_log = result.scalar_one_or_none()
        
        prev_hash = last_log.log_hash if last_log else "0" * 64
        new_index = (last_log.index + 1) if last_log else 0
        
        # 2. Prepare data for hashing
        timestamp = datetime.now()
        data = {
            "shipment_id": str(shipment_id),
            "status": status,
            "location_lat": lat,
            "location_lng": lng,
            "timestamp": timestamp.isoformat(),
            "index": new_index,
            "metadata": metadata or {}
        }
        
        # 3. Generate hash
        new_hash = SecurityService.generate_hash(data, prev_hash)
        
        # 4. Create and save log
        db_log = ShipmentLog(
            shipment_id=shipment_id,
            status=status,
            location_lat=lat,
            location_lng=lng,
            timestamp=timestamp,
            index=new_index,
            previous_hash=prev_hash,
            log_hash=new_hash,
            metadata_json=metadata or {}
        )
        db.add(db_log)
        await db.flush()
        return db_log

    @staticmethod
    async def create_shipment(db: AsyncSession, shipment_in: ShipmentCreate) -> Shipment:
        # Generate tracking ID if not provided
        tracking_id = shipment_in.tracking_id or f"RTX-{uuid.uuid4().hex[:8].upper()}"
        
        db_shipment = Shipment(
            tracking_id=tracking_id,
            priority=shipment_in.priority,
            status="created",
            origin_name=shipment_in.origin_name,
            origin_address=shipment_in.origin_address,
            origin_lat=shipment_in.origin_lat,
            origin_lng=shipment_in.origin_lng,
            total_items=shipment_in.total_items,
            total_weight_kg=shipment_in.total_weight_kg
        )
        db.add(db_shipment)
        await db.flush()  # Get ID
        
        total_weight = 0
        for p_in in shipment_in.parcels:
            db_parcel = Parcel(
                shipment_id=db_shipment.id,
                weight_kg=p_in.weight_kg,
                length_cm=p_in.length_cm,
                width_cm=p_in.width_cm,
                height_cm=p_in.height_cm,
                category=p_in.category,
                is_hazardous=p_in.is_hazardous,
                is_fragile=p_in.is_fragile
            )
            db.add(db_parcel)
            total_weight += p_in.weight_kg
            
        # Update delivery point with shipment and weight
        dp_id = shipment_in.delivery_point_id
        
        # If ID is not a valid UUID, create a new DeliveryPoint from dest data
        is_uuid = True
        try:
            if not isinstance(dp_id, uuid.UUID):
                uuid.UUID(str(dp_id))
        except (ValueError, TypeError):
            is_uuid = False

        if not is_uuid:
            # Creation of new DeliveryPoint from Mapbox data
            new_dp = DeliveryPoint(
                name=shipment_in.dest_name or "New Location",
                address=shipment_in.dest_address or "Unknown Address",
                latitude=shipment_in.dest_lat or 0.0,
                longitude=shipment_in.dest_lng or 0.0,
                demand_kg=total_weight or shipment_in.total_weight_kg or 0.0,
                shipment_id=db_shipment.id,
                status="pending"
            )
            db.add(new_dp)
        else:
            # Use existing delivery point ID
            result = await db.execute(select(DeliveryPoint).where(DeliveryPoint.id == dp_id))
            dp = result.scalar_one_or_none()
            if dp:
                dp.shipment_id = db_shipment.id
                dp.demand_kg = total_weight or shipment_in.total_weight_kg or 1.0
            
        # Record initial log
        await ShipmentService.record_shipment_log(db, db_shipment.id, "created")
            
        await db.commit()
        # Explicit refresh and reload
        shipment = await ShipmentService.get_shipment(db, db_shipment.id)
        if not shipment:
            raise Exception("Failed to retrieve created shipment")
        return shipment

    @staticmethod
    async def get_shipment(db: AsyncSession, shipment_id: uuid.UUID) -> Optional[Shipment]:
        result = await db.execute(
            select(Shipment)
            .options(
                selectinload(Shipment.delivery_point), 
                selectinload(Shipment.parcels),
                selectinload(Shipment.logs)
            )
            .where(Shipment.id == shipment_id)
        )
        shipment = result.scalar_one_or_none()
        if shipment:
            from app.services.security_service import SecurityService
            # Dynamic attribute for Pydantic serialization
            shipment.is_verified = SecurityService.verify_chain(shipment.logs)
        return shipment

    @staticmethod
    async def list_shipments(db: AsyncSession, skip: int = 0, limit: int = 100) -> List[Shipment]:
        from app.services.security_service import SecurityService
        result = await db.execute(
            select(Shipment)
            .options(
                selectinload(Shipment.delivery_point), 
                selectinload(Shipment.parcels),
                selectinload(Shipment.logs)
            )
            .order_by(Shipment.created_at.desc())
            .offset(skip).limit(limit)
        )
        shipments = result.scalars().all()
        for s in shipments:
            s.is_verified = SecurityService.verify_chain(s.logs)
        return list(shipments)


    @staticmethod
    async def update_shipment_status(db: AsyncSession, shipment_id: uuid.UUID, status: str, lat: float = None, lng: float = None, received_by: str = None, signature_data: str = None) -> Optional[Shipment]:
        result = await db.execute(
            select(Shipment)
            .options(
                selectinload(Shipment.delivery_point), 
                selectinload(Shipment.parcels),
                selectinload(Shipment.logs)
            )
            .where(Shipment.id == shipment_id)
        )
        db_shipment = result.scalar_one_or_none()
        if db_shipment:
            db_shipment.status = status
            if received_by:
                db_shipment.received_by = received_by
            if signature_data:
                db_shipment.signature_data = signature_data
            
            # Record tamper-evident log with metadata if delivered
            metadata = {}
            if status == "delivered":
                metadata = {"received_by": received_by, "signature_captured": bool(signature_data)}

            await ShipmentService.record_shipment_log(db, shipment_id, status, lat, lng, metadata)
            await db.commit()
            await db.refresh(db_shipment)
            from app.services.security_service import SecurityService
            db_shipment.is_verified = SecurityService.verify_chain(db_shipment.logs)
        return db_shipment


