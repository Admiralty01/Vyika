from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.core.rate_limiter import financial_rate_limiter
from app.core.audit import log_audit_event
from app.models.models import (
    User, Wallet, Product, Sale, Withdrawal, TransactionLedger,
    UserStatus, SaleStatus, WithdrawalStatus, TransactionType, TransactionStatus, Notification
)
from app.schemas.schemas import (
    UserResponse, AdminDashboardStats, BalanceAdjustmentRequest, TransactionResponse
)
from app.modules.auth.deps import get_current_admin

router = APIRouter(prefix="/admin", tags=["Admin Operations"])

@router.get("/stats", response_model=AdminDashboardStats)
async def get_admin_stats(
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    users_count = (await db.execute(select(func.count(User.id)))).scalar() or 0
    products_count = (await db.execute(select(func.count(Product.id)))).scalar() or 0
    
    sales_total = (await db.execute(select(func.count(Sale.id)))).scalar() or 0
    sales_pending = (await db.execute(select(func.count(Sale.id)).where(Sale.status == SaleStatus.PENDING))).scalar() or 0
    sales_approved = (await db.execute(select(func.count(Sale.id)).where(Sale.status == SaleStatus.APPROVED))).scalar() or 0

    # Commissions Paid USD
    commissions_paid_usd = (await db.execute(
        select(func.coalesce(func.sum(Sale.calculated_commission_usd), Decimal("0.0000")))
        .where(Sale.status == SaleStatus.APPROVED)
    )).scalar() or Decimal("0.0000")

    # Pending Withdrawals USD
    pending_wd_usd = (await db.execute(
        select(func.coalesce(func.sum(Withdrawal.amount_usd), Decimal("0.0000")))
        .where(Withdrawal.status.in_([WithdrawalStatus.PENDING, WithdrawalStatus.APPROVED]))
    )).scalar() or Decimal("0.0000")

    # Paid Withdrawals USD
    paid_wd_usd = (await db.execute(
        select(func.coalesce(func.sum(Withdrawal.amount_usd), Decimal("0.0000")))
        .where(Withdrawal.status == WithdrawalStatus.PAID)
    )).scalar() or Decimal("0.0000")

    return AdminDashboardStats(
        total_users_count=users_count,
        total_products_count=products_count,
        total_sales_submitted=sales_total,
        total_pending_sales=sales_pending,
        total_approved_sales=sales_approved,
        total_commissions_paid_usd=commissions_paid_usd,
        total_pending_withdrawals_usd=pending_wd_usd,
        total_withdrawals_paid_usd=paid_wd_usd
    )

@router.get("/users", response_model=list[UserResponse])
async def list_users(
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(User).order_by(User.created_at.desc())
    users = (await db.execute(stmt)).scalars().all()
    return [UserResponse.model_validate(u) for u in users]

@router.post("/users/{user_id}/toggle-status", response_model=UserResponse)
async def toggle_user_status(
    user_id: str,
    request: Request,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(User).where(User.id == user_id)
    user = (await db.execute(stmt)).scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    if user.id == admin.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot suspend your own admin account.")

    new_status = UserStatus.SUSPENDED if user.status == UserStatus.ACTIVE else UserStatus.ACTIVE
    user.status = new_status
    user.updated_at = datetime.now(timezone.utc)

    await log_audit_event(
        db=db,
        action="USER_SUSPENDED" if new_status == UserStatus.SUSPENDED else "USER_ACTIVATED",
        resource="User",
        actor_id=admin.id,
        actor_email=admin.email,
        resource_id=user.id,
        ip_address=request.client.host if request.client else None
    )

    await db.commit()
    await db.refresh(user)
    return UserResponse.model_validate(user)

@router.post("/users/{user_id}/balance-adjustment", response_model=TransactionResponse)
async def adjust_user_balance(
    user_id: str,
    adj_in: BalanceAdjustmentRequest,
    request: Request,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    await financial_rate_limiter.check(request, key_prefix="balance_adjustment")

    stmt = select(User).where(User.id == user_id)
    target_user = (await db.execute(stmt)).scalar_one_or_none()

    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target user not found.")

    stmt_w = select(Wallet).where(Wallet.user_id == user_id)
    wallet = (await db.execute(stmt_w)).scalar_one_or_none()

    if not wallet:
        wallet = Wallet(user_id=user_id)
        db.add(wallet)
        await db.flush()

    adjustment_amount = round(adj_in.amount_usd, 4)

    if adjustment_amount < 0 and wallet.available_balance_usd < abs(adjustment_amount):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot debit balance by ${abs(adjustment_amount):.2f}. Available balance is only ${wallet.available_balance_usd:.2f}."
        )

    wallet.available_balance_usd += adjustment_amount
    if adjustment_amount > 0:
        wallet.total_earned_usd += adjustment_amount
    wallet.updated_at = datetime.now(timezone.utc)

    txn = TransactionLedger(
        user_id=user_id,
        type=TransactionType.BALANCE_ADJUSTMENT,
        amount_usd=adjustment_amount,
        currency="USD",
        exchange_rate=Decimal("1.0"),
        amount_local=adjustment_amount,
        status=TransactionStatus.COMPLETED,
        reference=f"ADJ-{admin.id[:6]}",
        description=f"Manual Admin Balance Adjustment: {adj_in.reason.strip()}"
    )
    db.add(txn)

    notif = Notification(
        user_id=user_id,
        title="Balance Adjustment",
        message=f"An administrative balance adjustment of ${adjustment_amount:+.2f} USD was performed. Reason: {adj_in.reason.strip()}",
        type="WALLET"
    )
    db.add(notif)

    await log_audit_event(
        db=db,
        action="BALANCE_ADJUSTED",
        resource="Wallet",
        actor_id=admin.id,
        actor_email=admin.email,
        resource_id=target_user.id,
        ip_address=request.client.host if request.client else None,
        metadata={"adjustment_usd": str(adjustment_amount), "reason": adj_in.reason.strip()}
    )

    await db.commit()
    await db.refresh(txn)

    return TransactionResponse.model_validate(txn)
