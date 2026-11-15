# Deployment checklist
- Terminate HTTPS in front (Caddy/nginx/ALB); set PUBLIC_BASE_URL and CORS_ORIGINS to the https origin.
- Strong persistent SECRET_KEY; PostgreSQL; persistent volume (or an S3-compatible store) for UPLOAD_DIR.
- ALLOW_DEMO_DATA=false; configure Earth Engine.
- Back up the database (pg_dump) and the evidence/reports volume together.
- Replace in-memory rate limiting; add Alembic and a real job queue.
- Have privacy policy and terms reviewed. Do not claim production readiness until docs/limitations.md is cleared.
