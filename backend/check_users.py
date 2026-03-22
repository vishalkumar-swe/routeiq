import asyncio
import bcrypt
from sqlalchemy import text
from app.core.database import AsyncSessionLocal

async def check():
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            text("SELECT email, role, is_active, hashed_password FROM users ORDER BY role")
        )
        rows = result.fetchall()
        print(f"\nFound {len(rows)} users:\n")
        for row in rows:
            email, role, is_active, hashed = row
            # test each password
            passwords = {
                'superadmin@routeiq.io': 'SuperAdmin1234!',
                'admin@routeiq.io': 'Admin1234!',
                'manager@routeiq.io': 'Manager1234!',
                'driver@routeiq.io': 'Driver1234!',
            }
            test_pw = passwords.get(email, '')
            if test_pw and hashed:
                try:
                    ok = bcrypt.checkpw(test_pw.encode(), hashed.encode())
                except Exception as e:
                    ok = f"ERROR: {e}"
            else:
                ok = "NO HASH"
            print(f"  {email} | role={role} | active={is_active} | pw_match={ok}")

asyncio.run(check())
