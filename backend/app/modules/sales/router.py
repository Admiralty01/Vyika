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
    Sale, Product, ProductStatus, User, Wallet, TransactionLedger,
    TransactionType, TransactionStatus, SaleStatus, Notification, CurrencyRate, UserRole
)
from app.schemas.schemas import SaleCreate, SaleReview, SaleResponse
from app.modules.auth.deps import get_current_user, get_current_admin

router = APIRouter(prefix="/sales", tags=["Sales"])

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

@router.post("", response_model=SaleResponse, status_code=status.HTTP_201_CREATED)
async def submit_sale(
    sale_in: SaleCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    await financial_rate_limiter.check(request, key_prefix="submit_sale")

    # Fetch Product
    stmt = select(Product).where(Product.id == sale_in.product_id)
    product = (await db.execute(stmt)).scalar_one_or_none()

    if not product or product.status != ProductStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Product is not available for sale."
        )

    # Calculate commission using stored product snapshot terms
    if product.commission_type == "PERCENTAGE":
        commission_usd = (product.price_usd * product.commission_value) / Decimal("100")
    else:
        commission_usd = product.commission_value

    # Round to 4 decimal places
    commission_usd = round(commission_usd, 4)

    # Lookup country exchange rate snapshot
    currency_code, exchange_rate = await get_user_currency_info(db, current_user.country)
    commission_local = round(commission_usd * exchange_rate, 4)

    new_sale = Sale(
        user_id=current_user.id,
        product_id=product.id,
        product_price_usd=product.price_usd,
        commission_type=product.commission_type,
        commission_value=product.commission_value,
        calculated_commission_usd=commission_usd,
        currency=currency_code,
        exchange_rate=exchange_rate,
        calculated_commission_local=commission_local,
        status=SaleStatus.PENDING
    )
    db.add(new_sale)
    await db.flush()

    # User Notification
    user_notif = Notification(
        user_id=current_user.id,
        title="Sale Submitted",
        message=f"Your sale submission for '{product.name}' (#{new_sale.sale_code}) is pending admin review.",
        type="SALE"
    )
    db.add(user_notif)

    # Admin Notifications for all Administrators
    await notify_all_admins(
        db=db,
        title="New Sale Submitted 🛒",
        message=f"Affiliate {current_user.full_name} ({current_user.email}) submitted a sale for '{product.name}' (#{new_sale.sale_code}).",
        notif_type="ADMIN_SALE"
    )

    await log_audit_event(
        db=db,
        action="SALE_SUBMITTED",
        resource="Sale",
        actor_id=current_user.id,
        actor_email=current_user.email,
        resource_id=new_sale.id,
        ip_address=request.client.host if request.client else None,
        metadata={"sale_code": new_sale.sale_code, "commission_usd": str(commission_usd)}
    )

    await db.commit()
    await db.refresh(new_sale)

    # Prepare response
    res = SaleResponse.model_validate(new_sale)
    res.product_name = product.name
    res.user_full_name = current_user.full_name
    res.user_email = current_user.email
    return res

@router.get("", response_model=list[SaleResponse])
async def list_sales(
    status_filter: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Sale).options(selectinload(Sale.product), selectinload(Sale.user))

    if current_user.role != "ADMIN":
        # IDOR Protection: User can ONLY see their own sales
        stmt = stmt.where(Sale.user_id == current_user.id)
    
    if status_filter:
        try:
            s_status = SaleStatus(status_filter.upper())
            stmt = stmt.where(Sale.status == s_status)
        except ValueError:
            pass

    stmt = stmt.order_by(Sale.submitted_at.desc())
    result = await db.execute(stmt)
    sales = result.scalars().all()

    output = []
    for s in sales:
        item = SaleResponse.model_validate(s)
        item.product_name = s.product.name if s.product else "Unknown Product"
        item.user_full_name = s.user.full_name if s.user else "Unknown User"
        item.user_email = s.user.email if s.user else "Unknown Email"
        output.append(item)

    return output

@router.get("/{sale_id}", response_model=SaleResponse)
async def get_sale(
    sale_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Sale).options(selectinload(Sale.product), selectinload(Sale.user)).where(Sale.id == sale_id)
    sale = (await db.execute(stmt)).scalar_one_or_none()

    if not sale:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sale not found.")

    # IDOR check
    if current_user.role != "ADMIN" and sale.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    item = SaleResponse.model_validate(sale)
    item.product_name = sale.product.name if sale.product else "Unknown Product"
    item.user_full_name = sale.user.full_name if sale.user else "Unknown User"
    item.user_email = sale.user.email if sale.user else "Unknown Email"
    return item

@router.post("/{sale_id}/review", response_model=SaleResponse)
async def review_sale(
    sale_id: str,
    review_in: SaleReview,
    request: Request,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    await financial_rate_limiter.check(request, key_prefix="review_sale")

    # Lock sale row / query within transaction
    stmt = select(Sale).options(selectinload(Sale.product), selectinload(Sale.user)).where(Sale.id == sale_id)
    sale = (await db.execute(stmt)).scalar_one_or_none()

    if not sale:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sale not found.")

    # Prevent duplicate approval/review
    if sale.status != SaleStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Sale has already been reviewed (current status: {sale.status.value})."
        )

    if review_in.status in (SaleStatus.APPROVED, SaleStatus.SOLD):
        # 1. Update Sale Status
        sale.status = SaleStatus.APPROVED  # Marked as SOLD / APPROVED
        sale.reviewed_at = datetime.now(timezone.utc)
        sale.reviewed_by_id = admin.id

        # 2. Get User Wallet
        stmt_w = select(Wallet).where(Wallet.user_id == sale.user_id)
        wallet = (await db.execute(stmt_w)).scalar_one_or_none()
        if not wallet:
            wallet = Wallet(user_id=sale.user_id)
            db.add(wallet)
            await db.flush()

        # 3. Credit Wallet Balance & Total Earned atomically
        wallet.available_balance_usd += sale.calculated_commission_usd
        wallet.total_earned_usd += sale.calculated_commission_usd
        wallet.updated_at = datetime.now(timezone.utc)

        # 4. Add Transaction Ledger Entry
        txn = TransactionLedger(
            user_id=sale.user_id,
            type=TransactionType.COMMISSION,
            amount_usd=sale.calculated_commission_usd,
            currency=sale.currency,
            exchange_rate=sale.exchange_rate,
            amount_local=sale.calculated_commission_local,
            status=TransactionStatus.COMPLETED,
            reference=sale.sale_code,
            description=f"Commission credited for sale of {sale.product.name if sale.product else 'Product'}",
            related_sale_id=sale.id
        )
        db.add(txn)

        # 5. User Notification
        user_notif = Notification(
            user_id=sale.user_id,
            title="Sale Approved! 🎉",
            message=f"Your sale (#{sale.sale_code}) was approved! ${sale.calculated_commission_usd:.2f} USD commission has been credited to your wallet.",
            type="COMMISSION"
        )
        db.add(user_notif)

        # 6. Audit Event
        await log_audit_event(
            db=db,
            action="SALE_APPROVED",
            resource="Sale",
            actor_id=admin.id,
            actor_email=admin.email,
            resource_id=sale.id,
            ip_address=request.client.host if request.client else None,
            metadata={
                "sale_code": sale.sale_code,
                "credited_commission_usd": str(sale.calculated_commission_usd),
                "user_id": sale.user_id
            }
        )

    elif review_in.status == SaleStatus.REJECTED:
        sale.status = SaleStatus.REJECTED
        sale.rejection_reason = review_in.rejection_reason or "Sale did not meet verification criteria."
        sale.reviewed_at = datetime.now(timezone.utc)
        sale.reviewed_by_id = admin.id

        user_notif = Notification(
            user_id=sale.user_id,
            title="Sale Rejected",
            message=f"Your sale submission (#{sale.sale_code}) was rejected. Reason: {sale.rejection_reason}",
            type="SALE"
        )
        db.add(user_notif)

        await log_audit_event(
            db=db,
            action="SALE_REJECTED",
            resource="Sale",
            actor_id=admin.id,
            actor_email=admin.email,
            resource_id=sale.id,
            ip_address=request.client.host if request.client else None,
            metadata={"sale_code": sale.sale_code, "reason": sale.rejection_reason}
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid review status. Must be APPROVED or REJECTED."
        )

    await db.commit()
    await db.refresh(sale)

    item = SaleResponse.model_validate(sale)
    item.product_name = sale.product.name if sale.product else "Unknown Product"
    item.user_full_name = sale.user.full_name if sale.user else "Unknown User"
    item.user_email = sale.user.email if sale.user else "Unknown Email"
    return item
