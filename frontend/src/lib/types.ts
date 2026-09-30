export type UserRole = "USER" | "ADMIN";
export type UserStatus = "ACTIVE" | "SUSPENDED";
export type ProductStatus = "ACTIVE" | "INACTIVE" | "ARCHIVED";
export type CommissionType = "PERCENTAGE" | "FIXED";
export type SaleStatus = "PENDING" | "APPROVED" | "SOLD" | "REJECTED";
export type WithdrawalStatus = "PENDING" | "APPROVED" | "REJECTED" | "PAID";
export type TransactionType = "COMMISSION" | "WITHDRAWAL_REQUEST" | "WITHDRAWAL_APPROVED" | "WITHDRAWAL_REJECTED" | "BALANCE_ADJUSTMENT";
export type TransactionStatus = "COMPLETED" | "HELD" | "REVERSED";

export interface User {
  id: string;
  email: string;
  full_name: string;
  country: string;
  role: UserRole;
  status: UserStatus;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface PaymentDetail {
  id: string;
  user_id: string;
  payment_method: string;
  account_name: string;
  account_number_masked: string;
  bank_name: string;
  bank_code?: string;
  country: string;
  additional_details?: string;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  image_url?: string;
  price_usd: number;
  commission_type: CommissionType;
  commission_value: number;
  status: ProductStatus;
  created_at: string;
  updated_at: string;
}

export interface Sale {
  id: string;
  sale_code: string;
  user_id: string;
  user_full_name?: string;
  user_email?: string;
  product_id: string;
  product_name?: string;
  product_price_usd: number;
  commission_type: CommissionType;
  commission_value: number;
  calculated_commission_usd: number;
  currency: string;
  exchange_rate: number;
  calculated_commission_local: number;
  status: SaleStatus;
  rejection_reason?: string;
  submitted_at: string;
  reviewed_at?: string;
  reviewed_by_id?: string;
}

export interface Wallet {
  id: string;
  user_id: string;
  available_balance_usd: number;
  total_earned_usd: number;
  pending_withdrawal_usd: number;
  currency: string;
  currency_symbol: string;
  exchange_rate: number;
  available_balance_local: number;
  total_earned_local: number;
  pending_withdrawal_local: number;
  updated_at: string;
}

export interface TransactionLedger {
  id: string;
  transaction_code: string;
  user_id: string;
  type: TransactionType;
  amount_usd: number;
  currency: string;
  exchange_rate: number;
  amount_local: number;
  status: TransactionStatus;
  reference: string;
  description: string;
  related_sale_id?: string;
  related_withdrawal_id?: string;
  created_at: string;
}

export interface Withdrawal {
  id: string;
  withdrawal_code: string;
  user_id: string;
  user_full_name?: string;
  user_email?: string;
  amount_usd: number;
  currency: string;
  exchange_rate: number;
  amount_local: number;
  status: WithdrawalStatus;
  rejection_reason?: string;
  payment_reference?: string;
  payment_snapshot?: Record<string, any>;
  requested_at: string;
  reviewed_at?: string;
  reviewed_by_id?: string;
  paid_at?: string;
}

export interface CurrencyRate {
  id: string;
  country_code: string;
  country_name: string;
  currency_code: string;
  currency_symbol: string;
  exchange_rate_to_usd: number;
  updated_at: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor_id?: string;
  actor_email?: string;
  action: string;
  resource: string;
  resource_id?: string;
  ip_address?: string;
  metadata_json?: Record<string, any>;
  created_at: string;
}

export interface AdminStats {
  total_users_count: number;
  total_products_count: number;
  total_sales_submitted: number;
  total_pending_sales: number;
  total_approved_sales: number;
  total_commissions_paid_usd: number;
  total_pending_withdrawals_usd: number;
  total_withdrawals_paid_usd: number;
}
