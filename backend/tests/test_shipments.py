import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from asgi_lifespan import LifespanManager

@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"

@pytest.fixture
async def client():
    async with LifespanManager(app) as manager:
        async with AsyncClient(transport=ASGITransport(app=manager.app), base_url="http://test") as c:
            yield c

@pytest.mark.anyio
async def test_shipment_flow(client):
    # 1. Create a delivery point manually in DB or via an endpoint if it exists
    # Since there's no POST /delivery-points, let's use the DB session directly if we can,
    # or just test the list endpoint which was reported as failing.
    
    # 2. Test Listing (should be empty but 200)
    r = await client.get("/api/v1/shipments/")
    assert r.status_code == 200
    assert isinstance(r.json(), list)

    # 3. Test Routes Delivery Points listing
    r = await client.get("/api/v1/routes/delivery-points")
    assert r.status_code == 200
    assert isinstance(r.json(), list)

@pytest.mark.anyio
async def test_create_shipment_validation(client):
    # Test with invalid data to ensure it doesn't 500
    payload = {
        "priority": "invalid",
        "parcels": []
    }
    r = await client.post("/api/v1/shipments/", json=payload)
    assert r.status_code == 422 # Validation error, not 500

