/**
 * Regime-aware tax for documents issued to clients (quotes, invoices).
 * Mirrors SalesTaxMixin.apply_tax_totals() on the server.
 */

export type TaxRegime = "in_gst" | "ae_vat" | "generic";
export type TaxCategory = "" | "standard" | "zero" | "exempt";
export type SupplyType = "intra" | "inter";
export type RateOption = { label: string; rate: number; category: TaxCategory };

export const GST_STATES: Record<string, string> = {
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
export const STATE_NAMES = Object.values(GST_STATES).sort();
export const GSTIN_REGEX = /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/;
export const TRN_REGEX = /^\d{15}$/;

export const SALES_TAX_REGIMES: Record<
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
    reverseChargeHint: string;
  }
> = {
  in_gst: {
    label: "India – GST",
    taxName: "GST",
    taxIdLabel: "Client GSTIN",
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
    reverseChargeHint: "RCM: the client pays the GST directly to the government. GST is shown but not charged.",
  },
  ae_vat: {
    label: "UAE – VAT",
    taxName: "VAT",
    taxIdLabel: "Client TRN",
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
    reverseChargeHint: "The client accounts for the 5% VAT themselves (e.g. VAT-registered business buyer). VAT is shown but not charged.",
  },
  generic: {
    label: "Other – single tax",
    taxName: "Tax",
    taxIdLabel: "Client Tax ID",
    taxIdPlaceholder: "VAT / tax registration no.",
    taxIdHint: "Optional",
    validateTaxId: (v) => v.length <= 30,
    defaultRate: 0,
    rateOptions: null,
    showPlaceOfSupply: false,
    showHsn: false,
    reverseChargeHint: "The client accounts for the tax themselves. Tax is shown but not charged.",
  },
};

type CompanyLike = { country?: string | null; currency?: string | null; state?: string | null; tax_id?: string | null } | null | undefined;

export function defaultTaxRegime(country?: string | null, currency?: string | null): TaxRegime {
  const c = (country || "").trim().toLowerCase();
  const cur = (currency || "").trim().toUpperCase();
  if (c.includes("india") || ["in", "ind", "bharat"].includes(c) || (!c && cur === "INR")) return "in_gst";
  if (
    c.includes("emirates") || c.replace(/\./g, "").includes("uae") ||
    ["ae", "are", "dubai", "abu dhabi", "sharjah"].includes(c) || (!c && cur === "AED")
  ) return "ae_vat";
  return "generic";
}

/** A rupee document is Indian GST, a dirham one UAE VAT; otherwise the company's own system. */
export function regimeForCurrency(code: string, company: CompanyLike): TaxRegime {
  if (code === "INR") return "in_gst";
  if (code === "AED") return "ae_vat";
  const base = (company?.currency || "").toUpperCase();
  return code === base ? defaultTaxRegime(company?.country, company?.currency) : "generic";
}

export const normalizeTaxId = (v: string) => v.toUpperCase().replace(/[\s-]/g, "");
export const rateKey = (rate: number, category: TaxCategory) => `${rate}|${category}`;

export function stateFromGstin(gstin: string): string | null {
  return GSTIN_REGEX.test(gstin) ? GST_STATES[gstin.slice(0, 2)] || null : null;
}

/** Our registered state: from our GSTIN when we have one, else the company address. */
export function supplierState(company: CompanyLike): string {
  return stateFromGstin(normalizeTaxId(company?.tax_id || "")) || company?.state || "";
}

export type DocTaxSettings = {
  tax_regime: TaxRegime;
  taxApplicable: boolean;
  customer_tax_id: string;
  place_of_supply: string;
  supply_type: SupplyType;
  reverse_charge: boolean;
};

export type TaxLine = {
  quantity: number | string;
  unit_price: number | string;
  tax_rate: number | string;
  tax_category?: TaxCategory | string | null;
  is_included?: boolean;
};

const num = (v: unknown) => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : 0;
};

export function initialTaxSettings(company: CompanyLike, currency?: string): DocTaxSettings {
  const regime = currency ? regimeForCurrency(currency, company) : defaultTaxRegime(company?.country, company?.currency);
  return {
    tax_regime: regime,
    taxApplicable: false,
    customer_tax_id: "",
    place_of_supply: regime === "in_gst" ? supplierState(company) : "",
    supply_type: "intra",
    reverse_charge: false,
  };
}

/** Settings for editing an existing quote/invoice. */
export function taxSettingsFromDoc(doc: any, company: CompanyLike): DocTaxSettings {
  const regime: TaxRegime = doc?.tax_regime || regimeForCurrency((doc?.currency || company?.currency || "").toUpperCase(), company);
  const items: TaxLine[] = doc?.items || [];
  return {
    tax_regime: regime,
    taxApplicable: Boolean(doc?.reverse_charge) || items.some((i) => num(i.tax_rate) > 0 || (i.tax_category && i.tax_category !== "")),
    customer_tax_id: doc?.customer_tax_id || "",
    place_of_supply: doc?.place_of_supply || (regime === "in_gst" ? supplierState(company) : ""),
    supply_type: doc?.supply_type === "inter" ? "inter" : "intra",
    reverse_charge: Boolean(doc?.reverse_charge),
  };
}

function deriveSupplyType(placeOfSupply: string, company: CompanyLike): SupplyType {
  const ours = supplierState(company);
  if (!ours || !placeOfSupply) return "intra";
  return ours.toLowerCase() === placeOfSupply.toLowerCase() ? "intra" : "inter";
}

/**
 * Apply a settings change and keep derived values in sync: line rates when tax is
 * toggled or the system changes, place of supply from the client's GSTIN, and
 * supply type (our state vs. place of supply).
 */
export function applyTaxPatch<L extends TaxLine>(
  prev: DocTaxSettings,
  patch: Partial<DocTaxSettings>,
  items: L[],
  company: CompanyLike,
): { settings: DocTaxSettings; items: L[] } {
  const next = { ...prev, ...patch };
  let nextItems = items;
  const setRates = (rate: number) => {
    nextItems = nextItems.map((i) => ({ ...i, tax_rate: rate, tax_category: rate > 0 ? "standard" : "" }));
  };

  if ("tax_regime" in patch && patch.tax_regime !== prev.tax_regime) {
    const cfg = SALES_TAX_REGIMES[next.tax_regime];
    if (!cfg.validateTaxId(next.customer_tax_id)) next.customer_tax_id = "";
    if (!cfg.showPlaceOfSupply) next.place_of_supply = "";
    else if (!next.place_of_supply) next.place_of_supply = stateFromGstin(next.customer_tax_id) || supplierState(company);
    if (next.tax_regime !== "in_gst") next.supply_type = "intra";
    if (next.taxApplicable) setRates(cfg.defaultRate);
  }
  if ("taxApplicable" in patch && patch.taxApplicable !== prev.taxApplicable) {
    setRates(next.taxApplicable ? SALES_TAX_REGIMES[next.tax_regime].defaultRate : 0);
    if (!next.taxApplicable) next.reverse_charge = false;
  }
  if (next.tax_regime === "in_gst") {
    if ("customer_tax_id" in patch && !("place_of_supply" in patch)) {
      const clientState = stateFromGstin(next.customer_tax_id);
      if (clientState) next.place_of_supply = clientState;
    }
    if (("customer_tax_id" in patch || "place_of_supply" in patch || "tax_regime" in patch) && !("supply_type" in patch)) {
      next.supply_type = deriveSupplyType(next.place_of_supply, company);
    }
  }
  return { settings: next, items: nextItems };
}

export function computeDocTax(items: TaxLine[], s: DocTaxSettings) {
  const r2 = (n: number) => Math.round(n * 100) / 100;
  let subtotal = 0;
  let lineTax = 0;
  for (const i of items) {
    if (i.is_included) continue;
    const amount = num(i.quantity) * num(i.unit_price);
    subtotal += amount;
    if (s.taxApplicable && i.tax_category !== "zero" && i.tax_category !== "exempt") lineTax += (amount * num(i.tax_rate)) / 100;
  }
  lineTax = r2(lineTax);
  const reverseCharge = s.taxApplicable && s.reverse_charge ? lineTax : 0;
  const tax = reverseCharge ? 0 : lineTax;
  const split = s.tax_regime === "in_gst" && tax > 0;
  const igst = split && s.supply_type === "inter" ? tax : 0;
  const cgst = split && s.supply_type !== "inter" ? r2(tax / 2) : 0;
  const sgst = split && s.supply_type !== "inter" ? r2(tax - cgst) : 0;
  return { subtotal: r2(subtotal), tax, cgst, sgst, igst, reverseCharge, total: r2(subtotal + tax) };
}

/** Fields sent to the API alongside the line items. */
export function taxPayload(s: DocTaxSettings) {
  const cfg = SALES_TAX_REGIMES[s.tax_regime];
  return {
    tax_regime: s.tax_regime,
    customer_tax_id: s.taxApplicable || s.customer_tax_id ? s.customer_tax_id : "",
    place_of_supply: cfg.showPlaceOfSupply ? s.place_of_supply : "",
    supply_type: s.tax_regime === "in_gst" ? s.supply_type : "intra",
    reverse_charge: s.taxApplicable && s.reverse_charge,
  };
}

/** Line values to send: no tax when tax is switched off, none on zero/exempt lines. */
export function lineTaxFields(line: TaxLine, s: DocTaxSettings) {
  if (!s.taxApplicable) return { tax_rate: 0, tax_category: "" };
  const category = (line.tax_category || (num(line.tax_rate) > 0 ? "standard" : "")) as TaxCategory;
  return { tax_rate: category === "zero" || category === "exempt" ? 0 : num(line.tax_rate), tax_category: category };
}
