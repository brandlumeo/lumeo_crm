"use client";

import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Coins,
  FileText,
  AlertCircle,
  CheckCircle2,
  FolderOpen,
  ArrowRight,
  TrendingUp,
  Clock,
  ExternalLink,
  Plus,
  Search,
  Download,
  Printer,
  X,
  CreditCard,
  Wallet,
  Tag,
  Building2,
  Plane,
  Utensils,
  Laptop,
  Megaphone,
  Zap,
  Truck,
  Scale,
  Sparkles,
  Eye,
  Trash2,
  Edit3,
  Check,
  Building,
  RotateCcw,
  Receipt,
  FileDown,
  Layers,
  ChevronRight,
  BadgeAlert,
  User,
} from "lucide-react";
import {
  useExpenseClaims,
  useCreateExpenseClaim,
  useUpdateExpenseClaim,
  useDeleteExpenseClaim,
  useApproveExpenseClaim,
  useCurrentUser,
  useCurrentCompany,
  useAllDealsBoard,
  useTeam,
} from "@/lib/queries";
import { formatINR, formatCompactINR, formatShortDate, formatLongDate, toNumber, cn } from "@/lib/utils";
import type { ExpenseClaim } from "@/lib/types";

// ── Category Definitions & Visual Tokens ─────────────────────────────────────
const CATEGORY_CONFIG: Record<
  ExpenseClaim["category"],
  { label: string; icon: any; color: string; bg: string; border: string; barColor: string }
> = {
  travel: {
    label: "Travel & Lodging",
    icon: Plane,
    color: "text-sky-700 dark:text-sky-400",
    bg: "bg-sky-50 dark:bg-sky-950/40",
    border: "border-sky-200 dark:border-sky-800",
    barColor: "bg-sky-500",
  },
  meals: {
    label: "Meals & Entertainment",
    icon: Utensils,
    color: "text-amber-700 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    border: "border-amber-200 dark:border-amber-800",
    barColor: "bg-amber-500",
  },
  software: {
    label: "Software & SaaS",
    icon: Laptop,
    color: "text-violet-700 dark:text-violet-400",
    bg: "bg-violet-50 dark:bg-violet-950/40",
    border: "border-violet-200 dark:border-violet-800",
    barColor: "bg-violet-500",
  },
  office: {
    label: "Office & Supplies",
    icon: Building2,
    color: "text-slate-700 dark:text-slate-400",
    bg: "bg-slate-50 dark:bg-slate-900/40",
    border: "border-slate-200 dark:border-slate-800",
    barColor: "bg-slate-500",
  },
  marketing: {
    label: "Advertising & Marketing",
    icon: Megaphone,
    color: "text-rose-700 dark:text-rose-400",
    bg: "bg-rose-50 dark:bg-rose-950/40",
    border: "border-rose-200 dark:border-rose-800",
    barColor: "bg-rose-500",
  },
  utilities: {
    label: "Utilities & Rent",
    icon: Zap,
    color: "text-orange-700 dark:text-orange-400",
    bg: "bg-orange-50 dark:bg-orange-950/40",
    border: "border-orange-200 dark:border-orange-800",
    barColor: "bg-orange-500",
  },
  logistics: {
    label: "Logistics & Shipping",
    icon: Truck,
    color: "text-teal-700 dark:text-teal-400",
    bg: "bg-teal-50 dark:bg-teal-950/40",
    border: "border-teal-200 dark:border-teal-800",
    barColor: "bg-teal-500",
  },
  professional: {
    label: "Professional & Legal",
    icon: Scale,
    color: "text-indigo-700 dark:text-indigo-400",
    bg: "bg-indigo-50 dark:bg-indigo-950/40",
    border: "border-indigo-200 dark:border-indigo-800",
    barColor: "bg-indigo-500",
  },
  misc: {
    label: "Miscellaneous",
    icon: Tag,
    color: "text-zinc-700 dark:text-zinc-400",
    bg: "bg-zinc-50 dark:bg-zinc-900/40",
    border: "border-zinc-200 dark:border-zinc-800",
    barColor: "bg-zinc-400",
  },
};

const PAYMENT_METHODS: { id: ExpenseClaim["payment_method"]; label: string; icon: any }[] = [
  { id: "personal_card", label: "Personal Card / UPI", icon: Wallet },
  { id: "company_card", label: "Corporate Credit/Debit Card", icon: CreditCard },
  { id: "company_netbanking", label: "Company NetBanking", icon: Building },
  { id: "cash", label: "Petty Cash", icon: Coins },
];

export default function ExpensesPage() {
  const { data: user } = useCurrentUser();
  const { data: company } = useCurrentCompany();
  const isManager = user?.role === "owner" || user?.role === "admin";

  // Data Queries
  const { data: myExpenses = [], isLoading: myLoading } = useExpenseClaims(false);
  const { data: companyExpenses = [], isLoading: companyLoading } = useExpenseClaims(true);
  const { data: deals = [], isLoading: dealsLoading } = useAllDealsBoard();
  const { data: teamUsers = [] } = useTeam();

  // Mutations
  const createMutation = useCreateExpenseClaim();
  const updateMutation = useUpdateExpenseClaim();
  const deleteMutation = useDeleteExpenseClaim();
  const approveMutation = useApproveExpenseClaim();

  // Page States
  const [mounted, setMounted] = useState(false);
  const [scope, setScope] = useState<"all" | "my">("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [employeeFilter, setEmployeeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseClaim | null>(null);
  const [lightboxExpense, setLightboxExpense] = useState<ExpenseClaim | null>(null);
  const [settleExpenseItem, setSettleExpenseItem] = useState<ExpenseClaim | null>(null);
  const [rejectExpenseItem, setRejectExpenseItem] = useState<ExpenseClaim | null>(null);
  const [deleteExpenseItem, setDeleteExpenseItem] = useState<ExpenseClaim | null>(null);

  // Form State
  const [formType, setFormType] = useState<"reimbursement" | "company_paid">("reimbursement");
  const [formUserId, setFormUserId] = useState<string>("");
  const [formTitle, setFormTitle] = useState("");
  const [formMerchant, setFormMerchant] = useState("");
  const [formCategory, setFormCategory] = useState<ExpenseClaim["category"]>("misc");
  const [formAmount, setFormAmount] = useState("");
  const [formTaxAmount, setFormTaxAmount] = useState("");
  const [formExpenseDate, setFormExpenseDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [formPaymentMethod, setFormPaymentMethod] = useState<ExpenseClaim["payment_method"]>("personal_card");
  const [formDealId, setFormDealId] = useState("");
  const [formIsBillable, setFormIsBillable] = useState(false);
  const [formDescription, setFormDescription] = useState("");
  const [formReceiptFile, setFormReceiptFile] = useState<File | null>(null);
  const [formReceiptPreview, setFormReceiptPreview] = useState<string | null>(null);
  const [formError, setFormError] = useState("");

  // Settlement Form State
  const [settleDate, setSettleDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [settleReference, setSettleReference] = useState("");
  const [settleNotes, setSettleNotes] = useState("");

  // Reject Form State
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  // Determine current active claims pool
  const activePool = useMemo(() => {
    if (!isManager || scope === "my") {
      return myExpenses;
    }
    return companyExpenses;
  }, [isManager, scope, myExpenses, companyExpenses]);

  // Filtered Claims
  const filteredClaims = useMemo(() => {
    return activePool.filter((item) => {
      // Status Filter
      if (statusFilter !== "all" && item.status !== statusFilter) return false;

      // Category Filter
      if (categoryFilter !== "all" && item.category !== categoryFilter) return false;

      // Type Filter
      if (typeFilter !== "all" && item.expense_type !== typeFilter) return false;

      // Employee Filter
      if (employeeFilter !== "all" && String(item.user) !== String(employeeFilter)) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = item.title?.toLowerCase().includes(q);
        const matchesMerchant = item.merchant?.toLowerCase().includes(q);
        const matchesUser = item.user_full_name?.toLowerCase().includes(q) || item.user_email?.toLowerCase().includes(q);
        const matchesDeal = item.deal_name?.toLowerCase().includes(q);
        const matchesDesc = item.description?.toLowerCase().includes(q);
        const matchesRef = item.settlement_reference?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesMerchant && !matchesUser && !matchesDeal && !matchesDesc && !matchesRef) {
          return false;
        }
      }

      return true;
    });
  }, [activePool, statusFilter, categoryFilter, typeFilter, employeeFilter, searchQuery]);

  // Overall Pool Aggregates (KPIs)
  const kpiTotalSpend = useMemo(() => {
    return activePool
      .filter((e) => e.status !== "rejected")
      .reduce((sum, e) => sum + toNumber(e.amount), 0);
  }, [activePool]);

  const kpiPending = useMemo(() => {
    const pendingItems = activePool.filter((e) => e.status === "pending");
    return {
      count: pendingItems.length,
      amount: pendingItems.reduce((sum, e) => sum + toNumber(e.amount), 0),
    };
  }, [activePool]);

  const kpiSettled = useMemo(() => {
    const settledItems = activePool.filter((e) => e.status === "settled" || e.status === "approved");
    return {
      count: settledItems.length,
      amount: settledItems.reduce((sum, e) => sum + toNumber(e.amount), 0),
    };
  }, [activePool]);

  const kpiBillable = useMemo(() => {
    const billableItems = activePool.filter((e) => e.is_billable && e.status !== "rejected");
    return {
      count: billableItems.length,
      amount: billableItems.reduce((sum, e) => sum + toNumber(e.amount), 0),
    };
  }, [activePool]);

  // Category Spend Distribution
  const categoryBreakdown = useMemo(() => {
    const valid = activePool.filter((e) => e.status !== "rejected");
    const totals: Record<ExpenseClaim["category"], number> = {
      travel: 0,
      meals: 0,
      software: 0,
      office: 0,
      marketing: 0,
      utilities: 0,
      logistics: 0,
      professional: 0,
      misc: 0,
    };
    let grandTotal = 0;

    valid.forEach((e) => {
      const cat = (e.category || "misc") as ExpenseClaim["category"];
      const amt = toNumber(e.amount);
      if (totals[cat] !== undefined) {
        totals[cat] += amt;
      } else {
        totals.misc += amt;
      }
      grandTotal += amt;
    });

    const entries = (Object.entries(totals) as [ExpenseClaim["category"], number][])
      .filter(([_, amt]) => amt > 0)
      .sort((a, b) => b[1] - a[1]);

    return { entries, grandTotal };
  }, [activePool]);

  // Reset & Open Log Modal
  const openNewExpenseModal = (defaultType: "reimbursement" | "company_paid" = "reimbursement") => {
    setEditingExpense(null);
    setFormType(defaultType);
    setFormUserId(String(user?.id || ""));
    setFormTitle("");
    setFormMerchant("");
    setFormCategory("misc");
    setFormAmount("");
    setFormTaxAmount("");
    setFormExpenseDate(new Date().toISOString().slice(0, 10));
    setFormPaymentMethod(defaultType === "reimbursement" ? "personal_card" : "company_card");
    setFormDealId("");
    setFormIsBillable(false);
    setFormDescription("");
    setFormReceiptFile(null);
    setFormReceiptPreview(null);
    setFormError("");
    setIsLogModalOpen(true);
  };

  // Open Edit Modal
  const openEditExpenseModal = (claim: ExpenseClaim) => {
    setEditingExpense(claim);
    setFormType(claim.expense_type || "reimbursement");
    setFormUserId(claim.user ? String(claim.user) : String(user?.id || ""));
    setFormTitle(claim.title || "");
    setFormMerchant(claim.merchant || "");
    setFormCategory(claim.category || "misc");
    setFormAmount(claim.amount ? String(toNumber(claim.amount)) : "");
    setFormTaxAmount(claim.tax_amount ? String(toNumber(claim.tax_amount)) : "");
    setFormExpenseDate(claim.expense_date || new Date().toISOString().slice(0, 10));
    setFormPaymentMethod(claim.payment_method || "personal_card");
    setFormDealId(claim.deal ? String(claim.deal) : "");
    setFormIsBillable(Boolean(claim.is_billable));
    setFormDescription(claim.description || "");
    setFormReceiptFile(null);
    setFormReceiptPreview(claim.receipt || null);
    setFormError("");
    setIsLogModalOpen(true);
  };

  // Receipt File Selection
  const handleReceiptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormReceiptFile(file);
      if (file.type.startsWith("image/")) {
        setFormReceiptPreview(URL.createObjectURL(file));
      } else {
        setFormReceiptPreview(null);
      }
    }
  };

  // Submit Expense Form
  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!formTitle.trim()) {
      setFormError("Expense Title is required.");
      return;
    }

    const amt = parseFloat(formAmount);
    if (isNaN(amt) || amt <= 0) {
      setFormError("Please enter a valid positive expense amount.");
      return;
    }

    const formData = new FormData();
    formData.append("title", formTitle.trim());
    formData.append("amount", amt.toString());
    formData.append("expense_type", formType);
    formData.append("category", formCategory);
    formData.append("expense_date", formExpenseDate);
    formData.append("payment_method", formPaymentMethod);
    formData.append("is_billable", formIsBillable ? "true" : "false");
    if (formUserId) {
      formData.append("user_id", formUserId);
    }

    if (formMerchant.trim()) {
      formData.append("merchant", formMerchant.trim());
    }
    if (formTaxAmount && !isNaN(parseFloat(formTaxAmount))) {
      formData.append("tax_amount", parseFloat(formTaxAmount).toString());
    }
    if (formDealId) {
      formData.append("deal", formDealId);
    }
    if (formDescription.trim()) {
      formData.append("description", formDescription.trim());
    }
    if (formReceiptFile) {
      formData.append("receipt", formReceiptFile);
    }

    if (editingExpense) {
      // Update
      updateMutation.mutate(
        { id: editingExpense.id, payload: formData },
        {
          onSuccess: () => {
            toast.success("Expense claim updated successfully");
            setIsLogModalOpen(false);
            setEditingExpense(null);
          },
          onError: (err: any) => {
            const msg = err.response?.data?.detail || "Failed to update expense";
            setFormError(typeof msg === "string" ? msg : JSON.stringify(msg));
            toast.error("Failed to update expense");
          },
        }
      );
    } else {
      // Create
      createMutation.mutate(formData, {
        onSuccess: () => {
          toast.success(
            formType === "company_paid" && isManager
              ? "Direct corporate spend logged & settled"
              : "Expense claim submitted for verification"
          );
          setIsLogModalOpen(false);
        },
        onError: (err: any) => {
          const msg = err.response?.data?.detail || "Failed to submit expense";
          setFormError(typeof msg === "string" ? msg : JSON.stringify(msg));
          toast.error("Failed to submit expense");
        },
      });
    }
  };

  // Manager Approve Action
  const handleApprove = (claim: ExpenseClaim) => {
    approveMutation.mutate(
      {
        id: claim.id,
        payload: { status: "approved" },
      },
      {
        onSuccess: () => {
          toast.success(`Claim "${claim.title}" approved for reimbursement payout.`);
        },
        onError: () => toast.error("Failed to approve claim."),
      }
    );
  };

  // Manager Settle / Disburse Action
  const handleConfirmSettlement = () => {
    if (!settleExpenseItem) return;

    approveMutation.mutate(
      {
        id: settleExpenseItem.id,
        payload: {
          status: "settled",
          settled_at: settleDate,
          settlement_reference: settleReference.trim() || undefined,
          manager_notes: settleNotes.trim() || settleExpenseItem.manager_notes || undefined,
        },
      },
      {
        onSuccess: () => {
          toast.success(`Claim "${settleExpenseItem.title}" marked as Reimbursed & Settled.`);
          setSettleExpenseItem(null);
          setSettleReference("");
          setSettleNotes("");
        },
        onError: () => toast.error("Failed to settle claim."),
      }
    );
  };

  // Manager Reject Action
  const handleConfirmReject = () => {
    if (!rejectExpenseItem) return;

    approveMutation.mutate(
      {
        id: rejectExpenseItem.id,
        payload: {
          status: "rejected",
          manager_notes: rejectReason.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          toast.success(`Claim "${rejectExpenseItem.title}" rejected.`);
          setRejectExpenseItem(null);
          setRejectReason("");
        },
        onError: () => toast.error("Failed to reject claim."),
      }
    );
  };

  // Delete Action
  const handleConfirmDelete = () => {
    if (!deleteExpenseItem) return;
    deleteMutation.mutate(deleteExpenseItem.id, {
      onSuccess: () => {
        toast.success("Expense record removed permanently.");
        setDeleteExpenseItem(null);
      },
      onError: () => toast.error("Failed to delete expense."),
    });
  };

  // CSV Export
  const handleExportCSV = () => {
    if (filteredClaims.length === 0) {
      toast.info("No expense records to export.");
      return;
    }

    const headers = [
      "Expense Date",
      "Title",
      "Merchant / Vendor",
      "Category",
      "Type",
      "Payment Method",
      "Amount (INR)",
      "Tax Amount (INR)",
      "Billable to Client",
      "Linked Deal",
      "Status",
      "Claimant Name",
      "Claimant Email",
      "Approved By",
      "Settled Date",
      "Settlement Reference",
      "Description / Notes",
    ];

    const rows = filteredClaims.map((c) => [
      c.expense_date || "",
      `"${(c.title || "").replace(/"/g, '""')}"`,
      `"${(c.merchant || "").replace(/"/g, '""')}"`,
      CATEGORY_CONFIG[c.category]?.label || c.category || "",
      c.expense_type === "company_paid" ? "Company Paid" : "Reimbursement",
      c.payment_method_display || c.payment_method || "",
      toNumber(c.amount).toFixed(2),
      c.tax_amount ? toNumber(c.tax_amount).toFixed(2) : "0.00",
      c.is_billable ? "Yes" : "No",
      `"${(c.deal_name || "").replace(/"/g, '""')}"`,
      c.status.toUpperCase(),
      `"${(c.user_full_name || "").replace(/"/g, '""')}"`,
      c.user_email || "",
      `"${(c.approved_by_name || "").replace(/"/g, '""')}"`,
      c.settled_at || "",
      `"${(c.settlement_reference || "").replace(/"/g, '""')}"`,
      `"${(c.description || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `expenses_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success("Expense ledger exported to CSV.");
  };

  // Print Summary
  const handlePrint = () => {
    window.print();
  };

  const isLoading = myLoading || (isManager && companyLoading);

  if (!mounted || isLoading) {
    return (
      <div className="p-7 pb-16 max-w-[1440px] mx-auto">
        <div className="card p-10 animate-pulse border border-line bg-paper">
          <div className="h-8 bg-bone-2 rounded w-1/4 mb-4" />
          <div className="h-4 bg-bone-2 rounded w-1/2 mb-8" />
          <div className="grid grid-cols-4 gap-4">
            <div className="h-24 bg-bone-2 rounded" />
            <div className="h-24 bg-bone-2 rounded" />
            <div className="h-24 bg-bone-2 rounded" />
            <div className="h-24 bg-bone-2 rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 pb-20 max-w-[1440px] mx-auto flex flex-col gap-7 animate-rise">
      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-line">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2.5">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
              Corporate Spend & Claims
            </span>
            {isManager && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold text-muted bg-bone border border-line">
                Manager Access
              </span>
            )}
          </div>
          <h1 className="font-serif text-[28px] md:text-[32px] tracking-tight text-ink font-semibold">
            Financial Expenses & Claims
          </h1>
          <p className="text-[13px] text-muted max-w-2xl">
            Track business expenditures, audit employee out-of-pocket receipts, manage tax attribution, and disburse reimbursement payouts.
          </p>
        </div>

        {/* Global Header Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-line bg-paper hover:bg-bone text-ink transition-colors shadow-xs"
            title="Download CSV spreadsheet of current expenses"
          >
            <Download className="w-3.5 h-3.5 text-muted" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handlePrint}
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-line bg-paper hover:bg-bone text-ink transition-colors shadow-xs"
            title="Print or export PDF summary"
          >
            <Printer className="w-3.5 h-3.5 text-muted" />
            <span>Print</span>
          </button>

          <button
            onClick={() => openNewExpenseModal("reimbursement")}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-ink hover:opacity-90 text-paper transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Log Expense</span>
          </button>
        </div>
      </div>

      {/* ── 4 KPI Metric Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Registered Spend */}
        <div className="card p-5 border border-line bg-paper flex items-center gap-4 shadow-2xs">
          <div className="w-11 h-11 bg-bone border border-line rounded-xl grid place-items-center shrink-0">
            <Coins className="w-5 h-5 text-ink-2" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-wider text-muted font-medium truncate">
              Total Logged Spend
            </div>
            <div className="text-[22px] font-semibold tracking-tight text-ink mt-0.5 font-mono">
              {formatINR(kpiTotalSpend)}
            </div>
            <div className="text-[11px] text-muted mt-0.5">
              {activePool.filter((e) => e.status !== "rejected").length} active records
            </div>
          </div>
        </div>

        {/* Card 2: Pending Verification Queue */}
        <div className="card p-5 border border-line bg-paper flex items-center gap-4 shadow-2xs">
          <div className="w-11 h-11 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl grid place-items-center shrink-0 text-amber-700 dark:text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-wider text-muted font-medium truncate">
              Pending Verification
            </div>
            <div className="text-[22px] font-semibold tracking-tight text-amber-700 dark:text-amber-400 mt-0.5 font-mono">
              {formatINR(kpiPending.amount)}
            </div>
            <div className="text-[11px] text-muted mt-0.5">
              {kpiPending.count} claims waiting for review
            </div>
          </div>
        </div>

        {/* Card 3: Reimbursed & Settled */}
        <div className="card p-5 border border-line bg-paper flex items-center gap-4 shadow-2xs">
          <div className="w-11 h-11 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl grid place-items-center shrink-0 text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-wider text-muted font-medium truncate">
              Settled & Disbursed
            </div>
            <div className="text-[22px] font-semibold tracking-tight text-emerald-800 dark:text-emerald-300 mt-0.5 font-mono">
              {formatINR(kpiSettled.amount)}
            </div>
            <div className="text-[11px] text-muted mt-0.5">
              {kpiSettled.count} disbursed transactions
            </div>
          </div>
        </div>

        {/* Card 4: Client Recoverable / Billable */}
        <div className="card p-5 border border-line bg-paper flex items-center gap-4 shadow-2xs">
          <div className="w-11 h-11 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl grid place-items-center shrink-0 text-blue-700 dark:text-blue-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-wider text-muted font-medium truncate">
              Client Billable Spend
            </div>
            <div className="text-[22px] font-semibold tracking-tight text-blue-700 dark:text-blue-400 mt-0.5 font-mono">
              {formatINR(kpiBillable.amount)}
            </div>
            <div className="text-[11px] text-muted mt-0.5">
              {kpiBillable.count} rechargeable to clients
            </div>
          </div>
        </div>
      </div>

      {/* ── Category Spend Distribution Visual Bar ──────────────────────────── */}
      {categoryBreakdown.grandTotal > 0 && (
        <div className="card p-5 border border-line bg-paper flex flex-col gap-3 shadow-2xs">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-ink flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-ink-2" />
              Category Spend Distribution
            </span>
            <span className="text-muted font-mono">
              Total Outflow: <strong className="text-ink font-semibold">{formatINR(categoryBreakdown.grandTotal)}</strong>
            </span>
          </div>

          {/* Segmented Progress Bar */}
          <div className="w-full h-3 bg-bone rounded-full overflow-hidden flex shadow-inner">
            {categoryBreakdown.entries.map(([cat, amt]) => {
              const pct = (amt / categoryBreakdown.grandTotal) * 100;
              const config = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.misc;
              if (pct < 0.2) return null;
              return (
                <div
                  key={cat}
                  className={cn(config.barColor, "h-full transition-all duration-300 relative group cursor-pointer")}
                  style={{ width: `${pct}%` }}
                  title={`${config.label}: ${formatINR(amt)} (${pct.toFixed(1)}%)`}
                  onClick={() => setCategoryFilter(categoryFilter === cat ? "all" : cat)}
                />
              );
            })}
          </div>

          {/* Category Breakdown Badges */}
          <div className="flex items-center gap-2 flex-wrap pt-1">
            {categoryBreakdown.entries.map(([cat, amt]) => {
              const pct = (amt / categoryBreakdown.grandTotal) * 100;
              const config = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.misc;
              const isSelected = categoryFilter === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(isSelected ? "all" : cat)}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] transition-all border",
                    isSelected
                      ? "bg-ink text-paper border-ink font-semibold shadow-xs"
                      : "bg-bone hover:bg-bone-2 text-ink border-line"
                  )}
                >
                  <span className={cn("w-2 h-2 rounded-full", config.barColor)} />
                  <span>{config.label}</span>
                  <span className={cn("font-mono font-medium", isSelected ? "text-paper/90" : "text-muted")}>
                    {formatINR(amt)}
                  </span>
                  <span className={cn("text-[10px]", isSelected ? "text-paper/70" : "text-muted/70")}>
                    ({pct.toFixed(0)}%)
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Filters & Controls Bar ──────────────────────────────────────────── */}
      <div className="card p-4 border border-line bg-paper flex flex-col gap-3 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Scope Selector (Managers Only) */}
          {isManager && (
            <div className="flex items-center p-0.5 bg-bone border border-line rounded-lg w-fit">
              <button
                onClick={() => setScope("all")}
                className={cn(
                  "px-3 py-1.5 text-xs font-semibold rounded-md transition-all",
                  scope === "all" ? "bg-paper text-ink shadow-xs" : "text-muted hover:text-ink"
                )}
              >
                All Company Spend ({companyExpenses.length})
              </button>
              <button
                onClick={() => setScope("my")}
                className={cn(
                  "px-3 py-1.5 text-xs font-semibold rounded-md transition-all",
                  scope === "my" ? "bg-paper text-ink shadow-xs" : "text-muted hover:text-ink"
                )}
              >
                My Claims ({myExpenses.length})
              </button>
            </div>
          )}

          {/* Search Box */}
          <div className="relative flex-grow max-w-md">
            <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by title, merchant, user, deal, or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-bone border border-line rounded-lg pl-9 pr-8 py-2 text-xs outline-none focus:border-ink transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Dropdown Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Category Dropdown */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-bone border border-line rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-ink font-medium"
            >
              <option value="all">All Categories</option>
              {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.label}
                </option>
              ))}
            </select>

            {/* Type Dropdown */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-bone border border-line rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-ink font-medium"
            >
              <option value="all">All Types</option>
              <option value="reimbursement">Reimbursements</option>
              <option value="company_paid">Direct Company Spend</option>
            </select>

            {/* Employee Filter (for managers) */}
            {isManager && scope === "all" && teamUsers.length > 0 && (
              <select
                value={employeeFilter}
                onChange={(e) => setEmployeeFilter(e.target.value)}
                className="bg-bone border border-line rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-ink font-medium"
              >
                <option value="all">All Employees ({teamUsers.length})</option>
                {teamUsers.map((m: any) => (
                  <option key={m.id} value={m.id}>
                    👤 {m.first_name || m.name ? `${m.first_name || m.name}` : m.email}
                  </option>
                ))}
              </select>
            )}

            {(statusFilter !== "all" || categoryFilter !== "all" || typeFilter !== "all" || employeeFilter !== "all" || searchQuery) && (
              <button
                onClick={() => {
                  setStatusFilter("all");
                  setCategoryFilter("all");
                  setTypeFilter("all");
                  setEmployeeFilter("all");
                  setSearchQuery("");
                }}
                className="flex items-center gap-1 text-[11px] text-muted hover:text-ink font-medium px-2 py-1.5 rounded bg-bone border border-line transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 border-t border-line-2 pt-2.5 overflow-x-auto pb-1 text-xs">
          {[
            { id: "all", label: "All Records", count: activePool.length },
            { id: "pending", label: "Pending", count: activePool.filter((e) => e.status === "pending").length },
            { id: "approved", label: "Approved", count: activePool.filter((e) => e.status === "approved").length },
            { id: "settled", label: "Settled / Disbursed", count: activePool.filter((e) => e.status === "settled").length },
            { id: "rejected", label: "Rejected", count: activePool.filter((e) => e.status === "rejected").length },
          ].map((tab) => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold text-xs whitespace-nowrap transition-all",
                  isActive
                    ? "bg-ink text-paper shadow-xs"
                    : "text-muted hover:text-ink hover:bg-bone"
                )}
              >
                <span>{tab.label}</span>
                <span
                  className={cn(
                    "text-[10px] px-1.5 py-0.2 rounded-full font-mono",
                    isActive ? "bg-paper/20 text-paper" : "bg-bone-2 text-muted"
                  )}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Main Interactive Expenses Ledger Table ──────────────────────────── */}
      <div className="card border border-line bg-paper overflow-hidden shadow-2xs">
        <div className="p-4 border-b border-line flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-ink-2" />
            <h2 className="font-serif text-[17px] font-semibold text-ink">
              Expense Transactions Ledger
            </h2>
            <span className="text-xs text-muted">
              ({filteredClaims.length} records shown)
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          {filteredClaims.length === 0 ? (
            <div className="py-16 text-center flex flex-col items-center justify-center gap-2">
              <Coins className="w-10 h-10 text-muted/40 stroke-1" />
              <h3 className="font-serif text-lg font-semibold text-ink">No expenses found</h3>
              <p className="text-xs text-muted max-w-sm">
                No expense transactions match your active filters. Try resetting the filters or log a new claim.
              </p>
              <button
                onClick={() => openNewExpenseModal("reimbursement")}
                className="mt-2 flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-ink text-paper hover:opacity-90 transition-all"
              >
                <Plus className="w-4 h-4" />
                Log New Expense
              </button>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-line bg-bone/60 text-muted uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4 font-semibold">Date</th>
                  <th className="py-3 px-4 font-semibold">Title & Merchant</th>
                  <th className="py-3 px-4 font-semibold">Spender</th>
                  <th className="py-3 px-4 font-semibold">Category</th>
                  <th className="py-3 px-4 font-semibold">Type & Payment</th>
                  <th className="py-3 px-4 font-semibold">Deal Context</th>
                  <th className="py-3 px-4 font-semibold text-right">Amount</th>
                  <th className="py-3 px-4 font-semibold text-center">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-2">
                {filteredClaims.map((exp) => {
                  const catConfig = CATEGORY_CONFIG[exp.category] || CATEGORY_CONFIG.misc;
                  const CatIcon = catConfig.icon;
                  const isOwner = user?.id === exp.user;
                  const canManage = isManager;
                  const canEdit = (isOwner || canManage) && exp.status === "pending";
                  const canDelete = (isOwner || canManage) && exp.status === "pending";

                  return (
                    <tr key={exp.id} className="hover:bg-bone/40 transition-colors">
                      {/* 1. Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-muted font-mono">
                        <div className="font-semibold text-ink text-[12px]">
                          {exp.expense_date ? formatShortDate(exp.expense_date) : "—"}
                        </div>
                        <div className="text-[10px] text-muted/80">
                          Logged {new Date(exp.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                        </div>
                      </td>

                      {/* 2. Title & Merchant */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-ink text-[13px] leading-snug">
                          {exp.title}
                        </div>
                        {exp.merchant && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="flex items-center gap-1 text-[11px] font-medium text-ink-2 bg-bone px-1.5 py-0.5 rounded border border-line">
                              <Building2 className="w-3 h-3 text-muted" />
                              {exp.merchant}
                            </span>
                          </div>
                        )}
                        {exp.description && (
                          <div className="text-[11px] text-muted leading-relaxed line-clamp-1 mt-0.5" title={exp.description}>
                            "{exp.description}"
                          </div>
                        )}
                      </td>

                      {/* 3. Spender */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px] flex items-center justify-center shrink-0 border border-emerald-200">
                            {(() => {
                              const nameStr = exp.user_full_name || exp.user_email || "U";
                              const parts = nameStr.trim().split(" ");
                              if (parts.length >= 2) {
                                return (parts[0][0] + parts[1][0]).toUpperCase();
                              }
                              return nameStr.slice(0, 2).toUpperCase();
                            })()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-ink text-[12px] truncate max-w-[140px]" title={exp.user_full_name || exp.user_email}>
                              {exp.user_full_name || exp.user_email?.split("@")[0]}
                            </div>
                            {exp.user_email && (
                              <div className="text-[10px] text-muted truncate max-w-[140px]" title={exp.user_email}>
                                {exp.user_email}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 4. Category */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border",
                            catConfig.bg,
                            catConfig.color,
                            catConfig.border
                          )}
                        >
                          <CatIcon className="w-3.5 h-3.5" />
                          {catConfig.label}
                        </span>
                      </td>

                      {/* 4. Type & Payment */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {exp.expense_type === "company_paid" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-bold uppercase bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                            <CreditCard className="w-3 h-3" />
                            Direct Company Spend
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-bold uppercase bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            <Wallet className="w-3 h-3" />
                            Reimbursement Claim
                          </span>
                        )}
                        <div className="text-[10px] text-muted mt-0.5">
                          {exp.payment_method_display || exp.payment_method}
                        </div>
                      </td>

                      {/* 5. Deal Context & Billable */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {exp.deal ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="inline-flex items-center gap-1 text-[11.5px] font-medium text-accent">
                              <FolderOpen className="w-3.5 h-3.5" />
                              <span className="truncate max-w-[140px]" title={exp.deal_name || "Deal"}>
                                {exp.deal_name || "Deal"}
                              </span>
                            </span>
                            {exp.is_billable && (
                              <span className="inline-flex items-center gap-0.5 text-[9.5px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1 py-0.2 rounded w-fit">
                                <Sparkles className="w-2.5 h-2.5" />
                                Billable to Client
                              </span>
                            )}
                          </div>
                        ) : exp.is_billable ? (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                            <Sparkles className="w-3 h-3" />
                            Billable
                          </span>
                        ) : (
                          <span className="text-muted/60 font-mono text-[11px]">—</span>
                        )}
                      </td>

                      {/* 6. Amount */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="font-mono font-bold text-[13.5px] text-ink">
                          {formatINR(toNumber(exp.amount))}
                        </div>
                        {exp.tax_amount && toNumber(exp.tax_amount) > 0 && (
                          <div className="text-[10px] text-muted font-mono">
                            Incl. {formatINR(toNumber(exp.tax_amount))} tax
                          </div>
                        )}
                      </td>

                      {/* 7. Status */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {exp.status === "approved" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            Approved
                          </span>
                        )}
                        {exp.status === "settled" && (
                          <div className="flex flex-col items-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-blue-50 text-blue-800 border border-blue-200">
                              <Check className="w-3 h-3" />
                              Settled
                            </span>
                            {exp.settlement_reference && (
                              <span className="text-[9.5px] text-muted font-mono mt-0.5" title={exp.settlement_reference}>
                                Ref: {exp.settlement_reference}
                              </span>
                            )}
                          </div>
                        )}
                        {exp.status === "pending" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-amber-50 text-amber-800 border border-amber-200">
                            <Clock className="w-3 h-3" />
                            Pending Review
                          </span>
                        )}
                        {exp.status === "rejected" && (
                          <div className="flex flex-col items-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-rose-50 text-rose-800 border border-rose-200">
                              <X className="w-3 h-3" />
                              Rejected
                            </span>
                            {exp.manager_notes && (
                              <span className="text-[9.5px] text-rose-700/80 truncate max-w-[120px] mt-0.5" title={exp.manager_notes}>
                                "{exp.manager_notes}"
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* 8. Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Receipt Lightbox View */}
                          {exp.receipt ? (
                            <button
                              onClick={() => setLightboxExpense(exp)}
                              className="p-1.5 text-muted hover:text-ink hover:bg-bone rounded border border-line transition-colors"
                              title="View receipt"
                            >
                              <Receipt className="w-3.5 h-3.5 text-ink-2" />
                            </button>
                          ) : (
                            <span className="p-1.5 text-muted/30 cursor-not-allowed" title="No receipt uploaded">
                              <Receipt className="w-3.5 h-3.5" />
                            </span>
                          )}

                          {/* Manager: Approve / Reject for Pending */}
                          {canManage && exp.status === "pending" && (
                            <>
                              <button
                                onClick={() => handleApprove(exp)}
                                disabled={approveMutation.isPending}
                                className="px-2 py-1 text-[11px] font-semibold rounded bg-emerald-700 hover:bg-emerald-800 text-white transition-all shadow-2xs"
                                title="Approve claim"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => setRejectExpenseItem(exp)}
                                className="px-2 py-1 text-[11px] font-semibold rounded bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-all"
                                title="Reject claim"
                              >
                                Reject
                              </button>
                            </>
                          )}

                          {/* Manager: Settle / Disburse for Approved */}
                          {canManage && exp.status === "approved" && (
                            <button
                              onClick={() => {
                                setSettleExpenseItem(exp);
                                setSettleDate(new Date().toISOString().slice(0, 10));
                                setSettleReference("");
                                setSettleNotes("");
                              }}
                              className="px-2 py-1 text-[11px] font-semibold rounded bg-blue-700 hover:bg-blue-800 text-white transition-all shadow-2xs flex items-center gap-1"
                              title="Disburse payout and mark settled"
                            >
                              <Check className="w-3 h-3" />
                              Settle
                            </button>
                          )}

                          {/* Edit (Pending only) */}
                          {canEdit && (
                            <button
                              onClick={() => openEditExpenseModal(exp)}
                              className="p-1.5 text-muted hover:text-ink hover:bg-bone rounded border border-line transition-colors"
                              title="Edit claim"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Delete (Pending only) */}
                          {canDelete && (
                            <button
                              onClick={() => setDeleteExpenseItem(exp)}
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded border border-rose-200 transition-colors"
                              title="Delete claim"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Modal 1: Log / Edit Expense Dialog ───────────────────────────────── */}
      <Dialog.Root open={isLogModalOpen} onOpenChange={setIsLogModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-ink/50 backdrop-blur-xs z-50 animate-fade-in" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-paper shadow-2xl rounded-2xl border border-line z-50 p-6 md:p-8 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-line pb-4 mb-6">
              <div>
                <Dialog.Title className="font-serif text-xl font-semibold text-ink">
                  {editingExpense ? "Edit Expense Claim" : "Record Business Expense"}
                </Dialog.Title>
                <Dialog.Description className="text-xs text-muted mt-0.5">
                  Log operational costs, upload receipts, and allocate expenditure to departments or client deals.
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button className="text-muted hover:text-ink p-1 rounded-lg hover:bg-bone">
                  <X className="w-5 h-5" />
                </button>
              </Dialog.Close>
            </div>

            {/* Type Switcher Tabs */}
            <div className="flex items-center p-1 bg-bone border border-line rounded-xl mb-6">
              <button
                type="button"
                onClick={() => {
                  setFormType("reimbursement");
                  if (formPaymentMethod === "company_card" || formPaymentMethod === "company_netbanking") {
                    setFormPaymentMethod("personal_card");
                  }
                }}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all",
                  formType === "reimbursement"
                    ? "bg-paper text-ink shadow-xs"
                    : "text-muted hover:text-ink"
                )}
              >
                <Wallet className="w-4 h-4" />
                <span>Employee Out-of-Pocket Claim</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormType("company_paid");
                  if (formPaymentMethod === "personal_card") {
                    setFormPaymentMethod("company_card");
                  }
                }}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all",
                  formType === "company_paid"
                    ? "bg-paper text-ink shadow-xs"
                    : "text-muted hover:text-ink"
                )}
              >
                <CreditCard className="w-4 h-4" />
                <span>Direct Corporate Spend</span>
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="flex flex-col gap-4">
              {/* Row 1: Title & Employee Spender */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] uppercase tracking-wider font-semibold text-muted">
                    Expense Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Flight to Kochi, Client Dinner, AWS Renewal"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    required
                    className="bg-bone border border-line rounded-lg px-3 py-2 text-xs outline-none focus:border-ink"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] uppercase tracking-wider font-semibold text-muted flex items-center justify-between">
                    <span>Employee / Spender <span className="text-rose-500">*</span></span>
                    {isManager && (
                      <span className="text-[10px] text-emerald-700 font-medium lowercase">
                        {formType === "reimbursement" ? "(claimant)" : "(who spent)"}
                      </span>
                    )}
                  </label>
                  <select
                    value={formUserId}
                    onChange={(e) => setFormUserId(e.target.value)}
                    disabled={!isManager}
                    className="bg-bone border border-line rounded-lg px-3 py-2 text-xs outline-none focus:border-ink font-medium disabled:opacity-80 disabled:cursor-not-allowed"
                  >
                    {teamUsers.map((member: any) => (
                      <option key={member.id} value={member.id}>
                        👤 {member.first_name || member.name ? `${member.first_name || member.name} (${member.email})` : member.email} {member.id === user?.id ? "• You" : ""}
                      </option>
                    ))}
                    {teamUsers.length === 0 && (
                      <option value={user?.id || ""}>
                        👤 {user?.first_name || user?.email || "Current User"} • You
                      </option>
                    )}
                  </select>
                </div>
              </div>

              {/* Row 2: Merchant & Category */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] uppercase tracking-wider font-semibold text-muted">
                    Merchant / Vendor Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Indigo, Taj Hotels, Amazon, Figma"
                    value={formMerchant}
                    onChange={(e) => setFormMerchant(e.target.value)}
                    className="bg-bone border border-line rounded-lg px-3 py-2 text-xs outline-none focus:border-ink"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] uppercase tracking-wider font-semibold text-muted">
                    Expense Category
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as ExpenseClaim["category"])}
                    className="bg-bone border border-line rounded-lg px-3 py-2 text-xs outline-none focus:border-ink font-medium"
                  >
                    {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                      <option key={key} value={key}>
                        {config.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 3: Date & Payment Method */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] uppercase tracking-wider font-semibold text-muted">
                    Transaction / Expense Date
                  </label>
                  <input
                    type="date"
                    value={formExpenseDate}
                    onChange={(e) => setFormExpenseDate(e.target.value)}
                    required
                    className="bg-bone border border-line rounded-lg px-3 py-2 text-xs outline-none focus:border-ink font-mono"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] uppercase tracking-wider font-semibold text-muted">
                    Payment Method
                  </label>
                  <select
                    value={formPaymentMethod}
                    onChange={(e) => setFormPaymentMethod(e.target.value as ExpenseClaim["payment_method"])}
                    className="bg-bone border border-line rounded-lg px-3 py-2 text-xs outline-none focus:border-ink font-medium"
                  >
                    {PAYMENT_METHODS.map((method) => (
                      <option key={method.id} value={method.id}>
                        {method.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 4: Amount & Tax Portion */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] uppercase tracking-wider font-semibold text-muted">
                    Total Amount (INR) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs text-muted">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="0.00"
                      value={formAmount}
                      onChange={(e) => setFormAmount(e.target.value)}
                      required
                      className="w-full bg-bone border border-line rounded-lg pl-7 pr-3 py-2 text-xs font-mono font-bold outline-none focus:border-ink"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] uppercase tracking-wider font-semibold text-muted">
                    Tax / GST Amount (INR) <span className="text-muted/60 lowercase font-normal">(optional)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs text-muted">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={formTaxAmount}
                      onChange={(e) => setFormTaxAmount(e.target.value)}
                      className="w-full bg-bone border border-line rounded-lg pl-7 pr-3 py-2 text-xs font-mono outline-none focus:border-ink"
                    />
                  </div>
                </div>
              </div>

              {/* Row 5: CRM Deal Context */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] uppercase tracking-wider font-semibold text-muted">
                  Associate with CRM Deal <span className="text-muted/60 lowercase font-normal">(optional)</span>
                </label>
                <select
                  value={formDealId}
                  onChange={(e) => setFormDealId(e.target.value)}
                  className="bg-bone border border-line rounded-lg px-3 py-2 text-xs outline-none focus:border-ink font-medium"
                >
                  <option value="">No deal linkage</option>
                  {deals.map((d) => (
                    <option key={d.id} value={d.id}>
                      💼 {d.title} ({formatINR(toNumber(d.amount))})
                    </option>
                  ))}
                </select>
              </div>

              {/* Billable Toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg border border-line bg-bone/50">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <div>
                    <div className="text-xs font-semibold text-ink">Billable to Client</div>
                    <div className="text-[11px] text-muted">This expenditure will be billed / recharged to client or deal invoice.</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={formIsBillable}
                  onChange={(e) => setFormIsBillable(e.target.checked)}
                  className="w-4 h-4 accent-ink rounded cursor-pointer"
                />
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] uppercase tracking-wider font-semibold text-muted">
                  Notes / Business Justification
                </label>
                <textarea
                  rows={2}
                  placeholder="Details regarding purpose, project scope, attendees..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="bg-bone border border-line rounded-lg px-3 py-2 text-xs outline-none focus:border-ink"
                />
              </div>

              {/* Receipt File Upload */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] uppercase tracking-wider font-semibold text-muted">
                  Receipt / Invoice Voucher
                </label>
                <div className="border border-dashed border-line rounded-xl p-4 bg-bone/40 flex flex-col items-center justify-center gap-2 text-center">
                  {formReceiptPreview ? (
                    <div className="relative group">
                      <img
                        src={formReceiptPreview}
                        alt="Receipt preview"
                        className="h-28 w-auto max-w-full rounded-lg object-contain border border-line shadow-xs bg-paper"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setFormReceiptFile(null);
                          setFormReceiptPreview(null);
                        }}
                        className="absolute -top-2 -right-2 bg-rose-600 text-white rounded-full p-1 shadow hover:bg-rose-700"
                        title="Remove receipt"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : formReceiptFile ? (
                    <div className="flex items-center gap-2 text-xs font-semibold text-ink bg-paper px-3 py-1.5 rounded-lg border border-line">
                      <FileText className="w-4 h-4 text-ink-2" />
                      <span>{formReceiptFile.name}</span>
                      <button
                        type="button"
                        onClick={() => setFormReceiptFile(null)}
                        className="text-rose-500 hover:text-rose-700 ml-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <Receipt className="w-6 h-6 text-muted" />
                      <div className="text-xs text-muted">
                        <label className="text-ink font-semibold hover:underline cursor-pointer">
                          Upload receipt file
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={handleReceiptChange}
                            className="hidden"
                          />
                        </label>{" "}
                        or drag & drop
                      </div>
                      <div className="text-[10px] text-muted/70">PNG, JPG, or PDF up to 10MB</div>
                    </>
                  )}
                </div>
              </div>

              {formError && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-line mt-2">
                <button
                  type="button"
                  onClick={() => setIsLogModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border border-line bg-paper hover:bg-bone text-ink transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-5 py-2 text-xs font-semibold rounded-lg bg-ink hover:opacity-90 text-paper transition-all shadow-sm flex items-center gap-2"
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <span className="w-3.5 h-3.5 border-2 border-paper/30 border-t-paper rounded-full animate-spin" />
                  )}
                  <span>
                    {editingExpense
                      ? "Update Expense"
                      : formType === "company_paid" && isManager
                      ? "Record & Settle Direct Spend"
                      : "Submit Expense Claim"}
                  </span>
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* ── Modal 2: Receipt Lightbox Preview Modal ──────────────────────────── */}
      <Dialog.Root open={lightboxExpense !== null} onOpenChange={(open) => !open && setLightboxExpense(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-ink/70 backdrop-blur-xs z-50 animate-fade-in" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl max-h-[92vh] flex flex-col bg-paper shadow-2xl rounded-2xl border border-line z-50 overflow-hidden animate-in zoom-in-95 duration-200">
            {lightboxExpense && (
              <>
                <div className="p-4 px-6 border-b border-line flex items-center justify-between bg-bone/40">
                  <div className="flex items-center gap-3">
                    <Receipt className="w-5 h-5 text-ink-2" />
                    <div>
                      <Dialog.Title className="font-semibold text-sm text-ink">
                        Receipt: {lightboxExpense.title}
                      </Dialog.Title>
                      <div className="text-[11px] text-muted flex items-center gap-2">
                        {lightboxExpense.merchant && (
                          <>
                            <span>Merchant: <strong className="font-medium text-ink">{lightboxExpense.merchant}</strong></span>
                            <span>•</span>
                          </>
                        )}
                        <span>Spender: <strong className="font-medium text-ink">{lightboxExpense.user_full_name || lightboxExpense.user_email}</strong></span>
                        <span>•</span>
                        <span className="font-mono font-semibold">{formatINR(toNumber(lightboxExpense.amount))}</span>
                        <span>•</span>
                        <span>{lightboxExpense.expense_date}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {lightboxExpense.receipt && (
                      <a
                        href={lightboxExpense.receipt}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-line bg-paper hover:bg-bone text-ink transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open in New Tab</span>
                      </a>
                    )}
                    <Dialog.Close asChild>
                      <button className="text-muted hover:text-ink p-1.5 rounded-lg hover:bg-bone">
                        <X className="w-5 h-5" />
                      </button>
                    </Dialog.Close>
                  </div>
                </div>

                <div className="flex-1 p-6 overflow-auto flex items-center justify-center bg-bone/30">
                  {lightboxExpense.receipt?.toLowerCase().endsWith(".pdf") ? (
                    <iframe
                      src={lightboxExpense.receipt}
                      className="w-full h-[650px] rounded-xl border border-line bg-paper shadow-sm"
                      title="PDF Receipt Preview"
                    />
                  ) : (
                    <img
                      src={lightboxExpense.receipt || ""}
                      alt={lightboxExpense.title}
                      className="max-h-[650px] w-auto max-w-full rounded-xl object-contain border border-line bg-paper shadow-md"
                    />
                  )}
                </div>
              </>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* ── Modal 3: Settle / Disburse Claim Modal ───────────────────────────── */}
      <Dialog.Root open={settleExpenseItem !== null} onOpenChange={(open) => !open && setSettleExpenseItem(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-ink/50 backdrop-blur-xs z-50 animate-fade-in" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-paper shadow-2xl rounded-2xl border border-line z-50 p-6 animate-in zoom-in-95 duration-200">
            {settleExpenseItem && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-line pb-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-blue-600" />
                    <Dialog.Title className="font-serif text-lg font-semibold text-ink">
                      Disburse & Settle Claim
                    </Dialog.Title>
                  </div>
                  <Dialog.Close asChild>
                    <button className="text-muted hover:text-ink p-1 rounded-lg hover:bg-bone">
                      <X className="w-4 h-4" />
                    </button>
                  </Dialog.Close>
                </div>

                {/* Claim Summary Box */}
                <div className="p-3.5 rounded-xl border border-line bg-bone flex flex-col gap-1 text-xs">
                  <div className="text-muted">Reimbursement Payout For:</div>
                  <div className="font-semibold text-sm text-ink">{settleExpenseItem.user_full_name} ({settleExpenseItem.user_email})</div>
                  <div className="font-medium text-ink-2 mt-1">{settleExpenseItem.title}</div>
                  <div className="font-mono text-[16px] font-bold text-ink mt-0.5">
                    {formatINR(toNumber(settleExpenseItem.amount))}
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] uppercase tracking-wider font-semibold text-muted">
                      Settlement / Payout Date
                    </label>
                    <input
                      type="date"
                      value={settleDate}
                      onChange={(e) => setSettleDate(e.target.value)}
                      required
                      className="bg-bone border border-line rounded-lg px-3 py-2 text-xs font-mono outline-none focus:border-ink"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] uppercase tracking-wider font-semibold text-muted">
                      Payment Reference / UTR Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. HDFC-IMPS-892104, Cash voucher #12, GPay Ref"
                      value={settleReference}
                      onChange={(e) => setSettleReference(e.target.value)}
                      className="bg-bone border border-line rounded-lg px-3 py-2 text-xs outline-none focus:border-ink"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] uppercase tracking-wider font-semibold text-muted">
                      Manager Notes / Audit Memo
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Optional payout remarks..."
                      value={settleNotes}
                      onChange={(e) => setSettleNotes(e.target.value)}
                      className="bg-bone border border-line rounded-lg px-3 py-2 text-xs outline-none focus:border-ink"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-line mt-2">
                  <button
                    type="button"
                    onClick={() => setSettleExpenseItem(null)}
                    className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-line bg-paper hover:bg-bone text-ink transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmSettlement}
                    disabled={approveMutation.isPending}
                    className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-700 hover:bg-blue-800 text-white transition-all shadow-sm"
                  >
                    Confirm Payout & Settle
                  </button>
                </div>
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* ── Modal 4: Reject Claim Dialog ────────────────────────────────────── */}
      <Dialog.Root open={rejectExpenseItem !== null} onOpenChange={(open) => !open && setRejectExpenseItem(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-ink/50 backdrop-blur-xs z-50 animate-fade-in" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-paper shadow-2xl rounded-2xl border border-line z-50 p-6 animate-in zoom-in-95 duration-200">
            {rejectExpenseItem && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-line pb-3">
                  <div className="flex items-center gap-2">
                    <BadgeAlert className="w-5 h-5 text-rose-600" />
                    <Dialog.Title className="font-serif text-lg font-semibold text-ink">
                      Reject Expense Claim
                    </Dialog.Title>
                  </div>
                  <Dialog.Close asChild>
                    <button className="text-muted hover:text-ink p-1 rounded-lg hover:bg-bone">
                      <X className="w-4 h-4" />
                    </button>
                  </Dialog.Close>
                </div>

                <p className="text-xs text-muted">
                  Are you sure you want to reject the claim{" "}
                  <strong className="text-ink">"{rejectExpenseItem.title}"</strong> ({formatINR(toNumber(rejectExpenseItem.amount))}) submitted by{" "}
                  <strong className="text-ink">{rejectExpenseItem.user_full_name}</strong>?
                </p>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] uppercase tracking-wider font-semibold text-muted">
                    Rejection Reason / Auditor Feedback
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Specify why this claim cannot be reimbursed (e.g. Missing valid tax invoice, policy limit exceeded)..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="bg-bone border border-line rounded-lg px-3 py-2 text-xs outline-none focus:border-ink"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-line mt-2">
                  <button
                    type="button"
                    onClick={() => setRejectExpenseItem(null)}
                    className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-line bg-paper hover:bg-bone text-ink transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmReject}
                    disabled={approveMutation.isPending}
                    className="px-4 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition-all shadow-sm"
                  >
                    Confirm Rejection
                  </button>
                </div>
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* ── Modal 5: Delete Confirmation Dialog ─────────────────────────────── */}
      <Dialog.Root open={deleteExpenseItem !== null} onOpenChange={(open) => !open && setDeleteExpenseItem(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-ink/50 backdrop-blur-xs z-50 animate-fade-in" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-paper shadow-2xl rounded-2xl border border-line z-50 p-6 animate-in zoom-in-95 duration-200">
            {deleteExpenseItem && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 text-rose-600 border-b border-line pb-3">
                  <Trash2 className="w-5 h-5" />
                  <Dialog.Title className="font-serif text-lg font-semibold text-ink">
                    Delete Expense
                  </Dialog.Title>
                </div>

                <p className="text-xs text-muted">
                  Are you sure you want to permanently delete this pending claim:{" "}
                  <strong className="text-ink">"{deleteExpenseItem.title}"</strong> ({formatINR(toNumber(deleteExpenseItem.amount))})? This action cannot be undone.
                </p>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-line">
                  <button
                    type="button"
                    onClick={() => setDeleteExpenseItem(null)}
                    className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-line bg-paper hover:bg-bone text-ink transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDelete}
                    disabled={deleteMutation.isPending}
                    className="px-4 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition-all shadow-sm"
                  >
                    Delete Permanently
                  </button>
                </div>
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
