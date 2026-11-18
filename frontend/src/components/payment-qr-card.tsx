"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { formatCurrency } from "@/lib/utils";

type QrSettings = {
  payment_qr_mode?: "off" | "image" | "upi" | string;
  payment_qr_image?: string | null;
  upi_id?: string | null;
  payment_qr_label?: string | null;
  payment_qr_on_quotes?: boolean;
  payment_qr_on_invoices?: boolean;
  payment_qr_currency?: string | null;
};

/** Mirrors InvoiceSettings.payment_qr_for() on the server. */
export function resolvePaymentQr(settings: QrSettings | null | undefined, kind: "quote" | "invoice", currency: string) {
  if (!settings) return null;
  if (kind === "quote" && settings.payment_qr_on_quotes === false) return null;
  if (kind === "invoice" && settings.payment_qr_on_invoices === false) return null;
  const wanted = (settings.payment_qr_currency || "").toUpperCase();
  const cur = (currency || "").toUpperCase();
  if (wanted && cur && cur !== wanted) return null;
  if (settings.payment_qr_mode === "image" && settings.payment_qr_image) return { kind: "image" as const, value: settings.payment_qr_image };
  if (settings.payment_qr_mode === "upi" && settings.upi_id && (cur === "" || cur === "INR")) return { kind: "upi" as const, value: settings.upi_id.trim() };
  return null;
}

export function upiLink(upiId: string, payee: string, amount?: number, note?: string) {
  const params = new URLSearchParams({ pa: upiId, pn: payee || "", cu: "INR" });
  if (amount && amount > 0) params.set("am", amount.toFixed(2));
  if (note) params.set("tn", note.slice(0, 50));
  return `upi://pay?${params.toString().replace(/\+/g, "%20").replace(/%40/g, "@")}`;
}

export function PaymentQrCard({
  settings,
  kind,
  currency,
  amount,
  payee,
  reference,
  className = "",
}: {
  settings: QrSettings | null | undefined;
  kind: "quote" | "invoice";
  currency: string;
  amount: number;
  payee: string;
  reference?: string;
  className?: string;
}) {
  const qr = resolvePaymentQr(settings, kind, currency);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const link = qr?.kind === "upi" ? upiLink(qr.value, payee, amount, reference) : null;

  useEffect(() => {
    if (!link) return;
    QRCode.toDataURL(link, { margin: 1, width: 240 })
      .then(setDataUrl)
      .catch(() => setDataUrl(null));
  }, [link]);

  if (!qr || !(amount > 0)) return null;
  const src = qr.kind === "image" ? qr.value : dataUrl;
  if (!src) return null;

  return (
    <div className={`flex items-center gap-4 p-4 rounded-xl border border-line bg-white print:break-inside-avoid ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="Payment QR code" loading="eager" decoding="sync" className="w-28 h-28 object-contain shrink-0" />
      <div className="space-y-1 text-sm">
        <div className="font-semibold text-ink">{settings?.payment_qr_label || "Scan to pay"}</div>
        <div className="text-muted">
          Amount: <span className="font-medium text-ink">{formatCurrency(amount, currency)}</span>
        </div>
        {reference && <div className="text-muted">Reference: {reference}</div>}
        {qr.kind === "upi" && <div className="text-muted font-mono text-xs">UPI: {qr.value}</div>}
        {link && (
          <a href={link} className="inline-block mt-1 text-xs font-medium underline text-ink print:hidden md:hidden">
            Pay with a UPI app
          </a>
        )}
      </div>
    </div>
  );
}
