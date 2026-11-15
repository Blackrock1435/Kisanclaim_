# Architecture

Modular monolith: React SPA -> FastAPI -> SQL database + local file storage. External data: Open-Meteo (weather), Google Earth Engine (Sentinel-2, optional).

backend/app: api (routes, schemas, access checks; RBAC enforced here), core (config, db, Argon2id, JWT, rate limit), models, digipin (port of India Post's official algorithm), satellite (NDVI + Earth Engine client with config_required / labelled demo states), weather (Open-Meteo), evidence (magic-byte sniffing, EXIF, SHA-256), assessment (versioned rule engine), reports (ReportLab PDF + QR + hashes), services (audit, notifications, analysis pipeline).

## Claim lifecycle
draft -> submitted -> evidence_processing -> analysis_pending -> analysis_completed -> under_review -> (additional_evidence_required | approved | rejected) -> closed.
Every transition is stored in `claim_events`. Only an officer/admin can approve or reject; the pipeline never does.

## Analysis pipeline (services/pipeline.py)
Open-Meteo fetch -> satellite analysis (real GEE / config_required / labelled demo) -> rule engine -> new `assessments` version -> PDF -> `reports` row with file SHA-256 and public verify code. Failures return the claim to `submitted` with an audit entry; nothing is fabricated.

## Rule engine (assessment/engine.py, v1.0.0)
NDVI % change thresholds (in `RULES`), gated on >=50% valid pixels; rainfall consistency for wet disasters and drought; photo-GPS proximity; always `manual_review_required = true`. Output is a category plus signals, never a crop-loss percentage.

## Security
Argon2id, JWT with expiry, server-side role checks on every route, claim-level ownership checks returning 404, content-sniffed uploads with size cap, private evidence served only after auth, per-IP rate limits on login/register, audit log, generic 500 responses.
