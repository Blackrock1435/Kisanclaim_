from __future__ import annotations
from fastapi import HTTPException
from ..models.models import Claim


def claim_for(db, claim_id: int, user) -> Claim:
    """Backend authorisation: farmer -> own claims; officer -> assigned claims; admin -> all."""
    c = db.get(Claim, claim_id)
    if not c:
        raise HTTPException(404, "Claim not found")
    if user.role == "admin" or (user.role == "farmer" and c.farmer_id == user.id) or (user.role == "officer" and c.officer_id == user.id):
        return c
    raise HTTPException(404, "Claim not found")  # 404 not 403: do not reveal existence
