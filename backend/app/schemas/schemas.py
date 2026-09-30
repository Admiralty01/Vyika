from datetime import datetime
from decimal import Decimal
from typing import Optional, Any
from pydantic import BaseModel, EmailStr, Field, field_validator
from app.models.models import UserRole, UserStatus, ProductStatus, CommissionType, SaleStatus, WithdrawalStatus, TransactionType, TransactionStatus

# --- Auth & User Schemas ---

class UserRegister(BaseModel):
    email: EmailStr
    full_name: str = Field(..., min_length=2, max_length=255)
    password: str = Field(..., min_length=8, max_length=128)
    country: str = Field(..., min_length=2, max_length=100)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8, max_length=128)

class PasswordChange(BaseModel):
    old_password: str
    new_password: str = Field(..., min_length=8, max_length=128)

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    country: str
    role: UserRole
    status: UserStatus
    email_verified: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# --- Payment Details Schemas ---

class PaymentDetailCreate(BaseModel):
    payment_method: str = Field(..., min_length=2, max_length=100)
    account_name: str = Field(..., min_length=2, max_length=255)
    account_number: str = Field(..., min_length=2, max_length=255)
    bank_name: str = Field(..., min_length=2, max_length=255)
    bank_code: Optional[str] = None
    country: str = Field(..., min_length=2, max_length=100)
    additional_details: Optional[str] = None

class PaymentDetailResponse(BaseModel):
    id: str
    user_id: str
    payment_method: str
    account_name: str
    account_number_masked: str
    bank_name: str
    bank_code: Optional[str]
    country: str
    additional_details: Optional[str]
    updated_at: datetime

# --- Product Schemas ---

class ProductCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    description: str = Field(..., min_length=5)
    image_url: Optional[str] = None
    price_usd: Decimal = Field(..., gt=0)
    commission_type: CommissionType
    commission_value: Decimal = Field(..., gt=0)
    status: ProductStatus = ProductStatus.ACTIVE

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    price_usd: Optional[Decimal] = Field(None, gt=0)
    commission_type: Optional[CommissionType] = None
    commission_value: Optional[Decimal] = Field(None, gt=0)
    status: Optional[ProductStatus] = None

class ProductResponse(BaseModel):
    id: str
    name: str
    description: str
    image_url: Optional[str]
    price_usd: Decimal
    commission_type: CommissionType
    commission_value: Decimal
    status: ProductStatus
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# --- Sale Schemas ---

class SaleCreate(BaseModel):
    product_id: str

class SaleReview(BaseModel):
    status: SaleStatus  # APPROVED or REJECTED
    rejection_reason: Optional[str] = None

class SaleResponse(BaseModel):
    id: str
    sale_code: str
    user_id: str
    user_full_name: Optional[str] = None
    user_email: Optional[str] = None
    product_id: str
    product_name: Optional[str] = None
    product_price_usd: Decimal
    commission_type: CommissionType
    commission_value: Decimal
    calculated_commission_usd: Decimal
    currency: str
    exchange_rate: Decimal
    calculated_commission_local: Decimal
    status: SaleStatus
    rejection_reason: Optional[str]
    submitted_at: datetime
    reviewed_at: Optional[datetime]
    reviewed_by_id: Optional[str]

    class Config:
        from_attributes = True

# --- Wallet & Transaction Schemas ---

class WalletResponse(BaseModel):
    id: str
    user_id: str
    available_balance_usd: Decimal
    total_earned_usd: Decimal
    pending_withdrawal_usd: Decimal
    currency: str = "USD"
    currency_symbol: str = "$"
    exchange_rate: Decimal = Decimal("1.0")
    available_balance_local: Decimal
    total_earned_local: Decimal
    pending_withdrawal_local: Decimal
    updated_at: datetime

    class Config:
        from_attributes = True

class TransactionResponse(BaseModel):
    id: str
    transaction_code: str
    user_id: str
    type: TransactionType
    amount_usd: Decimal
    currency: str
    exchange_rate: Decimal
    amount_local: Decimal
    status: TransactionStatus
    reference: str
    description: str
    related_sale_id: Optional[str]
    related_withdrawal_id: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

# --- Withdrawal Schemas ---

class WithdrawalRequest(BaseModel):
    amount_usd: Decimal = Field(..., gt=0)

class WithdrawalReview(BaseModel):
    status: WithdrawalStatus  # APPROVED or REJECTED
    rejection_reason: Optional[str] = None
    payment_reference: Optional[str] = None

class WithdrawalResponse(BaseModel):
    id: str
    withdrawal_code: str
    user_id: str
    user_full_name: Optional[str] = None
    user_email: Optional[str] = None
    amount_usd: Decimal
    currency: str
    exchange_rate: Decimal
    amount_local: Decimal
    status: WithdrawalStatus
    rejection_reason: Optional[str]
    payment_reference: Optional[str]
    payment_snapshot: Optional[dict[str, Any]]
    requested_at: datetime
    reviewed_at: Optional[datetime]
    reviewed_by_id: Optional[str]
    paid_at: Optional[datetime]

    class Config:
        from_attributes = True

# --- Balance Adjustment Schema ---

class BalanceAdjustmentRequest(BaseModel):
    amount_usd: Decimal  # Can be positive (credit) or negative (debit)
    reason: str = Field(..., min_length=5)

# --- Currency Rate Schemas ---

class CurrencyRateResponse(BaseModel):
    id: str
    country_code: str
    country_name: str
    currency_code: str
    currency_symbol: str
    exchange_rate_to_usd: Decimal
    updated_at: datetime

    class Config:
        from_attributes = True

class CurrencyRateUpdate(BaseModel):
    exchange_rate_to_usd: Decimal = Field(..., gt=0)

# --- Notification Schemas ---

class NotificationResponse(BaseModel):
    id: str
    title: str
    message: str
    type: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True

# --- Audit Log Schema ---

class AuditLogResponse(BaseModel):
    id: str
    actor_id: Optional[str]
    actor_email: Optional[str]
    action: str
    resource: str
    resource_id: Optional[str]
    ip_address: Optional[str]
    metadata_json: Optional[dict[str, Any]]
    created_at: datetime

    class Config:
        from_attributes = True

# --- Dashboard Stats Schemas ---

class UserDashboardStats(BaseModel):
    available_balance_usd: Decimal
    total_earned_usd: Decimal
    pending_withdrawal_usd: Decimal
    total_sales_count: int
    approved_sales_count: int
    pending_sales_count: int
    currency_code: str
    currency_symbol: str
    exchange_rate: Decimal
    available_balance_local: Decimal
    total_earned_local: Decimal
    pending_withdrawal_local: Decimal

class AdminDashboardStats(BaseModel):
    total_users_count: int
    total_products_count: int
    total_sales_submitted: int
    total_pending_sales: int
    total_approved_sales: int
    total_commissions_paid_usd: Decimal
    total_pending_withdrawals_usd: Decimal
    total_withdrawals_paid_usd: Decimal
