import {
  User, PaymentDetail, Product, Sale, Wallet, TransactionLedger,
  Withdrawal, CurrencyRate, Notification, AuditLog, AdminStats
} from "./types";

const getApiBase = (): string => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== "undefined") {
    if (!envUrl || envUrl.includes("localhost") || envUrl.includes("127.0.0.1")) {
      return "/api/v1";
    }
    return envUrl;
  }
  return envUrl || "http://127.0.0.1:8000/api/v1";
};

class ApiClient {
  private getHeaders(): HeadersInit {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Bypass-Tunnel-Reminder": "true",
      "ngrok-skip-browser-warning": "true",
    };
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }
    return headers;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const base = getApiBase();
    const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    const url = endpoint.startsWith("http") ? endpoint : `${base}${cleanEndpoint}`;
    const headers = { ...this.getHeaders(), ...(options.headers || {}) };

    const config: RequestInit = {
      ...options,
      headers,
      credentials: "include",
    };

    const res = await fetch(url, config);
    const contentType = res.headers.get("content-type");

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      const message = errorData.detail || errorData.error?.message || "An unexpected network error occurred.";
      throw new Error(message);
    }

    if (contentType && !contentType.includes("application/json")) {
      const text = await res.text();
      if (text.includes("localtunnel") || text.includes("Bypass")) {
        throw new Error("Tunnel security prompt active. Please refresh or click 'Click to Continue'.");
      }
      throw new Error("Server returned an invalid non-JSON response.");
    }

    return res.json();
  }

  // --- Auth ---
  async register(data: any): Promise<{ access_token: string; user: User }> {
    const res = await this.request<{ access_token: string; user: User }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (res.access_token && typeof window !== "undefined") {
      localStorage.setItem("token", res.access_token);
    }
    return res;
  }

  async login(data: any): Promise<{ access_token: string; user: User }> {
    const res = await this.request<{ access_token: string; user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (res.access_token && typeof window !== "undefined") {
      localStorage.setItem("token", res.access_token);
    }
    return res;
  }

  async logout(): Promise<void> {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
    }
    await this.request("/auth/logout", { method: "POST" }).catch(() => {});
  }

  async getMe(): Promise<User> {
    return this.request<User>("/auth/me");
  }

  async changePassword(data: any): Promise<{ message: string }> {
    return this.request<{ message: string }>("/auth/password-change", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // --- Products ---
  async getProducts(status_filter?: string): Promise<Product[]> {
    const query = status_filter ? `?status_filter=${status_filter}` : "";
    return this.request<Product[]>(`/products${query}`);
  }

  async createProduct(data: any): Promise<Product> {
    return this.request<Product>("/products", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateProduct(id: string, data: any): Promise<Product> {
    return this.request<Product>(`/products/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async archiveProduct(id: string): Promise<Product> {
    return this.request<Product>(`/products/${id}`, { method: "DELETE" });
  }

  async uploadProductImage(file: File): Promise<{ image_url: string }> {
    const formData = new FormData();
    formData.append("file", file);
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";

    const base = getApiBase();
    const headers: Record<string, string> = {
      "Bypass-Tunnel-Reminder": "true",
      "ngrok-skip-browser-warning": "true",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(`${base}/products/upload-image`, {
      method: "POST",
      headers,
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Image upload failed.");
    }
    return res.json();
  }

  // --- Sales ---
  async submitSale(product_id: string): Promise<Sale> {
    return this.request<Sale>("/sales", {
      method: "POST",
      body: JSON.stringify({ product_id }),
    });
  }

  async getSales(status_filter?: string): Promise<Sale[]> {
    const query = status_filter ? `?status_filter=${status_filter}` : "";
    return this.request<Sale[]>(`/sales${query}`);
  }

  async reviewSale(sale_id: string, status: "APPROVED" | "REJECTED", rejection_reason?: string): Promise<Sale> {
    return this.request<Sale>(`/sales/${sale_id}/review`, {
      method: "POST",
      body: JSON.stringify({ status, rejection_reason }),
    });
  }

  // --- Wallet & Transactions ---
  async getWallet(): Promise<Wallet> {
    return this.request<Wallet>("/wallet");
  }

  async getTransactions(user_id?: string): Promise<TransactionLedger[]> {
    const query = user_id ? `?user_id_filter=${user_id}` : "";
    return this.request<TransactionLedger[]>(`/transactions${query}`);
  }

  // --- Withdrawals ---
  async requestWithdrawal(amount_usd: number): Promise<Withdrawal> {
    return this.request<Withdrawal>("/withdrawals", {
      method: "POST",
      body: JSON.stringify({ amount_usd }),
    });
  }

  async getWithdrawals(status_filter?: string): Promise<Withdrawal[]> {
    const query = status_filter ? `?status_filter=${status_filter}` : "";
    return this.request<Withdrawal[]>(`/withdrawals${query}`);
  }

  async reviewWithdrawal(withdrawal_id: string, status: "APPROVED" | "REJECTED", rejection_reason?: string): Promise<Withdrawal> {
    return this.request<Withdrawal>(`/withdrawals/${withdrawal_id}/review`, {
      method: "POST",
      body: JSON.stringify({ status, rejection_reason }),
    });
  }

  async payWithdrawal(withdrawal_id: string, payment_ref: string): Promise<Withdrawal> {
    return this.request<Withdrawal>(`/withdrawals/${withdrawal_id}/pay?payment_ref=${encodeURIComponent(payment_ref)}`, {
      method: "POST",
    });
  }

  // --- Payment Details ---
  async getPaymentDetails(): Promise<PaymentDetail> {
    return this.request<PaymentDetail>("/users/me/payment-details");
  }

  async updatePaymentDetails(data: any): Promise<PaymentDetail> {
    return this.request<PaymentDetail>("/users/me/payment-details", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // --- Currencies ---
  async getCurrencies(): Promise<CurrencyRate[]> {
    return this.request<CurrencyRate[]>("/currencies");
  }

  async getMyCurrency(): Promise<CurrencyRate> {
    return this.request<CurrencyRate>("/currencies/my-rate");
  }

  async updateCurrencyRate(id: string, exchange_rate_to_usd: number): Promise<CurrencyRate> {
    return this.request<CurrencyRate>(`/currencies/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ exchange_rate_to_usd }),
    });
  }

  // --- Notifications ---
  async getNotifications(): Promise<Notification[]> {
    return this.request<Notification[]>("/notifications");
  }

  async markNotificationRead(id: string): Promise<Notification> {
    return this.request<Notification>(`/notifications/${id}/read`, { method: "POST" });
  }

  async markAllNotificationsRead(): Promise<void> {
    return this.request("/notifications/read-all", { method: "POST" });
  }

  // --- Admin ---
  async getAdminStats(): Promise<AdminStats> {
    return this.request<AdminStats>("/admin/stats");
  }

  async getAdminUsers(): Promise<User[]> {
    return this.request<User[]>("/admin/users");
  }

  async toggleUserStatus(userId: string): Promise<User> {
    return this.request<User>(`/admin/users/${userId}/toggle-status`, { method: "POST" });
  }

  async adjustUserBalance(userId: string, amount_usd: number, reason: string): Promise<TransactionLedger> {
    return this.request<TransactionLedger>(`/admin/users/${userId}/balance-adjustment`, {
      method: "POST",
      body: JSON.stringify({ amount_usd, reason }),
    });
  }

  async getAuditLogs(action_filter?: string): Promise<AuditLog[]> {
    const query = action_filter ? `?action_filter=${action_filter}` : "";
    return this.request<AuditLog[]>(`/audit-logs${query}`);
  }
}

export const api = new ApiClient();
