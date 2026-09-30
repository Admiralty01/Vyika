from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.models.models import AuditLog, User
from app.schemas.schemas import AuditLogResponse
from app.modules.auth.deps import get_current_admin

router = APIRouter(prefix="/audit-logs", tags=["Audit Logging"])

@router.get("", response_model=list[AuditLogResponse])
async def list_audit_logs(
    action_filter: Optional[str] = None,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(AuditLog)
    if action_filter:
        stmt = stmt.where(AuditLog.action == action_filter.strip())
    stmt = stmt.order_by(AuditLog.created_at.desc()).limit(100)

    result = await db.execute(stmt)
    logs = result.scalars().all()
    return [AuditLogResponse.model_validate(log) for log in logs]
