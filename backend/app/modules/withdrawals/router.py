from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.core.rate_limiter import financial_rate_limiter
from app.core.audit import log_audit_event
from app.models.models import (
    Withdrawal, Wallet, PaymentDetail, User, TransactionLedger,
    TransactionType, TransactionStatus, WithdrawalStatus, Notification, CurrencyRate, UserRole
)
from app.schemas.schemas import WithdrawalRequest, WithdrawalReview, WithdrawalResponse
from app.modules.auth.deps import get_current_user, get_current_admin

router = APIRouter(prefix="/withdrawals", tags=["Withdrawals"])

MINIMUM_WITHDRAWAL_USD = Decimal("10.00")

async def notify_all_admins(db: AsyncSession, title: str, message: str, notif_type: str = "ADMIN"):
    stmt = select(User).where(User.role == UserRole.ADMIN)
    admins = (await db.execute(stmt)).scalars().all()
    for admin in admins:
        db.add(Notification(
            user_id=admin.id,
            title=title,
            message=message,
            type=notif_type
        ))


async def get_user_currency_info(db: AsyncSession, user_country: str):
    stmt = select(CurrencyRate).where(CurrencyRate.country_name == user_country)
    rate_record = (await db.execute(stmt)).scalar_one_or_none()
    if rate_record:
        return rate_record.currency_code, rate_record.exchange_rate_to_usd
    return "USD", Decimal("1.0")

@router.post("", response_model=WithdrawalResponse, status_code=status.HTTP_201_CREATED)
async def request_withdrawal(
    wd_in: WithdrawalRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    await financial_rate_limiter.check(request, key_prefix="request_withdrawal")

    amount = round(wd_in.amount_usd, 4)

    if amount < MINIMUM_WITHDRAWAL_USD:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Minimum withdrawal amount is ${MINIMUM_WITHDRAWAL_USD:.2f} USD."
        )

    # Fetch User Payment Details Snapshot
    stmt_p = select(PaymentDetail).where(PaymentDetail.user_id == current_user.id)
    payment_detail = (await db.execute(stmt_p)).scalar_one_or_none()

    if not payment_detail:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please configure your payout/payment details before requesting a withdrawal."
        )

    # Fetch Wallet & Lock for atomic balance reservation
    stmt_w = select(Wallet).where(Wallet.user_id == current_user.id)
    wallet = (await db.execute(stmt_w)).scalar_one_or_none()

    if not wallet or wallet.available_balance_usd < amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Insufficient available balance for this withdrawal request."
        )

    # Atomic Balance Reservation / Hold
    wallet.available_balance_usd -= amount
    wallet.pending_withdrawal_usd += amount
    wallet.updated_at = datetime.now(timezone.utc)

    # Exchange Rate
    currency_code, exchange_rate = await get_user_currency_info(db, current_user.country)
    amount_local = round(amount * exchange_rate, 4)

    # Create Payment Snapshot
    payment_snapshot = {
        "payment_method": payment_detail.payment_method,
        "account_name": payment_detail.account_name,
        "account_number": payment_detail.account_number,
        "bank_name": payment_detail.bank_name,
        "bank_code": payment_detail.bank_code,
        "country": payment_detail.country,
        "additional_details": payment_detail.additional_details
    }

    new_withdrawal = Withdrawal(
        user_id=current_user.id,
        amount_usd=amount,
        currency=currency_code,
        exchange_rate=exchange_rate,
        amount_local=amount_local,
        status=WithdrawalStatus.PENDING,
        payment_snapshot=payment_snapshot
    )
    db.add(new_withdrawal)
    await db.flush()

    # Ledger entry for withdrawal request hold
    txn = TransactionLedger(
        user_id=current_user.id,
        type=TransactionType.WITHDRAWAL_REQUEST,
        amount_usd=amount,
        currency=currency_code,
        exchange_rate=exchange_rate,
        amount_local=amount_local,
        status=TransactionStatus.HELD,
        reference=new_withdrawal.withdrawal_code,
        description=f"Withdrawal request of ${amount:.2f} USD pending approval",
        related_withdrawal_id=new_withdrawal.id
    )
    db.add(txn)

    # Notification
    notif = Notification(
        user_id=current_user.id,
        title="Withdrawal Requested",
        message=f"Your withdrawal request of ${amount:.2f} USD (#{new_withdrawal.withdrawal_code}) is being processed.",
        type="WITHDRAWAL"
    )
    db.add(notif)

    # Admin Notifications
    await notify_all_admins(
        db=db,
        title="New Withdrawal Requested 💸",
        message=f"Affiliate {current_user.full_name} ({current_user.email}) requested a payout of ${amount:.2f} USD (#{new_withdrawal.withdrawal_code}).",
        notif_type="ADMIN_WITHDRAWAL"
    )

    # Audit
    await log_audit_event(
        db=db,
        action="WITHDRAWAL_REQUESTED",
        resource="Withdrawal",
        actor_id=current_user.id,
        actor_email=current_user.email,
        resource_id=new_withdrawal.id,
        ip_address=request.client.host if request.client else None,
        metadata={"withdrawal_code": new_withdrawal.withdrawal_code, "amount_usd": str(amount)}
    )

    await db.commit()
    await db.refresh(new_withdrawal)

    res = WithdrawalResponse.model_validate(new_withdrawal)
    res.user_full_name = current_user.full_name
    res.user_email = current_user.email
    return res

@router.get("", response_model=list[WithdrawalResponse])
async def list_withdrawals(
    status_filter: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Withdrawal).options(selectinload(Withdrawal.user))

    if current_user.role != "ADMIN":
        stmt = stmt.where(Withdrawal.user_id == current_user.id)

    if status_filter:
        try:
            w_status = WithdrawalStatus(status_filter.upper())
            stmt = stmt.where(Withdrawal.status == w_status)
        except ValueError:
            pass

    stmt = stmt.order_by(Withdrawal.requested_at.desc())
    result = await db.execute(stmt)
    withdrawals = result.scalars().all()

    output = []
    for w in withdrawals:
        item = WithdrawalResponse.model_validate(w)
        item.user_full_name = w.user.full_name if w.user else "Unknown User"
        item.user_email = w.user.email if w.user else "Unknown Email"
        output.append(item)

    return output

@router.get("/{withdrawal_id}", response_model=WithdrawalResponse)
async def get_withdrawal(
    withdrawal_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Withdrawal).options(selectinload(Withdrawal.user)).where(Withdrawal.id == withdrawal_id)
    wd = (await db.execute(stmt)).scalar_one_or_none()

    if not wd:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Withdrawal not found.")

    if current_user.role != "ADMIN" and wd.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    item = WithdrawalResponse.model_validate(wd)
    item.user_full_name = wd.user.full_name if wd.user else "Unknown User"
    item.user_email = wd.user.email if wd.user else "Unknown Email"
    return item

@router.post("/{withdrawal_id}/review", response_model=WithdrawalResponse)
async def review_withdrawal(
    withdrawal_id: str,
    review_in: WithdrawalReview,
    request: Request,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    await financial_rate_limiter.check(request, key_prefix="review_withdrawal")

    stmt = select(Withdrawal).options(selectinload(Withdrawal.user)).where(Withdrawal.id == withdrawal_id)
    wd = (await db.execute(stmt)).scalar_one_or_none()

    if not wd:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Withdrawal not found.")

    if wd.status != WithdrawalStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Withdrawal cannot be reviewed in current status: {wd.status.value}"
        )

    if review_in.status == WithdrawalStatus.APPROVED:
        wd.status = WithdrawalStatus.APPROVED
        wd.reviewed_at = datetime.now(timezone.utc)
        wd.reviewed_by_id = admin.id

        user_notif = Notification(
            user_id=wd.user_id,
            title="Withdrawal Approved ✅",
            message=f"Your withdrawal request of ${wd.amount_usd:.2f} USD (#{wd.withdrawal_code}) has been approved and is queued for payout.",
            type="WITHDRAWAL"
        )
        db.add(user_notif)

        await log_audit_event(
            db=db,
            action="WITHDRAWAL_APPROVED",
            resource="Withdrawal",
            actor_id=admin.id,
            actor_email=admin.email,
            resource_id=wd.id,
            ip_address=request.client.host if request.client else None,
            metadata={"withdrawal_code": wd.withdrawal_code, "amount_usd": str(wd.amount_usd)}
        )

    elif review_in.status == WithdrawalStatus.REJECTED:
        wd.status = WithdrawalStatus.REJECTED
        wd.rejection_reason = review_in.rejection_reason or "Withdrawal request failed verification."
        wd.reviewed_at = datetime.now(timezone.utc)
        wd.reviewed_by_id = admin.id

        # Refund hold back to wallet available balance
        stmt_w = select(Wallet).where(Wallet.user_id == wd.user_id)
        wallet = (await db.execute(stmt_w)).scalar_one_or_none()
        if wallet:
            wallet.pending_withdrawal_usd -= wd.amount_usd
            wallet.available_balance_usd += wd.amount_usd
            wallet.updated_at = datetime.now(timezone.utc)

        # Ledger record for rejection refund
        txn = TransactionLedger(
            user_id=wd.user_id,
            type=TransactionType.WITHDRAWAL_REJECTED,
            amount_usd=wd.amount_usd,
            currency=wd.currency,
            exchange_rate=wd.exchange_rate,
            amount_local=wd.amount_local,
            status=TransactionStatus.REVERSED,
            reference=wd.withdrawal_code,
            description=f"Withdrawal request rejected. Funds returned: {wd.rejection_reason}",
            related_withdrawal_id=wd.id
        )
        db.add(txn)

        user_notif = Notification(
            user_id=wd.user_id,
            title="Withdrawal Rejected",
            message=f"Your withdrawal (#{wd.withdrawal_code}) was rejected and funds were returned to your balance. Reason: {wd.rejection_reason}",
            type="WITHDRAWAL"
        )
        db.add(user_notif)

        await log_audit_event(
            db=db,
            action="WITHDRAWAL_REJECTED",
            resource="Withdrawal",
            actor_id=admin.id,
            actor_email=admin.email,
            resource_id=wd.id,
            ip_address=request.client.host if request.client else None,
            metadata={"withdrawal_code": wd.withdrawal_code, "reason": wd.rejection_reason}
        )

    await db.commit()
    await db.refresh(wd)

    item = WithdrawalResponse.model_validate(wd)
    item.user_full_name = wd.user.full_name if wd.user else "Unknown User"
    item.user_email = wd.user.email if wd.user else "Unknown Email"
    return item

@router.post("/{withdrawal_id}/pay", response_model=WithdrawalResponse)
async def mark_withdrawal_paid(
    withdrawal_id: str,
    payment_ref: str,
    request: Request,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    await financial_rate_limiter.check(request, key_prefix="pay_withdrawal")

    stmt = select(Withdrawal).options(selectinload(Withdrawal.user)).where(Withdrawal.id == withdrawal_id)
    wd = (await db.execute(stmt)).scalar_one_or_none()

    if not wd:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Withdrawal not found.")

    if wd.status != WithdrawalStatus.APPROVED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Withdrawal must be in APPROVED status before marking as PAID."
        )

    # Transition APPROVED -> PAID
    wd.status = WithdrawalStatus.PAID
    wd.payment_reference = payment_ref.strip()
    wd.paid_at = datetime.now(timezone.utc)

    # Release pending hold balance completely
    stmt_w = select(Wallet).where(Wallet.user_id == wd.user_id)
    wallet = (await db.execute(stmt_w)).scalar_one_or_none()
    if wallet:
        wallet.pending_withdrawal_usd -= wd.amount_usd
        wallet.updated_at = datetime.now(timezone.utc)

    # Ledger entry for completed payout
    txn = TransactionLedger(
        user_id=wd.user_id,
        type=TransactionType.WITHDRAWAL_APPROVED,
        amount_usd=wd.amount_usd,
        currency=wd.currency,
        exchange_rate=wd.exchange_rate,
        amount_local=wd.amount_local,
        status=TransactionStatus.COMPLETED,
        reference=wd.payment_reference,
        description=f"Payout completed for withdrawal #{wd.withdrawal_code}. Ref: {wd.payment_reference}",
        related_withdrawal_id=wd.id
    )
    db.add(txn)

    user_notif = Notification(
        user_id=wd.user_id,
        title="Payout Dispatched! 💸",
        message=f"Your payout for withdrawal (#{wd.withdrawal_code}) has been sent! Payment Ref: {wd.payment_reference}",
        type="WITHDRAWAL"
    )
    db.add(user_notif)

    await log_audit_event(
        db=db,
        action="WITHDRAWAL_PAID",
        resource="Withdrawal",
        actor_id=admin.id,
        actor_email=admin.email,
        resource_id=wd.id,
        ip_address=request.client.host if request.client else None,
        metadata={"withdrawal_code": wd.withdrawal_code, "payment_ref": wd.payment_reference}
    )

    await db.commit()
    await db.refresh(wd)

    item = WithdrawalResponse.model_validate(wd)
    item.user_full_name = wd.user.full_name if wd.user else "Unknown User"
    item.user_email = wd.user.email if wd.user else "Unknown Email"
    return item
