from __future__ import annotations
"""Analysis pipeline: weather + satellite -> assessment (versioned) -> PDF report. Run as a background task."""
import hashlib, os, secrets
from datetime import datetime, timezone
from ..core.config import get_settings
from ..core.db import SessionLocal
from ..models.models import Analysis, Assessment, Claim, Evidence, Report
from ..satellite import ndvi
from ..weather import open_meteo
from ..assessment import engine
from ..reports import pdf
from .common import audit, notify, set_status


def run_pipeline(claim_id: int):
    db = SessionLocal()
    try:
        s = get_settings()
        claim = db.get(Claim, claim_id)
        fld = claim.field
        set_status(db, claim, "evidence_processing", None, "Automated analysis started")
        notify(db, claim.farmer_id, "Evidence processing started", f"Claim {claim.ref}", claim.id)
        db.commit()
        set_status(db, claim, "analysis_pending", None, "Fetching satellite and weather data")
        db.commit()
        wx = open_meteo.fetch(fld.centroid_lat, fld.centroid_lon, claim.incident_date)
        sat = ndvi.analyze(fld.boundary, claim.incident_date)
        for kind, res in (("weather", wx), ("satellite", sat)):
            db.add(Analysis(claim_id=claim.id, kind=kind, status=res["status"], source=res.get("source", ""), data=res))
        evs = db.query(Evidence).filter_by(claim_id=claim.id).all()
        ev_dicts = [{"lat": e.exif_lat, "lon": e.exif_lon} for e in evs]
        cd = {"incident_date": claim.incident_date, "disaster_type": claim.disaster_type, "description": claim.description}
        res = engine.run(cd, fld.boundary, ev_dicts, sat, wx)
        ver = (db.query(Assessment).filter_by(claim_id=claim.id).count()) + 1
        a = Assessment(claim_id=claim.id, version=ver, rule_version=res["rule_version"], category=res["category"], data=res)
        db.add(a); db.flush()
        code = secrets.token_hex(10)
        path = os.path.join(s.upload_dir, "reports", f"{claim.ref}-v{ver}.pdf")
        os.makedirs(os.path.dirname(path), exist_ok=True)
        ev_ctx = []
        for e in evs:
            with open(e.stored_path, "rb") as fh:
                ev_ctx.append({"filename": e.filename, "sha256": e.sha256, "lat": e.exif_lat, "lon": e.exif_lon,
                               "taken_at": e.exif_taken_at, "uploaded_at": e.uploaded_at.isoformat(timespec="seconds"), "bytes": fh.read()})
        farm = fld.farm
        pdf.build(path, {"claim": {"ref": claim.ref, "farmer_id": claim.farmer_id, "crop_name": claim.crop_name, "variety": claim.variety,
                                   "sowing_date": claim.sowing_date, "disaster_type": claim.disaster_type, "incident_date": claim.incident_date,
                                   "description": claim.description},
                         "farm": {"name": farm.name, "village": farm.village, "taluk": farm.taluk, "district": farm.district, "state": farm.state},
                         "field": {"name": fld.name, "area_ha": fld.area_ha, "centroid_lat": fld.centroid_lat, "centroid_lon": fld.centroid_lon,
                                   "digipin": fld.digipin, "boundary": fld.boundary},
                         "evidence": ev_ctx, "satellite": sat, "weather": wx, "assessment": res, "assessment_version": ver,
                         "verify_url": f"{s.public_base_url}/verify/{code}"})
        with open(path, "rb") as fh:
            digest = hashlib.sha256(fh.read()).hexdigest()
        db.add(Report(assessment_id=a.id, claim_id=claim.id, path=path, sha256=digest, verify_code=code))
        set_status(db, claim, "analysis_completed", None, f"Assessment v{ver}: {res['category_text']}")
        notify(db, claim.farmer_id, "Analysis completed", "Your preliminary assessment and PDF report are ready.", claim.id)
        notify(db, claim.farmer_id, "Report available", f"Report for {claim.ref} can be downloaded.", claim.id)
        audit(db, None, "pipeline.completed", "claim", claim.id, f"assessment v{ver}")
        db.commit()
    except Exception as e:  # never leave a claim stuck silently
        db.rollback()
        claim = db.get(Claim, claim_id)
        if claim:
            set_status(db, claim, "submitted", None, f"Automated analysis failed: {type(e).__name__}. Will be retried by an officer/admin.")
            audit(db, None, "pipeline.failed", "claim", claim_id, str(e)[:300])
            db.commit()
    finally:
        db.close()
