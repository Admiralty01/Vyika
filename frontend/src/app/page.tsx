"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  TrendingUp, Wallet as WalletIcon, ShoppingBag, ArrowUpRight, CheckCircle2,
  XCircle, Clock, Shield, Bell, User as UserIcon, LogOut, DollarSign,
  PlusCircle, RefreshCw, AlertCircle, Search, Filter, Lock, Building,
  CreditCard, Eye, EyeOff, Layers, Activity, Settings, Check, ChevronRight,
  LayoutDashboard, Package, Receipt, ArrowDownRight, Users, FileText, Globe,
  Menu, X, ChevronDown
} from "lucide-react";
import { api } from "@/lib/api";
import {
  User, Product, Sale, Wallet, TransactionLedger, Withdrawal,
  CurrencyRate, Notification, AuditLog, AdminStats, PaymentDetail
} from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import VyikaLogo from "@/components/VyikaLogo";

const COUNTRIES = [
  { code: "pg", name: "Papua New Guinea", flagUrl: "https://flagcdn.com/w40/pg.png" },
  { code: "au", name: "Australia", flagUrl: "https://flagcdn.com/w40/au.png" },
  { code: "vu", name: "Vanuatu", flagUrl: "https://flagcdn.com/w40/vu.png" },
  { code: "fj", name: "Fiji", flagUrl: "https://flagcdn.com/w40/fj.png" },
  { code: "ws", name: "Samoa", flagUrl: "https://flagcdn.com/w40/ws.png" },
  { code: "za", name: "South Africa", flagUrl: "https://flagcdn.com/w40/za.png" },
  { code: "us", name: "United States", flagUrl: "https://flagcdn.com/w40/us.png" },
  { code: "gb", name: "United Kingdom", flagUrl: "https://flagcdn.com/w40/gb.png" },
  { code: "ng", name: "Nigeria", flagUrl: "https://flagcdn.com/w40/ng.png" },
  { code: "eu", name: "European Union", flagUrl: "https://flagcdn.com/w40/eu.png" },
  { code: "ke", name: "Kenya", flagUrl: "https://flagcdn.com/w40/ke.png" },
  { code: "ca", name: "Canada", flagUrl: "https://flagcdn.com/w40/ca.png" },
];

export default function Home({ initialAuthView = "landing" }: { initialAuthView?: "landing" | "login" | "register" }) {
  const queryClient = useQueryClient();
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [currencyMode, setCurrencyMode] = useState<"LOCAL" | "USD">("LOCAL");
  const [authView, setAuthView] = useState<"landing" | "login" | "register">(initialAuthView);
  const [authMode, setAuthMode] = useState<"login" | "register">(initialAuthView === "register" ? "register" : "login");
  const [authError, setAuthError] = useState<string>("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  // Search & Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [salesFilter, setSalesFilter] = useState<string>("ALL");

  // Auth Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [country, setCountry] = useState("Papua New Guinea");
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);

  // Modals & Action States
  const [saleProductModal, setSaleProductModal] = useState<Product | null>(null);
  const [rejectModalSale, setRejectModalSale] = useState<Sale | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const [rejectModalWithdrawal, setRejectModalWithdrawal] = useState<Withdrawal | null>(null);
  const [payModalWithdrawal, setPayModalWithdrawal] = useState<Withdrawal | null>(null);
  const [paymentRefInput, setPaymentRefInput] = useState("");

  const [showNewProductModal, setShowNewProductModal] = useState(false);
  const [newProdName, setNewProdName] = useState("");
  const [newProdDesc, setNewProdDesc] = useState("");
  const [newProdPrice, setNewProdPrice] = useState("99.00");
  const [newProdCommType, setNewProdCommType] = useState<"PERCENTAGE" | "FIXED">("PERCENTAGE");
  const [newProdCommVal, setNewProdCommVal] = useState("25.00");
  const [newProdImage, setNewProdImage] = useState("https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=800&auto=format&fit=crop");

  const [wdAmount, setWdAmount] = useState("");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payMethod, setPayMethod] = useState("Bank Transfer");
  const [payAccName, setPayAccName] = useState("");
  const [payAccNum, setPayAccNum] = useState("");
  const [payBankName, setPayBankName] = useState("");
  const [payBankCode, setPayBankCode] = useState("");

  const [adjUserModal, setAdjUserModal] = useState<User | null>(null);
  const [adjAmount, setAdjAmount] = useState("");
  const [adjReason, setAdjReason] = useState("");
  const [mounted, setMounted] = useState(false);

  // Hydrate Auth Token & Mounting
  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem("token");
    if (token) {
      setAuthToken(token);
    }
  }, []);

  // Fetch Current User Profile
  const { data: meData } = useQuery({
    queryKey: ["me", authToken],
    queryFn: () => api.getMe(),
    enabled: !!authToken,
  });

  useEffect(() => {
    if (meData) {
      setCurrentUser(meData);
    }
  }, [meData]);

  // Data Queries
  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: () => api.getProducts(),
    enabled: !!currentUser,
  });

  const { data: sales = [] } = useQuery({
    queryKey: ["sales"],
    queryFn: () => api.getSales(),
    enabled: !!currentUser,
  });

  const { data: wallet } = useQuery({
    queryKey: ["wallet"],
    queryFn: () => api.getWallet(),
    enabled: !!currentUser,
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => api.getTransactions(),
    enabled: !!currentUser,
  });

  const { data: withdrawals = [] } = useQuery({
    queryKey: ["withdrawals"],
    queryFn: () => api.getWithdrawals(),
    enabled: !!currentUser,
  });

  const { data: paymentDetail } = useQuery({
    queryKey: ["paymentDetail"],
    queryFn: () => api.getPaymentDetails(),
    enabled: !!currentUser,
  });

  const { data: adminStats } = useQuery({
    queryKey: ["adminStats"],
    queryFn: () => api.getAdminStats(),
    enabled: !!currentUser && currentUser.role === "ADMIN",
  });

  const { data: adminUsers = [] } = useQuery({
    queryKey: ["adminUsers"],
    queryFn: () => api.getAdminUsers(),
    enabled: !!currentUser && currentUser.role === "ADMIN",
  });

  const { data: auditLogs = [] } = useQuery({
    queryKey: ["auditLogs"],
    queryFn: () => api.getAuditLogs(),
    enabled: !!currentUser && currentUser.role === "ADMIN",
  });

  // Mutations
  const loginMutation = useMutation({
    mutationFn: (data: any) => api.login(data),
    onSuccess: (res) => {
      setAuthToken(res.access_token);
      setCurrentUser(res.user);
      setAuthError("");
    },
    onError: (err: any) => setAuthError(err.message || "Invalid email or password."),
  });

  const registerMutation = useMutation({
    mutationFn: (data: any) => api.register(data),
    onSuccess: (res) => {
      setAuthToken(res.access_token);
      setCurrentUser(res.user);
      setAuthError("");
    },
    onError: (err: any) => setAuthError(err.message || "Registration failed."),
  });

  const submitSaleMutation = useMutation({
    mutationFn: (prodId: string) => api.submitSale(prodId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      setSaleProductModal(null);
    },
  });

  const requestWithdrawalMutation = useMutation({
    mutationFn: (amountUsd: number) => api.requestWithdrawal(amountUsd),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["withdrawals"] });
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      setWdAmount("");
    },
    onError: (err: any) => alert(err.message || "Withdrawal failed."),
  });

  const reviewSaleMutation = useMutation({
    mutationFn: ({ saleId, status, reason }: { saleId: string; status: "APPROVED" | "REJECTED"; reason?: string }) =>
      api.reviewSale(saleId, status, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["adminStats"] });
      setRejectModalSale(null);
    },
  });

  const reviewWithdrawalMutation = useMutation({
    mutationFn: ({ wdId, status, reason }: { wdId: string; status: "APPROVED" | "REJECTED"; reason?: string }) =>
      api.reviewWithdrawal(wdId, status, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["withdrawals"] });
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["adminStats"] });
      setRejectModalWithdrawal(null);
    },
  });

  const payWithdrawalMutation = useMutation({
    mutationFn: ({ wdId, ref }: { wdId: string; ref: string }) => api.payWithdrawal(wdId, ref),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["withdrawals"] });
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["adminStats"] });
      setPayModalWithdrawal(null);
      setPaymentRefInput("");
    },
  });

  const savePaymentDetailsMutation = useMutation({
    mutationFn: (data: any) => api.updatePaymentDetails(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["paymentDetail"] });
      setShowPaymentModal(false);
    },
  });

  const toggleUserMutation = useMutation({
    mutationFn: (userId: string) => api.toggleUserStatus(userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["adminUsers"] }),
  });

  const adjustBalanceMutation = useMutation({
    mutationFn: ({ userId, amount, reason }: { userId: string; amount: number; reason: string }) =>
      api.adjustUserBalance(userId, amount, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      setAdjUserModal(null);
      setAdjAmount("");
      setAdjReason("");
    },
  });

  const handleLogout = () => {
    api.logout();
    setAuthToken(null);
    setCurrentUser(null);
  };

  const formatMoney = (amountUsd: number) => {
    if (!wallet) return formatCurrency(amountUsd, "USD", "$");
    if (currencyMode === "LOCAL" && wallet.currency !== "USD") {
      const localVal = amountUsd * wallet.exchange_rate;
      return formatCurrency(localVal, wallet.currency, wallet.currency_symbol);
    }
    return formatCurrency(amountUsd, "USD", "$");
  };

  const formatCleanId = (code: string, type: "SALE" | "WITHDRAWAL" | "TXN" = "TXN") => {
    if (!code) return "TXN-0000";
    const cleaned = code.replace(/^(#|SL-|WD-|TX-)+/gi, "");
    return `${type === "WITHDRAWAL" ? "WD" : "TXN"}-${cleaned}`;
  };

  const getCountryFlagUrl = (countryName?: string) => {
    const match = COUNTRIES.find((c) => c.name.toLowerCase() === countryName?.toLowerCase());
    return match ? match.flagUrl : "https://flagcdn.com/w40/pg.png";
  };

  // --- RENDER LANDING PAGE OR ISOLATED AUTH SCREEN ---
  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!currentUser) {
    // --- 1. DEDICATED MARKETING LANDING PAGE VIEW ---
    if (authView === "landing") {
      return (
        <div className="min-h-screen bg-slate-50/70 text-slate-900 font-sans flex flex-col justify-between overflow-x-hidden">
          {/* TOP NAVBAR (ONLY ON LANDING PAGE) */}
          <header className="w-full bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-40">
            <div className="max-w-7xl mx-auto px-3.5 sm:px-6 py-3.5 flex items-center justify-between">
              {/* Logo */}
              <div className="flex items-center justify-center gap-2 cursor-pointer transition-all duration-200 hover:opacity-90" onClick={() => setAuthView("landing")}>
                <VyikaLogo variant="dark" className="h-7 sm:h-9 md:h-10 w-auto" />
              </div>

              {/* Nav Links */}
              <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
                <a href="#home" className="text-blue-600 font-bold transition">Home</a>
                <a href="#products" className="hover:text-slate-900 transition">Products</a>
                <a href="#commissions" className="hover:text-slate-900 transition">Commissions</a>
                <a href="#payouts" className="hover:text-slate-900 transition">Wallet & Payouts</a>
                <a href="#about" className="hover:text-slate-900 transition">About</a>
                <a href="#faq" className="hover:text-slate-900 transition">FAQ</a>
              </nav>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  onClick={() => { setAuthMode("login"); setAuthView("login"); setAuthError(""); }}
                  className="px-4 sm:px-5 py-2 text-xs sm:text-sm font-bold rounded-full transition-all bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 cursor-pointer"
                >
                  Login
                </button>
                <button
                  onClick={() => { setAuthMode("register"); setAuthView("register"); setAuthError(""); }}
                  className="px-4 sm:px-5 py-2 text-xs sm:text-sm font-bold rounded-full transition-all bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 cursor-pointer"
                >
                  Sign Up
                </button>
              </div>
            </div>
          </header>

          {/* HERO & MARKETING LANDING SECTIONS */}
          <main className="flex-1">
            {/* HERO SECTION */}
            <section id="home" className="max-w-7xl mx-auto px-4 sm:px-6 pt-12 pb-16 md:pt-20 md:pb-24 text-center space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-bold shadow-2xs">
                <span>✨ Commercial Digital Sales & Commission SaaS Platform</span>
              </div>

              <div className="space-y-4 max-w-4xl mx-auto">
                <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-slate-900 tracking-tight leading-tight">
                  Empowering Digital Sales & <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500">Instant Multi-Currency</span> Commissions
                </h1>
                <p className="text-sm sm:text-lg md:text-xl text-slate-600 font-medium max-w-2xl mx-auto leading-relaxed">
                  Promote high-converting digital products, log your affiliate sales, track multi-currency commissions in real time, and execute local bank payouts effortlessly.
                </p>
              </div>

              {/* HERO CTA BUTTONS */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
                <button
                  onClick={() => { setAuthMode("register"); setAuthView("register"); setAuthError(""); }}
                  className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-extrabold rounded-2xl transition-all shadow-lg shadow-blue-600/25 text-base flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Create Free Account</span>
                  <ChevronRight className="w-5 h-5" />
                </button>
                <button
                  onClick={() => { setAuthMode("login"); setAuthView("login"); setAuthError(""); }}
                  className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-slate-50 text-slate-800 font-bold rounded-2xl border border-slate-200/90 transition-all shadow-sm text-base flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Sign In to Dashboard</span>
                </button>
              </div>

              {/* PLATFORM METRICS */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto pt-10">
                <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-sm space-y-1">
                  <div className="text-2xl sm:text-3xl font-black text-blue-600">$250,000+</div>
                  <div className="text-xs font-bold text-slate-500">Total Sales Processed</div>
                </div>
                <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-sm space-y-1">
                  <div className="text-2xl sm:text-3xl font-black text-slate-900">25% - 50%</div>
                  <div className="text-xs font-bold text-slate-500">Commission Rates</div>
                </div>
                <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-sm space-y-1">
                  <div className="text-2xl sm:text-3xl font-black text-blue-600">12+</div>
                  <div className="text-xs font-bold text-slate-500">Countries Supported</div>
                </div>
                <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-sm space-y-1">
                  <div className="text-2xl sm:text-3xl font-black text-slate-900">24/7</div>
                  <div className="text-xs font-bold text-slate-500">Automated Payouts</div>
                </div>
              </div>
            </section>

            {/* FEATURED PRODUCTS CATALOG SHOWCASE */}
            <section id="products" className="max-w-7xl mx-auto px-4 sm:px-6 py-16 border-t border-slate-200/60">
              <div className="text-center space-y-2 mb-12">
                <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900">High-Converting Digital Catalog</h2>
                <p className="text-xs sm:text-base text-slate-500 max-w-xl mx-auto font-medium">Select top-tier courses, templates, and AI toolkits to promote and start earning automated commissions.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  { name: "Social Media Ads Masterclass 2026", price: "$99.00", comm: "25% Commission", desc: "Meta Ads, TikTok campaigns, pixel tracking, and high-ROI ad copy formulas.", img: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=800&auto=format&fit=crop" },
                  { name: "SEO Mastery & Link Building Vault", price: "$149.00", comm: "30% Commission", desc: "Technical SEO audits, backlink prospecting outreach, and topical authority maps.", img: "https://images.unsplash.com/photo-1571721795195-a2ca2d3370a9?q=80&w=800&auto=format&fit=crop" },
                  { name: "High-Ticket Email Marketing Funnels", price: "$199.00", comm: "$50.00 Fixed", desc: "Plug-and-play email sequences, lead magnets, and automation workflows.", img: "https://images.unsplash.com/photo-1563986768609-322da13575f3?q=80&w=800&auto=format&fit=crop" },
                ].map((item, idx) => (
                  <div key={idx} className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all group">
                    <div className="h-44 overflow-hidden relative">
                      <img src={item.img} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      <div className="absolute top-3 right-3 bg-blue-600 text-white text-xs font-extrabold px-3 py-1 rounded-full shadow-md">
                        {item.comm}
                      </div>
                    </div>
                    <div className="p-6 space-y-3">
                      <h3 className="font-extrabold text-base text-slate-900 line-clamp-1">{item.name}</h3>
                      <p className="text-xs text-slate-500 font-medium line-clamp-2 leading-relaxed">{item.desc}</p>
                      <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                        <span className="text-lg font-black text-slate-900">{item.price}</span>
                        <button
                          onClick={() => { setAuthMode("register"); setAuthView("register"); setAuthError(""); }}
                          className="px-4 py-2 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-800 text-xs font-bold rounded-xl transition-all cursor-pointer"
                        >
                          Promote Product
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* COMMISSIONS & PAYOUTS SECTION */}
            <section id="commissions" className="max-w-7xl mx-auto px-4 sm:px-6 py-16 border-t border-slate-200/60">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="space-y-4">
                  <span className="text-xs font-extrabold uppercase text-blue-600 tracking-wider">Multi-Currency Wallet</span>
                  <h2 className="text-2xl sm:text-4xl font-black text-slate-900 leading-tight">Instant Local Currency Conversion & Payouts</h2>
                  <p className="text-xs sm:text-base text-slate-600 font-medium leading-relaxed">
                    Earn in USD or view your wallet balance dynamically converted into Papua New Guinea Kina (PGK), Australian Dollars (AUD), Nigerian Naira (NGN), South African Rand (ZAR), and 8+ other local currencies with automatic rate calculation.
                  </p>
                  <div className="pt-2 flex items-center gap-3">
                    <button
                      onClick={() => { setAuthMode("register"); setAuthView("register"); setAuthError(""); }}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs sm:text-sm transition-all shadow-md shadow-blue-600/20 cursor-pointer"
                    >
                      Start Earning Now
                    </button>
                  </div>
                </div>

                <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <div className="font-bold text-sm text-slate-700">Supported Countries</div>
                    <span className="text-xs font-bold text-blue-600">12+ Active Regions</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { name: "Papua New Guinea", flag: "https://flagcdn.com/w40/pg.png", code: "PGK K" },
                      { name: "Australia", flag: "https://flagcdn.com/w40/au.png", code: "AUD A$" },
                      { name: "Nigeria", flag: "https://flagcdn.com/w40/ng.png", code: "NGN ₦" },
                      { name: "South Africa", flag: "https://flagcdn.com/w40/za.png", code: "ZAR R" },
                      { name: "United States", flag: "https://flagcdn.com/w40/us.png", code: "USD $" },
                      { name: "United Kingdom", flag: "https://flagcdn.com/w40/gb.png", code: "GBP £" },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                        <img src={item.flag} alt="" className="w-5 h-3.5 object-cover rounded-xs border border-slate-200 shrink-0" />
                        <div className="truncate">
                          <div className="text-xs font-bold text-slate-800 truncate">{item.name}</div>
                          <div className="text-[10px] font-mono text-slate-500 font-semibold">{item.code}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* FAQ SECTION */}
            <section id="faq" className="max-w-4xl mx-auto px-4 sm:px-6 py-16 border-t border-slate-200/60">
              <div className="text-center space-y-2 mb-10">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Frequently Asked Questions</h2>
                <p className="text-xs sm:text-sm text-slate-500 font-medium">Everything you need to know about Vyika affiliate sales & payouts.</p>
              </div>

              <div className="space-y-4">
                {[
                  { q: "How do I log sales and earn commissions?", a: "Simply navigate to the Products Catalog in your dashboard, select a product, and submit your sale log. Once verified, your commission is credited directly to your wallet." },
                  { q: "What currencies can I withdraw in?", a: "You can withdraw directly into local bank accounts across Papua New Guinea (PGK), Australia (AUD), Nigeria (NGN), South Africa (ZAR), United States (USD), United Kingdom (GBP), and more." },
                  { q: "How long do withdrawal requests take?", a: "Withdrawal requests are processed by platform administrators typically within 24 to 48 hours directly into your registered bank account." },
                ].map((faq, i) => (
                  <div key={i} className="p-5 bg-white border border-slate-200/80 rounded-2xl space-y-2">
                    <div className="font-bold text-sm text-slate-900">{faq.q}</div>
                    <div className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">{faq.a}</div>
                  </div>
                ))}
              </div>
            </section>
          </main>

          {/* LANDING PAGE FOOTER */}
          <footer className="py-8 bg-white border-t border-slate-200/80 text-center text-xs text-slate-500 font-medium">
            <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <VyikaLogo variant="dark" className="h-6 w-auto" />
                <span>© {new Date().getFullYear()} Vyika Platform. All rights reserved.</span>
              </div>
              <div className="flex items-center gap-6 text-slate-600 font-semibold">
                <button onClick={() => setAuthView("landing")} className="hover:text-slate-900 cursor-pointer">Landing</button>
                <button onClick={() => { setAuthMode("login"); setAuthView("login"); }} className="hover:text-slate-900 cursor-pointer">Login</button>
                <button onClick={() => { setAuthMode("register"); setAuthView("register"); }} className="hover:text-slate-900 cursor-pointer">Sign Up</button>
              </div>
            </div>
          </footer>
        </div>
      );
    }

    // --- 2. ISOLATED AUTHENTICATION VIEW (NO PUBLIC MARKETING HEADER, NO NAV LINKS) ---
    return (
      <div className="min-h-screen bg-slate-50/70 text-slate-900 font-sans flex flex-col justify-center items-center py-4 sm:py-8 px-3.5 sm:px-6 overflow-x-hidden">
        {/* MAIN ISOLATED AUTH CARD */}
        <main className="w-full max-w-full sm:max-w-md md:max-w-lg bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-5 sm:p-7 md:p-8 shadow-xl shadow-slate-200/60 space-y-4 sm:space-y-5 mx-auto my-auto">
          {/* IN-CARD CENTERED LOGO BRAND HEADER */}
          <div className="flex justify-center items-center pt-1 pb-1 cursor-pointer transition-transform hover:scale-[1.02]" onClick={() => setAuthView("landing")}>
            <VyikaLogo variant="dark" className="h-12 sm:h-14 md:h-16 w-auto filter drop-shadow-sm" />
          </div>

          {/* Segmented Auth Mode Switcher */}
          <div className="grid grid-cols-2 p-1 bg-slate-100/80 rounded-2xl border border-slate-200/60">
            <button
              type="button"
              onClick={() => { setAuthMode("login"); setAuthView("login"); setAuthError(""); }}
              className={`py-2 text-xs sm:text-sm font-extrabold rounded-xl transition-all cursor-pointer ${
                authMode === "login"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-900 font-semibold"
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => { setAuthMode("register"); setAuthView("register"); setAuthError(""); }}
              className={`py-2 text-xs sm:text-sm font-extrabold rounded-xl transition-all cursor-pointer ${
                authMode === "register"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-900 font-semibold"
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Titles */}
          <div className="text-center space-y-1">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
              {authMode === "login" ? "Welcome Back" : "Create Your Account"}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-sm mx-auto">
              {authMode === "login"
                ? "Log in to manage your orders, services, commission, and wallet"
                : "Join Vyika to start boosting your digital marketing & sales presence"}
            </p>
          </div>

          {authError && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{authError}</span>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (authMode === "login") {
                loginMutation.mutate({ email, password });
              } else {
                registerMutation.mutate({ email, password, full_name: fullName, country });
              }
            }}
            className="space-y-3.5 sm:space-y-4"
          >
            {authMode === "register" && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-extrabold tracking-wider uppercase text-slate-600 mb-1">
                      Full Name
                    </label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full bg-slate-50/80 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 sm:py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white text-xs sm:text-sm transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-extrabold tracking-wider uppercase text-slate-600 mb-1">
                      Country
                    </label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setCountryDropdownOpen(!countryDropdownOpen)}
                        className="w-full bg-slate-50/80 border border-slate-200 rounded-xl pl-3.5 pr-3 py-2.5 sm:py-3 text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white text-xs sm:text-sm transition-all text-left font-semibold flex items-center justify-between shadow-sm cursor-pointer"
                      >
                        <span className="flex items-center gap-2.5 truncate">
                          <img
                            src={getCountryFlagUrl(country)}
                            alt={country}
                            className="w-5 h-3.5 object-cover rounded-xs border border-slate-200/90 shrink-0 shadow-2xs"
                          />
                          <span className="truncate text-slate-800 font-bold">{country}</span>
                        </span>
                        <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${countryDropdownOpen ? "rotate-180 text-blue-600" : ""}`} />
                      </button>

                      {countryDropdownOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setCountryDropdownOpen(false)}
                          />
                          <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-slate-200/90 rounded-2xl shadow-xl shadow-slate-300/40 p-1.5 max-h-56 overflow-y-auto no-scrollbar space-y-0.5 animate-in fade-in duration-150">
                            {COUNTRIES.map((c) => {
                              const isSelected = country === c.name;
                              return (
                                <button
                                  key={c.code}
                                  type="button"
                                  onClick={() => {
                                    setCountry(c.name);
                                    setCountryDropdownOpen(false);
                                  }}
                                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all text-left cursor-pointer ${
                                    isSelected
                                      ? "bg-blue-50 text-blue-600 font-bold"
                                      : "text-slate-700 hover:bg-slate-100/80 hover:text-slate-900"
                                  }`}
                                >
                                  <span className="flex items-center gap-2.5 truncate">
                                    <img
                                      src={c.flagUrl}
                                      alt={c.name}
                                      className="w-5 h-3.5 object-cover rounded-xs border border-slate-200/90 shrink-0 shadow-2xs"
                                    />
                                    <span className="truncate">{c.name}</span>
                                  </span>
                                  {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                                </button>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-[11px] font-extrabold tracking-wider uppercase text-slate-600 mb-1">
                {authMode === "login" ? "Username or Email" : "Email Address"}
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={authMode === "login" ? "Enter username or email" : "you@example.com"}
                  className="w-full bg-slate-50/80 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 sm:py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white text-xs sm:text-sm transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-extrabold tracking-wider uppercase text-slate-600">
                  Password
                </label>
                {authMode === "login" && (
                  <a href="#forgot" className="text-xs text-blue-600 font-semibold hover:underline">
                    Forgot password?
                  </a>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50/80 border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 sm:py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white text-xs sm:text-sm transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4 text-slate-600" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {authMode === "register" && (
                <p className="text-[11px] text-slate-400 font-medium mt-1">Must be at least 8 characters long</p>
              )}
            </div>

            {authMode === "login" && (
              <div className="flex items-center gap-2 pt-0.5">
                <input
                  type="checkbox"
                  id="remember"
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <label htmlFor="remember" className="text-xs font-semibold text-slate-600 cursor-pointer select-none">
                  Remember this device
                </label>
              </div>
            )}

            <button
              type="submit"
              disabled={loginMutation.isPending || registerMutation.isPending}
              className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold min-h-[46px] sm:min-h-[50px] py-3.5 rounded-xl transition-all shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 text-sm sm:text-base mt-2 cursor-pointer"
            >
              {(loginMutation.isPending || registerMutation.isPending) && (
                <RefreshCw className="w-4 h-4 animate-spin" />
              )}
              <span>{authMode === "login" ? "Login to Vyika" : "Create Account"}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </form>

          <div className="text-center pt-2 border-t border-slate-100 space-y-2">
            {authMode === "login" ? (
              <p className="text-xs text-slate-600 font-medium">
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={() => { setAuthMode("register"); setAuthView("register"); setAuthError(""); }}
                  className="text-blue-600 font-bold hover:underline cursor-pointer"
                >
                  Create an account
                </button>
              </p>
            ) : (
              <p className="text-xs text-slate-600 font-medium">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => { setAuthMode("login"); setAuthView("login"); setAuthError(""); }}
                  className="text-blue-600 font-bold hover:underline cursor-pointer"
                >
                  Sign in
                </button>
              </p>
            )}

            <div>
              <button
                type="button"
                onClick={() => setAuthView("landing")}
                className="text-xs text-slate-500 hover:text-slate-800 font-semibold cursor-pointer transition-all inline-flex items-center gap-1"
              >
                ← Back to Vyika Landing Page
              </button>
            </div>
          </div>
        </main>

        {/* AUTH FOOTER */}
        <footer className="py-4 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} Vyika Platform. All rights reserved.
        </footer>
      </div>
    );
  }

  // --- RENDER MAIN SAAS DASHBOARD (SIDEBAR & HEADER LAYOUT) ---
  const filteredSales = sales.filter((s) => {
    if (salesFilter !== "ALL" && s.status !== salesFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        s.sale_code.toLowerCase().includes(q) ||
        (s.product_name && s.product_name.toLowerCase().includes(q)) ||
        (s.user_full_name && s.user_full_name.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex relative">
      {/* MOBILE SLIDE-OVER NAVIGATION DRAWER */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setMobileMenuOpen(false)}></div>
          <div className="relative bg-white w-72 max-w-full flex flex-col justify-between p-6 shadow-2xl z-50 border-r border-slate-200 space-y-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <VyikaLogo variant="dark" className="h-8 w-auto" />
                <button onClick={() => setMobileMenuOpen(false)} className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 transition">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="space-y-1.5">
                <button
                  onClick={() => { setActiveTab("dashboard"); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-sm transition ${
                    activeTab === "dashboard" ? "bg-blue-600 text-white shadow-xs" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4 shrink-0" />
                  Dashboard
                </button>
                <button
                  onClick={() => { setActiveTab("products"); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-sm transition ${
                    activeTab === "products" ? "bg-blue-600 text-white shadow-xs" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Package className="w-4 h-4 shrink-0" />
                  Products Catalog
                </button>
                <button
                  onClick={() => { setActiveTab("sales"); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-sm transition ${
                    activeTab === "sales" ? "bg-blue-600 text-white shadow-xs" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Receipt className="w-4 h-4 shrink-0" />
                  My Sales Log
                </button>
                <button
                  onClick={() => { setActiveTab("wallet"); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-sm transition ${
                    activeTab === "wallet" ? "bg-blue-600 text-white shadow-xs" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <WalletIcon className="w-4 h-4 shrink-0" />
                  Wallet & Payouts
                </button>

                {currentUser.role === "ADMIN" && (
                  <div className="pt-3 space-y-1">
                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-3 pb-1">
                      Platform Governance
                    </div>
                    <button
                      onClick={() => { setActiveTab("admin-reviews"); setMobileMenuOpen(false); }}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-sm transition ${
                        activeTab === "admin" || activeTab === "admin-reviews" ? "bg-amber-600 text-white shadow-xs" : "text-amber-800 bg-amber-50/80 border border-amber-200/80"
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      Pending Reviews
                    </button>
                    <button
                      onClick={() => { setActiveTab("admin-users"); setMobileMenuOpen(false); }}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-sm transition ${
                        activeTab === "admin-users" ? "bg-amber-600 text-white shadow-xs" : "text-amber-800 bg-amber-50/80 border border-amber-200/80"
                      }`}
                    >
                      <Users className="w-4 h-4 shrink-0" />
                      User Management
                    </button>
                  </div>
                )}
              </nav>
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-100">
              {wallet && (
                <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
                  <div className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Available Wallet</div>
                  <div className="text-xl font-extrabold text-slate-900 font-mono">
                    {formatMoney(wallet.available_balance_usd)}
                  </div>
                </div>
              )}
              <button
                onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-rose-600 hover:bg-rose-50 rounded-xl transition text-xs font-bold border border-rose-100"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DESKTOP STICKY FIXED SIDEBAR NAVIGATION */}
      <aside className="fixed inset-y-0 left-0 h-screen w-64 bg-white border-r border-slate-100/60 flex flex-col justify-between hidden md:flex shrink-0 z-30">
        <div className="p-6 space-y-6 overflow-y-auto no-scrollbar">
          <div className="flex items-center pb-3 border-b border-slate-100">
            <VyikaLogo variant="dark" className="h-8 md:h-9 w-auto" />
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-sm transition ${
                activeTab === "dashboard" ? "bg-blue-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab("products")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-sm transition ${
                activeTab === "products" ? "bg-blue-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <Package className="w-4 h-4 shrink-0" />
              <span>Products Catalog</span>
            </button>

            <button
              onClick={() => setActiveTab("sales")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-sm transition ${
                activeTab === "sales" ? "bg-blue-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <Receipt className="w-4 h-4 shrink-0" />
              <span>My Sales Log</span>
            </button>

            <button
              onClick={() => setActiveTab("wallet")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-sm transition ${
                activeTab === "wallet" ? "bg-blue-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <WalletIcon className="w-4 h-4 shrink-0" />
              <span>Wallet & Payouts</span>
            </button>

            {currentUser.role === "ADMIN" && (
              <div className="pt-4 space-y-1">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-3 pb-1">
                  Platform Governance
                </div>
                <button
                  onClick={() => setActiveTab("admin-reviews")}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-sm transition ${
                    activeTab === "admin" || activeTab === "admin-reviews"
                      ? "bg-amber-600 text-white shadow-xs"
                      : "text-amber-800 bg-amber-50/80 border border-amber-200/80 hover:bg-amber-100"
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Pending Reviews</span>
                </button>

                <button
                  onClick={() => setActiveTab("admin-users")}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-sm transition ${
                    activeTab === "admin-users"
                      ? "bg-amber-600 text-white shadow-xs"
                      : "text-amber-800 bg-amber-50/80 border border-amber-200/80 hover:bg-amber-100"
                  }`}
                >
                  <Users className="w-4 h-4 shrink-0" />
                  <span>User Management</span>
                </button>
              </div>
            )}
          </nav>
        </div>

        {/* Sidebar Bottom Google Cloud Console Inspired Wallet Widget */}
        <div className="p-5 border-t border-slate-100 space-y-3">
          {wallet && (
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-2 font-sans transition hover:border-slate-300">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Available Wallet</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Live Account Balance"></span>
              </div>
              <div className="text-2xl font-extrabold text-slate-900 font-mono tracking-tight">
                {formatMoney(wallet.available_balance_usd)}
              </div>
              <div className="pt-1 flex items-center justify-between text-[11px]">
                <span className="text-slate-500 font-mono">Currency: <strong className="text-slate-700">{wallet.currency}</strong></span>
                <button
                  onClick={() => setActiveTab("wallet")}
                  className="text-blue-600 hover:text-blue-700 font-bold hover:underline flex items-center gap-0.5"
                >
                  Withdraw <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* RIGHT MAIN WORKSPACE */}
      <div className="flex-1 flex flex-col min-w-0 md:pl-64">
        {/* HEADER TOP BAR */}
        <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between shadow-xs sticky top-0 z-30">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition"
              title="Open Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 capitalize">
              {activeTab === "admin"
                ? "Platform Control Center"
                : activeTab === "admin-reviews"
                ? "Pending Reviews"
                : activeTab === "admin-users"
                ? "User Management"
                : activeTab === "sales"
                ? "My Sales Log"
                : activeTab === "products"
                ? "Products Catalog"
                : activeTab === "wallet"
                ? "Wallet & Payouts"
                : "Dashboard"}{" "}
              Workspace
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {/* Currency Selector Toggle */}
            {wallet && wallet.currency !== "USD" && (
              <button
                onClick={() => setCurrencyMode(currencyMode === "LOCAL" ? "USD" : "LOCAL")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100/80 hover:bg-slate-200/80 border border-slate-200 text-xs font-mono font-bold text-slate-700 transition"
                title="Toggle Display Currency"
              >
                <DollarSign className="w-3.5 h-3.5 text-blue-600" />
                <span>Display: {currencyMode === "LOCAL" ? wallet.currency : "USD"}</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab("products")}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition shadow-xs flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" />
              <span className="hidden sm:inline">New Sale</span>
            </button>

            {/* TOP-RIGHT INTERACTIVE PROFILE DROPDOWN */}
            <div className="relative">
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2 p-1 pl-2.5 pr-2 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200/80 transition text-slate-800"
              >
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  {currentUser.full_name.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs font-bold text-slate-800 max-w-[100px] sm:max-w-[130px] truncate hidden sm:inline">
                  {currentUser.full_name}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${profileDropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {/* Profile Dropdown Menu */}
              {profileDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setProfileDropdownOpen(false)}></div>
                  <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50 divide-y divide-slate-100 text-slate-900">
                    <div className="px-4 py-3 space-y-1">
                      <div className="font-bold text-sm text-slate-900 truncate">{currentUser.full_name}</div>
                      <div className="text-xs text-slate-500 truncate">{currentUser.email}</div>
                      <div className="pt-1">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono font-bold rounded-md bg-blue-50 text-blue-700 border border-blue-200 uppercase">
                          {currentUser.role === "ADMIN" ? (
                            "Administrator"
                          ) : (
                            <>
                              <span>Affiliate</span>
                              <span>•</span>
                              <img
                                src={getCountryFlagUrl(currentUser.country)}
                                alt=""
                                className="w-3.5 h-2.5 object-cover rounded-xs border border-slate-200 shrink-0"
                              />
                              <span>{currentUser.country}</span>
                            </>
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="py-1">
                      <button
                        onClick={() => { setShowPaymentModal(true); setProfileDropdownOpen(false); }}
                        className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition"
                      >
                        <Building className="w-4 h-4 text-slate-400" />
                        <span>Configure Payout Account</span>
                      </button>
                    </div>

                    <div className="py-1">
                      <button
                        onClick={() => { handleLogout(); setProfileDropdownOpen(false); }}
                        className="w-full text-left px-4 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition"
                      >
                        <LogOut className="w-4 h-4 text-rose-600" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* MOBILE NAV TAB TAPE */}
        <div className="md:hidden bg-white border-b border-slate-200 p-2 flex overflow-x-auto gap-2 text-xs">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap ${
              activeTab === "dashboard" ? "bg-blue-600 text-white" : "text-slate-600"
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab("products")}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap ${
              activeTab === "products" ? "bg-blue-600 text-white" : "text-slate-600"
            }`}
          >
            Products
          </button>
          <button
            onClick={() => setActiveTab("sales")}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap ${
              activeTab === "sales" ? "bg-blue-600 text-white" : "text-slate-600"
            }`}
          >
            My Sales
          </button>
          <button
            onClick={() => setActiveTab("wallet")}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap ${
              activeTab === "wallet" ? "bg-blue-600 text-white" : "text-slate-600"
            }`}
          >
            Wallet
          </button>
          {currentUser.role === "ADMIN" && (
            <button
              onClick={() => setActiveTab("admin")}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap text-amber-800 bg-amber-50 ${
                activeTab === "admin" ? "bg-amber-600 text-white" : ""
              }`}
            >
              Admin Suite
            </button>
          )}
        </div>

        {/* WORKSPACE CONTENT AREA */}
        <main className="flex-1 p-6 md:p-8 space-y-8 max-w-7xl w-full mx-auto">
          {/* --- TAB 1: DASHBOARD --- */}
          {activeTab === "dashboard" && (
            <div className="space-y-8">
              {/* Material Style Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Available Balance */}
                <div className="bg-emerald-50/50 border border-emerald-100/90 rounded-3xl p-6 relative overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 group">
                  <div className="flex items-center justify-between text-slate-600 text-xs font-bold uppercase tracking-wider mb-4">
                    <span>Available Balance</span>
                    <div className="p-3 rounded-2xl bg-emerald-500 text-white shadow-md shadow-emerald-500/30 group-hover:scale-110 transition-transform">
                      <WalletIcon className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
                    {formatMoney(wallet?.available_balance_usd || 0)}
                  </div>
                  <p className="text-xs text-emerald-700 font-semibold mt-2.5 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Ready for withdrawal payout
                  </p>
                </div>

                {/* Total Earned */}
                <div className="bg-blue-50/50 border border-blue-100/90 rounded-3xl p-6 relative overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 group">
                  <div className="flex items-center justify-between text-slate-600 text-xs font-bold uppercase tracking-wider mb-4">
                    <span>Total Earned</span>
                    <div className="p-3 rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-600/30 group-hover:scale-110 transition-transform">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
                    {formatMoney(wallet?.total_earned_usd || 0)}
                  </div>
                  <p className="text-xs text-blue-700 font-semibold mt-2.5 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Approved commission earnings
                  </p>
                </div>

                {/* Pending Withdrawals */}
                <div className="bg-amber-50/50 border border-amber-100/90 rounded-3xl p-6 relative overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 group">
                  <div className="flex items-center justify-between text-slate-600 text-xs font-bold uppercase tracking-wider mb-4">
                    <span>Pending Withdrawals</span>
                    <div className="p-3 rounded-2xl bg-amber-500 text-white shadow-md shadow-amber-500/30 group-hover:scale-110 transition-transform">
                      <Clock className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
                    {formatMoney(wallet?.pending_withdrawal_usd || 0)}
                  </div>
                  <p className="text-xs text-amber-700 font-semibold mt-2.5 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    Reserved balance holds
                  </p>
                </div>

                {/* Total Sales (Sold) */}
                <div className="bg-purple-50/50 border border-purple-100/90 rounded-3xl p-6 relative overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 group">
                  <div className="flex items-center justify-between text-slate-600 text-xs font-bold uppercase tracking-wider mb-4">
                    <span>Total Sales</span>
                    <div className="p-3 rounded-2xl bg-purple-600 text-white shadow-md shadow-purple-600/30 group-hover:scale-110 transition-transform">
                      <ShoppingBag className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
                    {sales.filter((s) => s.status === "APPROVED" || s.status === "SOLD").length}
                  </div>
                  <p className="text-xs text-purple-700 font-semibold mt-2.5">
                    {sales.filter((s) => s.status === "APPROVED" || s.status === "SOLD").length} Approved • {sales.filter((s) => s.status === "PENDING").length} Pending
                  </p>
                </div>
              </div>

              {/* Recent Sales & Ledger Overview */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Sales Box */}
                <div className="bg-white border border-slate-200/80 rounded-3xl p-7 space-y-5 shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-blue-100 text-blue-600">
                        <ShoppingBag className="w-4 h-4" />
                      </div>
                      Recent Sales Submissions
                    </h3>
                    <button
                      onClick={() => setActiveTab("sales")}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 hover:underline"
                    >
                      View All <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  {sales.length === 0 ? (
                    <div className="text-center py-10 text-slate-500 text-sm font-medium">
                      No sales submitted yet. Go to <button onClick={() => setActiveTab("products")} className="text-blue-600 font-bold underline">Products</button> to submit a sale!
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {sales.slice(0, 4).map((s) => (
                        <div key={s.id} className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/70 hover:bg-slate-100/80 transition-all flex items-center justify-between">
                          <div>
                            <div className="font-bold text-sm text-slate-900">{s.product_name}</div>
                            <div className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                              <span className="font-mono font-bold text-slate-700">{formatCleanId(s.sale_code, "SALE")}</span>
                              <span>•</span>
                              <span>{formatDate(s.submitted_at)}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-mono font-extrabold text-emerald-600 text-sm">
                              +{formatMoney(s.calculated_commission_usd)}
                            </div>
                            <span className={`inline-block px-2.5 py-0.5 text-[10px] font-bold rounded-full mt-1.5 ${
                              s.status === "APPROVED" ? "bg-emerald-100 text-emerald-700 border border-emerald-200" :
                              s.status === "REJECTED" ? "bg-rose-100 text-rose-700 border border-rose-200" :
                              "bg-amber-100 text-amber-700 border border-amber-200"
                            }`}>
                              {s.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Transactions Box */}
                <div className="bg-white border border-slate-200/80 rounded-3xl p-7 space-y-5 shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-emerald-100 text-emerald-600">
                        <Activity className="w-4 h-4" />
                      </div>
                      Transaction Ledger
                    </h3>
                    <button
                      onClick={() => setActiveTab("wallet")}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 hover:underline"
                    >
                      Wallet Details <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  {transactions.length === 0 ? (
                    <div className="text-center py-10 text-slate-500 text-sm font-medium">
                      No financial transaction history recorded yet.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {transactions.slice(0, 4).map((t) => (
                        <div key={t.id} className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/70 hover:bg-slate-100/80 transition-all flex items-center justify-between">
                          <div>
                            <div className="font-bold text-sm text-slate-900">{t.description}</div>
                            <div className="text-xs text-slate-500 font-mono mt-1">Ref: {formatCleanId(t.reference, "TXN")}</div>
                          </div>
                          <div className="text-right">
                            <div className={`font-mono font-extrabold text-sm ${
                              t.type === "COMMISSION" || (t.type === "BALANCE_ADJUSTMENT" && t.amount_usd > 0)
                                ? "text-emerald-600"
                                : "text-amber-600"
                            }`}>
                              {t.amount_usd > 0 ? "+" : ""}{formatMoney(t.amount_usd)}
                            </div>
                            <span className="text-[10px] text-slate-500 block mt-1 font-medium">{formatDate(t.created_at)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* --- TAB 2: PRODUCTS --- */}
          {activeTab === "products" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Digital Marketing Products</h2>
                <p className="text-sm text-slate-500 font-medium">Select a product to submit sales and earn automated commissions.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {products.map((prod) => (
                  <div key={prod.id} className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden flex flex-col hover:border-blue-300 hover:shadow-xl transition-all duration-300 shadow-sm group">
                    {prod.image_url && (
                      <div className="h-48 bg-slate-100 relative overflow-hidden">
                        <img src={prod.image_url} alt={prod.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        <div className="absolute top-3.5 right-3.5 px-3 py-1 rounded-full bg-blue-600/90 backdrop-blur-md text-white text-xs font-mono font-bold shadow-md">
                          {prod.commission_type === "PERCENTAGE" ? `${prod.commission_value}% Commission` : `$${prod.commission_value} Fixed`}
                        </div>
                      </div>
                    )}
                    <div className="p-6 flex-1 flex flex-col justify-between space-y-5">
                      <div>
                        <h3 className="font-bold text-lg text-slate-900 group-hover:text-blue-600 transition-colors">{prod.name}</h3>
                        <p className="text-xs text-slate-500 mt-2 leading-relaxed font-medium">{prod.description}</p>
                      </div>
                      <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Price</span>
                          <span className="text-xl font-extrabold text-slate-900 font-mono">${prod.price_usd} USD</span>
                        </div>
                        <button
                          onClick={() => setSaleProductModal(prod)}
                          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-2xl transition shadow-md shadow-blue-600/20 flex items-center gap-2 hover:scale-105 active:scale-95"
                        >
                          <ShoppingBag className="w-4 h-4" />
                          Submit Sale
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* --- TAB 3: SALES HUB --- */}
          {activeTab === "sales" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Sales & Commissions Log</h2>
                  <p className="text-sm text-slate-500 font-medium">Track all your submitted sales, verification status, and earned commissions.</p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search sale code..."
                      className="bg-white border border-slate-200/90 rounded-2xl pl-10 pr-4 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600 shadow-xs"
                    />
                  </div>
                  <select
                    value={salesFilter}
                    onChange={(e) => setSalesFilter(e.target.value)}
                    className="bg-white border border-slate-200/90 rounded-2xl px-4 py-2 text-xs font-bold text-slate-700 focus:outline-none shadow-xs"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="PENDING">Pending Only</option>
                    <option value="APPROVED">Approved / Sold</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                </div>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-700">
                    <thead className="bg-slate-50/80 text-slate-500 text-xs uppercase tracking-wider font-bold border-b border-slate-200/80">
                      <tr>
                        <th className="px-6 py-4">Sale Code</th>
                        <th className="px-6 py-4">Product</th>
                        <th className="px-6 py-4">Price</th>
                        <th className="px-6 py-4">Commission Terms</th>
                        <th className="px-6 py-4">Calculated Commission</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Submitted At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {filteredSales.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                            No matching sales recorded.
                          </td>
                        </tr>
                      ) : (
                        filteredSales.map((s) => (
                          <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-6 py-4 font-mono font-bold text-slate-900">{formatCleanId(s.sale_code, "SALE")}</td>
                            <td className="px-6 py-4 font-bold text-slate-800">{s.product_name}</td>
                            <td className="px-6 py-4 font-mono">${s.product_price_usd} USD</td>
                            <td className="px-6 py-4">
                              {s.commission_type === "PERCENTAGE" ? `${s.commission_value}%` : `$${s.commission_value} Fixed`}
                            </td>
                            <td className="px-6 py-4 font-mono font-extrabold text-emerald-600">
                              +{formatMoney(s.calculated_commission_usd)}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                                s.status === "APPROVED" ? "bg-emerald-100 text-emerald-700 border border-emerald-200" :
                                s.status === "REJECTED" ? "bg-rose-100 text-rose-700 border border-rose-200" :
                                "bg-amber-100 text-amber-700 border border-amber-200"
                              }`}>
                                {s.status}
                              </span>
                              {s.rejection_reason && (
                                <div className="text-[10px] text-rose-600 font-bold mt-1">{s.rejection_reason}</div>
                              )}
                            </td>
                            <td className="px-6 py-4 text-xs text-slate-500">{formatDate(s.submitted_at)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* --- TAB 4: WALLET & PAYOUTS --- */}
          {activeTab === "wallet" && (
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Wallet & Withdrawal Payouts</h2>
                  <p className="text-sm text-slate-500 font-medium">Manage payment details, request earnings withdrawals, and inspect ledger.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Payment Details & Request Form */}
                <div className="space-y-6 lg:col-span-1">
                  {/* Payment Account Card */}
                  <div className="bg-white border border-slate-200/80 rounded-3xl p-6 space-y-4 shadow-sm">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <h3 className="font-bold text-slate-900 flex items-center gap-2.5 text-xs uppercase tracking-wider">
                        <div className="p-2 rounded-xl bg-blue-100 text-blue-600">
                          <CreditCard className="w-4 h-4" />
                        </div>
                        Payout Account
                      </h3>
                      <button
                        onClick={() => setShowPaymentModal(true)}
                        className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline"
                      >
                        {paymentDetail ? "Edit Account" : "+ Add Account"}
                      </button>
                    </div>

                    {paymentDetail ? (
                      <div className="space-y-2 text-xs font-medium">
                        <div><span className="text-slate-500">Method:</span> <span className="text-slate-900 font-bold">{paymentDetail.payment_method}</span></div>
                        <div><span className="text-slate-500">Bank:</span> <span className="text-slate-900 font-bold">{paymentDetail.bank_name}</span></div>
                        <div><span className="text-slate-500">Account Name:</span> <span className="text-slate-900 font-bold">{paymentDetail.account_name}</span></div>
                        <div><span className="text-slate-500">Account Number:</span> <span className="font-mono text-emerald-600 font-extrabold">{paymentDetail.account_number_masked}</span></div>
                      </div>
                    ) : (
                      <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 p-3.5 rounded-2xl font-semibold">
                        ⚠️ Payment details not configured. Add bank details before requesting payouts.
                      </div>
                    )}
                  </div>

                  {/* Request Withdrawal Box */}
                  <div className="bg-white border border-slate-200/80 rounded-3xl p-7 space-y-4 shadow-sm">
                    <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-emerald-100 text-emerald-600">
                        <ArrowUpRight className="w-4 h-4" />
                      </div>
                      Request Withdrawal
                    </h3>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const amt = parseFloat(wdAmount);
                        if (isNaN(amt) || amt <= 0) return alert("Enter a valid amount.");
                        requestWithdrawalMutation.mutate(amt);
                      }}
                      className="space-y-3"
                    >
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">Amount (USD $)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="10.00"
                          required
                          value={wdAmount}
                          onChange={(e) => setWdAmount(e.target.value)}
                          placeholder="Min $10.00 USD"
                          className="w-full bg-slate-50/80 border border-slate-200 rounded-2xl px-4 py-2.5 text-slate-900 font-mono placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white text-sm transition-all"
                        />
                      </div>

                      {wallet && (
                        <div className="text-[11px] text-slate-500 flex justify-between font-mono">
                          <span>Max Available:</span>
                          <span className="text-emerald-600 font-bold">{formatMoney(wallet.available_balance_usd)}</span>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={requestWithdrawalMutation.isPending || !paymentDetail}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-2xl transition text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20"
                      >
                        {requestWithdrawalMutation.isPending && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                        Submit Payout Request
                      </button>
                    </form>
                  </div>
                </div>

                {/* Withdrawal History Table */}
                <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-3xl p-7 space-y-5 shadow-sm">
                  <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-purple-100 text-purple-600">
                      <Clock className="w-4 h-4" />
                    </div>
                    Withdrawals History
                  </h3>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-700">
                      <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200/80">
                        <tr>
                          <th className="px-4 py-3">Code</th>
                          <th className="px-4 py-3">Amount USD</th>
                          <th className="px-4 py-3">Payout Local</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Reference</th>
                          <th className="px-4 py-3">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {withdrawals.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                              No withdrawal requests submitted yet.
                            </td>
                          </tr>
                        ) : (
                          withdrawals.map((w) => (
                            <tr key={w.id} className="hover:bg-slate-50/80 transition">
                              <td className="px-4 py-3 font-mono font-bold text-slate-900">{formatCleanId(w.withdrawal_code, "WITHDRAWAL")}</td>
                              <td className="px-4 py-3 font-mono font-bold text-emerald-600">${w.amount_usd} USD</td>
                              <td className="px-4 py-3 font-mono">
                                {formatCurrency(w.amount_local, w.currency, "")} {w.currency}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full ${
                                  w.status === "PAID" ? "bg-emerald-100 text-emerald-700 border border-emerald-200" :
                                  w.status === "APPROVED" ? "bg-blue-100 text-blue-700 border border-blue-200" :
                                  w.status === "REJECTED" ? "bg-rose-100 text-rose-700 border border-rose-200" :
                                  "bg-amber-100 text-amber-700 border border-amber-200"
                                }`}>
                                  {w.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 font-mono text-slate-500">{w.payment_reference || "-"}</td>
                              <td className="px-4 py-3 text-slate-500">{formatDate(w.requested_at)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* --- TAB 5: PLATFORM CONTROL CENTER (ADMIN ONLY) --- */}
          {activeTab.startsWith("admin") && currentUser.role === "ADMIN" && (
            <div className="space-y-8 border-t border-amber-200/80 pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 rounded-2xl bg-amber-100 text-amber-700">
                      <Shield className="w-6 h-6" />
                    </div>
                    <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Platform Governance Center</h2>
                  </div>
                  <p className="text-sm text-slate-500 font-medium mt-1">Complete governance over sales approvals, withdrawals, balance adjustments, and audit trails.</p>
                </div>
              </div>

              {/* Admin Metric Overview */}
              {adminStats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                  <div className="bg-white border border-slate-200/80 p-5 rounded-3xl shadow-sm hover:shadow-md transition-all">
                    <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Total Platform Users</div>
                    <div className="text-2xl font-mono font-extrabold text-slate-900 mt-2">{adminStats.total_users_count}</div>
                  </div>
                  <div className="bg-amber-50/40 border border-amber-100 p-5 rounded-3xl shadow-sm hover:shadow-md transition-all">
                    <div className="text-xs text-amber-700 uppercase font-bold tracking-wider">Pending Sales Review</div>
                    <div className="text-2xl font-mono font-extrabold text-amber-600 mt-2">{adminStats.total_pending_sales}</div>
                  </div>
                  <div className="bg-emerald-50/40 border border-emerald-100 p-5 rounded-3xl shadow-sm hover:shadow-md transition-all">
                    <div className="text-xs text-emerald-700 uppercase font-bold tracking-wider">Commissions Paid (USD)</div>
                    <div className="text-2xl font-mono font-extrabold text-emerald-600 mt-2">${adminStats.total_commissions_paid_usd}</div>
                  </div>
                  <div className="bg-blue-50/40 border border-blue-100 p-5 rounded-3xl shadow-sm hover:shadow-md transition-all">
                    <div className="text-xs text-blue-700 uppercase font-bold tracking-wider">Pending Payout Requests</div>
                    <div className="text-2xl font-mono font-extrabold text-blue-600 mt-2">${adminStats.total_pending_withdrawals_usd}</div>
                  </div>
                </div>
              )}

              {/* Admin Sales Approval Queue */}
              {(activeTab === "admin" || activeTab === "admin-reviews") && (
                <div className="bg-white border border-slate-200/80 rounded-3xl p-7 space-y-5 shadow-sm">
                  <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-amber-100 text-amber-600">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    Sales Review Queue (Pending Approvals)
                  </h3>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-700">
                      <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200/80">
                        <tr>
                          <th className="px-4 py-3">Code</th>
                          <th className="px-4 py-3">User</th>
                          <th className="px-4 py-3">Product</th>
                          <th className="px-4 py-3">Commission USD</th>
                          <th className="px-4 py-3">Submitted</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {sales.filter((s) => s.status === "PENDING").length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                              No pending sales requiring review.
                            </td>
                          </tr>
                        ) : (
                          sales.filter((s) => s.status === "PENDING").map((s) => (
                            <tr key={s.id} className="hover:bg-slate-50/80 transition">
                              <td className="px-4 py-3 font-mono font-bold text-slate-900">
                                {formatCleanId(s.sale_code, "SALE")}
                              </td>
                              <td className="px-4 py-3 font-medium">{s.user_full_name} ({s.user_email})</td>
                              <td className="px-4 py-3 font-semibold text-slate-800">{s.product_name}</td>
                              <td className="px-4 py-3 font-mono font-bold text-emerald-600">+${s.calculated_commission_usd} USD</td>
                              <td className="px-4 py-3 text-slate-500">{formatDate(s.submitted_at)}</td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => reviewSaleMutation.mutate({ saleId: s.id, status: "APPROVED" })}
                                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition shadow-xs text-xs whitespace-nowrap"
                                  >
                                    Approve & Credit
                                  </button>
                                  <button
                                    onClick={() => setRejectModalSale(s)}
                                    className="px-3.5 py-1.5 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 font-bold rounded-xl transition text-xs whitespace-nowrap"
                                  >
                                    Reject
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Admin Withdrawals Review Queue */}
              {(activeTab === "admin" || activeTab === "admin-reviews") && (
                <div className="bg-white border border-slate-200/80 rounded-3xl p-7 space-y-5 shadow-sm">
                  <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-blue-100 text-blue-600">
                      <ArrowUpRight className="w-4 h-4" />
                    </div>
                    Withdrawal Payout Approvals Queue
                  </h3>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-700">
                      <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200/80">
                        <tr>
                          <th className="px-4 py-3">Code</th>
                          <th className="px-4 py-3">User</th>
                          <th className="px-4 py-3">Amount USD</th>
                          <th className="px-4 py-3">Payout Local</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {withdrawals.filter((w) => w.status === "PENDING" || w.status === "APPROVED").length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                              No pending withdrawal requests.
                            </td>
                          </tr>
                        ) : (
                          withdrawals.filter((w) => w.status === "PENDING" || w.status === "APPROVED").map((w) => (
                            <tr key={w.id} className="hover:bg-slate-50/80 transition">
                              <td className="px-4 py-3 font-mono font-bold text-slate-900">
                                {formatCleanId(w.withdrawal_code, "WITHDRAWAL")}
                              </td>
                              <td className="px-4 py-3 font-medium">{w.user_full_name} ({w.user_email})</td>
                              <td className="px-4 py-3 font-mono font-bold text-emerald-600">${w.amount_usd} USD</td>
                              <td className="px-4 py-3 font-mono">{w.amount_local} {w.currency}</td>
                              <td className="px-4 py-3">
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
                                  {w.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {w.status === "PENDING" && (
                                    <>
                                      <button
                                        onClick={() => reviewWithdrawalMutation.mutate({ wdId: w.id, status: "APPROVED" })}
                                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition shadow-xs text-xs whitespace-nowrap"
                                      >
                                        Approve Request
                                      </button>
                                      <button
                                        onClick={() => setRejectModalWithdrawal(w)}
                                        className="px-3.5 py-1.5 bg-rose-50 border border-rose-200 text-rose-700 font-bold rounded-xl transition text-xs whitespace-nowrap"
                                      >
                                        Reject & Refund
                                      </button>
                                    </>
                                  )}

                                  {w.status === "APPROVED" && (
                                    <button
                                      onClick={() => setPayModalWithdrawal(w)}
                                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition shadow-xs text-xs whitespace-nowrap"
                                    >
                                      Dispatch Payout
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Admin Users Management & Balance Adjustments */}
              {(activeTab === "admin" || activeTab === "admin-users") && (
                <div className="bg-white border border-slate-200/80 rounded-3xl p-7 space-y-5 shadow-sm">
                  <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-purple-100 text-purple-600">
                      <Users className="w-4 h-4" />
                    </div>
                    User Accounts & Controlled Balance Adjustments
                  </h3>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-700">
                      <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200/80">
                        <tr>
                          <th className="px-4 py-3">User</th>
                          <th className="px-4 py-3">Role</th>
                          <th className="px-4 py-3">Country</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Joined Date</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {adminUsers.map((u) => (
                          <tr key={u.id} className="hover:bg-slate-50/80 transition">
                            <td className="px-4 py-3 font-semibold text-slate-900">{u.full_name} <span className="text-slate-500">({u.email})</span></td>
                            <td className="px-4 py-3 font-mono">{u.role}</td>
                            <td className="px-4 py-3">{u.country}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full ${
                                u.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700 border border-emerald-200" : "bg-rose-100 text-rose-700 border border-rose-200"
                              }`}>
                                {u.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-500">{formatDate(u.created_at)}</td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => setAdjUserModal(u)}
                                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl transition text-xs whitespace-nowrap"
                                >
                                  Adjust Balance
                                </button>
                                {u.role !== "ADMIN" && (
                                  <button
                                    onClick={() => toggleUserMutation.mutate(u.id)}
                                    className="px-3.5 py-1.5 bg-amber-50 border border-amber-200 text-amber-800 font-bold rounded-xl transition text-xs whitespace-nowrap"
                                  >
                                    {u.status === "ACTIVE" ? "Suspend" : "Activate"}
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Audit Log Trail */}
              <div className="bg-white border border-slate-200/80 rounded-3xl p-7 space-y-5 shadow-sm">
                <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
                    <FileText className="w-4 h-4" />
                  </div>
                  Immutable Platform Audit Log Trail
                </h3>

                <div className="overflow-x-auto max-h-80 overflow-y-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-semibold sticky top-0 border-b border-slate-200/80">
                      <tr>
                        <th className="px-4 py-2.5">Action</th>
                        <th className="px-4 py-2.5">Resource</th>
                        <th className="px-4 py-2.5">Actor Email</th>
                        <th className="px-4 py-2.5">Metadata</th>
                        <th className="px-4 py-2.5">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {auditLogs.map((a) => (
                        <tr key={a.id} className="font-mono text-[11px] hover:bg-slate-50/80">
                          <td className="px-4 py-2 text-blue-600 font-bold">{a.action}</td>
                          <td className="px-4 py-2 text-slate-800">{a.resource}</td>
                          <td className="px-4 py-2 text-slate-600">{a.actor_email || "System"}</td>
                          <td className="px-4 py-2 text-slate-500 max-w-xs truncate">{JSON.stringify(a.metadata_json || {})}</td>
                          <td className="px-4 py-2 text-slate-500">{formatDate(a.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* --- MODALS (GOOGLE MATERIAL STYLING) --- */}
      {/* 1. Submit Sale Modal */}
      {saleProductModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200/80 rounded-3xl p-8 max-w-md w-full space-y-6 shadow-2xl">
            <h3 className="font-bold text-xl text-slate-900">Confirm Sale Submission</h3>
            <p className="text-xs md:text-sm text-slate-600 font-medium">
              You are submitting a sale for <strong className="text-slate-900">{saleProductModal.name}</strong> (${saleProductModal.price_usd} USD).
            </p>
            <div className="p-4 bg-slate-50/80 border border-slate-200/80 rounded-2xl text-xs space-y-1.5 font-medium">
              <div>Commission Rate: <span className="font-mono text-emerald-600 font-bold">{saleProductModal.commission_type === "PERCENTAGE" ? `${saleProductModal.commission_value}%` : `$${saleProductModal.commission_value}`}</span></div>
              <div>Estimated Commission: <span className="font-mono text-emerald-600 font-bold">
                {saleProductModal.commission_type === "PERCENTAGE"
                  ? formatMoney((saleProductModal.price_usd * saleProductModal.commission_value) / 100)
                  : formatMoney(saleProductModal.commission_value)}
              </span></div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setSaleProductModal(null)}
                className="flex-1 py-3 bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 rounded-2xl text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                onClick={() => submitSaleMutation.mutate(saleProductModal.id)}
                disabled={submitSaleMutation.isPending}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-blue-600/20 transition"
              >
                Confirm Submission
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Admin Reject Sale Modal */}
      {rejectModalSale && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200/80 rounded-3xl p-8 max-w-md w-full space-y-5 shadow-2xl">
            <h3 className="font-bold text-xl text-slate-900">Reject Sale #{rejectModalSale.sale_code}</h3>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Rejection Reason</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Invalid order ID or customer cancelled..."
                className="w-full bg-slate-50/80 border border-slate-200 rounded-2xl p-3.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
                rows={3}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setRejectModalSale(null)} className="flex-1 py-3 bg-slate-100 border border-slate-200 text-xs text-slate-700 font-bold rounded-2xl transition">Cancel</button>
              <button
                onClick={() => reviewSaleMutation.mutate({ saleId: rejectModalSale.id, status: "REJECTED", reason: rejectReason })}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white rounded-2xl transition shadow-md shadow-rose-600/20"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Admin Dispatch Payment Modal */}
      {payModalWithdrawal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200/80 rounded-3xl p-8 max-w-md w-full space-y-5 shadow-2xl">
            <h3 className="font-bold text-xl text-slate-900">Dispatch Payout #{payModalWithdrawal.withdrawal_code}</h3>
            <p className="text-xs text-slate-600 font-medium">Amount: ${payModalWithdrawal.amount_usd} USD ({payModalWithdrawal.amount_local} {payModalWithdrawal.currency})</p>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Bank Payment Reference / Transaction Hash</label>
              <input
                type="text"
                required
                value={paymentRefInput}
                onChange={(e) => setPaymentRefInput(e.target.value)}
                placeholder="NIP-BNK-998822-TX"
                className="w-full bg-slate-50/80 border border-slate-200 rounded-2xl p-3.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white font-mono transition-all"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setPayModalWithdrawal(null)} className="flex-1 py-3 bg-slate-100 border border-slate-200 text-xs text-slate-700 font-bold rounded-2xl transition">Cancel</button>
              <button
                onClick={() => payWithdrawalMutation.mutate({ wdId: payModalWithdrawal.id, ref: paymentRefInput })}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white rounded-2xl transition shadow-md shadow-emerald-600/20"
              >
                Confirm Paid
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Payment Details Form Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200/80 rounded-3xl p-8 max-w-md w-full space-y-5 shadow-2xl">
            <h3 className="font-bold text-xl text-slate-900">Configure Payout Account</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                savePaymentDetailsMutation.mutate({
                  payment_method: payMethod,
                  account_name: payAccName,
                  account_number: payAccNum,
                  bank_name: payBankName,
                  bank_code: payBankCode,
                  country: currentUser.country
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Payment Method</label>
                <input
                  type="text"
                  required
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  placeholder="Direct Bank Transfer"
                  className="w-full bg-slate-50/80 border border-slate-200 rounded-2xl p-3 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Bank Name</label>
                <input
                  type="text"
                  required
                  value={payBankName}
                  onChange={(e) => setPayBankName(e.target.value)}
                  placeholder="Access Bank / Chase / Barclays"
                  className="w-full bg-slate-50/80 border border-slate-200 rounded-2xl p-3 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Account Holder Name</label>
                <input
                  type="text"
                  required
                  value={payAccName}
                  onChange={(e) => setPayAccName(e.target.value)}
                  placeholder="Sarah Jenkins"
                  className="w-full bg-slate-50/80 border border-slate-200 rounded-2xl p-3 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Account Number / IBAN</label>
                <input
                  type="text"
                  required
                  value={payAccNum}
                  onChange={(e) => setPayAccNum(e.target.value)}
                  placeholder="0123456789"
                  className="w-full bg-slate-50/80 border border-slate-200 rounded-2xl p-3 text-xs text-slate-900 font-mono focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowPaymentModal(false)} className="flex-1 py-3 bg-slate-100 border border-slate-200 text-xs text-slate-700 font-bold rounded-2xl transition">Cancel</button>
                <button type="submit" className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white rounded-2xl transition shadow-md shadow-blue-600/20">Save Payout Details</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Admin Balance Adjustment Modal */}
      {adjUserModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200/80 rounded-3xl p-8 max-w-md w-full space-y-5 shadow-2xl">
            <h3 className="font-bold text-xl text-slate-900">Adjust Balance for {adjUserModal.full_name}</h3>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Adjustment Amount USD (+ for credit, - for debit)</label>
              <input
                type="number"
                step="0.01"
                required
                value={adjAmount}
                onChange={(e) => setAdjAmount(e.target.value)}
                placeholder="e.g. 50.00 or -25.00"
                className="w-full bg-slate-50/80 border border-slate-200 rounded-2xl p-3 text-xs text-slate-900 font-mono focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Audit Reason (Required)</label>
              <input
                type="text"
                required
                value={adjReason}
                onChange={(e) => setAdjReason(e.target.value)}
                placeholder="Manual adjustment for campaign bonus..."
                className="w-full bg-slate-50/80 border border-slate-200 rounded-2xl p-3 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setAdjUserModal(null)} className="flex-1 py-3 bg-slate-100 border border-slate-200 text-xs text-slate-700 font-bold rounded-2xl transition">Cancel</button>
              <button
                onClick={() => adjustBalanceMutation.mutate({ userId: adjUserModal.id, amount: parseFloat(adjAmount), reason: adjReason })}
                className="flex-1 py-3 bg-amber-600 hover:bg-amber-700 text-xs font-bold text-white rounded-2xl transition shadow-md shadow-amber-600/20"
              >
                Perform Adjustment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
