from decimal import Decimal
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.models.models import Wallet, TransactionLedger, User, CurrencyRate
from app.schemas.schemas import WalletResponse, TransactionResponse
from app.modules.auth.deps import get_current_user

router = APIRouter(tags=["Wallet & Transactions"])

async def get_user_currency_info(db: AsyncSession, user_country: str):
    stmt = select(CurrencyRate).where(CurrencyRate.country_name == user_country)
    rate_record = (await db.execute(stmt)).scalar_one_or_none()
    if rate_record:
        return rate_record.currency_code, rate_record.currency_symbol, rate_record.exchange_rate_to_usd
    return "USD", "$", Decimal("1.0")

@router.get("/wallet", response_model=WalletResponse)
async def get_wallet_overview(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Wallet).where(Wallet.user_id == current_user.id)
    wallet = (await db.execute(stmt)).scalar_one_or_none()

    if not wallet:
        wallet = Wallet(user_id=current_user.id)
        db.add(wallet)
        await db.commit()
        await db.refresh(wallet)

    c_code, c_symbol, ex_rate = await get_user_currency_info(db, current_user.country)

    bal_local = round(wallet.available_balance_usd * ex_rate, 2)
    earned_local = round(wallet.total_earned_usd * ex_rate, 2)
    pending_local = round(wallet.pending_withdrawal_usd * ex_rate, 2)

    return WalletResponse(
        id=wallet.id,
        user_id=wallet.user_id,
        available_balance_usd=wallet.available_balance_usd,
        total_earned_usd=wallet.total_earned_usd,
        pending_withdrawal_usd=wallet.pending_withdrawal_usd,
        currency=c_code,
        currency_symbol=c_symbol,
        exchange_rate=ex_rate,
        available_balance_local=bal_local,
        total_earned_local=earned_local,
        pending_withdrawal_local=pending_local,
        updated_at=wallet.updated_at
    )

@router.get("/transactions", response_model=list[TransactionResponse])
async def list_transactions(
    user_id_filter: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(TransactionLedger)

    if current_user.role != "ADMIN":
        # IDOR protection: User can ONLY see their transactions
        stmt = stmt.where(TransactionLedger.user_id == current_user.id)
    elif user_id_filter:
        stmt = stmt.where(TransactionLedger.user_id == user_id_filter)

    stmt = stmt.order_by(TransactionLedger.created_at.desc())
    result = await db.execute(stmt)
    txns = result.scalars().all()
    return [TransactionResponse.model_validate(t) for t in txns]
