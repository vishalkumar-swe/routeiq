"""Force reset all user passwords to known values."""
import asyncio
import bcrypt
from sqlalchemy import text
from app.core.database import AsyncSessionLocal

USERS = [
    ("superadmin@routeiq.io", "SuperAdmin1234!", "superadmin", "Platform Superadmin"),
    ("admin@routeiq.io",      "Admin1234!",      "admin",       "Fleet Admin"),
    ("manager@routeiq.io",    "Manager1234!",    "manager",     "Fleet Manager"),
    ("driver@routeiq.io",     "Driver1234!",     "driver",      "John Driver"),
]

async def reset():
    async with AsyncSessionLocal() as session:
        for email, pw, role, name in USERS:
            hashed = bcrypt.hashpw(pw.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            # Upsert: update if exists, insert if not
            result = await session.execute(
                text("SELECT id FROM users WHERE email = :email"),
                {"email": email}
            )
            row = result.fetchone()
            if row:
                await session.execute(
                    text("UPDATE users SET hashed_password = :hashed, is_active = true WHERE email = :email"),
                    {"hashed": hashed, "email": email}
                )
                print(f"[UPDATED] {email} -> password reset OK")
            else:
                import uuid
                await session.execute(
                    text("""
                        INSERT INTO users (id, email, full_name, hashed_password, role, is_active)
                        VALUES (:id, :email, :name, :hashed, :role, true)
                    """),
                    {"id": str(uuid.uuid4()), "email": email, "name": name,
                     "hashed": hashed, "role": role}
                )
                print(f"[CREATED] {email} -> inserted OK")

        await session.commit()
        print("\nAll done. Verifying...")

        # Verify
        for email, pw, _, _ in USERS:
            result = await session.execute(
                text("SELECT hashed_password, is_active FROM users WHERE email = :email"),
                {"email": email}
            )
            row = result.fetchone()
            if row:
                hashed_db, active = row
                match = bcrypt.checkpw(pw.encode('utf-8'), hashed_db.encode('utf-8'))
                print(f"  {email} | active={active} | pw_match={match}")
            else:
                print(f"  {email} | NOT FOUND!")

asyncio.run(reset())
