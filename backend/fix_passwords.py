"""Direct psql password reset script - uses raw psycopg2."""
import os, bcrypt, psycopg2

DB_URL = os.environ.get("DATABASE_URL", "postgresql://routeiq:routeiq_pass@db:5432/routeiq")

# Parse connection info
# URL format: postgresql+asyncpg://user:pass@host:port/db
# We'll use synchronous psycopg2 with normal postgresql URL
url = DB_URL.replace("postgresql+asyncpg://", "").replace("postgresql://", "")
# url = "routeiq:routeiq_pass@db:5432/routeiq"
user_pass, host_db = url.split("@")
username, password = user_pass.split(":")
host_port, dbname = host_db.split("/")
host, port = (host_port.split(":") + ["5432"])[:2]

print(f"Connecting to {host}:{port} db={dbname} user={username}")

conn = psycopg2.connect(host=host, port=int(port), dbname=dbname, user=username, password=password)
conn.autocommit = True
cur = conn.cursor()

USERS = [
    ("superadmin@routeiq.io", "SuperAdmin1234!", "superadmin", "Platform Superadmin"),
    ("admin@routeiq.io",      "Admin1234!",      "admin",       "Fleet Admin"),
    ("manager@routeiq.io",    "Manager1234!",    "manager",     "Fleet Manager"),
    ("driver@routeiq.io",     "Driver1234!",     "driver",      "John Driver"),
]

import uuid as uuidmod

for email, pw, role, name in USERS:
    hashed = bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()
    cur.execute("SELECT id FROM users WHERE email = %s", (email,))
    row = cur.fetchone()
    if row:
        cur.execute("UPDATE users SET hashed_password = %s, is_active = true WHERE email = %s", (hashed, email))
        print(f"[UPDATED] {email}")
    else:
        cur.execute("""
            INSERT INTO users (id, email, full_name, hashed_password, role, is_active)
            VALUES (%s, %s, %s, %s, %s, true)
        """, (str(uuidmod.uuid4()), email, name, hashed, role))
        print(f"[CREATED] {email}")

print("\n--- Verification ---")
for email, pw, _, _ in USERS:
    cur.execute("SELECT hashed_password, is_active FROM users WHERE email = %s", (email,))
    row = cur.fetchone()
    if row:
        hashed_db, active = row
        match = bcrypt.checkpw(pw.encode(), hashed_db.encode())
        print(f"  {email} | active={active} | pw_ok={match}")
    else:
        print(f"  {email} | NOT FOUND!")

cur.close()
conn.close()
print("\nDone!")
