# Database

Tables: users, farms, fields, claims, claim_events, evidence, analyses (satellite + weather, history kept), assessments (versioned), reports, reviews, notifications, audit_logs. Foreign keys cascade where children are meaningless without the parent.

## Deviations from the original plan
* Geometry: boundaries are GeoJSON in a JSON column, validated and measured with Shapely + pyproj (geodesic area). docker-compose uses the PostGIS image but no PostGIS column type is used yet. Upgrade: add geoalchemy2, change `fields.boundary` to Geometry('POLYGON', 4326), backfill with ST_GeomFromGeoJSON.
* Migrations: tables come from `Base.metadata.create_all`. Alembic is not wired up; add it before schema changes on a real deployment.
* Tables merged: profiles live on `users`; satellite/weather share `analyses` (`kind`); `assessments` has one row per version; crop details live on `claims` and `fields`.
