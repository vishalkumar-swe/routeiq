# RouteIQ — Fleet Intelligence Platform

AI-powered route optimization and fleet management system.

## Architecture

```
routeiq/
├── backend/                  # FastAPI + Python ML
│   ├── app/
│   │   ├── api/v1/endpoints/ # Auth, Vehicles, Routes, Optimization, Telemetry, Dashboard
│   │   ├── core/             # DB, Redis, Security, Config, Celery
│   │   ├── models/           # SQLAlchemy ORM models
│   │   ├── schemas/          # Pydantic request/response schemas
│   │   ├── ml/               # VRP Solver, ETA Model, Rerouting Engine
│   │   └── middleware/       # Prometheus metrics, Request ID
│   └── tests/                # pytest test suite
├── frontend/                 # React + Vite + TypeScript
│   └── src/
│       ├── pages/            # Dashboard, Fleet, Routes, Optimize, Analytics
│       ├── components/       # Map, Charts, UI Kit
│       ├── services/         # Axios API client
│       └── store/            # Zustand state (auth)
├── infra/
│   ├── k8s/                  # Kubernetes manifests + HPA
│   └── prometheus/           # Prometheus + Grafana config
├── scripts/                  # DB init SQL
└── .github/workflows/        # CI/CD (GitHub Actions → AWS ECS)
```

## Tech Stack

| Layer         | Technology                                    |
|---------------|-----------------------------------------------|
| Backend       | FastAPI, SQLAlchemy (async), Alembic          |
| ML/AI         | Google OR-Tools (VRP), XGBoost (ETA), NumPy  |
| Auth          | JWT (access + refresh), bcrypt, RBAC          |
| Cache/Queue   | Redis, Celery, Celery Beat                    |
| Database      | PostgreSQL 16                                 |
| Frontend      | React 18, Vite, TypeScript, Zustand           |
| Charts        | Recharts                                      |
| Map           | MapLibre GL (OpenStreetMap tiles)             |
| Infra         | Docker Compose, Kubernetes, AWS ECS           |
| Monitoring    | Prometheus, Grafana                           |
| CI/CD         | GitHub Actions → GHCR → AWS ECS              |

## Quick Start

```bash
# 1. Clone and configure
cp backend/.env.example backend/.env
# Edit backend/.env — set SECRET_KEY and API keys

# 2. Start all services
docker compose up -d

# 3. Run migrations
docker compose exec backend alembic upgrade head

# 4. Access the app
open http://localhost:3005        # Frontend
open http://localhost:8001/api/docs  # Swagger UI
open http://localhost:9091        # Prometheus
open http://localhost:3002        # Grafana (admin/admin123)
```

## API Endpoints

| Method | Endpoint                        | Description              | Auth      |
|--------|----------------------------------|--------------------------|-----------|
| POST   | /api/v1/auth/register           | Register user            | —         |
| POST   | /api/v1/auth/login              | Login → JWT tokens       | —         |
| POST   | /api/v1/auth/refresh            | Refresh access token     | —         |
| GET    | /api/v1/vehicles/               | List fleet               | Any role  |
| POST   | /api/v1/vehicles/               | Add vehicle              | Admin/Mgr |
| GET    | /api/v1/vehicles/summary        | Fleet KPI counts         | Any role  |
| POST   | /api/v1/optimize/               | Run VRP optimization     | Admin/Mgr |
| POST   | /api/v1/optimize/eta            | Predict ETA              | Any role  |
| GET    | /api/v1/routes/                 | List routes              | Any role  |
| POST   | /api/v1/telemetry/              | Ingest GPS ping          | Any role  |
| GET    | /api/v1/telemetry/{id}/live     | Get live position        | Any role  |
| GET    | /api/v1/dashboard/kpis          | Dashboard KPIs           | Any role  |

## AI Components

### 1. VRP Solver (`app/ml/vrp_solver.py`)
- **Primary**: Google OR-Tools constraint programming
- **Fallback**: Nearest-neighbour greedy algorithm
- Features: time windows, vehicle capacity, traffic factor
- Inputs: depot, delivery points, vehicle configs
- Output: optimized routes with distance, duration, fuel estimates

### 2. ETA Predictor (`app/ml/eta_model.py`)
- **Primary**: Trained XGBoost/LightGBM model (when `eta_model.pkl` exists)
- **Fallback**: Physics-based speed model
- Features: distance, traffic density, weather severity, hour-of-day (sin/cos encoding), day-of-week, vehicle type, historical speed
- Output: predicted minutes + confidence interval + impact breakdown

### 3. Dynamic Rerouting (`app/ml/reroute_engine.py`)
- Triggered by traffic events (webhook or polling)
- Cooldown: 5 minutes per vehicle to prevent rerouting thrash
- Threshold: only reroutes if saving > 10 minutes
- Re-solves VRP for remaining stops only

## Role-Based Access

| Role    | Permissions                                           |
|---------|-------------------------------------------------------|
| Admin   | Full access: CRUD all entities, see all data          |
| Manager | Create/edit routes and vehicles, view all data        |
| Driver  | View own routes, submit telemetry, see own vehicle    |

## Training the ETA Model

```python
# backend/app/ml/train_eta.py (create this)
import pandas as pd
from xgboost import XGBRegressor
import pickle

# Load historical telemetry + delivery data from DB
df = pd.read_sql("SELECT ...", engine)

# Build feature matrix (see _build_features in eta_model.py)
X, y = build_features(df), df['actual_duration_minutes']

model = XGBRegressor(n_estimators=500, learning_rate=0.05, max_depth=6)
model.fit(X, y)

with open('app/ml/eta_model.pkl', 'wb') as f:
    pickle.dump(model, f)
```

## Production Deployment

```bash
# Build and push images
docker build -t routeiq/backend:latest ./backend
docker build -t routeiq/frontend:latest ./frontend

# Deploy to Kubernetes
kubectl apply -f infra/k8s/deployment.yaml

# Or via CI/CD — push to main branch triggers:
# 1. Run tests
# 2. Build Docker images → GHCR
# 3. Deploy to AWS ECS
```
