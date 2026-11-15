# KisanClaim

Satellite-backed crop damage evidence for faster insurance claims. A farmer marks a field, uploads geotagged photos and an event date; KisanClaim combines Sentinel-2 NDVI, historical rainfall and the photos into a PRELIMINARY assessment and a downloadable PDF report that an officer can review.

KisanClaim is an evidence-support tool. It never approves a claim, never outputs a crop-loss percentage, and says so on every screen and report. Built for Colossus 3.0 (deck in docs/).

## Included
* Public site from the pitch deck: problem, 5-step journey, evidence explainer with an interactive NDVI field, USP table, roadmap, FAQ, privacy/terms, report verification (/verify/:code).
* Farmer: consented registration, farms, fields drawn on a satellite map (validated polygons, geodesic area, official DIGIPIN), 5-step claim wizard with draft saving, upload progress/retry, EXIF GPS+time, SHA-256, status history, PDF download, notifications.
* Officer: assigned-claims queue with filters/pagination, evidence view, start review, comments, request evidence, approve/reject with mandatory reason.
* Admin: users, officer assignment, audit log, data-source status, analysis re-run.
* Backend: FastAPI, SQLAlchemy, Argon2id, JWT, RBAC with claim-level isolation, rate limits, versioned rule engine, ReportLab PDF with QR and integrity hash.

## Run
    ./scripts/setup.sh
    cd backend && source .venv/bin/activate && uvicorn app.main:app --reload
    cd frontend && npm run dev        # http://localhost:5173

See docs/setup.md (Docker, Earth Engine), docs/architecture.md, and docs/limitations.md.

## Verified in the build sandbox
* Backend pytest: 14 passed (DIGIPIN matches India Post's reference vector 4T396F42L7; NDVI; rules; RBAC; polygon rejection; uploads; PDF; full claim-to-review flow).
* Frontend: tsc clean, vite build OK, Vitest 6 passed.
* Browser end-to-end (register, farm, draw field, claim, photo, submit, assessment, PDF available) passed against the live API using demo satellite data.
* NOT exercised: live Open-Meteo, live Earth Engine, Docker build.
