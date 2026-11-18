"use client";

import { formatCurrency } from "@/lib/utils";
import {
  SALES_TAX_REGIMES,
  STATE_NAMES,
  normalizeTaxId,
  rateKey,
  stateFromGstin,
  type DocTaxSettings,
  type TaxCategory,
  type TaxRegime,
  computeDocTax,
} from "@/lib/tax";

const inputCls = "w-full px-3 py-2 bg-bone border border-line rounded-md text-sm outline-none focus:border-ink transition-colors";
const labelCls = "block text-xs font-medium text-ink mb-1.5";

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

/** Tax applicable toggle, tax system, client tax number, place of supply and reverse charge. */
export function DocTaxPanel({
  value,
  onChange,
  docLabel = "document",
}: {
  value: DocTaxSettings;
  onChange: (patch: Partial<DocTaxSettings>) => void;
  docLabel?: string;
}) {
  const cfg = SALES_TAX_REGIMES[value.tax_regime];
  const taxIdInvalid = Boolean(value.customer_tax_id) && !cfg.validateTaxId(value.customer_tax_id);
  const gstState = value.tax_regime === "in_gst" ? stateFromGstin(value.customer_tax_id) : null;

  return (
    <div className="p-4 rounded-lg border border-line bg-bone/40 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm font-medium text-ink cursor-pointer select-none">
          <input
            type="checkbox"
            checked={value.taxApplicable}
            onChange={(e) => onChange({ taxApplicable: e.target.checked })}
            className="accent-ink w-4 h-4"
          />
          Charge {cfg.taxName} on this {docLabel}
        </label>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted">Tax system</span>
          <select
            aria-label="Tax system"
            className="px-2 py-1 bg-bone border border-line rounded-md text-xs outline-none focus:border-ink"
            value={value.tax_regime}
            onChange={(e) => onChange({ tax_regime: e.target.value as TaxRegime })}
          >
            {(Object.keys(SALES_TAX_REGIMES) as TaxRegime[]).map((r) => (
              <option key={r} value={r}>
                {SALES_TAX_REGIMES[r].label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!value.taxApplicable ? (
        <p className="text-[11px] text-muted">
          No {cfg.taxName} will be added. Tick the box to charge {cfg.taxName} on the line items.
        </p>
      ) : (
        <>
          <div className={`grid grid-cols-1 gap-4 ${cfg.showPlaceOfSupply ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
            <div>
              <label className={labelCls}>{cfg.taxIdLabel}</label>
              <input
                type="text"
                maxLength={30}
                placeholder={cfg.taxIdPlaceholder}
                className={`${inputCls} font-mono uppercase ${taxIdInvalid ? "border-rose-400 focus:border-rose-500" : ""}`}
                value={value.customer_tax_id}
                onChange={(e) => onChange({ customer_tax_id: normalizeTaxId(e.target.value) })}
              />
              {taxIdInvalid ? (
                <p className="text-[11px] text-rose-600 mt-1">Invalid format: {cfg.taxIdHint}</p>
              ) : gstState ? (
                <p className="text-[11px] text-muted mt-1">Registered in {gstState}</p>
              ) : (
                <p className="text-[11px] text-muted mt-1">{cfg.taxIdHint}. Leave blank for unregistered clients</p>
              )}
            </div>

            {cfg.showPlaceOfSupply && (
              <div>
                <label className={labelCls}>Place of Supply</label>
                <select className={inputCls} value={value.place_of_supply} onChange={(e) => onChange({ place_of_supply: e.target.value })}>
                  <option value="">Select state...</option>
                  {STATE_NAMES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                  {value.place_of_supply && !STATE_NAMES.includes(value.place_of_supply) && (
                    <option value={value.place_of_supply}>{value.place_of_supply}</option>
                  )}
                </select>
              </div>
            )}

            {cfg.showPlaceOfSupply ? (
              <div>
                <label className={labelCls}>Supply Type</label>
                <select
                  className={inputCls}
                  value={value.supply_type}
                  disabled={value.reverse_charge}
                  onChange={(e) => onChange({ supply_type: e.target.value as "intra" | "inter" })}
                >
                  <option value="intra">Intra-state (CGST + SGST)</option>
                  <option value="inter">Inter-state (IGST)</option>
                </select>
                <p className="text-[11px] text-muted mt-1">Set automatically from your state vs. place of supply</p>
              </div>
            ) : (
              <div className="flex items-end">
                <ReverseChargeToggle checked={value.reverse_charge} onChange={(v) => onChange({ reverse_charge: v })} hint={cfg.reverseChargeHint} />
              </div>
            )}
          </div>
          {cfg.showPlaceOfSupply && (
            <ReverseChargeToggle checked={value.reverse_charge} onChange={(v) => onChange({ reverse_charge: v })} hint={cfg.reverseChargeHint} />
          )}
        </>
      )}
    </div>
  );
}

/** Per-line tax rate: preset slabs (GST / VAT incl. zero-rated & exempt) or a free % input. */
export function LineTaxRate({
  regime,
  rate,
  category,
  onChange,
  className = "",
}: {
  regime: TaxRegime;
  rate: number | string;
  category?: string | null;
  onChange: (rate: number, category: TaxCategory) => void;
  className?: string;
}) {
  const cfg = SALES_TAX_REGIMES[regime];
  const r = parseFloat(String(rate ?? 0)) || 0;
  const cat = ((category || (r > 0 ? "standard" : "")) as TaxCategory);
  const options = cfg.rateOptions;

  if (!options) {
    return (
      <div className="relative">
        <input
          type="number"
          min="0"
          max="100"
          step="0.01"
          aria-label={`${cfg.taxName} %`}
          placeholder={`${cfg.taxName} %`}
          className={`${className} pr-6`}
          value={r || ""}
          onChange={(e) => {
            const v = parseFloat(e.target.value) || 0;
            onChange(v, v > 0 ? "standard" : "");
          }}
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-muted pointer-events-none">%</span>
      </div>
    );
  }

  const current = rateKey(cat === "zero" || cat === "exempt" ? 0 : r, cat);
  const list = options.some((o) => rateKey(o.rate, o.category) === current) ? options : [...options, { label: `${r}%`, rate: r, category: cat }];
  return (
    <select
      aria-label={`${cfg.taxName} rate`}
      className={className}
      value={current}
      onChange={(e) => {
        const [v, c] = e.target.value.split("|");
        onChange(parseFloat(v) || 0, c as TaxCategory);
      }}
    >
      {list.map((o) => (
        <option key={rateKey(o.rate, o.category)} value={rateKey(o.rate, o.category)}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

/** Subtotal, CGST/SGST/IGST or VAT, total and the reverse-charge note. */
export function DocTaxTotals({
  totals,
  settings,
  currency,
  className = "",
}: {
  totals: ReturnType<typeof computeDocTax>;
  settings: DocTaxSettings;
  currency: string;
  className?: string;
}) {
  const cfg = SALES_TAX_REGIMES[settings.tax_regime];
  const row = (label: string, value: number) => (
    <div className="flex justify-between gap-6 text-muted">
      <span>{label}</span>
      <span className="font-mono">{formatCurrency(value, currency)}</span>
    </div>
  );
  return (
    <div className={`space-y-1 text-sm ${className}`}>
      {row("Subtotal", totals.subtotal)}
      {totals.igst > 0 && row("IGST", totals.igst)}
      {totals.cgst > 0 && row("CGST", totals.cgst)}
      {totals.sgst > 0 && row("SGST", totals.sgst)}
      {totals.tax > 0 && !totals.igst && !totals.cgst && row(cfg.taxName, totals.tax)}
      <div className="flex justify-between gap-6 font-semibold text-ink pt-1 border-t border-line">
        <span>Total</span>
        <span className="font-mono">{formatCurrency(totals.total, currency)}</span>
      </div>
      {totals.reverseCharge > 0 && (
        <p className="text-[11px] text-amber-700">
          Reverse charge: {cfg.taxName} of {formatCurrency(totals.reverseCharge, currency)} is payable by the client, not included in the total.
        </p>
      )}
    </div>
  );
}

const TAX_ID_LABELS: Record<string, string> = { in_gst: "GSTIN", ae_vat: "TRN" };
const TAX_NAMES: Record<string, string> = { in_gst: "GST", ae_vat: "VAT" };

export function docTaxIdLabel(regime?: string | null) {
  return TAX_ID_LABELS[regime || ""] || "Tax ID";
}

/** "TAX INVOICE" when GST/VAT is charged (or reverse-charged), else "INVOICE". */
export function invoiceTitle(doc: any) {
  const taxed = (doc?.tax_regime === "in_gst" || doc?.tax_regime === "ae_vat") && (parseFloat(doc?.tax_amount || "0") > 0 || doc?.reverse_charge);
  return taxed ? "TAX INVOICE" : "INVOICE";
}

/** Saved tax figures of a quote/invoice: CGST + SGST, IGST, VAT/Tax, and the reverse-charge note. */
export function DocTaxBreakdown({ doc, currency, rowClassName }: { doc: any; currency: string; rowClassName: string }) {
  const n = (v: unknown) => parseFloat(String(v ?? "0")) || 0;
  const taxName = TAX_NAMES[doc?.tax_regime || ""] || "Tax";
  const rows: [string, number][] = [];
  if (n(doc?.igst_amount)) rows.push(["IGST", n(doc.igst_amount)]);
  else if (n(doc?.cgst_amount) || n(doc?.sgst_amount)) rows.push(["CGST", n(doc.cgst_amount)], ["SGST", n(doc.sgst_amount)]);
  else rows.push([taxName, n(doc?.tax_amount)]);
  return (
    <>
      {rows.map(([label, value]) => (
        <div key={label} className={rowClassName}>
          <span>{label}</span>
          <span>{formatCurrency(value, currency)}</span>
        </div>
      ))}
      {doc?.reverse_charge && (
        <p className="text-xs text-amber-700">
          Reverse charge applies: {taxName} of {formatCurrency(n(doc.reverse_charge_amount), currency)} is payable by the recipient.
        </p>
      )}
    </>
  );
}
