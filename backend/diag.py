
import asyncio
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.models import User
from app.core.security import verify_password

async def diagnostic():
    email = "superadmin@routeiq.io"
    password = "SuperAdmin123!"
    
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if not user:
            print("USER NOT FOUND")
            return
        
        db_hash = user.hashed_password
        print(f"DB Hash: {repr(db_hash)}")
        print(f"Length: {len(db_hash)}")
        ok = verify_password(password, db_hash)
        print(f"Verify: {ok}")

if __name__ == "__main__":
    asyncio.run(diagnostic())
