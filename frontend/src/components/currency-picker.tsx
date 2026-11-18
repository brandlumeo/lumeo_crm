"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { fetchExchangeRate } from "@/lib/api";
import { CURRENCIES, currencyLabel } from "@/lib/currency";

type Props = {
  currency: string;
  /** Base-currency units per 1 unit of `currency`. */
  rate: number;
  baseCurrency: string;
  onChange: (currency: string, rate: number) => void;
  label?: string;
  selectClassName?: string;
  /** Fetch a rate automatically when the currency changes (default true). */
  autoFetch?: boolean;
};

const defaultSelectCls =
  "w-full px-3 py-2 bg-bone border border-line rounded-md text-sm outline-none focus:border-ink transition-colors";

/**
 * Currency dropdown + exchange-rate field. The rate field only appears when the
 * document currency differs from the company's base currency; it is auto-filled
 * with today's rate and stays editable (e.g. to match the bank's actual rate).
 */
export function CurrencyPicker({ currency, rate, baseCurrency, onChange, label = "Currency", selectClassName, autoFetch = true }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastFetched = useRef<string | null>(null);
  const isForeign = !!currency && currency !== baseCurrency;

  const loadRate = async (code: string) => {
    if (!code || code === baseCurrency) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchExchangeRate(code, baseCurrency);
      lastFetched.current = code;
      onChange(code, parseFloat(data.rate));
    } catch {
      setError("Couldn't fetch today's rate. Enter it manually.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch when switching to a foreign currency that has no usable rate yet.
  useEffect(() => {
    if (autoFetch && isForeign && (!rate || rate === 1) && lastFetched.current !== currency) {
      void loadRate(currency);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currency, baseCurrency]);

  const options = CURRENCIES.some((c) => c.code === currency) || !currency
    ? CURRENCIES
    : [...CURRENCIES, { code: currency, name: currency, symbol: currency }];

  return (
    <div className="space-y-2">
      <div>
        <label className="block text-xs font-medium text-ink mb-1.5">{label}</label>
        <select
          className={selectClassName || defaultSelectCls}
          value={currency || baseCurrency}
          onChange={(e) => {
            const code = e.target.value;
            lastFetched.current = null;
            onChange(code, 1);
          }}
        >
          {options.map((c) => (
            <option key={c.code} value={c.code}>
              {currencyLabel(c.code)}
              {c.code === baseCurrency ? " (base)" : ""}
            </option>
          ))}
        </select>
      </div>
      {isForeign && (
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted whitespace-nowrap">1 {currency} =</span>
            <input
              type="number"
              step="0.000001"
              min="0"
              aria-label={`Exchange rate ${currency} to ${baseCurrency}`}
              className="w-full min-w-0 px-2 py-1 bg-bone border border-line rounded-md text-xs font-mono outline-none focus:border-ink"
              value={rate && rate !== 1 ? rate : ""}
              placeholder={loading ? "Fetching…" : "Rate"}
              onChange={(e) => onChange(currency, parseFloat(e.target.value) || 0)}
            />
            <span className="text-[11px] text-muted">{baseCurrency}</span>
            <button
              type="button"
              title="Refresh today's rate"
              onClick={() => void loadRate(currency)}
              className="p-1 text-muted hover:text-ink rounded"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            </button>
          </div>
          <p className={`text-[11px] mt-1 ${error ? "text-rose-600" : "text-muted"}`}>
            {error || "Used only to convert this document into your reports. Edit to match your bank rate."}
          </p>
        </div>
      )}
    </div>
  );
}
