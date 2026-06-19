"""API v1 router — aggregates all endpoint routers."""
from fastapi import APIRouter

from .endpoints import auth, users, vehicles, routes, telemetry, dashboard, optimization, shipments, analytics, traffic, depots, cargo, gps

api_router = APIRouter()

api_router.include_router(auth.router,         prefix="/auth",         tags=["Authentication"])
api_router.include_router(users.router,        prefix="/users",        tags=["Users"])
api_router.include_router(vehicles.router,     prefix="/vehicles",     tags=["Vehicles"])
api_router.include_router(shipments.router,    prefix="/shipments",    tags=["Shipment Cargo"])
api_router.include_router(routes.router,       prefix="/routes",       tags=["Routes"])
api_router.include_router(optimization.router, prefix="/optimize",     tags=["Optimization"])
api_router.include_router(telemetry.router,    prefix="/telemetry",    tags=["Telemetry"])
api_router.include_router(dashboard.router,    prefix="/dashboard",    tags=["Dashboard"])
api_router.include_router(analytics.router,    prefix="/analytics",    tags=["AI Analytics"])
api_router.include_router(traffic.router,      prefix="/traffic",      tags=["Traffic Simulation"])
api_router.include_router(depots.router,       prefix="/depots",       tags=["Depots"])
api_router.include_router(cargo.router,        prefix="/cargo",        tags=["Cargo Collaboration"])
api_router.include_router(gps.router,        prefix="/gps",        tags=["GPS"])
# # api_router.include_router(agents.router,       prefix="/agents",       tags=["AI Agents"])
