from typing import Optional, Any
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.models import AuditLog

async def log_audit_event(
    db: AsyncSession,
    action: str,
    resource: str,
    actor_id: Optional[str] = None,
    actor_email: Optional[str] = None,
    resource_id: Optional[str] = None,
    ip_address: Optional[str] = None,
    metadata: Optional[dict[str, Any]] = None
) -> AuditLog:
    audit_entry = AuditLog(
        actor_id=actor_id,
        actor_email=actor_email,
        action=action,
        resource=resource,
        resource_id=resource_id,
        ip_address=ip_address,
        metadata_json=metadata or {}
    )
    db.add(audit_entry)
    return audit_entry
