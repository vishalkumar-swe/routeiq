import asyncio
import uuid
import sys
import os

# Ensure the backend directory is in the path
sys.path.append(os.getcwd())

from app.core.database import AsyncSessionLocal
from app.models.models import User
from app.core.security import hash_password

async def seed_admin():
    async with AsyncSessionLocal() as db:
        from sqlalchemy import select
        # Check if admin exists
        result = await db.execute(select(User).where(User.email == "admin@routeiq.ai"))
        existing = result.scalar_one_or_none()
        
        if existing:
            print("Admin user already exists.")
            return

        admin = User(
            id=uuid.uuid4(),
            email="admin@routeiq.ai",
            full_name="System Administrator",
            hashed_password=hash_password("admin123"),
            role="admin",
            is_active=True
        )
        db.add(admin)
        await db.commit()
        print("Admin user created: admin@routeiq.ai / admin123")

if __name__ == "__main__":
    asyncio.run(seed_admin())
