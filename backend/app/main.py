from __future__ import annotations
import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from .api import routes, advanced_routes, assessment_routes
from .core.config import get_settings
from .core.db import Base, engine
from .models import models  # noqa: F401

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("kisanclaim")


def create_app() -> FastAPI:
    s = get_settings()
    Base.metadata.create_all(engine)
    try:
        from sqlalchemy import inspect, text
        with engine.connect() as conn:
            insp = inspect(conn)
            if "agent_executions" in insp.get_table_names():
                cols = [c["name"] for c in insp.get_columns("agent_executions")]
                if "execution_id" not in cols:
                    conn.execute(text("ALTER TABLE agent_executions ADD COLUMN execution_id VARCHAR(64)"))
                if "farmer_id" not in cols:
                    conn.execute(text("ALTER TABLE agent_executions ADD COLUMN farmer_id INTEGER"))
            if "claims" in insp.get_table_names():
                cols = [c["name"] for c in insp.get_columns("claims")]
                if "claimed_area_ha" not in cols:
                    conn.execute(text("ALTER TABLE claims ADD COLUMN claimed_area_ha FLOAT"))
                if "claimed_amount" not in cols:
                    conn.execute(text("ALTER TABLE claims ADD COLUMN claimed_amount FLOAT"))
            conn.commit()
    except Exception as e:
        log.warning("Database migration notice: %s", e)
    app = FastAPI(
        title="KisanClaim API",
        version="1.0.0",
        description="Evidence-support and PRELIMINARY assessment platform. Not an insurance decision system.",
    )
    origins = [o.strip() for o in s.cors_origins.split(",") if o.strip()]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    for r in (
        routes.auth, routes.farms, routes.claims, routes.notif, routes.admin, routes.misc,
        advanced_routes.parcel_router, advanced_routes.geocamera_router, advanced_routes.sat_router,
        advanced_routes.agents_router, advanced_routes.graph_router, advanced_routes.dossier_router,
        advanced_routes.copilot_router, advanced_routes.integrations_router,
        advanced_routes.disaster_map_router, assessment_routes.router
    ):
        app.include_router(r)

    @app.exception_handler(Exception)
    async def unhandled(request: Request, exc: Exception):  # never leak internals
        log.exception("Unhandled error on %s", request.url.path)
        return JSONResponse({"detail": "Something went wrong on our side. Please try again."}, status_code=500)

    @app.get("/api/health")
    def health():
        return {"ok": True}
    return app


app = create_app()
