"use client";

import React, { useState, useMemo } from "react";
import {
  Plus,
  Search,
  Filter,
  Download,
  Trash2,
  Edit2,
  Calendar,
  ArrowDownLeft,
  FileText,
  DollarSign,
  Building2,
  Receipt,
  Wallet,
  TrendingUp,
  X,
  Loader2,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Paperclip,
} from "lucide-react";

import {
  useIncomes,
  useCreateIncome,
  useUpdateIncome,
  useDeleteIncome,
  useCurrentUser,
  Income,
} from "@/lib/queries";
import { cn, formatINR, formatCompactINR } from "@/lib/utils";
import { toast } from "sonner";

const CATEGORIES = [
  { value: "all", label: "All Categories" },
  { value: "retainer", label: "Client Retainer", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { value: "consulting", label: "Consulting / Service", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  { value: "commission", label: "Commission / Referral", color: "bg-purple-50 text-purple-700 border-purple-200" },
  { value: "investment", label: "Investment / Dividends", color: "bg-blue-50 text-blue-700 border-blue-200" },
  { value: "affiliate", label: "Affiliate / Ad Revenue", color: "bg-amber-50 text-amber-700 border-amber-200" },
  { value: "grant", label: "Grant / Subsidy", color: "bg-teal-50 text-teal-700 border-teal-200" },
  { value: "interest", label: "Bank Interest", color: "bg-cyan-50 text-cyan-700 border-cyan-200" },
  { value: "refund", label: "Vendor Refund", color: "bg-rose-50 text-rose-700 border-rose-200" },
  { value: "capital", label: "Owner Capital / Equity", color: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200" },
  { value: "other", label: "Other Miscellaneous", color: "bg-bone-2 text-ink-2 border-line" },
];

const PAYMENT_METHODS = [
  { value: "all", label: "All Payment Methods" },
  { value: "bank_transfer", label: "Bank Transfer / NEFT / IMPS" },
  { value: "upi", label: "UPI / QR Code" },
  { value: "cash", label: "Cash" },
  { value: "cheque", label: "Cheque" },
  { value: "card", label: "Credit / Debit Card" },
  { value: "other", label: "Other" },
];

export default function IncomePage() {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedMethod, setSelectedMethod] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);

  // Delete confirm state
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState<string>("");
  const [formAmount, setFormAmount] = useState<string>("");
  const [formDate, setFormDate] = useState<string>(now.toISOString().split("T")[0]);
  const [formCategory, setFormCategory] = useState<string>("consulting");
  const [formReceivedFrom, setFormReceivedFrom] = useState<string>("");
  const [formPaymentMethod, setFormPaymentMethod] = useState<string>("bank_transfer");
  const [formReference, setFormReference] = useState<string>("");
  const [formNotes, setFormNotes] = useState<string>("");
  const [formReceipt, setFormReceipt] = useState<File | null>(null);

  const { data: user } = useCurrentUser();
  const { data: rawIncomes, isLoading } = useIncomes();
  const createIncomeMutation = useCreateIncome();
  const updateIncomeMutation = useUpdateIncome();
  const deleteIncomeMutation = useDeleteIncome();

  const incomesList: Income[] = useMemo(() => {
    if (!rawIncomes) return [];
    if (Array.isArray(rawIncomes)) return rawIncomes;
    return (rawIncomes as any)?.results || [];
  }, [rawIncomes]);

  // Filtered incomes
  const filteredIncomes = useMemo(() => {
    return incomesList.filter((item) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchFrom = (item.received_from || "").toLowerCase().includes(q);
        const matchRef = (item.reference || "").toLowerCase().includes(q);
        const matchNotes = (item.notes || "").toLowerCase().includes(q);
        if (!matchTitle && !matchFrom && !matchRef && !matchNotes) return false;
      }

      // Category
      if (selectedCategory !== "all" && item.category !== selectedCategory) {
        return false;
      }

      // Payment method
      if (selectedMethod !== "all" && item.payment_method !== selectedMethod) {
        return false;
      }

      // Date filtering
      if (item.date) {
        const itemDate = new Date(item.date);
        if (itemDate.getFullYear() !== selectedYear) {
          return false;
        }
        if (selectedMonth !== "all" && itemDate.getMonth() + 1 !== Number(selectedMonth)) {
          return false;
        }
      }

      return true;
    });
  }, [incomesList, searchQuery, selectedCategory, selectedMethod, selectedYear, selectedMonth]);

  // Metrics
  const currentMonthNum = now.getMonth() + 1;
  const currentMonthTotal = useMemo(() => {
    return incomesList
      .filter((item) => {
        if (!item.date) return false;
        const d = new Date(item.date);
        return d.getFullYear() === now.getFullYear() && d.getMonth() + 1 === currentMonthNum;
      })
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  }, [incomesList, currentMonthNum]);

  const yearTotal = useMemo(() => {
    return incomesList
      .filter((item) => {
        if (!item.date) return false;
        const d = new Date(item.date);
        return d.getFullYear() === selectedYear;
      })
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  }, [incomesList, selectedYear]);

  const avgTransaction = useMemo(() => {
    if (filteredIncomes.length === 0) return 0;
    const total = filteredIncomes.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    return Math.round(total / filteredIncomes.length);
  }, [filteredIncomes]);

  const openCreateModal = () => {
    setEditingIncome(null);
    setFormTitle("");
    setFormAmount("");
    setFormDate(now.toISOString().split("T")[0]);
    setFormCategory("consulting");
    setFormReceivedFrom("");
    setFormPaymentMethod("bank_transfer");
    setFormReference("");
    setFormNotes("");
    setFormReceipt(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item: Income) => {
    setEditingIncome(item);
    setFormTitle(item.title);
    setFormAmount(String(item.amount));
    setFormDate(item.date || now.toISOString().split("T")[0]);
    setFormCategory(item.category || "other");
    setFormReceivedFrom(item.received_from || "");
    setFormPaymentMethod(item.payment_method || "bank_transfer");
    setFormReference(item.reference || "");
    setFormNotes(item.notes || "");
    setFormReceipt(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      toast.error("Please enter a title for this income record.");
      return;
    }
    const parsedAmount = parseFloat(formAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Please enter a valid amount greater than zero.");
      return;
    }

    const formData = new FormData();
    formData.append("title", formTitle.trim());
    formData.append("amount", parsedAmount.toFixed(2));
    formData.append("date", formDate);
    formData.append("category", formCategory);
    formData.append("received_from", formReceivedFrom.trim());
    formData.append("payment_method", formPaymentMethod);
    formData.append("reference", formReference.trim());
    formData.append("notes", formNotes.trim());
    if (formReceipt) {
      formData.append("receipt", formReceipt);
    }

    try {
      if (editingIncome) {
        await updateIncomeMutation.mutateAsync({ id: editingIncome.id, payload: formData });
        toast.success("Income record updated successfully.");
      } else {
        await createIncomeMutation.mutateAsync(formData);
        toast.success("Direct income recorded successfully.");
      }
      setIsModalOpen(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to save income record.");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteIncomeMutation.mutateAsync(id);
      toast.success("Income record deleted.");
      setDeletingId(null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete record.");
    }
  };

  const handleExportCSV = () => {
    if (filteredIncomes.length === 0) {
      toast.error("No income records to export.");
      return;
    }
    const headers = ["ID", "Title", "Amount (INR)", "Date", "Category", "Received From", "Payment Method", "Reference", "Notes"];
    const rows = filteredIncomes.map((item) => [
      item.id,
      `"${item.title.replace(/"/g, '""')}"`,
      Number(item.amount).toFixed(2),
      item.date,
      item.category_display || item.category,
      `"${(item.received_from || "").replace(/"/g, '""')}"`,
      item.payment_method,
      `"${(item.reference || "").replace(/"/g, '""')}"`,
      `"${(item.notes || "").replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Income_Records_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-[1400px] mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-line pb-6">
        <div>
          <div className="flex items-center gap-2 text-muted text-[12.5px] uppercase tracking-wider font-semibold mb-1">
            <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
            <span>Revenue Operations</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-serif text-ink tracking-tight font-medium">
            Income &amp; Direct Revenue
          </h1>
          <p className="text-[13.5px] text-muted mt-1 max-w-xl">
            Record direct client payments, consulting fees, retainers, and miscellaneous revenue without raising an invoice.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 border border-line bg-paper text-ink text-[13px] rounded-lg hover:bg-bone-1 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-muted" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-[13.5px] font-medium rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Record Income</span>
          </button>
        </div>
      </div>

      {/* KPI Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Month Inflow */}
        <div className="bg-paper border border-line rounded-xl p-5 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[12.5px] text-muted font-medium">This Month&apos;s Direct Income</span>
            <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl lg:text-3xl font-serif text-emerald-700 font-medium tracking-tight">
              {formatINR(currentMonthTotal)}
            </div>
            <div className="text-[12px] text-muted mt-1">
              Recorded in {now.toLocaleString("default", { month: "long" })} {now.getFullYear()}
            </div>
          </div>
        </div>

        {/* 2. Annual Total */}
        <div className="bg-paper border border-line rounded-xl p-5 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[12.5px] text-muted font-medium">Annual Direct Total ({selectedYear})</span>
            <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl lg:text-3xl font-serif text-ink font-medium tracking-tight">
              {formatINR(yearTotal)}
            </div>
            <div className="text-[12px] text-muted mt-1 font-mono">
              Total YTD Direct Receipts
            </div>
          </div>
        </div>

        {/* 3. Average Inflow */}
        <div className="bg-paper border border-line rounded-xl p-5 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[12.5px] text-muted font-medium">Average Receipt Value</span>
            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl lg:text-3xl font-serif text-ink font-medium tracking-tight">
              {formatINR(avgTransaction)}
            </div>
            <div className="text-[12px] text-muted mt-1">
              Per recorded transaction
            </div>
          </div>
        </div>

        {/* 4. Transactions Count */}
        <div className="bg-paper border border-line rounded-xl p-5 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[12.5px] text-muted font-medium">Recorded Incomes</span>
            <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl lg:text-3xl font-serif text-ink font-medium tracking-tight">
              {filteredIncomes.length}
            </div>
            <div className="text-[12px] text-muted mt-1">
              Active ledger entries
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-paper border border-line rounded-xl p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search income, source, ref..."
            className="w-full bg-bone-1/60 border border-line rounded-lg pl-9 pr-3 py-1.5 text-[13px] text-ink placeholder:text-muted/70 focus:outline-none focus:ring-1 focus:ring-ink"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-paper border border-line text-ink text-[12.5px] rounded-lg px-2.5 py-1.5 shadow-2xs cursor-pointer focus:outline-none focus:ring-1 focus:ring-ink"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>

          {/* Payment Method */}
          <select
            value={selectedMethod}
            onChange={(e) => setSelectedMethod(e.target.value)}
            className="bg-paper border border-line text-ink text-[12.5px] rounded-lg px-2.5 py-1.5 shadow-2xs cursor-pointer focus:outline-none focus:ring-1 focus:ring-ink"
          >
            {PAYMENT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>

          {/* Year selector */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="bg-paper border border-line text-ink text-[12.5px] rounded-lg px-2.5 py-1.5 shadow-2xs cursor-pointer focus:outline-none focus:ring-1 focus:ring-ink font-mono"
          >
            {[now.getFullYear() - 2, now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Income Records Ledger Table */}
      <div className="bg-paper border border-line rounded-xl shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-ink-2" />
            <p className="text-[14px] text-muted font-serif">Loading direct income records...</p>
          </div>
        ) : filteredIncomes.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-bone-2 text-muted flex items-center justify-center mx-auto mb-3">
              <ArrowDownLeft className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-[17px] text-ink font-medium">No Income Entries Recorded</h3>
            <p className="text-[13px] text-muted max-w-md mx-auto mt-1 mb-5">
              {searchQuery || selectedCategory !== "all"
                ? "No income records matched your search filters."
                : "Record your first direct cash, retainer, or non-invoice revenue entry to track it on your Finance Dashboard."}
            </p>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-[13px] font-medium rounded-lg shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Record Income</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-bone-1/70 border-b border-line text-muted font-mono text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-5 font-semibold">Date</th>
                  <th className="py-3 px-5 font-semibold">Income Title &amp; Details</th>
                  <th className="py-3 px-5 font-semibold">Category</th>
                  <th className="py-3 px-5 font-semibold">Received From</th>
                  <th className="py-3 px-5 font-semibold">Payment Method</th>
                  <th className="py-3 px-5 font-semibold text-right">Amount (₹)</th>
                  <th className="py-3 px-5 font-semibold text-center">Receipt</th>
                  <th className="py-3 px-5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {filteredIncomes.map((item) => {
                  const catObj = CATEGORIES.find((c) => c.value === item.category);
                  const methodObj = PAYMENT_METHODS.find((m) => m.value === item.payment_method);

                  return (
                    <tr key={item.id} className="hover:bg-bone-1/50 transition-colors">
                      <td className="py-3.5 px-5 whitespace-nowrap font-mono text-muted text-[12px]">
                        {item.date}
                      </td>

                      <td className="py-3.5 px-5">
                        <div className="font-semibold text-ink text-[13.5px]">
                          {item.title}
                        </div>
                        {item.notes && (
                          <div className="text-[12px] text-muted line-clamp-1 mt-0.5">
                            {item.notes}
                          </div>
                        )}
                        <div className="text-[11px] text-muted/80 font-mono mt-0.5">
                          Logged by {item.created_by_name || "Admin"}
                        </div>
                      </td>

                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <span className={cn(
                          "px-2.5 py-0.5 rounded-full text-[11.5px] border font-medium",
                          catObj?.color || "bg-bone-2 text-ink-2 border-line"
                        )}>
                          {item.category_display || catObj?.label || item.category}
                        </span>
                      </td>

                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <span className="text-ink font-medium">
                          {item.received_from || "—"}
                        </span>
                      </td>

                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <div className="text-ink-2">
                          {methodObj?.label || item.payment_method}
                        </div>
                        {item.reference && (
                          <div className="text-[11px] font-mono text-muted">
                            Ref: {item.reference}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-5 text-right whitespace-nowrap font-mono font-semibold text-emerald-700 text-[14px]">
                        +{formatINR(Number(item.amount))}
                      </td>

                      <td className="py-3.5 px-5 text-center whitespace-nowrap">
                        {item.receipt ? (
                          <a
                            href={item.receipt}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11.5px] text-indigo-600 hover:text-indigo-800 underline"
                          >
                            <Paperclip className="w-3.5 h-3.5" />
                            <span>View</span>
                          </a>
                        ) : (
                          <span className="text-muted text-[12px]">None</span>
                        )}
                      </td>

                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(item)}
                            title="Edit Record"
                            className="p-1.5 rounded-md hover:bg-bone-2 text-muted hover:text-ink transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeletingId(item.id)}
                            title="Delete Record"
                            className="p-1.5 rounded-md hover:bg-rose-50 text-muted hover:text-rose-600 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record / Edit Income Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-paper border border-line rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-line flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <ArrowDownLeft className="w-4 h-4" />
                </div>
                <h3 className="font-serif text-[18px] text-ink font-medium">
                  {editingIncome ? "Edit Direct Income" : "Record Direct Income"}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-muted hover:text-ink p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-[12.5px] font-medium text-ink mb-1">
                  Income Description / Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Q4 Consulting Advance, Client Retainer, Google AdSense"
                  className="w-full bg-bone-1/50 border border-line rounded-lg px-3 py-2 text-[13px] text-ink focus:outline-none focus:ring-1 focus:ring-ink"
                />
              </div>

              {/* Amount & Date Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12.5px] font-medium text-ink mb-1">
                    Amount (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    placeholder="25000.00"
                    className="w-full bg-bone-1/50 border border-line rounded-lg px-3 py-2 text-[13px] text-ink font-mono focus:outline-none focus:ring-1 focus:ring-ink"
                  />
                </div>

                <div>
                  <label className="block text-[12.5px] font-medium text-ink mb-1">
                    Receipt Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full bg-bone-1/50 border border-line rounded-lg px-3 py-2 text-[13px] text-ink font-mono focus:outline-none focus:ring-1 focus:ring-ink"
                  />
                </div>
              </div>

              {/* Category & Payment Method Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12.5px] font-medium text-ink mb-1">
                    Income Category
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full bg-bone-1/50 border border-line rounded-lg px-3 py-2 text-[13px] text-ink focus:outline-none focus:ring-1 focus:ring-ink"
                  >
                    {CATEGORIES.filter((c) => c.value !== "all").map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[12.5px] font-medium text-ink mb-1">
                    Payment Method
                  </label>
                  <select
                    value={formPaymentMethod}
                    onChange={(e) => setFormPaymentMethod(e.target.value)}
                    className="w-full bg-bone-1/50 border border-line rounded-lg px-3 py-2 text-[13px] text-ink focus:outline-none focus:ring-1 focus:ring-ink"
                  >
                    {PAYMENT_METHODS.filter((m) => m.value !== "all").map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Received From & Reference Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12.5px] font-medium text-ink mb-1">
                    Received From (Client / Source)
                  </label>
                  <input
                    type="text"
                    value={formReceivedFrom}
                    onChange={(e) => setFormReceivedFrom(e.target.value)}
                    placeholder="e.g. Acme Corporation, HDFC Bank"
                    className="w-full bg-bone-1/50 border border-line rounded-lg px-3 py-2 text-[13px] text-ink focus:outline-none focus:ring-1 focus:ring-ink"
                  />
                </div>

                <div>
                  <label className="block text-[12.5px] font-medium text-ink mb-1">
                    UTR / Cheque / Transaction Ref
                  </label>
                  <input
                    type="text"
                    value={formReference}
                    onChange={(e) => setFormReference(e.target.value)}
                    placeholder="e.g. UTR1234567890"
                    className="w-full bg-bone-1/50 border border-line rounded-lg px-3 py-2 text-[13px] text-ink font-mono focus:outline-none focus:ring-1 focus:ring-ink"
                  />
                </div>
              </div>

              {/* Receipt File */}
              <div>
                <label className="block text-[12.5px] font-medium text-ink mb-1">
                  Proof Receipt / Deposit Slip (Optional)
                </label>
                <input
                  type="file"
                  onChange={(e) => setFormReceipt(e.target.files?.[0] || null)}
                  className="w-full text-[12.5px] text-muted file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-[12px] file:font-medium file:bg-bone-2 file:text-ink hover:file:bg-bone-1"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[12.5px] font-medium text-ink mb-1">
                  Notes / Remarks
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Additional context or contract details..."
                  className="w-full bg-bone-1/50 border border-line rounded-lg px-3 py-2 text-[13px] text-ink focus:outline-none focus:ring-1 focus:ring-ink"
                />
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-line flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-line rounded-lg text-[13px] text-ink hover:bg-bone-1 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createIncomeMutation.isPending || updateIncomeMutation.isPending}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-[13px] font-medium flex items-center gap-1.5 disabled:opacity-60 transition-colors"
                >
                  {(createIncomeMutation.isPending || updateIncomeMutation.isPending) && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  )}
                  <span>{editingIncome ? "Update Income" : "Save Income"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId !== null && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-paper border border-line rounded-xl shadow-xl p-6 max-w-sm w-full animate-in fade-in zoom-in-95 duration-150">
            <h4 className="font-serif text-[17px] text-ink font-medium">Delete Income Record?</h4>
            <p className="text-[13px] text-muted mt-2">
              This will permanently remove this income entry and re-compute your financial totals. Are you sure?
            </p>
            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setDeletingId(null)}
                className="px-3.5 py-1.5 border border-line rounded-lg text-[12.5px] text-ink hover:bg-bone-1 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deletingId)}
                disabled={deleteIncomeMutation.isPending}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[12.5px] font-medium flex items-center gap-1.5 transition-colors"
              >
                {deleteIncomeMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
