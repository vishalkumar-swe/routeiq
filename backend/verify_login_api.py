
import httpx
import asyncio

async def test_logins():
    url = "http://localhost:8000/api/v1/auth/login"
    users = [
        {"email": "superadmin@routeiq.io", "password": "SuperAdmin123!", "role": "superadmin"},
        {"email": "admin@routeiq.io", "password": "Admin1234!", "role": "admin"},
        {"email": "manager@routeiq.io", "password": "Manager123!", "role": "manager"},
        {"email": "driver@routeiq.io", "password": "Driver123!", "role": "driver"},
    ]

    async with httpx.AsyncClient() as client:
        for u in users:
            r = await client.post(url, json={"email": u["email"], "password": u["password"]})
            if r.status_code == 200:
                print(f"SUCCESS: {u['role']} ({u['email']}) logged in.")
            else:
                print(f"FAILED: {u['role']} ({u['email']}) got {r.status_code}: {r.text}")

if __name__ == "__main__":
    asyncio.run(test_logins())
