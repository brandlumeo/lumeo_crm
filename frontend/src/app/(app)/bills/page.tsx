"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { 
  Plus, 
  Search, 
  Check, 
  ExternalLink, 
  Download, 
  Trash2, 
  Loader2, 
  Edit2, 
  ShoppingBag,
  CreditCard,
  Eye,
  AlertTriangle,
  Clock,
  Calendar,
  CheckCircle2,
  Building2,
  Paperclip,
  X,
  Receipt,
  Tag,
  Printer
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";

import { 
  useBillPage, 
  useBillKPIs, 
  useVendorPage, 
  useCurrentCompany,
  useRecordBillPayment,
  useDeleteBillPayment,
  type Bill
} from "@/lib/queries";
import { 
  createBill, 
  updateBill, 
  deleteBill, 
  updateBillStatus,
  downloadBillPdf,
  openBillPdfInNewTab
} from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { PageShell } from "@/components/page-shell";
import { EmptyState } from "@/components/empty-state";
import { SkeletonTable } from "@/components/skeleton-table";

const BILL_CATEGORIES: Record<string, string> = {
  software: "Software & Cloud",
  office: "Office & Rent",
  raw_materials: "Raw Materials & Supplies",
  equipment: "Equipment & Hardware",
  marketing: "Marketing & Advertising",
  legal: "Legal & Professional",
  logistics: "Logistics & Shipping",
  maintenance: "Repairs & Maintenance",
  utilities: "Utilities & Internet",
  other: "Other Expenses",
};

const PAYMENT_METHODS: { value: string; label: string }[] = [
  { value: "bank_transfer", label: "Bank Transfer (NEFT/RTGS/IMPS)" },
  { value: "upi", label: "UPI / QR Code" },
  { value: "cheque", label: "Cheque" },
  { value: "credit_card", label: "Corporate Credit Card" },
  { value: "debit_card", label: "Debit Card" },
  { value: "cash", label: "Cash" },
  { value: "other", label: "Other" },
];

function getDueStatus(dueDateStr: string | null | undefined, billStatus: string) {
  if (billStatus === "paid") return { label: "Paid", color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 };
  if (billStatus === "cancelled") return { label: "Cancelled", color: "bg-gray-100 text-gray-600 border-gray-200", icon: X };
  if (!dueDateStr) return { label: "No Due Date", color: "bg-bone-2 text-muted border-line", icon: Clock };
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDateStr);
  due.setHours(0, 0, 0, 0);
  
  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) {
    const overdueDays = Math.abs(diffDays);
    return { 
      label: `${overdueDays}d overdue`, 
      color: "bg-rose-50 text-rose-700 border-rose-200 font-semibold", 
      icon: AlertTriangle,
      isOverdue: true 
    };
  } else if (diffDays === 0) {
    return { 
      label: "Due today", 
      color: "bg-amber-50 text-amber-800 border-amber-200 font-semibold", 
      icon: Clock,
      isDueSoon: true 
    };
  } else if (diffDays <= 7) {
    return { 
      label: `Due in ${diffDays}d`, 
      color: "bg-amber-50/70 text-amber-700 border-amber-200/60", 
      icon: Clock,
      isDueSoon: true 
    };
  } else {
    return { 
      label: `Due ${dueDateStr}`, 
      color: "bg-bone text-muted border-line", 
      icon: Calendar 
    };
  }
}

export default function BillsPage() {
  const queryClient = useQueryClient();
  const { data: company } = useCurrentCompany();
  const currency = company?.currency || "INR";

  // Filter & tab states
  const [activeTab, setActiveTab] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedVendor, setSelectedVendor] = useState<string>("all");

  // Query params
  const queryParams = useMemo(() => {
    const p: any = { limit: 100 };
    if (activeTab === "overdue") {
      p.status = "overdue";
    } else if (activeTab !== "all") {
      p.status = activeTab;
    }
    if (selectedCategory !== "all") {
      p.category = selectedCategory;
    }
    if (selectedVendor !== "all") {
      p.vendor = selectedVendor;
    }
    return p;
  }, [activeTab, selectedCategory, selectedVendor]);

  const { data, isLoading } = useBillPage(queryParams);
  const { data: kpisData, isLoading: isKpisLoading } = useBillKPIs();
  const { data: vendorData } = useVendorPage({ limit: 200 });

  const vendors = vendorData?.results || [];

  // Local client-side search filtering
  const billList = useMemo(() => {
    const list: Bill[] = data?.results || [];
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter((b) => 
      b.bill_number.toLowerCase().includes(q) ||
      (b.vendor_details?.name && b.vendor_details.name.toLowerCase().includes(q)) ||
      (b.notes && b.notes.toLowerCase().includes(q)) ||
      (b.category && b.category.toLowerCase().includes(q))
    );
  }, [data?.results, searchQuery]);

  // Modal / Drawer states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editBillId, setEditBillId] = useState<number | null>(null);
  const [deleteBillId, setDeleteBillId] = useState<number | null>(null);
  const [detailBill, setDetailBill] = useState<Bill | null>(null);
  const [paymentBill, setPaymentBill] = useState<Bill | null>(null);

  // Payment Form state
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [paymentMethod, setPaymentMethod] = useState<string>("bank_transfer");
  const [transactionId, setTransactionId] = useState<string>("");
  const [paymentNotes, setPaymentNotes] = useState<string>("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  // New/Edit Bill form state
  const [newBill, setNewBill] = useState<{
    vendor: number | null;
    bill_date: string;
    due_date: string;
    category: string;
    payment_terms: string;
    status: string;
    notes: string;
    attachmentFile: File | null;
    existingAttachment?: string | null;
    items: { description: string; quantity: number; unit_price: number; tax_rate: number }[];
  }>({
    vendor: null,
    bill_date: new Date().toISOString().split("T")[0],
    due_date: "",
    category: "other",
    payment_terms: "Net 30",
    status: "draft",
    notes: "",
    attachmentFile: null,
    items: [{ description: "", quantity: 1, unit_price: 0, tax_rate: 0 }],
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: createBill,
    onSuccess: () => {
      setIsModalOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      toast.success("Bill created successfully");
    },
    onError: (err: any) => {
      const data = err.response?.data;
      const errorMsg = data?.error || (data && typeof data === "object" ? Object.entries(data).map(([k, v]) => `${k}: ${v}`).join(", ") : "Failed to create Bill");
      toast.error(errorMsg);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) => updateBill(id, payload),
    onSuccess: (updated) => {
      setIsModalOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      if (detailBill?.id === updated.id) {
        setDetailBill(updated);
      }
      toast.success("Bill updated successfully");
    },
    onError: (err: any) => {
      const data = err.response?.data;
      const errorMsg = data?.error || (data && typeof data === "object" ? Object.entries(data).map(([k, v]) => `${k}: ${v}`).join(", ") : "Failed to update Bill");
      toast.error(errorMsg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBill,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      if (detailBill?.id === deleteBillId) {
        setDetailBill(null);
      }
      toast.success("Bill deleted");
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => updateBillStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      toast.success("Status updated");
    },
  });

  const recordPaymentMutation = useRecordBillPayment();
  const deletePaymentMutation = useDeleteBillPayment();

  // Reset form
  const resetForm = () => {
    setEditBillId(null);
    setNewBill({
      vendor: null,
      bill_date: new Date().toISOString().split("T")[0],
      due_date: "",
      category: "other",
      payment_terms: "Net 30",
      status: "draft",
      notes: "",
      attachmentFile: null,
      items: [{ description: "", quantity: 1, unit_price: 0, tax_rate: 0 }],
    });
  };

  const handleEditClick = (bill: Bill) => {
    setEditBillId(bill.id);
    setNewBill({
      vendor: bill.vendor,
      bill_date: bill.bill_date,
      due_date: bill.due_date || "",
      category: bill.category || "other",
      payment_terms: bill.payment_terms || "Net 30",
      status: bill.status,
      notes: bill.notes || "",
      attachmentFile: null,
      existingAttachment: bill.attachment,
      items: bill.items && bill.items.length > 0 
        ? bill.items.map((item) => ({
            description: item.description,
            quantity: parseFloat(String(item.quantity)),
            unit_price: parseFloat(String(item.unit_price)),
            tax_rate: parseFloat(String(item.tax_rate)),
          }))
        : [{ description: "", quantity: 1, unit_price: 0, tax_rate: 0 }],
    });
    setIsModalOpen(true);
  };

  const calculateSubtotal = () => {
    return newBill.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  };

  const calculateTax = () => {
    return newBill.items.reduce((sum, item) => sum + item.quantity * item.unit_price * (item.tax_rate / 100), 0);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const handleCreateOrUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBill.vendor) {
      toast.error("Please select a vendor");
      return;
    }

    const validItems = newBill.items.filter((item) => item.description.trim() !== "");
    if (validItems.length === 0) {
      toast.error("Please add at least one line item with a description");
      return;
    }

    const formData = new FormData();
    formData.append("vendor", String(newBill.vendor));
    formData.append("bill_date", newBill.bill_date);
    if (newBill.due_date) formData.append("due_date", newBill.due_date);
    formData.append("category", newBill.category);
    formData.append("payment_terms", newBill.payment_terms);
    formData.append("status", newBill.status);
    formData.append("notes", newBill.notes || "");
    formData.append("subtotal", calculateSubtotal().toFixed(2));
    formData.append("tax_amount", calculateTax().toFixed(2));
    formData.append("total_amount", calculateTotal().toFixed(2));
    formData.append("items", JSON.stringify(validItems));

    if (newBill.attachmentFile) {
      formData.append("attachment", newBill.attachmentFile);
    }

    if (editBillId) {
      updateMutation.mutate({ id: editBillId, payload: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const openPaymentModal = (bill: Bill) => {
    setPaymentBill(bill);
    setPaymentAmount(String(bill.amount_due));
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setPaymentMethod("bank_transfer");
    setTransactionId("");
    setPaymentNotes("");
    setReceiptFile(null);
  };

  const handleRecordPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentBill) return;

    const amt = parseFloat(paymentAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Please enter a valid payment amount greater than 0");
      return;
    }

    const formData = new FormData();
    formData.append("amount", amt.toFixed(2));
    formData.append("payment_date", paymentDate);
    formData.append("payment_method", paymentMethod);
    if (transactionId) formData.append("transaction_id", transactionId);
    if (paymentNotes) formData.append("notes", paymentNotes);
    if (receiptFile) formData.append("receipt", receiptFile);

    recordPaymentMutation.mutate(
      { id: paymentBill.id, payload: formData },
      {
        onSuccess: (updated) => {
          toast.success(`Payment of ${formatCurrency(amt, currency)} recorded`);
          setPaymentBill(null);
          if (detailBill?.id === updated.id) {
            setDetailBill(updated);
          }
        },
        onError: (err: any) => {
          const errData = err.response?.data;
          toast.error(errData?.error || "Failed to record payment");
        },
      }
    );
  };

  const handleDeletePayment = (paymentId: number) => {
    if (!detailBill) return;
    if (!confirm("Are you sure you want to remove this payment entry? The bill balance will be automatically adjusted.")) return;

    deletePaymentMutation.mutate(
      { billId: detailBill.id, paymentId },
      {
        onSuccess: (updated) => {
          toast.success("Payment record deleted and bill re-calculated");
          setDetailBill(updated);
        },
        onError: () => toast.error("Failed to delete payment"),
      }
    );
  };

  const handleViewPdf = async (bill: Bill) => {
    try {
      toast.loading("Opening voucher preview...", { id: `pdf-view-${bill.id}` });
      await openBillPdfInNewTab(bill.id);
      toast.dismiss(`pdf-view-${bill.id}`);
    } catch {
      toast.error("Failed to open PDF voucher", { id: `pdf-view-${bill.id}` });
    }
  };

  const handleDownloadPdf = async (bill: Bill) => {
    try {
      toast.loading("Generating printable voucher...", { id: `pdf-${bill.id}` });
      await downloadBillPdf(bill.id, bill.bill_number);
      toast.success("Voucher downloaded", { id: `pdf-${bill.id}` });
    } catch {
      toast.error("Failed to download PDF voucher", { id: `pdf-${bill.id}` });
    }
  };

  return (
    <PageShell
      eyebrow="Finance"
      title="Bills"
      description="Accounts payable workflow, vendor invoices, payment schedules, and expense records."
    >
      <div className="space-y-6">
        {/* Executive Accounts Payable (AP) KPI Ribbon */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
          {/* Card 1: Total Outstanding */}
          <div className="bg-paper border border-line rounded-xl p-5 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between text-muted mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Outstanding</span>
              <div className="w-8 h-8 rounded-lg bg-bone-2 flex items-center justify-center text-ink border border-line">
                <Receipt className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-semibold font-serif text-ink tracking-tight">
              {isKpisLoading ? "—" : formatCurrency(kpisData?.total_outstanding || 0, currency)}
            </div>
            <div className="text-xs text-muted mt-2 flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
              <span>Pending vendor disbursements</span>
            </div>
          </div>

          {/* Card 2: Overdue Bills */}
          <div className={`border rounded-xl p-5 shadow-xs relative overflow-hidden transition-colors ${
            (kpisData?.overdue_count || 0) > 0 
              ? "bg-rose-50/50 border-rose-200" 
              : "bg-paper border-line"
          }`}>
            <div className="flex items-center justify-between text-muted mb-2">
              <span className={`text-xs font-semibold uppercase tracking-wider ${
                (kpisData?.overdue_count || 0) > 0 ? "text-rose-700" : "text-muted"
              }`}>
                Overdue AP
              </span>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
                (kpisData?.overdue_count || 0) > 0 
                  ? "bg-rose-100 text-rose-700 border-rose-300" 
                  : "bg-bone-2 text-ink border-line"
              }`}>
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className={`text-2xl font-semibold font-serif tracking-tight ${
              (kpisData?.overdue_count || 0) > 0 ? "text-rose-800" : "text-ink"
            }`}>
              {isKpisLoading ? "—" : formatCurrency(kpisData?.overdue_amount || 0, currency)}
            </div>
            <div className="text-xs mt-2 flex items-center gap-1.5">
              {(kpisData?.overdue_count || 0) > 0 ? (
                <span className="text-rose-700 font-medium flex items-center gap-1">
                  ⚠️ {kpisData?.overdue_count} {kpisData?.overdue_count === 1 ? "bill requires" : "bills require"} immediate action
                </span>
              ) : (
                <span className="text-emerald-700 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> All payments on schedule
                </span>
              )}
            </div>
          </div>

          {/* Card 3: Due Next 7 Days */}
          <div className="bg-paper border border-line rounded-xl p-5 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between text-muted mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Due in 7 Days</span>
              <div className="w-8 h-8 rounded-lg bg-bone-2 flex items-center justify-center text-ink border border-line">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-semibold font-serif text-ink tracking-tight">
              {isKpisLoading ? "—" : formatCurrency(kpisData?.due_next_7_days || 0, currency)}
            </div>
            <div className="text-xs text-muted mt-2 flex items-center gap-1.5">
              <span>Short-term cash outflow need</span>
            </div>
          </div>

          {/* Card 4: Paid This Month */}
          <div className="bg-paper border border-line rounded-xl p-5 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between text-muted mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Paid This Month</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-semibold font-serif text-emerald-700 tracking-tight">
              {isKpisLoading ? "—" : formatCurrency(kpisData?.paid_this_month || 0, currency)}
            </div>
            <div className="text-xs text-muted mt-2 flex items-center gap-1.5">
              <span className="text-emerald-600 font-medium">Disbursed successfully</span>
            </div>
          </div>
        </div>

        {/* Main Card with Tabs, Search, Filters & Table */}
        <div className="bg-paper border border-line rounded-xl overflow-hidden shadow-xs animate-rise">
          {/* Header Bar */}
          <div className="p-4 border-b border-line flex flex-col md:flex-row md:items-center justify-between gap-4 bg-bone">
            {/* Status Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              {[
                { key: "all", label: "All Bills", count: kpisData?.counts.all },
                { key: "open", label: "Open", count: kpisData?.counts.open },
                { key: "partial", label: "Partially Paid", count: kpisData?.counts.partial },
                { key: "overdue", label: "Overdue", count: kpisData?.counts.overdue, isAlert: (kpisData?.counts.overdue || 0) > 0 },
                { key: "paid", label: "Paid", count: kpisData?.counts.paid },
                { key: "draft", label: "Drafts", count: kpisData?.counts.draft },
              ].map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                      isActive
                        ? "bg-ink text-paper shadow-xs"
                        : tab.isAlert
                        ? "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
                        : "text-muted hover:text-ink hover:bg-bone-2"
                    }`}
                  >
                    <span>{tab.label}</span>
                    {typeof tab.count === "number" && (
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                        isActive
                          ? "bg-white/20 text-white"
                          : tab.isAlert
                          ? "bg-rose-200 text-rose-800"
                          : "bg-bone-2 text-muted"
                      }`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Create New Bill Button */}
            <div className="flex items-center gap-2">
              <button
                className="bg-ink text-paper px-4 py-2 rounded-lg text-xs md:text-sm font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-xs whitespace-nowrap"
                onClick={() => {
                  resetForm();
                  setIsModalOpen(true);
                }}
              >
                <Plus className="w-4 h-4" />
                <span>New Bill</span>
              </button>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="p-3 border-b border-line bg-paper flex flex-col sm:flex-row items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                placeholder="Search by bill #, vendor, or notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-bone border border-line rounded-lg text-xs md:text-sm outline-none focus:border-ink transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category Filter */}
            <div className="w-full sm:w-auto min-w-[180px]">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-1.5 bg-bone border border-line rounded-lg text-xs md:text-sm outline-none focus:border-ink transition-colors cursor-pointer text-ink"
              >
                <option value="all">All Categories</option>
                {Object.entries(BILL_CATEGORIES).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Vendor Filter */}
            <div className="w-full sm:w-auto min-w-[180px]">
              <select
                value={selectedVendor}
                onChange={(e) => setSelectedVendor(e.target.value)}
                className="w-full px-3 py-1.5 bg-bone border border-line rounded-lg text-xs md:text-sm outline-none focus:border-ink transition-colors cursor-pointer text-ink"
              >
                <option value="all">All Vendors</option>
                {vendors.map((v: any) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Table Area */}
          {isLoading ? (
            <SkeletonTable columns={6} rows={5} />
          ) : billList.length === 0 ? (
            <EmptyState
              icon={ShoppingBag}
              title="No bills found"
              description={
                searchQuery || selectedCategory !== "all" || selectedVendor !== "all" || activeTab !== "all"
                  ? "No bills match your current filters. Try resetting the search or category."
                  : "Create your first bill to log vendor expenses and track accounts payable."
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-bone-2 border-b border-line">
                  <tr>
                    <th className="px-5 py-3 font-medium text-muted text-xs uppercase tracking-wider">Bill & Category</th>
                    <th className="px-5 py-3 font-medium text-muted text-xs uppercase tracking-wider">Vendor & PO</th>
                    <th className="px-5 py-3 font-medium text-muted text-xs uppercase tracking-wider">Dates & Schedule</th>
                    <th className="px-5 py-3 font-medium text-muted text-xs uppercase tracking-wider">Payment Progress</th>
                    <th className="px-5 py-3 font-medium text-muted text-xs uppercase tracking-wider">Status</th>
                    <th className="px-5 py-3 font-medium text-muted text-xs uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {billList.map((bill) => {
                    const dueInfo = getDueStatus(bill.due_date, bill.status);
                    const DueIcon = dueInfo.icon;
                    const totalAmt = parseFloat(String(bill.total_amount || 0));
                    const paidAmt = parseFloat(String(bill.amount_paid || 0));
                    const dueAmt = parseFloat(String(bill.amount_due || 0));
                    const percentPaid = totalAmt > 0 ? Math.min(100, Math.round((paidAmt / totalAmt) * 100)) : 0;

                    return (
                      <tr 
                        key={bill.id} 
                        className="hover:bg-bone-2/50 transition-colors group cursor-pointer"
                        onClick={(e) => {
                          // Prevent opening drawer if clicking buttons or dropdowns
                          if ((e.target as HTMLElement).closest("button, select, a")) return;
                          setDetailBill(bill);
                        }}
                      >
                        {/* Bill Number & Category */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-ink font-mono text-sm tracking-tight">
                              {bill.bill_number}
                            </span>
                            {bill.attachment && (
                              <a
                                href={bill.attachment}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-muted hover:text-ink transition-colors p-1 rounded hover:bg-bone"
                                title="View original vendor tax invoice"
                              >
                                <Paperclip className="w-3.5 h-3.5 text-blue-600" />
                              </a>
                            )}
                          </div>
                          <div className="mt-1 flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-bone-2 text-muted border border-line">
                              <Tag className="w-2.5 h-2.5" />
                              {BILL_CATEGORIES[bill.category] || bill.category_display || "Expense"}
                            </span>
                          </div>
                        </td>

                        {/* Vendor & PO */}
                        <td className="px-5 py-3.5">
                          <div className="font-medium text-ink flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-muted shrink-0" />
                            <span>{bill.vendor_details?.name || "Unknown Vendor"}</span>
                          </div>
                          {bill.purchase_order_details && (
                            <div className="text-[11px] text-muted mt-1 font-mono">
                              PO: {bill.purchase_order_details.po_number}
                            </div>
                          )}
                        </td>

                        {/* Dates & Due Status */}
                        <td className="px-5 py-3.5">
                          <div className="text-xs text-muted flex items-center gap-1">
                            <span>Billed:</span>
                            <span className="text-ink font-mono">{bill.bill_date}</span>
                          </div>
                          <div className="mt-1">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border ${dueInfo.color}`}>
                              <DueIcon className="w-3 h-3" />
                              <span>{dueInfo.label}</span>
                            </span>
                          </div>
                        </td>

                        {/* Payment Progress */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-baseline justify-between gap-3 text-xs mb-1">
                            <span className="font-semibold text-ink font-mono">
                              {formatCurrency(totalAmt, currency)}
                            </span>
                            <span className="text-[11px] text-muted">
                              {percentPaid}% paid
                            </span>
                          </div>
                          {/* Mini Progress Bar */}
                          <div className="w-36 h-1.5 bg-bone-2 rounded-full overflow-hidden border border-line/60">
                            <div 
                              className={`h-full transition-all duration-300 ${
                                bill.status === "paid" 
                                  ? "bg-emerald-600" 
                                  : dueInfo.isOverdue 
                                  ? "bg-rose-500" 
                                  : "bg-ink"
                              }`}
                              style={{ width: `${percentPaid}%` }}
                            />
                          </div>
                          <div className="text-[11px] text-muted mt-1 flex items-center justify-between">
                            <span>Due: <strong className={dueAmt > 0 ? "text-ink font-mono" : "text-emerald-700"}>{formatCurrency(dueAmt, currency)}</strong></span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-5 py-3.5">
                          <select
                            value={bill.status}
                            onChange={(e) => {
                              e.stopPropagation();
                              statusMutation.mutate({ id: bill.id, status: e.target.value });
                            }}
                            disabled={statusMutation.isPending}
                            className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize outline-none transition-colors border cursor-pointer ${
                              bill.status === "draft"
                                ? "bg-slate-100 text-slate-800 border-slate-200"
                                : bill.status === "open"
                                ? "bg-blue-50 text-blue-800 border-blue-200"
                                : bill.status === "partial"
                                ? "bg-amber-50 text-amber-800 border-amber-200"
                                : bill.status === "paid"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : "bg-rose-50 text-rose-800 border-rose-200"
                            }`}
                          >
                            <option value="draft">Draft</option>
                            <option value="open">Open</option>
                            <option value="partial">Partially Paid</option>
                            <option value="paid">Paid</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Record Payment Button */}
                            {bill.status !== "paid" && bill.status !== "cancelled" && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openPaymentModal(bill);
                                }}
                                className="px-2.5 py-1 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition-colors flex items-center gap-1 shadow-2xs"
                                title="Record payment against this bill"
                              >
                                <CreditCard className="w-3.5 h-3.5" />
                                <span>Pay</span>
                              </button>
                            )}

                            {/* View Drawer Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDetailBill(bill);
                              }}
                              className="p-1.5 text-muted hover:text-ink hover:bg-bone-2 rounded-md transition-colors border border-line bg-paper"
                              title="Inspect bill and payment history"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {/* View / Print PDF Voucher in browser */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewPdf(bill);
                              }}
                              className="p-1.5 text-muted hover:text-ink hover:bg-bone-2 rounded-md transition-colors border border-line bg-paper"
                              title="Open / Print Voucher (PDF)"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>

                            {/* Download PDF Voucher */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownloadPdf(bill);
                              }}
                              className="p-1.5 text-muted hover:text-ink hover:bg-bone-2 rounded-md transition-colors border border-line bg-paper"
                              title="Download Accounts Payable Voucher (PDF)"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>

                            {/* Edit Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditClick(bill);
                              }}
                              className="p-1.5 text-muted hover:text-ink hover:bg-bone-2 rounded-md transition-colors border border-line bg-paper"
                              title="Edit Bill"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteBillId(bill.id);
                              }}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-md transition-colors border border-rose-200 bg-paper"
                              title="Delete Bill"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
      </div>

      {/* Record Payment Modal */}
      {paymentBill && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-paper border border-line rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-rise">
            <div className="p-5 border-b border-line flex justify-between items-center bg-bone">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center border border-emerald-300">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-ink">Record Vendor Payment</h2>
                  <p className="text-xs text-muted">{paymentBill.bill_number} • {paymentBill.vendor_details?.name}</p>
                </div>
              </div>
              <button 
                onClick={() => setPaymentBill(null)}
                className="text-muted hover:text-ink p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRecordPaymentSubmit} className="p-5 space-y-4">
              {/* Outstanding Balance Callout */}
              <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-lg p-3.5 flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-emerald-800 uppercase tracking-wider">Remaining Balance Due</div>
                  <div className="text-xl font-bold font-serif text-emerald-950 mt-0.5">
                    {formatCurrency(parseFloat(String(paymentBill.amount_due || 0)), currency)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPaymentAmount(String(paymentBill.amount_due))}
                  className="text-xs font-semibold text-emerald-700 bg-emerald-100/80 hover:bg-emerald-200 px-3 py-1.5 rounded-md border border-emerald-300 transition-colors"
                >
                  Pay Full Balance
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Payment Amount */}
                <div>
                  <label className="block text-xs font-medium text-ink mb-1.5">Payment Amount ({currency}) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0.01"
                    max={String(paymentBill.amount_due)}
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-bone border border-line rounded-lg text-sm font-mono outline-none focus:border-ink transition-colors"
                    placeholder="0.00"
                  />
                </div>

                {/* Payment Date */}
                <div>
                  <label className="block text-xs font-medium text-ink mb-1.5">Payment Date *</label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-3 py-2 bg-bone border border-line rounded-lg text-sm outline-none focus:border-ink transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Payment Method */}
                <div>
                  <label className="block text-xs font-medium text-ink mb-1.5">Payment Method *</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 bg-bone border border-line rounded-lg text-sm outline-none focus:border-ink transition-colors"
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Transaction / Reference ID */}
                <div>
                  <label className="block text-xs font-medium text-ink mb-1.5">UTR / Cheque / Ref #</label>
                  <input
                    type="text"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    placeholder="e.g. UTR49281948291"
                    className="w-full px-3 py-2 bg-bone border border-line rounded-lg text-sm font-mono outline-none focus:border-ink transition-colors"
                  />
                </div>
              </div>

              {/* Receipt / Proof Upload */}
              <div>
                <label className="block text-xs font-medium text-ink mb-1.5">Upload Payment Proof / Bank Receipt (Optional)</label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-muted file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-line file:text-xs file:font-medium file:bg-bone file:text-ink hover:file:bg-bone-2 cursor-pointer"
                />
              </div>

              {/* Internal Notes */}
              <div>
                <label className="block text-xs font-medium text-ink mb-1.5">Notes & Remarks</label>
                <textarea
                  rows={2}
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Additional notes for accounts ledger..."
                  className="w-full px-3 py-2 bg-bone border border-line rounded-lg text-sm outline-none focus:border-ink transition-colors resize-none"
                />
              </div>

              <div className="pt-3 border-t border-line flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentBill(null)}
                  className="px-4 py-2 text-sm font-medium text-ink hover:bg-bone-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recordPaymentMutation.isPending}
                  className="px-5 py-2 bg-ink text-paper text-sm font-medium rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2 shadow-xs disabled:opacity-50"
                >
                  {recordPaymentMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Recording...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Confirm Payment</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Slide-Over Detail Drawer */}
      {detailBill && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end animate-fade-in">
          <div className="w-full max-w-xl bg-paper border-l border-line shadow-2xl h-full flex flex-col animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-5 border-b border-line flex items-center justify-between bg-bone">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold font-mono text-ink">{detailBill.bill_number}</h2>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize border ${
                    detailBill.status === "paid"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : detailBill.status === "partial"
                      ? "bg-amber-50 text-amber-800 border-amber-200"
                      : "bg-blue-50 text-blue-800 border-blue-200"
                  }`}>
                    {detailBill.status_display || detailBill.status}
                  </span>
                </div>
                <div className="text-xs text-muted mt-0.5">
                  Category: {BILL_CATEGORIES[detailBill.category] || detailBill.category}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleViewPdf(detailBill)}
                  className="px-3 py-1.5 text-xs font-medium text-ink bg-paper border border-line rounded-lg hover:bg-bone transition-colors flex items-center gap-1.5 shadow-2xs"
                  title="Open / Print Voucher in browser"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>View Voucher</span>
                </button>
                <button
                  onClick={() => handleDownloadPdf(detailBill)}
                  className="p-1.5 text-muted hover:text-ink hover:bg-bone rounded-lg border border-line transition-colors"
                  title="Download Voucher PDF"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setDetailBill(null)}
                  className="p-1.5 text-muted hover:text-ink rounded-lg hover:bg-bone-2 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* Financial Snapshot */}
              <div className="grid grid-cols-3 gap-3 p-4 bg-bone rounded-xl border border-line">
                <div>
                  <div className="text-[11px] font-medium text-muted uppercase">Total Amount</div>
                  <div className="text-lg font-semibold font-serif text-ink mt-0.5">
                    {formatCurrency(parseFloat(String(detailBill.total_amount || 0)), currency)}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-medium text-muted uppercase">Amount Paid</div>
                  <div className="text-lg font-semibold font-serif text-emerald-700 mt-0.5">
                    {formatCurrency(parseFloat(String(detailBill.amount_paid || 0)), currency)}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-medium text-muted uppercase">Balance Due</div>
                  <div className="text-lg font-semibold font-serif text-rose-700 mt-0.5">
                    {formatCurrency(parseFloat(String(detailBill.amount_due || 0)), currency)}
                  </div>
                </div>
              </div>

              {/* Vendor & PO Details */}
              <div className="p-4 bg-paper rounded-xl border border-line space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">Vendor Details</h3>
                  {detailBill.purchase_order_details && (
                    <span className="text-xs text-muted font-mono">
                      PO: {detailBill.purchase_order_details.po_number}
                    </span>
                  )}
                </div>
                <div className="text-sm font-semibold text-ink flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-muted" />
                  <span>{detailBill.vendor_details?.name}</span>
                </div>
                {detailBill.vendor_details?.email && (
                  <div className="text-xs text-muted">Email: {detailBill.vendor_details.email}</div>
                )}
                {detailBill.vendor_details?.phone && (
                  <div className="text-xs text-muted">Phone: {detailBill.vendor_details.phone}</div>
                )}
                {detailBill.vendor_details?.address && (
                  <div className="text-xs text-muted">Address: {detailBill.vendor_details.address}</div>
                )}
                <div className="text-xs text-muted pt-2 border-t border-line/60 flex items-center justify-between">
                  <span>Payment Terms: <strong>{detailBill.payment_terms || "Net 30"}</strong></span>
                  <span>Due Date: <strong>{detailBill.due_date || "None"}</strong></span>
                </div>
              </div>

              {/* Original Tax Invoice Attachment */}
              <div className="p-4 bg-paper rounded-xl border border-line">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">Original Vendor Invoice</h3>
                  {detailBill.attachment ? (
                    <a
                      href={detailBill.attachment}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                    >
                      <span>View File</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-xs text-muted italic">No invoice file uploaded</span>
                  )}
                </div>
              </div>

              {/* Itemized Lines */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">Line Items</h3>
                <div className="border border-line rounded-lg overflow-hidden bg-bone-2">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-bone border-b border-line text-muted">
                      <tr>
                        <th className="px-3 py-2 font-medium">Description</th>
                        <th className="px-3 py-2 font-medium text-right">Qty</th>
                        <th className="px-3 py-2 font-medium text-right">Rate</th>
                        <th className="px-3 py-2 font-medium text-right">Tax %</th>
                        <th className="px-3 py-2 font-medium text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line/70 bg-paper">
                      {detailBill.items && detailBill.items.length > 0 ? (
                        detailBill.items.map((item, idx) => (
                          <tr key={idx}>
                            <td className="px-3 py-2 font-medium text-ink">{item.description}</td>
                            <td className="px-3 py-2 text-right text-muted font-mono">{item.quantity}</td>
                            <td className="px-3 py-2 text-right text-muted font-mono">{formatCurrency(Number(item.unit_price), currency)}</td>
                            <td className="px-3 py-2 text-right text-muted font-mono">{item.tax_rate}%</td>
                            <td className="px-3 py-2 text-right font-medium text-ink font-mono">{formatCurrency(Number(item.total || Number(item.quantity) * Number(item.unit_price)), currency)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-3 py-4 text-center text-muted">No line items recorded</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Payment History & Audit Log */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">Payment History ({detailBill.payments?.length || 0})</h3>
                  {detailBill.status !== "paid" && detailBill.status !== "cancelled" && (
                    <button
                      onClick={() => openPaymentModal(detailBill)}
                      className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Record Payment</span>
                    </button>
                  )}
                </div>

                {detailBill.payments && detailBill.payments.length > 0 ? (
                  <div className="space-y-2">
                    {detailBill.payments.map((p) => (
                      <div key={p.id} className="p-3 bg-bone rounded-lg border border-line text-xs flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-emerald-700 font-mono text-sm">
                            +{formatCurrency(parseFloat(String(p.amount)), currency)}
                          </div>
                          <div className="text-muted mt-0.5 flex items-center gap-2">
                            <span>{p.payment_date}</span>
                            <span>•</span>
                            <span className="capitalize">{p.payment_method_display || p.payment_method}</span>
                            {p.transaction_id && (
                              <>
                                <span>•</span>
                                <span className="font-mono">Ref: {p.transaction_id}</span>
                              </>
                            )}
                          </div>
                          {p.notes && <div className="text-muted italic mt-1">{p.notes}</div>}
                          {p.receipt && (
                            <a
                              href={p.receipt}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 hover:underline inline-flex items-center gap-1 mt-1 font-medium"
                            >
                              <Paperclip className="w-3 h-3" />
                              <span>View Receipt</span>
                            </a>
                          )}
                        </div>
                        <button
                          onClick={() => handleDeletePayment(p.id)}
                          className="p-1.5 text-muted hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          title="Remove payment record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-bone-2 rounded-lg border border-line text-center text-xs text-muted">
                    No payments logged yet for this bill.
                  </div>
                )}
              </div>

              {/* Notes */}
              {detailBill.notes && (
                <div className="space-y-1">
                  <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">Internal Notes</h3>
                  <div className="p-3 bg-bone rounded-lg border border-line text-xs text-ink whitespace-pre-wrap">
                    {detailBill.notes}
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 border-t border-line bg-bone flex items-center justify-between">
              <button
                onClick={() => {
                  const billToEdit = detailBill;
                  setDetailBill(null);
                  handleEditClick(billToEdit);
                }}
                className="px-4 py-2 text-xs font-medium text-ink bg-paper border border-line rounded-lg hover:bg-bone-2 transition-colors flex items-center gap-1.5"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Bill</span>
              </button>

              {detailBill.status !== "paid" && detailBill.status !== "cancelled" && (
                <button
                  onClick={() => openPaymentModal(detailBill)}
                  className="px-4 py-2 text-xs font-medium text-paper bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Record Payment</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* New / Edit Bill Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-paper border border-line rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col animate-rise">
            <div className="p-5 border-b border-line flex justify-between items-center bg-bone">
              <h2 className="text-lg font-semibold text-ink">{editBillId ? "Edit Bill" : "New Bill"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-muted hover:text-ink text-xl font-light">
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateOrUpdate} id="create-bill-form" className="p-5 overflow-y-auto space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Vendor Selector */}
                <div>
                  <label className="block text-xs font-medium text-ink mb-1.5">Vendor *</label>
                  <select
                    required
                    className="w-full px-3 py-2 bg-bone border border-line rounded-md text-sm outline-none focus:border-ink transition-colors"
                    value={newBill.vendor || ""}
                    onChange={(e) => setNewBill({ ...newBill, vendor: parseInt(e.target.value) })}
                  >
                    <option value="">Select a vendor...</option>
                    {vendors.map((v: any) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Category Selector */}
                <div>
                  <label className="block text-xs font-medium text-ink mb-1.5">Expense Category</label>
                  <select
                    className="w-full px-3 py-2 bg-bone border border-line rounded-md text-sm outline-none focus:border-ink transition-colors"
                    value={newBill.category}
                    onChange={(e) => setNewBill({ ...newBill, category: e.target.value })}
                  >
                    {Object.entries(BILL_CATEGORIES).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status Selector */}
                <div>
                  <label className="block text-xs font-medium text-ink mb-1.5">Status</label>
                  <select
                    className="w-full px-3 py-2 bg-bone border border-line rounded-md text-sm outline-none focus:border-ink transition-colors"
                    value={newBill.status}
                    onChange={(e) => setNewBill({ ...newBill, status: e.target.value })}
                  >
                    <option value="draft">Draft</option>
                    <option value="open">Open</option>
                    <option value="partial">Partially Paid</option>
                    <option value="paid">Paid</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Bill Issue Date */}
                <div>
                  <label className="block text-xs font-medium text-ink mb-1.5">Issue Date *</label>
                  <input
                    type="date"
                    required
                    className="w-full px-3 py-2 bg-bone border border-line rounded-md text-sm outline-none focus:border-ink transition-colors"
                    value={newBill.bill_date}
                    onChange={(e) => setNewBill({ ...newBill, bill_date: e.target.value })}
                  />
                </div>

                {/* Due Date */}
                <div>
                  <label className="block text-xs font-medium text-ink mb-1.5">Due Date</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 bg-bone border border-line rounded-md text-sm outline-none focus:border-ink transition-colors"
                    value={newBill.due_date}
                    onChange={(e) => setNewBill({ ...newBill, due_date: e.target.value })}
                  />
                </div>

                {/* Payment Terms */}
                <div>
                  <label className="block text-xs font-medium text-ink mb-1.5">Payment Terms</label>
                  <input
                    type="text"
                    placeholder="e.g. Net 30, Due on Receipt"
                    className="w-full px-3 py-2 bg-bone border border-line rounded-md text-sm outline-none focus:border-ink transition-colors"
                    value={newBill.payment_terms}
                    onChange={(e) => setNewBill({ ...newBill, payment_terms: e.target.value })}
                  />
                </div>
              </div>

              {/* Original Vendor Invoice Attachment */}
              <div>
                <label className="block text-xs font-medium text-ink mb-1.5">Vendor Invoice Attachment (PDF/Image)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="application/pdf,image/*"
                    onChange={(e) => setNewBill({ ...newBill, attachmentFile: e.target.files?.[0] || null })}
                    className="w-full text-xs text-muted file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-line file:text-xs file:font-medium file:bg-bone file:text-ink hover:file:bg-bone-2 cursor-pointer"
                  />
                  {newBill.existingAttachment && (
                    <a
                      href={newBill.existingAttachment}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-blue-600 hover:underline shrink-0 flex items-center gap-1 font-medium"
                    >
                      <Paperclip className="w-3.5 h-3.5" />
                      <span>Current File</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Line Items Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">Line Items</h3>
                  <button
                    type="button"
                    onClick={() =>
                      setNewBill({
                        ...newBill,
                        items: [...newBill.items, { description: "", quantity: 1, unit_price: 0, tax_rate: 0 }],
                      })
                    }
                    className="text-xs font-medium text-ink bg-bone px-2 py-1 rounded-md border border-line hover:bg-bone-2 transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add Item
                  </button>
                </div>

                <div className="space-y-2">
                  {newBill.items.map((item, index) => (
                    <div key={index} className="flex flex-wrap md:flex-nowrap items-start gap-2 p-3 bg-bone-2 rounded-lg border border-line/60">
                      <div className="flex-1 min-w-[200px]">
                        <input
                          required
                          placeholder="Item or service description"
                          className="w-full px-3 py-1.5 bg-bone border border-line rounded-md text-sm outline-none focus:border-ink transition-colors"
                          value={item.description}
                          onChange={(e) => {
                            const newItems = [...newBill.items];
                            newItems[index].description = e.target.value;
                            setNewBill({ ...newBill, items: newItems });
                          }}
                        />
                      </div>
                      <div className="flex items-center gap-2 w-full md:w-auto">
                        <div className="w-[80px]">
                          <input
                            type="number"
                            step="0.01"
                            required
                            placeholder="Qty"
                            className="w-full px-3 py-1.5 bg-bone border border-line rounded-md text-sm outline-none focus:border-ink transition-colors font-mono"
                            value={item.quantity}
                            onChange={(e) => {
                              const newItems = [...newBill.items];
                              newItems[index].quantity = parseFloat(e.target.value) || 0;
                              setNewBill({ ...newBill, items: newItems });
                            }}
                          />
                        </div>
                        <div className="w-[110px]">
                          <input
                            type="number"
                            step="0.01"
                            required
                            placeholder="Price"
                            className="w-full px-3 py-1.5 bg-bone border border-line rounded-md text-sm outline-none focus:border-ink transition-colors font-mono"
                            value={item.unit_price}
                            onChange={(e) => {
                              const newItems = [...newBill.items];
                              newItems[index].unit_price = parseFloat(e.target.value) || 0;
                              setNewBill({ ...newBill, items: newItems });
                            }}
                          />
                        </div>
                        <div className="w-[75px]">
                          <input
                            type="number"
                            step="0.01"
                            placeholder="Tax %"
                            className="w-full px-3 py-1.5 bg-bone border border-line rounded-md text-sm outline-none focus:border-ink transition-colors font-mono"
                            value={item.tax_rate}
                            onChange={(e) => {
                              const newItems = [...newBill.items];
                              newItems[index].tax_rate = parseFloat(e.target.value) || 0;
                              setNewBill({ ...newBill, items: newItems });
                            }}
                          />
                        </div>
                        {newBill.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const newItems = newBill.items.filter((_, i) => i !== index);
                              setNewBill({ ...newBill, items: newItems });
                            }}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-md transition-colors mt-0.5"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex flex-col items-end gap-1 text-xs bg-bone/40 p-3 rounded-lg border border-line">
                  <div className="w-full max-w-[240px] flex justify-between text-muted">
                    <span>Subtotal:</span>
                    <span className="font-mono">{formatCurrency(calculateSubtotal(), currency)}</span>
                  </div>
                  <div className="w-full max-w-[240px] flex justify-between text-muted">
                    <span>Tax:</span>
                    <span className="font-mono">{formatCurrency(calculateTax(), currency)}</span>
                  </div>
                  <div className="w-full max-w-[240px] flex justify-between font-bold text-ink pt-2 border-t border-line mt-1">
                    <span>Total:</span>
                    <span className="font-mono text-sm">{formatCurrency(calculateTotal(), currency)}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-ink mb-1.5">Notes & Instructions</label>
                <textarea
                  className="w-full px-3 py-2 bg-bone border border-line rounded-md text-sm outline-none focus:border-ink transition-colors min-h-[70px] resize-none"
                  value={newBill.notes}
                  onChange={(e) => setNewBill({ ...newBill, notes: e.target.value })}
                  placeholder="Additional instructions or notes..."
                />
              </div>
            </form>

            <div className="p-4 border-t border-line bg-bone flex justify-end gap-3 mt-auto">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-ink hover:bg-bone-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                form="create-bill-form"
                type="submit"
                className="flex items-center justify-center min-w-[120px] px-4 py-2 bg-ink text-paper text-sm font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : editBillId ? (
                  "Save Changes"
                ) : (
                  "Create Bill"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Dialog.Root open={deleteBillId !== null} onOpenChange={(open) => !open && setDeleteBillId(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-ink/50 backdrop-blur-xs z-50 animate-fade-in" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-paper shadow-2xl rounded-xl overflow-hidden z-50 animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-ink">Delete Bill</h2>
              <p className="text-muted mt-2 text-sm">
                Are you sure you want to delete this bill? This action cannot be undone and will permanently remove this record and associated payment histories.
              </p>
            </div>
            <div className="p-4 border-t border-line bg-bone flex justify-end gap-3">
              <Dialog.Close asChild>
                <button className="px-4 py-2 text-sm font-medium text-ink hover:bg-bone-2 rounded-md transition-colors">
                  Cancel
                </button>
              </Dialog.Close>
              <button
                className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                onClick={() => {
                  if (deleteBillId) deleteMutation.mutate(deleteBillId);
                  setDeleteBillId(null);
                }}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete Bill"}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </PageShell>
  );
}
