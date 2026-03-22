
import asyncio
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.models import User
from app.core.security import verify_password

async def check_pass():
    email = "superadmin@routeiq.io"
    password = "SuperAdmin123!"
    
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if not user:
            print(f"User {email} not found")
            return
        
        ok = verify_password(password, user.hashed_password)
        print(f"Password Check for {email}: {'CORRECT' if ok else 'WRONG'}")
        print(f"Role: {user.role} (Type: {type(user.role)})")

if __name__ == "__main__":
    asyncio.run(check_pass())
