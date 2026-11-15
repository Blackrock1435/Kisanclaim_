from __future__ import annotations
from sqlalchemy.orm import Session
from ..models.models import AuditLog, ClaimEvent, Notification, Claim


def audit(db: Session, actor_id, action: str, entity: str | None = None, entity_id: int | None = None, detail: str | None = None):
    db.add(AuditLog(actor_id=actor_id, action=action, entity=entity, entity_id=entity_id, detail=detail))


def notify(db: Session, user_id: int, title: str, body: str | None = None, claim_id: int | None = None):
    # In-app only. SMS/WhatsApp providers can plug in here later; none is configured or claimed.
    db.add(Notification(user_id=user_id, title=title, body=body, claim_id=claim_id))


def set_status(db: Session, claim: Claim, to: str, actor_id: int | None, note: str | None = None):
    db.add(ClaimEvent(claim_id=claim.id, actor_id=actor_id, from_status=claim.status, to_status=to, note=note))
    claim.status = to
