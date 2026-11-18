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
  usePurchaseOrderPage,
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
import { CurrencyPicker } from "@/components/currency-picker";
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

// GST state codes (first two digits of a GSTIN)
const GST_STATES: Record<string, string> = {
  "01": "Jammu and Kashmir", "02": "Himachal Pradesh", "03": "Punjab", "04": "Chandigarh",
  "05": "Uttarakhand", "06": "Haryana", "07": "Delhi", "08": "Rajasthan", "09": "Uttar Pradesh",
  "10": "Bihar", "11": "Sikkim", "12": "Arunachal Pradesh", "13": "Nagaland", "14": "Manipur",
  "15": "Mizoram", "16": "Tripura", "17": "Meghalaya", "18": "Assam", "19": "West Bengal",
  "20": "Jharkhand", "21": "Odisha", "22": "Chhattisgarh", "23": "Madhya Pradesh", "24": "Gujarat",
  "26": "Dadra and Nagar Haveli and Daman and Diu", "27": "Maharashtra", "29": "Karnataka",
  "30": "Goa", "31": "Lakshadweep", "32": "Kerala", "33": "Tamil Nadu", "34": "Puducherry",
  "35": "Andaman and Nicobar Islands", "36": "Telangana", "37": "Andhra Pradesh", "38": "Ladakh",
  "97": "Other Territory",
};
const STATE_NAMES = Object.values(GST_STATES).sort();
const GSTIN_REGEX = /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/;
const TRN_REGEX = /^\d{15}$/;

type TaxRegime = "in_gst" | "ae_vat" | "generic";
type TaxCategory = "" | "standard" | "zero" | "exempt";
type RateOption = { label: string; rate: number; category: TaxCategory };

const TAX_REGIMES: Record<
  TaxRegime,
  {
    label: string;
    taxName: string;
    taxIdLabel: string;
    taxIdPlaceholder: string;
    taxIdHint: string;
    validateTaxId: (v: string) => boolean;
    defaultRate: number;
    rateOptions: RateOption[] | null; // null => free numeric input
    showPlaceOfSupply: boolean;
    showHsn: boolean;
    showTds: boolean;
    reverseChargeHint: string;
  }
> = {
  in_gst: {
    label: "India – GST",
    taxName: "GST",
    taxIdLabel: "Vendor GSTIN",
    taxIdPlaceholder: "e.g. 29ABCDE1234F1Z5",
    taxIdHint: "15 characters",
    validateTaxId: (v) => GSTIN_REGEX.test(v),
    defaultRate: 18,
    rateOptions: [
      ...[0, 0.25, 3, 5, 12, 18, 28].map((r) => ({ label: `${r}%`, rate: r, category: "standard" as TaxCategory })),
      { label: "Nil-rated", rate: 0, category: "zero" },
      { label: "Exempt", rate: 0, category: "exempt" },
    ],
    showPlaceOfSupply: true,
    showHsn: true,
    showTds: true,
    reverseChargeHint: "RCM: you pay the GST directly to the government; the vendor is paid the pre-tax amount.",
  },
  ae_vat: {
    label: "UAE – VAT",
    taxName: "VAT",
    taxIdLabel: "Vendor TRN",
    taxIdPlaceholder: "e.g. 100123456700003",
    taxIdHint: "15-digit Tax Registration Number",
    validateTaxId: (v) => TRN_REGEX.test(v),
    defaultRate: 5,
    rateOptions: [
      { label: "5%", rate: 5, category: "standard" },
      { label: "0% Zero-rated", rate: 0, category: "zero" },
      { label: "Exempt", rate: 0, category: "exempt" },
    ],
    showPlaceOfSupply: false,
    showHsn: false,
    showTds: false,
    reverseChargeHint: "For imports / overseas suppliers: you account for the 5% VAT yourself; the vendor is paid the pre-tax amount.",
  },
  generic: {
    label: "Other – single tax",
    taxName: "Tax",
    taxIdLabel: "Vendor Tax ID",
    taxIdPlaceholder: "VAT / tax registration no.",
    taxIdHint: "Optional",
    validateTaxId: (v) => v.length <= 30,
    defaultRate: 0,
    rateOptions: null,
    showPlaceOfSupply: false,
    showHsn: false,
    showTds: false,
    reverseChargeHint: "You account for the tax yourself; the vendor is paid the pre-tax amount.",
  },
};

function defaultTaxRegime(country?: string | null, currency?: string | null): TaxRegime {
  const c = (country || "").trim().toLowerCase();
  const cur = (currency || "").trim().toUpperCase();
  if (c.includes("india") || ["in", "ind", "bharat"].includes(c) || (!c && cur === "INR")) return "in_gst";
  if (
    c.includes("emirates") || c.replace(/\./g, "").includes("uae") ||
    ["ae", "are", "dubai", "abu dhabi", "sharjah"].includes(c) || (!c && cur === "AED")
  ) return "ae_vat";
  return "generic";
}

const normalizeTaxId = (v: string) => v.toUpperCase().replace(/[\s-]/g, "");
const rateKey = (rate: number, category: TaxCategory) => `${rate}|${category}`;

const PAYMENT_TERM_OPTIONS: { label: string; days: number }[] = [
  { label: "Due on Receipt", days: 0 },
  { label: "Net 7", days: 7 },
  { label: "Net 15", days: 15 },
  { label: "Net 30", days: 30 },
  { label: "Net 45", days: 45 },
  { label: "Net 60", days: 60 },
  { label: "Net 90", days: 90 },
];

const TDS_SECTIONS: { value: string; label: string; rate: number }[] = [
  { value: "194C_I", label: "194C – Contractor (Individual/HUF)", rate: 1 },
  { value: "194C_O", label: "194C – Contractor (Company/Firm)", rate: 2 },
  { value: "194J_T", label: "194J – Technical services", rate: 2 },
  { value: "194J_P", label: "194J – Professional fees", rate: 10 },
  { value: "194I_PM", label: "194I – Rent: Plant & Machinery", rate: 2 },
  { value: "194I_LB", label: "194I – Rent: Land & Building", rate: 10 },
  { value: "194H", label: "194H – Commission / Brokerage", rate: 2 },
  { value: "194Q", label: "194Q – Purchase of goods", rate: 0.1 },
  { value: "194O", label: "194O – E-commerce operator", rate: 0.1 },
  { value: "other", label: "Other (custom rate)", rate: 0 },
];

function termsToDays(terms: string): number | null {
  const opt = PAYMENT_TERM_OPTIONS.find((o) => o.label.toLowerCase() === terms.trim().toLowerCase());
  if (opt) return opt.days;
  const m = terms.match(/^\s*(?:net\s*)?(\d+)\s*(?:days?)?\s*$/i);
  return m ? parseInt(m[1], 10) : null;
}

/** "65" or "65 days" -> "Net 65" so it matches the dropdown and drives the due date. */
function normalizeTerms(terms: string): string {
  const days = termsToDays(terms);
  if (days === null) return terms;
  return PAYMENT_TERM_OPTIONS.find((o) => o.days === days)?.label || (days === 0 ? "Due on Receipt" : `Net ${days}`);
}

function addDays(isoDate: string, days: number): string {
  if (!isoDate) return "";
  const d = new Date(`${isoDate}T00:00:00`);
  d.setDate(d.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function stateFromGstin(gstin: string): string | null {
  return GSTIN_REGEX.test(gstin) ? GST_STATES[gstin.slice(0, 2)] || null : null;
}

/** Intra-state (CGST+SGST) when the supplier's state equals the place of supply. */
function deriveSupplyType(gstin: string, placeOfSupply: string, fallbackState?: string | null): "intra" | "inter" {
  const supplierState = stateFromGstin(gstin) || fallbackState || "";
  if (!supplierState || !placeOfSupply) return "intra";
  return supplierState.toLowerCase() === placeOfSupply.toLowerCase() ? "intra" : "inter";
}

type BillLine = {
  description: string;
  hsn_sac_code: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  tax_category: TaxCategory;
};

const emptyLine = (rate = 0): BillLine => ({
  description: "",
  hsn_sac_code: "",
  quantity: 1,
  unit_price: 0,
  tax_rate: rate,
  tax_category: rate > 0 ? "standard" : "",
});

type BillForm = {
  vendor: number | null;
  vendor_reference: string;
  purchase_order: number | null;
  bill_date: string;
  due_date: string;
  dueDateTouched: boolean;
  category: string;
  payment_terms: string;
  status: string;
  notes: string;
  currency: string;
  exchange_rate: number;
  tax_regime: TaxRegime;
  taxApplicable: boolean;
  vendor_tax_id: string;
  place_of_supply: string;
  supply_type: "intra" | "inter";
  reverse_charge: boolean;
  discount_amount: number;
  roundOff: boolean;
  tds_section: string;
  tds_rate: number;
  attachmentFile: File | null;
  existingAttachment?: string | null;
  items: BillLine[];
};

/** Mirrors Bill.recalculate_totals() on the server. */
function computeBillTotals(form: BillForm) {
  const r2 = (n: number) => Math.round(n * 100) / 100;
  const cfg = TAX_REGIMES[form.tax_regime];
  const subtotal = form.items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const discount = Math.min(Math.max(form.discount_amount || 0, 0), subtotal);
  const taxable = subtotal - discount;
  const ratio = subtotal ? taxable / subtotal : 0;
  const lineTax = form.taxApplicable
    ? r2(form.items.reduce((s, i) => s + i.quantity * i.unit_price * ratio * ((i.tax_category === "zero" || i.tax_category === "exempt" ? 0 : i.tax_rate) / 100), 0))
    : 0;
  const reverseCharge = form.taxApplicable && form.reverse_charge ? lineTax : 0;
  const tax = reverseCharge ? 0 : lineTax;
  const split = form.tax_regime === "in_gst" && !reverseCharge;
  const igst = split && form.supply_type === "inter" ? tax : 0;
  const cgst = split && form.supply_type !== "inter" ? r2(tax / 2) : 0;
  const sgst = split && form.supply_type !== "inter" ? r2(tax - cgst) : 0;
  const preRound = r2(taxable + tax);
  const roundOff = form.roundOff ? r2(Math.round(preRound) - preRound) : 0;
  const total = r2(preRound + roundOff);
  const tdsRate = cfg.showTds && form.tds_section ? form.tds_rate || 0 : 0;
  const tds = r2((taxable * tdsRate) / 100);
  return { subtotal: r2(subtotal), discount: r2(discount), taxable: r2(taxable), tax, cgst, sgst, igst, reverseCharge, roundOff, total, tdsRate, tds, net: r2(total - tds) };
}

const inputCls = "w-full px-3 py-2 bg-bone border border-line rounded-md text-sm outline-none focus:border-ink transition-colors";
const labelCls = "block text-xs font-medium text-ink mb-1.5";
const lineInputCls = "w-full px-2.5 py-1.5 bg-bone border border-line rounded-md text-sm outline-none focus:border-ink transition-colors";
const mobileLabelCls = "md:hidden block text-[11px] font-medium text-muted mb-1";
// Literal class strings so Tailwind can see them: [desc, hsn?, qty, rate, tax?, amount, remove]
const LINE_GRID = {
  full: "md:grid-cols-[minmax(0,1fr)_96px_72px_100px_120px_104px_32px]",
  noHsn: "md:grid-cols-[minmax(0,1fr)_72px_100px_120px_104px_32px]",
  noTax: "md:grid-cols-[minmax(0,1fr)_72px_100px_104px_32px]",
};

function ReverseChargeToggle({ checked, onChange, hint }: { checked: boolean; onChange: (v: boolean) => void; hint: string }) {
  return (
    <label className="flex items-start gap-2 text-xs text-ink cursor-pointer select-none">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="accent-ink mt-0.5" />
      <span>
        <span className="font-medium">Reverse charge applies</span>
        <span className="block text-[11px] text-muted">{hint}</span>
      </span>
    </label>
  );
}

function TotalRow({ label, value, currency }: { label: string; value: number; currency: string }) {
  return (
    <div className="flex justify-between text-muted">
      <span>{label}</span>
      <span className="font-mono">{formatCurrency(value, currency)}</span>
    </div>
  );
}

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
      (b.vendor_reference && b.vendor_reference.toLowerCase().includes(q)) ||
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
  const { data: poData } = usePurchaseOrderPage({ limit: 200 });
  const purchaseOrders: any[] = poData?.results || [];

  const companyRegime = defaultTaxRegime(company?.country, company?.currency);
  const baseCurrency = (company?.currency || "INR").toUpperCase();

  const blankForm = (): BillForm => {
    const today = new Date().toISOString().split("T")[0];
    return {
      vendor: null,
      vendor_reference: "",
      purchase_order: null,
      bill_date: today,
      due_date: addDays(today, 30),
      dueDateTouched: false,
      category: "other",
      payment_terms: "Net 30",
      status: "draft",
      notes: "",
      currency: baseCurrency,
      exchange_rate: 1,
      tax_regime: companyRegime,
      taxApplicable: false,
      vendor_tax_id: "",
      place_of_supply: companyRegime === "in_gst" ? company?.state || "" : "",
      supply_type: "intra",
      reverse_charge: false,
      discount_amount: 0,
      roundOff: false,
      tds_section: "",
      tds_rate: 0,
      attachmentFile: null,
      items: [emptyLine()],
    };
  };

  const [newBill, setNewBill] = useState<BillForm>(blankForm);
  const regimeCfg = TAX_REGIMES[newBill.tax_regime];

  /** Apply a change and keep derived fields (due date, supply type, line tax) in sync. */
  const patchBill = (patch: Partial<BillForm>) => {
    setNewBill((prev) => {
      const next = { ...prev, ...patch };
      if (("bill_date" in patch || "payment_terms" in patch) && !next.dueDateTouched) {
        const days = termsToDays(next.payment_terms);
        if (days !== null) next.due_date = addDays(next.bill_date, days);
      }
      if ("tax_regime" in patch && patch.tax_regime !== prev.tax_regime) {
        const cfg = TAX_REGIMES[next.tax_regime];
        if (!cfg.validateTaxId(next.vendor_tax_id)) next.vendor_tax_id = "";
        if (!cfg.showTds) next.tds_section = "";
        if (!cfg.showPlaceOfSupply) next.place_of_supply = "";
        else if (!next.place_of_supply) next.place_of_supply = company?.state || "";
        if (next.taxApplicable) {
          next.items = next.items.map((i) => ({ ...i, tax_rate: cfg.defaultRate, tax_category: cfg.defaultRate > 0 ? "standard" : "" }));
        }
      }
      if ("taxApplicable" in patch && patch.taxApplicable !== prev.taxApplicable) {
        const rate = next.taxApplicable ? TAX_REGIMES[next.tax_regime].defaultRate : 0;
        next.items = next.items.map((i) => ({ ...i, tax_rate: rate, tax_category: rate > 0 ? "standard" : "" }));
        if (!next.taxApplicable) next.reverse_charge = false;
      }
      if (next.tax_regime === "in_gst" && ("vendor_tax_id" in patch || "place_of_supply" in patch || "tax_regime" in patch) && !("supply_type" in patch)) {
        next.supply_type = deriveSupplyType(next.vendor_tax_id, next.place_of_supply);
      }
      return next;
    });
  };

  const handleCurrencyChange = (code: string, rate: number) => {
    const patch: Partial<BillForm> = { currency: code, exchange_rate: rate };
    if (code !== newBill.currency) {
      // A dirham bill is almost always UAE VAT, a rupee bill Indian GST.
      patch.tax_regime = code === "INR" ? "in_gst" : code === "AED" ? "ae_vat" : code === baseCurrency ? companyRegime : "generic";
    }
    patchBill(patch);
  };

  const updateLine = (index: number, patch: Partial<BillLine>) => {
    setNewBill((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    }));
  };

  const vendorTaxDefaults = (v: any, regime: TaxRegime): Partial<BillForm> => {
    const taxId = normalizeTaxId(v?.tax_id || "");
    const valid = taxId !== "" && TAX_REGIMES[regime].validateTaxId(taxId);
    return { vendor_tax_id: valid ? taxId : "", ...(valid ? { taxApplicable: true } : {}) };
  };

  const handleVendorChange = (vendorId: number | null) => {
    const v: any = vendors.find((x: any) => x.id === vendorId);
    const vendorCurrency = (v?.currency || "").toUpperCase() || baseCurrency;
    const regime: TaxRegime =
      vendorCurrency === newBill.currency ? newBill.tax_regime
      : vendorCurrency === "INR" ? "in_gst" : vendorCurrency === "AED" ? "ae_vat" : vendorCurrency === baseCurrency ? companyRegime : "generic";
    const patch: Partial<BillForm> = {
      vendor: vendorId,
      ...(vendorCurrency !== newBill.currency ? { currency: vendorCurrency, exchange_rate: 1, tax_regime: regime } : {}),
      ...vendorTaxDefaults(v, regime),
    };
    if (v?.payment_terms) {
      patch.payment_terms = normalizeTerms(v.payment_terms);
      patch.dueDateTouched = false;
    }
    const currentPo = purchaseOrders.find((po) => po.id === newBill.purchase_order);
    if (currentPo && currentPo.vendor !== vendorId) patch.purchase_order = null;
    patchBill(patch);
  };

  const handlePurchaseOrderChange = (poId: number | null) => {
    const po = purchaseOrders.find((x) => x.id === poId);
    if (!po) {
      patchBill({ purchase_order: null });
      return;
    }
    const v: any = vendors.find((x: any) => x.id === po.vendor) || po.vendor_details;
    const items: BillLine[] =
      po.items && po.items.length > 0
        ? po.items.map((it: any) => {
            const rate = parseFloat(String(it.tax_rate)) || 0;
            return {
              description: it.description,
              hsn_sac_code: "",
              quantity: parseFloat(String(it.quantity)) || 0,
              unit_price: parseFloat(String(it.unit_price)) || 0,
              tax_rate: rate,
              tax_category: rate > 0 ? "standard" : "",
            };
          })
        : newBill.items;
    const defaults = vendorTaxDefaults(v, newBill.tax_regime);
    const poCurrency = (po.currency || baseCurrency).toUpperCase();
    patchBill({
      purchase_order: po.id,
      vendor: po.vendor,
      currency: poCurrency,
      exchange_rate: parseFloat(String(po.exchange_rate || 1)) || 1,
      ...defaults,
      vendor_tax_id: defaults.vendor_tax_id || newBill.vendor_tax_id,
      // set items after taxApplicable so the PO's own rates are kept
    });
    setNewBill((prev) => ({ ...prev, items, taxApplicable: prev.taxApplicable || items.some((i) => i.tax_rate > 0) }));
  };

  const totals = computeBillTotals(newBill);
  const taxIdInvalid = newBill.vendor_tax_id !== "" && !regimeCfg.validateTaxId(newBill.vendor_tax_id);
  const showHsn = newBill.taxApplicable && regimeCfg.showHsn;
  const lineGridCls = !newBill.taxApplicable ? LINE_GRID.noTax : showHsn ? LINE_GRID.full : LINE_GRID.noHsn;
  const availablePOs = purchaseOrders.filter(
    (po) =>
      po.id === newBill.purchase_order ||
      ((!newBill.vendor || po.vendor === newBill.vendor) && ["approved", "sent"].includes(po.status))
  );

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
    setNewBill(blankForm());
  };

  const handleEditClick = (bill: Bill) => {
    setEditBillId(bill.id);
    const regime: TaxRegime = bill.tax_regime || companyRegime;
    const items: BillLine[] =
      bill.items && bill.items.length > 0
        ? bill.items.map((item) => ({
            description: item.description,
            hsn_sac_code: item.hsn_sac_code || "",
            quantity: parseFloat(String(item.quantity)),
            unit_price: parseFloat(String(item.unit_price)),
            tax_rate: parseFloat(String(item.tax_rate)),
            tax_category: (item.tax_category || "") as TaxCategory,
          }))
        : [emptyLine()];
    setNewBill({
      vendor: bill.vendor,
      vendor_reference: bill.vendor_reference || "",
      purchase_order: bill.purchase_order ?? null,
      bill_date: bill.bill_date,
      due_date: bill.due_date || "",
      dueDateTouched: true,
      category: bill.category || "other",
      payment_terms: bill.payment_terms || "Net 30",
      status: bill.status,
      notes: bill.notes || "",
      currency: (bill.currency || baseCurrency).toUpperCase(),
      exchange_rate: parseFloat(String(bill.exchange_rate || 1)) || 1,
      tax_regime: regime,
      taxApplicable:
        !!bill.vendor_tax_id || !!bill.reverse_charge || items.some((i) => i.tax_rate > 0 || i.tax_category !== ""),
      vendor_tax_id: bill.vendor_tax_id || "",
      place_of_supply: bill.place_of_supply || (regime === "in_gst" ? company?.state || "" : ""),
      supply_type: bill.supply_type || "intra",
      reverse_charge: !!bill.reverse_charge,
      discount_amount: parseFloat(String(bill.discount_amount || 0)),
      roundOff: parseFloat(String(bill.round_off || 0)) !== 0,
      tds_section: bill.tds_section || "",
      tds_rate: parseFloat(String(bill.tds_rate || 0)),
      attachmentFile: null,
      existingAttachment: bill.attachment,
      items,
    });
    setIsModalOpen(true);
  };

  const handleCreateOrUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBill.vendor) {
      toast.error("Please select a vendor");
      return;
    }
    if (newBill.taxApplicable && taxIdInvalid) {
      toast.error(`${regimeCfg.taxIdLabel} is not valid (${regimeCfg.taxIdHint}).`);
      return;
    }
    if (regimeCfg.showTds && newBill.tds_section && !(newBill.tds_rate > 0)) {
      toast.error("Enter a TDS rate for the selected section");
      return;
    }

    const validItems = newBill.items
      .filter((item) => item.description.trim() !== "")
      .map((item) => {
        if (!newBill.taxApplicable) return { ...item, tax_rate: 0, tax_category: "" as TaxCategory, hsn_sac_code: "" };
        return regimeCfg.showHsn ? item : { ...item, hsn_sac_code: "" };
      });
    if (validItems.length === 0) {
      toast.error("Please add at least one line item with a description");
      return;
    }

    // Money totals are calculated server-side from these inputs.
    const formData = new FormData();
    formData.append("vendor", String(newBill.vendor));
    formData.append("vendor_reference", newBill.vendor_reference.trim());
    formData.append("purchase_order", newBill.purchase_order ? String(newBill.purchase_order) : "");
    formData.append("bill_date", newBill.bill_date);
    formData.append("due_date", newBill.due_date || "");
    formData.append("category", newBill.category);
    formData.append("payment_terms", newBill.payment_terms);
    formData.append("status", newBill.status);
    formData.append("notes", newBill.notes || "");
    formData.append("currency", newBill.currency);
    if (newBill.currency !== baseCurrency && newBill.exchange_rate > 0 && newBill.exchange_rate !== 1) {
      formData.append("exchange_rate", String(newBill.exchange_rate));
    }
    formData.append("tax_regime", newBill.tax_regime);
    formData.append("vendor_tax_id", newBill.taxApplicable ? newBill.vendor_tax_id : "");
    formData.append("place_of_supply", regimeCfg.showPlaceOfSupply ? newBill.place_of_supply : "");
    formData.append("supply_type", newBill.supply_type);
    formData.append("reverse_charge", newBill.taxApplicable && newBill.reverse_charge ? "true" : "false");
    formData.append("discount_amount", totals.discount.toFixed(2));
    formData.append("round_off", totals.roundOff.toFixed(2));
    formData.append("tds_section", regimeCfg.showTds ? newBill.tds_section : "");
    formData.append("tds_rate", (regimeCfg.showTds && newBill.tds_section ? newBill.tds_rate : 0).toString());
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
          toast.success(`Payment of ${formatCurrency(amt, paymentBill.currency || currency)} recorded`);
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
                placeholder="Search by bill #, vendor invoice #, vendor, or notes..."
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
                    const payableAmt = parseFloat(String(bill.net_payable || 0)) || totalAmt;
                    const paidAmt = parseFloat(String(bill.amount_paid || 0));
                    const dueAmt = parseFloat(String(bill.amount_due || 0));
                    const percentPaid = payableAmt > 0 ? Math.min(100, Math.round((paidAmt / payableAmt) * 100)) : 0;

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
                              {formatCurrency(totalAmt, bill.currency || currency)}
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
                            <span>Due: <strong className={dueAmt > 0 ? "text-ink font-mono" : "text-emerald-700"}>{formatCurrency(dueAmt, bill.currency || currency)}</strong></span>
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
                    {formatCurrency(parseFloat(String(paymentBill.amount_due || 0)), paymentBill.currency || currency)}
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
                  <label className="block text-xs font-medium text-ink mb-1.5">Payment Amount ({paymentBill.currency || currency}) *</label>
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
                  <div className="text-[11px] font-medium text-muted uppercase">
                    {Number(detailBill.tds_amount || 0) > 0 ? "Net Payable" : "Total Amount"}
                  </div>
                  <div className="text-lg font-semibold font-serif text-ink mt-0.5">
                    {formatCurrency(parseFloat(String(detailBill.net_payable || detailBill.total_amount || 0)), detailBill.currency || currency)}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-medium text-muted uppercase">Amount Paid</div>
                  <div className="text-lg font-semibold font-serif text-emerald-700 mt-0.5">
                    {formatCurrency(parseFloat(String(detailBill.amount_paid || 0)), detailBill.currency || currency)}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-medium text-muted uppercase">Balance Due</div>
                  <div className="text-lg font-semibold font-serif text-rose-700 mt-0.5">
                    {formatCurrency(parseFloat(String(detailBill.amount_due || 0)), detailBill.currency || currency)}
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
                {(detailBill.vendor_reference || detailBill.vendor_tax_id || detailBill.place_of_supply || detailBill.reverse_charge) && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs pt-2 border-t border-line/60">
                    <div>
                      <div className="text-[11px] text-muted">Vendor Invoice No.</div>
                      <div className="font-mono text-ink">{detailBill.vendor_reference || "—"}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-muted">{TAX_REGIMES[detailBill.tax_regime || "generic"].taxIdLabel.replace("Vendor ", "")}</div>
                      <div className="font-mono text-ink">{detailBill.vendor_tax_id || "Unregistered"}</div>
                    </div>
                    {detailBill.tax_regime === "in_gst" ? (
                      <div>
                        <div className="text-[11px] text-muted">Place of Supply</div>
                        <div className="text-ink">{detailBill.place_of_supply || "—"}</div>
                      </div>
                    ) : (
                      <div>
                        <div className="text-[11px] text-muted">Tax System</div>
                        <div className="text-ink">{TAX_REGIMES[detailBill.tax_regime || "generic"].label}</div>
                      </div>
                    )}
                    {detailBill.reverse_charge && (
                      <div className="sm:col-span-3">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                          Reverse charge applies
                        </span>
                      </div>
                    )}
                  </div>
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
                        {detailBill.tax_regime === "in_gst" && <th className="px-3 py-2 font-medium">HSN/SAC</th>}
                        <th className="px-3 py-2 font-medium text-right">Qty</th>
                        <th className="px-3 py-2 font-medium text-right">Rate</th>
                        <th className="px-3 py-2 font-medium text-right">{TAX_REGIMES[detailBill.tax_regime || "generic"].taxName}</th>
                        <th className="px-3 py-2 font-medium text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line/70 bg-paper">
                      {detailBill.items && detailBill.items.length > 0 ? (
                        detailBill.items.map((item, idx) => (
                          <tr key={idx}>
                            <td className="px-3 py-2 font-medium text-ink">{item.description}</td>
                            {detailBill.tax_regime === "in_gst" && <td className="px-3 py-2 text-muted font-mono">{item.hsn_sac_code || "—"}</td>}
                            <td className="px-3 py-2 text-right text-muted font-mono">{item.quantity}</td>
                            <td className="px-3 py-2 text-right text-muted font-mono">{formatCurrency(Number(item.unit_price), detailBill.currency || currency)}</td>
                            <td className="px-3 py-2 text-right text-muted font-mono">
                              {item.tax_category === "exempt" ? "Exempt" : item.tax_category === "zero" ? "0% (zero)" : `${Number(item.tax_rate)}%`}
                            </td>
                            <td className="px-3 py-2 text-right font-medium text-ink font-mono">{formatCurrency(Number(item.total || Number(item.quantity) * Number(item.unit_price)), detailBill.currency || currency)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="px-3 py-4 text-center text-muted">No line items recorded</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="ml-auto w-full max-w-[280px] text-xs space-y-1.5 pt-1">
                  <TotalRow label="Subtotal" value={Number(detailBill.subtotal || 0)} currency={detailBill.currency || currency} />
                  {Number(detailBill.discount_amount || 0) > 0 && (
                    <>
                      <TotalRow label="Discount" value={-Number(detailBill.discount_amount)} currency={detailBill.currency || currency} />
                      <TotalRow label="Taxable value" value={Number(detailBill.taxable_amount || 0)} currency={detailBill.currency || currency} />
                    </>
                  )}
                  {Number(detailBill.igst_amount || 0) > 0 ? (
                    <TotalRow label="IGST" value={Number(detailBill.igst_amount)} currency={detailBill.currency || currency} />
                  ) : Number(detailBill.cgst_amount || 0) > 0 || Number(detailBill.sgst_amount || 0) > 0 ? (
                    <>
                      <TotalRow label="CGST" value={Number(detailBill.cgst_amount)} currency={detailBill.currency || currency} />
                      <TotalRow label="SGST" value={Number(detailBill.sgst_amount)} currency={detailBill.currency || currency} />
                    </>
                  ) : (
                    Number(detailBill.tax_amount || 0) > 0 && (
                      <TotalRow label={TAX_REGIMES[detailBill.tax_regime || "generic"].taxName} value={Number(detailBill.tax_amount)} currency={detailBill.currency || currency} />
                    )
                  )}
                  {Number(detailBill.round_off || 0) !== 0 && (
                    <TotalRow label="Round off" value={Number(detailBill.round_off)} currency={detailBill.currency || currency} />
                  )}
                  <div className="flex justify-between font-semibold text-ink pt-1.5 border-t border-line">
                    <span>Invoice Total</span>
                    <span className="font-mono">{formatCurrency(Number(detailBill.total_amount || 0), detailBill.currency || currency)}</span>
                  </div>
                  {Number(detailBill.tds_amount || 0) > 0 && (
                    <>
                      <TotalRow
                        label={`Less TDS ${detailBill.tds_section_display?.split(" - ")[0] || ""} @ ${Number(detailBill.tds_rate)}%`}
                        value={-Number(detailBill.tds_amount)}
                        currency={detailBill.currency || currency}
                      />
                      <div className="flex justify-between font-semibold text-emerald-800 pt-1.5 border-t border-line">
                        <span>Net Payable</span>
                        <span className="font-mono">{formatCurrency(Number(detailBill.net_payable || 0), detailBill.currency || currency)}</span>
                      </div>
                    </>
                  )}
                  {detailBill.reverse_charge && (
                    <div className="mt-2 p-2 rounded-md bg-amber-50 border border-amber-200 text-amber-900 flex justify-between">
                      <span>{TAX_REGIMES[detailBill.tax_regime || "generic"].taxName} under reverse charge (self-accounted)</span>
                      <span className="font-mono">{formatCurrency(Number(detailBill.reverse_charge_amount || 0), detailBill.currency || currency)}</span>
                    </div>
                  )}
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
                            +{formatCurrency(parseFloat(String(p.amount)), detailBill.currency || currency)}
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
              {/* Vendor & references */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={labelCls}>Vendor *</label>
                  <select
                    required
                    className={inputCls}
                    value={newBill.vendor || ""}
                    onChange={(e) => handleVendorChange(e.target.value ? parseInt(e.target.value) : null)}
                  >
                    <option value="">Select a vendor...</option>
                    {vendors.map((v: any) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelCls}>Vendor Invoice No.</label>
                  <input
                    type="text"
                    placeholder="As printed on vendor's invoice"
                    className={inputCls}
                    value={newBill.vendor_reference}
                    onChange={(e) => patchBill({ vendor_reference: e.target.value })}
                  />
                </div>

                <div>
                  <label className={labelCls}>Purchase Order</label>
                  <select
                    className={inputCls}
                    value={newBill.purchase_order || ""}
                    onChange={(e) => handlePurchaseOrderChange(e.target.value ? parseInt(e.target.value) : null)}
                  >
                    <option value="">No purchase order</option>
                    {availablePOs.map((po) => (
                      <option key={po.id} value={po.id}>
                        {po.po_number}
                        {!newBill.vendor && po.vendor_details?.name ? ` · ${po.vendor_details.name}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={labelCls}>Issue Date *</label>
                  <input
                    type="date"
                    required
                    className={inputCls}
                    value={newBill.bill_date}
                    onChange={(e) => patchBill({ bill_date: e.target.value })}
                  />
                </div>

                <div>
                  <label className={labelCls}>Payment Terms</label>
                  <select
                    className={inputCls}
                    value={PAYMENT_TERM_OPTIONS.some((o) => o.label === newBill.payment_terms) ? newBill.payment_terms : "__custom"}
                    onChange={(e) => {
                      if (e.target.value === "__custom") return;
                      patchBill({ payment_terms: e.target.value, dueDateTouched: false });
                    }}
                  >
                    {PAYMENT_TERM_OPTIONS.map((o) => (
                      <option key={o.label} value={o.label}>
                        {o.label}
                      </option>
                    ))}
                    {!PAYMENT_TERM_OPTIONS.some((o) => o.label === newBill.payment_terms) && (
                      <option value="__custom">{newBill.payment_terms || "Custom"}</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className={labelCls}>
                    Due Date
                    {!newBill.dueDateTouched && termsToDays(newBill.payment_terms) !== null && (
                      <span className="ml-1 font-normal text-muted">(from terms)</span>
                    )}
                  </label>
                  <input
                    type="date"
                    className={inputCls}
                    value={newBill.due_date}
                    min={newBill.bill_date}
                    onChange={(e) => patchBill({ due_date: e.target.value, dueDateTouched: true })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                <CurrencyPicker
                  currency={newBill.currency}
                  rate={newBill.exchange_rate}
                  baseCurrency={baseCurrency}
                  onChange={handleCurrencyChange}
                />
                <div>
                  <label className={labelCls}>Expense Category</label>
                  <select
                    className={inputCls}
                    value={newBill.category}
                    onChange={(e) => patchBill({ category: e.target.value })}
                  >
                    {Object.entries(BILL_CATEGORIES).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelCls}>Status</label>
                  <select
                    className={inputCls}
                    value={newBill.status}
                    onChange={(e) => patchBill({ status: e.target.value })}
                  >
                    <option value="draft">Draft</option>
                    <option value="open">Open</option>
                    <option value="partial">Partially Paid</option>
                    <option value="paid">Paid</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

              </div>

              <div>
                  <label className={labelCls}>Vendor Invoice Attachment</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept="application/pdf,image/*"
                      onChange={(e) => patchBill({ attachmentFile: e.target.files?.[0] || null })}
                      className="w-full min-w-0 text-xs text-muted file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border file:border-line file:text-xs file:font-medium file:bg-bone file:text-ink hover:file:bg-bone-2 cursor-pointer"
                    />
                    {newBill.existingAttachment && (
                      <a
                        href={newBill.existingAttachment}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-600 hover:underline shrink-0 flex items-center gap-1 font-medium"
                      >
                        <Paperclip className="w-3.5 h-3.5" />
                        <span>Current</span>
                      </a>
                    )}
                  </div>
                </div>

              {/* Tax details */}
              <div className="p-4 rounded-lg border border-line bg-bone/40 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <label className="flex items-center gap-2 text-sm font-medium text-ink cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={newBill.taxApplicable}
                      onChange={(e) => patchBill({ taxApplicable: e.target.checked })}
                      className="accent-ink w-4 h-4"
                    />
                    {regimeCfg.taxName} applicable on this bill
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted">Tax system</span>
                    <select
                      aria-label="Tax system"
                      className="px-2 py-1 bg-bone border border-line rounded-md text-xs outline-none focus:border-ink"
                      value={newBill.tax_regime}
                      onChange={(e) => patchBill({ tax_regime: e.target.value as TaxRegime })}
                    >
                      {(Object.keys(TAX_REGIMES) as TaxRegime[]).map((r) => (
                        <option key={r} value={r}>
                          {TAX_REGIMES[r].label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {!newBill.taxApplicable ? (
                  <p className="text-[11px] text-muted">
                    No {regimeCfg.taxName} will be recorded. Tick the box if the vendor charges {regimeCfg.taxName}.
                  </p>
                ) : (
                  <>
                    <div className={`grid grid-cols-1 gap-4 ${regimeCfg.showPlaceOfSupply ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
                      <div>
                        <label className={labelCls}>{regimeCfg.taxIdLabel}</label>
                        <input
                          type="text"
                          maxLength={30}
                          placeholder={regimeCfg.taxIdPlaceholder}
                          className={`${inputCls} font-mono uppercase ${taxIdInvalid ? "border-rose-400 focus:border-rose-500" : ""}`}
                          value={newBill.vendor_tax_id}
                          onChange={(e) => patchBill({ vendor_tax_id: normalizeTaxId(e.target.value) })}
                        />
                        {taxIdInvalid ? (
                          <p className="text-[11px] text-rose-600 mt-1">Invalid format: {regimeCfg.taxIdHint}</p>
                        ) : newBill.tax_regime === "in_gst" && stateFromGstin(newBill.vendor_tax_id) ? (
                          <p className="text-[11px] text-muted mt-1">Registered in {stateFromGstin(newBill.vendor_tax_id)}</p>
                        ) : (
                          <p className="text-[11px] text-muted mt-1">{regimeCfg.taxIdHint}. Leave blank if unregistered</p>
                        )}
                      </div>

                      {regimeCfg.showPlaceOfSupply && (
                        <div>
                          <label className={labelCls}>Place of Supply</label>
                          <select
                            className={inputCls}
                            value={newBill.place_of_supply}
                            onChange={(e) => patchBill({ place_of_supply: e.target.value })}
                          >
                            <option value="">Select state...</option>
                            {STATE_NAMES.map((st) => (
                              <option key={st} value={st}>
                                {st}
                              </option>
                            ))}
                            {newBill.place_of_supply && !STATE_NAMES.includes(newBill.place_of_supply) && (
                              <option value={newBill.place_of_supply}>{newBill.place_of_supply}</option>
                            )}
                          </select>
                        </div>
                      )}

                      {regimeCfg.showPlaceOfSupply ? (
                        <div>
                          <label className={labelCls}>Supply Type</label>
                          <select
                            className={inputCls}
                            value={newBill.supply_type}
                            disabled={newBill.reverse_charge}
                            onChange={(e) => patchBill({ supply_type: e.target.value as "intra" | "inter" })}
                          >
                            <option value="intra">Intra-state (CGST + SGST)</option>
                            <option value="inter">Inter-state (IGST)</option>
                          </select>
                          <p className="text-[11px] text-muted mt-1">Set automatically from GSTIN state vs. place of supply</p>
                        </div>
                      ) : (
                        <div className="flex items-end">
                          <ReverseChargeToggle
                            checked={newBill.reverse_charge}
                            onChange={(v) => patchBill({ reverse_charge: v })}
                            hint={regimeCfg.reverseChargeHint}
                          />
                        </div>
                      )}
                    </div>
                    {regimeCfg.showPlaceOfSupply && (
                      <ReverseChargeToggle
                        checked={newBill.reverse_charge}
                        onChange={(v) => patchBill({ reverse_charge: v })}
                        hint={regimeCfg.reverseChargeHint}
                      />
                    )}
                  </>
                )}
              </div>

              {/* Line Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">Line Items</h3>
                  <button
                    type="button"
                    onClick={() => patchBill({ items: [...newBill.items, emptyLine(newBill.taxApplicable ? regimeCfg.defaultRate : 0)] })}
                    className="text-xs font-medium text-ink bg-bone px-2 py-1 rounded-md border border-line hover:bg-bone-2 transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add Item
                  </button>
                </div>

                <div className="rounded-lg border border-line/60 overflow-hidden">
                  <div className={`hidden md:grid ${lineGridCls} gap-2 px-3 py-2 bg-bone text-[11px] font-medium text-muted uppercase tracking-wide border-b border-line/60`}>
                    <span>Description</span>
                    {showHsn && <span>HSN/SAC</span>}
                    <span className="text-right">Qty</span>
                    <span className="text-right">Rate</span>
                    {newBill.taxApplicable && <span className="text-right">{regimeCfg.taxName}</span>}
                    <span className="text-right">Amount</span>
                    <span />
                  </div>

                  <div className="divide-y divide-line/60 bg-bone-2">
                    {newBill.items.map((item, index) => {
                      const lineAmount = item.quantity * item.unit_price;
                      const options = regimeCfg.rateOptions;
                      const currentKey = rateKey(item.tax_rate, item.tax_category || (item.tax_rate > 0 ? "standard" : ""));
                      const optionList = options
                        ? options.some((o) => rateKey(o.rate, o.category) === currentKey)
                          ? options
                          : [...options, { label: `${item.tax_rate}%`, rate: item.tax_rate, category: item.tax_category }]
                        : null;
                      return (
                        <div key={index} className={`grid grid-cols-2 ${lineGridCls} gap-2 p-3 items-start`}>
                          <div className="col-span-2 md:col-span-1">
                            <span className={mobileLabelCls}>Description</span>
                            <input
                              required
                              aria-label="Description"
                              placeholder="Item or service description"
                              className={lineInputCls}
                              value={item.description}
                              onChange={(e) => updateLine(index, { description: e.target.value })}
                            />
                          </div>
                          {showHsn && (
                            <div>
                              <span className={mobileLabelCls}>HSN/SAC</span>
                              <input
                                aria-label="HSN/SAC code"
                                placeholder="e.g. 998314"
                                inputMode="numeric"
                                maxLength={8}
                                className={`${lineInputCls} font-mono`}
                                value={item.hsn_sac_code}
                                onChange={(e) => updateLine(index, { hsn_sac_code: e.target.value.replace(/\D/g, "") })}
                              />
                            </div>
                          )}
                          <div>
                            <span className={mobileLabelCls}>Qty</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              required
                              aria-label="Quantity"
                              className={`${lineInputCls} font-mono text-right`}
                              value={item.quantity}
                              onChange={(e) => updateLine(index, { quantity: parseFloat(e.target.value) || 0 })}
                            />
                          </div>
                          <div>
                            <span className={mobileLabelCls}>Rate</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              required
                              aria-label="Rate"
                              className={`${lineInputCls} font-mono text-right`}
                              value={item.unit_price}
                              onChange={(e) => updateLine(index, { unit_price: parseFloat(e.target.value) || 0 })}
                            />
                          </div>
                          {newBill.taxApplicable && (
                            <div>
                              <span className={mobileLabelCls}>{regimeCfg.taxName}</span>
                              {optionList ? (
                                <select
                                  aria-label={`${regimeCfg.taxName} rate`}
                                  className={`${lineInputCls} font-mono text-right`}
                                  value={currentKey}
                                  onChange={(e) => {
                                    const [rate, category] = e.target.value.split("|");
                                    updateLine(index, { tax_rate: parseFloat(rate) || 0, tax_category: category as TaxCategory });
                                  }}
                                >
                                  {optionList.map((o) => (
                                    <option key={rateKey(o.rate, o.category)} value={rateKey(o.rate, o.category)}>
                                      {o.label}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <div className="relative">
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="100"
                                    aria-label="Tax rate"
                                    className={`${lineInputCls} font-mono text-right pr-6`}
                                    value={item.tax_rate}
                                    onChange={(e) => {
                                      const rate = parseFloat(e.target.value) || 0;
                                      updateLine(index, { tax_rate: rate, tax_category: rate > 0 ? "standard" : "" });
                                    }}
                                  />
                                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted">%</span>
                                </div>
                              )}
                            </div>
                          )}
                          <div className="flex md:block items-center justify-between md:text-right md:pt-1.5">
                            <span className={mobileLabelCls}>Amount</span>
                            <span className="text-sm font-mono font-medium text-ink">{formatCurrency(lineAmount, newBill.currency)}</span>
                          </div>
                          <div className="flex justify-end md:pt-0.5">
                            {newBill.items.length > 1 && (
                              <button
                                type="button"
                                aria-label="Remove line"
                                onClick={() => patchBill({ items: newBill.items.filter((_, i) => i !== index) })}
                                className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-md transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Adjustments + totals */}
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg border border-line bg-bone/40 space-y-3">
                    <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">
                      {regimeCfg.showTds ? "Adjustments & TDS" : "Adjustments"}
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelCls}>Discount ({newBill.currency})</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          className={`${inputCls} font-mono`}
                          value={newBill.discount_amount || ""}
                          placeholder="0.00"
                          onChange={(e) => patchBill({ discount_amount: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      <label className="flex items-center gap-2 text-xs text-ink mt-6 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={newBill.roundOff}
                          onChange={(e) => patchBill({ roundOff: e.target.checked })}
                          className="accent-ink"
                        />
                        Round off total
                      </label>
                    </div>
                    {regimeCfg.showTds && (
                      <>
                        <div className="grid grid-cols-[1fr_90px] gap-3">
                          <div>
                            <label className={labelCls}>TDS Section</label>
                            <select
                              className={inputCls}
                              value={newBill.tds_section}
                              onChange={(e) => {
                                const sec = TDS_SECTIONS.find((t) => t.value === e.target.value);
                                patchBill({ tds_section: e.target.value, tds_rate: sec ? sec.rate || newBill.tds_rate : 0 });
                              }}
                            >
                              <option value="">No TDS</option>
                              {TDS_SECTIONS.map((t) => (
                                <option key={t.value} value={t.value}>
                                  {t.label}
                                  {t.rate ? ` (${t.rate}%)` : ""}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className={labelCls}>Rate %</label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max="30"
                              disabled={!newBill.tds_section}
                              className={`${inputCls} font-mono disabled:opacity-50`}
                              value={newBill.tds_section ? newBill.tds_rate : ""}
                              onChange={(e) => patchBill({ tds_rate: parseFloat(e.target.value) || 0 })}
                            />
                          </div>
                        </div>
                        <p className="text-[11px] text-muted">TDS is calculated on the taxable value (excluding GST) and deducted from what you pay the vendor.</p>
                      </>
                    )}
                  </div>

                  <div className="p-4 rounded-lg border border-line text-xs space-y-1.5">
                    <TotalRow label="Subtotal" value={totals.subtotal} currency={newBill.currency} />
                    {totals.discount > 0 && (
                      <>
                        <TotalRow label="Discount" value={-totals.discount} currency={newBill.currency} />
                        <TotalRow label="Taxable value" value={totals.taxable} currency={newBill.currency} />
                      </>
                    )}
                    {newBill.taxApplicable && !newBill.reverse_charge && (
                      newBill.tax_regime === "in_gst" ? (
                        newBill.supply_type === "inter" ? (
                          <TotalRow label="IGST" value={totals.igst} currency={newBill.currency} />
                        ) : (
                          <>
                            <TotalRow label="CGST" value={totals.cgst} currency={newBill.currency} />
                            <TotalRow label="SGST" value={totals.sgst} currency={newBill.currency} />
                          </>
                        )
                      ) : (
                        <TotalRow label={regimeCfg.taxName} value={totals.tax} currency={newBill.currency} />
                      )
                    )}
                    {totals.roundOff !== 0 && <TotalRow label="Round off" value={totals.roundOff} currency={newBill.currency} />}
                    <div className="flex justify-between font-bold text-ink pt-2 border-t border-line">
                      <span>Invoice Total</span>
                      <span className="font-mono text-sm">{formatCurrency(totals.total, newBill.currency)}</span>
                    </div>
                    {totals.tds > 0 && (
                      <>
                        <TotalRow label={`Less TDS @ ${totals.tdsRate}%`} value={-totals.tds} currency={newBill.currency} />
                        <div className="flex justify-between font-bold text-emerald-800 pt-2 border-t border-line">
                          <span>Net Payable to Vendor</span>
                          <span className="font-mono text-sm">{formatCurrency(totals.net, newBill.currency)}</span>
                        </div>
                      </>
                    )}
                    {newBill.taxApplicable && newBill.reverse_charge && (
                      <div className="mt-2 p-2 rounded-md bg-amber-50 border border-amber-200 text-amber-900">
                        <div className="flex justify-between font-medium">
                          <span>{regimeCfg.taxName} under reverse charge</span>
                          <span className="font-mono">{formatCurrency(totals.reverseCharge, newBill.currency)}</span>
                        </div>
                        <p className="text-[11px] mt-0.5">You account for this yourself. It is not paid to the vendor.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className={labelCls}>Notes & Instructions</label>
                <textarea
                  className={`${inputCls} min-h-[70px] resize-none`}
                  value={newBill.notes}
                  onChange={(e) => patchBill({ notes: e.target.value })}
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
