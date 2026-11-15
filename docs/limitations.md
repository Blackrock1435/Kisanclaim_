# Known limitations (read before demoing or deploying)

1. Satellite data needs credentials. Without Google Earth Engine the app says "Insufficient satellite data". With ALLOW_DEMO_DATA=true it shows the deck's illustrative curve, labelled DEMONSTRATION in the UI, assessment warnings and PDF. The GEE code path (satellite/ndvi.py::_gee) follows the documented API but has NOT been run against a live account.
2. Open-Meteo was tested with mocked responses and the failure path only; the live call was unreachable from the build sandbox.
3. No Celery/Redis: analysis runs in an in-process FastAPI background task. Use a real queue for production.
4. No Alembic and no PostGIS column yet (see database.md).
5. No email password reset (no SMTP). Admins can set a password via PATCH /api/admin/users/{id}/password.
6. Notifications are in-app only; no SMS/WhatsApp provider is configured.
7. Hindi and Kannada are partial (navigation and key actions) and need native-speaker review.
8. Offline: unsent claim form fields persist in the browser and uploads can be retried; there is no service worker or background upload queue.
9. Rate limiting is in-memory per process.
10. Legal pages are prototype text, not legal advice.
11. NDVI before/after uses the nearest usable image each side of the incident, not a growth-stage-aware baseline.
12. The Playwright spec in frontend/e2e needs `npx playwright install` and both servers running.
