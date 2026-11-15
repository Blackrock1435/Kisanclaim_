# Setup

## Quick start (macOS/Linux)
    ./scripts/setup.sh     # venv, deps, backend/.env with generated SECRET_KEY, demo accounts (passwords printed once)
    cd backend && source .venv/bin/activate && uvicorn app.main:app --reload    # http://localhost:8000/docs
    cd frontend && npm run dev                                                   # http://localhost:5173

Officer/admin sign-in: /officer-login. Admins assign claims to officers from the claim page.

## Tests
    cd backend && pytest -q          # 14 tests
    cd frontend && npm test          # Vitest
    cd frontend && npx playwright install && npm run e2e    # API + dev server running

## Satellite (Google Earth Engine)
1. Create a Cloud project with Earth Engine access and enable the API.
2. Create a service account, register it with Earth Engine, download its JSON key.
3. pip install earthengine-api; set GEE_PROJECT, GEE_SERVICE_ACCOUNT, GEE_PRIVATE_KEY_FILE; set ALLOW_DEMO_DATA=false.
4. Submit a claim whose incident date has Sentinel-2 imagery before and after it.

## Weather
Open-Meteo needs no key. If it fails, the claim page shows the error; nothing is substituted.

## Docker
    cp .env.example .env     # set SECRET_KEY and POSTGRES_PASSWORD
    docker compose up --build    # http://localhost:8080
    docker compose exec backend python seed.py
(Docker files were written but not built in the authoring sandbox.)
