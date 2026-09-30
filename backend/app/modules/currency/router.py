from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.audit import log_audit_event
from app.models.models import CurrencyRate, User
from app.schemas.schemas import CurrencyRateResponse, CurrencyRateUpdate
from app.modules.auth.deps import get_current_user, get_current_admin

router = APIRouter(prefix="/currencies", tags=["Currency"])

@router.get("", response_model=list[CurrencyRateResponse])
async def list_currencies(db: AsyncSession = Depends(get_db)):
    stmt = select(CurrencyRate).order_by(CurrencyRate.country_name.asc())
    result = await db.execute(stmt)
    rates = result.scalars().all()
    return [CurrencyRateResponse.model_validate(r) for r in rates]

@router.get("/my-rate", response_model=CurrencyRateResponse)
async def get_my_currency_rate(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(CurrencyRate).where(CurrencyRate.country_name == current_user.country)
    rate = (await db.execute(stmt)).scalar_one_or_none()

    if not rate:
        # Default USD
        return CurrencyRateResponse(
            id="usd-default",
            country_code="US",
            country_name=current_user.country,
            currency_code="USD",
            currency_symbol="$",
            exchange_rate_to_usd=1.0,
            updated_at=datetime.now(timezone.utc)
        )

    return CurrencyRateResponse.model_validate(rate)

@router.patch("/{rate_id}", response_model=CurrencyRateResponse)
async def update_currency_rate(
    rate_id: str,
    rate_in: CurrencyRateUpdate,
    request: Request,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(CurrencyRate).where(CurrencyRate.id == rate_id)
    rate = (await db.execute(stmt)).scalar_one_or_none()

    if not rate:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Currency rate not found.")

    old_rate = str(rate.exchange_rate_to_usd)
    rate.exchange_rate_to_usd = rate_in.exchange_rate_to_usd
    rate.updated_at = datetime.now(timezone.utc)

    await log_audit_event(
        db=db,
        action="CURRENCY_CHANGED",
        resource="CurrencyRate",
        actor_id=admin.id,
        actor_email=admin.email,
        resource_id=rate.id,
        ip_address=request.client.host if request.client else None,
        metadata={
            "country": rate.country_name,
            "currency_code": rate.currency_code,
            "old_rate": old_rate,
            "new_rate": str(rate.exchange_rate_to_usd)
        }
    )

    await db.commit()
    await db.refresh(rate)
    return CurrencyRateResponse.model_validate(rate)
