from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.audit import log_audit_event
from app.models.models import User, PaymentDetail
from app.schemas.schemas import UserResponse, PaymentDetailCreate, PaymentDetailResponse
from app.modules.auth.deps import get_current_user

router = APIRouter(prefix="/users", tags=["Users"])

def mask_account_number(acc_num: str) -> str:
    if not acc_num or len(acc_num) <= 4:
        return "****"
    return "*" * (len(acc_num) - 4) + acc_num[-4:]

@router.get("/me", response_model=UserResponse)
async def get_my_profile(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)

@router.get("/me/payment-details", response_model=PaymentDetailResponse)
async def get_my_payment_details(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(PaymentDetail).where(PaymentDetail.user_id == current_user.id)
    pd = (await db.execute(stmt)).scalar_one_or_none()

    if not pd:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No payment details found. Please create payment details."
        )

    return PaymentDetailResponse(
        id=pd.id,
        user_id=pd.user_id,
        payment_method=pd.payment_method,
        account_name=pd.account_name,
        account_number_masked=mask_account_number(pd.account_number),
        bank_name=pd.bank_name,
        bank_code=pd.bank_code,
        country=pd.country,
        additional_details=pd.additional_details,
        updated_at=pd.updated_at
    )

@router.post("/me/payment-details", response_model=PaymentDetailResponse)
async def update_my_payment_details(
    pd_in: PaymentDetailCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(PaymentDetail).where(PaymentDetail.user_id == current_user.id)
    existing_pd = (await db.execute(stmt)).scalar_one_or_none()

    if existing_pd:
        existing_pd.payment_method = pd_in.payment_method.strip()
        existing_pd.account_name = pd_in.account_name.strip()
        existing_pd.account_number = pd_in.account_number.strip()
        existing_pd.bank_name = pd_in.bank_name.strip()
        existing_pd.bank_code = pd_in.bank_code.strip() if pd_in.bank_code else None
        existing_pd.country = pd_in.country.strip()
        existing_pd.additional_details = pd_in.additional_details.strip() if pd_in.additional_details else None
        existing_pd.updated_at = datetime.now(timezone.utc)
        target_pd = existing_pd
    else:
        target_pd = PaymentDetail(
            user_id=current_user.id,
            payment_method=pd_in.payment_method.strip(),
            account_name=pd_in.account_name.strip(),
            account_number=pd_in.account_number.strip(),
            bank_name=pd_in.bank_name.strip(),
            bank_code=pd_in.bank_code.strip() if pd_in.bank_code else None,
            country=pd_in.country.strip(),
            additional_details=pd_in.additional_details.strip() if pd_in.additional_details else None
        )
        db.add(target_pd)

    await log_audit_event(
        db=db,
        action="PAYMENT_DETAILS_CHANGED",
        resource="PaymentDetail",
        actor_id=current_user.id,
        actor_email=current_user.email,
        resource_id=current_user.id,
        ip_address=request.client.host if request.client else None
    )

    await db.commit()
    await db.refresh(target_pd)

    return PaymentDetailResponse(
        id=target_pd.id,
        user_id=target_pd.user_id,
        payment_method=target_pd.payment_method,
        account_name=target_pd.account_name,
        account_number_masked=mask_account_number(target_pd.account_number),
        bank_name=target_pd.bank_name,
        bank_code=target_pd.bank_code,
        country=target_pd.country,
        additional_details=target_pd.additional_details,
        updated_at=target_pd.updated_at
    )
