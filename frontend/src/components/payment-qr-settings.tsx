"use client";

import { useEffect, useState } from "react";
import { Loader2, QrCode, UploadCloud, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useInvoiceSettings, useUpdateInvoiceSettings, useCurrentCompany } from "@/lib/queries";
import { uploadAttachment } from "@/lib/api";
import { CURRENCIES, currencyLabel } from "@/lib/currency";
import { PaymentQrCard } from "@/components/payment-qr-card";

type Mode = "off" | "image" | "upi";
const UPI_REGEX = /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z][a-zA-Z0-9.-]{1,63}$/;

/** Finance settings: payment QR printed on quotes and invoices (PDF + client link). */
export function PaymentQrSettings({ isAdmin }: { isAdmin: boolean }) {
  const { data: settings } = useInvoiceSettings();
  const { data: company } = useCurrentCompany();
  const update = useUpdateInvoiceSettings();
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    payment_qr_mode: "upi" as Mode,
    payment_qr_image: "",
    upi_id: "",
    payment_qr_label: "Scan to pay",
    payment_qr_on_quotes: true,
    payment_qr_on_invoices: true,
    payment_qr_currency: "INR",
  });

  useEffect(() => {
    if (!settings) return;
    const s: any = settings;
    setForm({
      payment_qr_mode: (s.payment_qr_mode as Mode) || "upi",
      payment_qr_image: s.payment_qr_image || "",
      upi_id: s.upi_id || "",
      payment_qr_label: s.payment_qr_label ?? "Scan to pay",
      payment_qr_on_quotes: s.payment_qr_on_quotes ?? true,
      payment_qr_on_invoices: s.payment_qr_on_invoices ?? true,
      payment_qr_currency: s.payment_qr_currency ?? "INR",
    });
  }, [settings]);

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));
  const upiInvalid = form.payment_qr_mode === "upi" && Boolean(form.upi_id) && !UPI_REGEX.test(form.upi_id.trim());

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Please choose an image (PNG or JPG).");
    if (file.size > 5 * 1024 * 1024) return toast.error("The image must be under 5 MB.");
    const fd = new FormData();
    fd.append("file", file);
    setUploading(true);
    try {
      const attachment = await uploadAttachment(fd);
      set({ payment_qr_image: attachment.file_url, payment_qr_mode: "image" });
      toast.success("QR uploaded. Click Save to apply it.");
    } catch {
      toast.error("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = () => {
    if (form.payment_qr_mode === "image" && !form.payment_qr_image) return toast.error("Upload your QR image first.");
    if (form.payment_qr_mode === "upi" && (!form.upi_id.trim() || upiInvalid)) return toast.error("Enter a valid UPI ID, e.g. name@hdfcbank.");
    update.mutate(
      { data: { ...form, upi_id: form.upi_id.trim() } },
      {
        onSuccess: () => toast.success("Payment QR settings saved"),
        onError: () => toast.error("Could not save payment QR settings"),
      },
    );
  };

  const previewCurrency = form.payment_qr_currency || (company?.currency || "INR").toUpperCase();
  const option = (value: Mode, title: string, hint: string) => (
    <label
      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
        form.payment_qr_mode === value ? "border-ink bg-bone/60" : "border-line hover:bg-bone/30"
      }`}
    >
      <input
        type="radio"
        name="payment_qr_mode"
        className="mt-1 accent-ink"
        checked={form.payment_qr_mode === value}
        disabled={!isAdmin}
        onChange={() => set({ payment_qr_mode: value })}
      />
      <span>
        <span className="block text-[13.5px] font-medium text-ink">{title}</span>
        <span className="block text-[12px] text-muted">{hint}</span>
      </span>
    </label>
  );

  return (
    <div className="bg-paper border border-line rounded-2xl shadow-sm p-6 md:p-8 animate-fade-in">
      <div className="flex items-center justify-between gap-4 mb-6 pb-4 border-b border-line/50">
        <div>
          <h4 className="text-[16px] font-semibold text-ink flex items-center gap-2">
            <QrCode className="w-4 h-4" /> Payment QR on quotes &amp; invoices
          </h4>
          <p className="text-[12.5px] text-muted mt-1">Clients scan it to pay. It appears on the PDF and on the shared quote/invoice link.</p>
        </div>
        {isAdmin && (
          <button onClick={handleSave} disabled={update.isPending || uploading} className="btn btn-primary text-[13px] px-4 py-2 bg-ink text-white rounded-lg flex items-center gap-2 disabled:opacity-60">
            {update.isPending && <Loader2 className="w-4 h-4 animate-spin" />} Save
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
        <div className="space-y-5">
          <div className="space-y-2">
            {option("image", "Use my QR code (scanner image)", "Upload the QR from your bank or UPI app. Clients enter the amount when they scan.")}
            {option("upi", "Generate a UPI QR with the exact amount", "Built from your UPI ID for each document, so the amount is filled in for the client (INR only).")}
            {option("off", "Don't show a payment QR", "Only bank details / payment methods are shown.")}
          </div>

          {form.payment_qr_mode === "image" && (
            <div className="flex items-center gap-4">
              {form.payment_qr_image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.payment_qr_image} alt="Uploaded payment QR" className="w-24 h-24 object-contain border border-line rounded-lg bg-white" />
              ) : (
                <div className="w-24 h-24 border border-dashed border-line rounded-lg flex items-center justify-center text-muted">
                  <QrCode className="w-8 h-8" />
                </div>
              )}
              {isAdmin && (
                <div className="flex flex-col gap-2">
                  <label className="btn btn-secondary text-[13px] px-3 py-1.5 rounded-lg border border-line cursor-pointer flex items-center gap-2">
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                    {form.payment_qr_image ? "Replace QR image" : "Upload QR image"}
                    <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
                  </label>
                  {form.payment_qr_image && (
                    <button type="button" onClick={() => set({ payment_qr_image: "" })} className="text-[12px] text-rose-600 flex items-center gap-1">
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {form.payment_qr_mode === "upi" && (
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-muted">UPI ID</label>
              <input
                className={`input w-full font-mono ${upiInvalid ? "border-rose-400" : ""}`}
                placeholder="e.g. yourbusiness@hdfcbank"
                value={form.upi_id}
                disabled={!isAdmin}
                onChange={(e) => set({ upi_id: e.target.value.replace(/\s/g, "") })}
              />
              <p className={`text-[12px] ${upiInvalid ? "text-rose-600" : "text-muted"}`}>
                {upiInvalid ? "That doesn't look like a UPI ID (name@bank)." : "The UPI ID printed under your bank's QR or shown in your UPI app."}
              </p>
            </div>
          )}

          {form.payment_qr_mode !== "off" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-muted">Caption</label>
                <input className="input w-full" maxLength={100} value={form.payment_qr_label} disabled={!isAdmin} onChange={(e) => set({ payment_qr_label: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-muted">Show on documents in</label>
                <select className="input w-full" value={form.payment_qr_currency} disabled={!isAdmin} onChange={(e) => set({ payment_qr_currency: e.target.value })}>
                  <option value="">Any currency</option>
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {currencyLabel(c.code)} only
                    </option>
                  ))}
                </select>
                <p className="text-[12px] text-muted">A UPI QR only works for rupee payments, so it's hidden on AED/SAR documents.</p>
              </div>
              <label className="flex items-center gap-2 text-[13.5px] text-ink">
                <input type="checkbox" className="accent-ink" checked={form.payment_qr_on_quotes} disabled={!isAdmin} onChange={(e) => set({ payment_qr_on_quotes: e.target.checked })} />
                Show on quotes
              </label>
              <label className="flex items-center gap-2 text-[13.5px] text-ink">
                <input type="checkbox" className="accent-ink" checked={form.payment_qr_on_invoices} disabled={!isAdmin} onChange={(e) => set({ payment_qr_on_invoices: e.target.checked })} />
                Show on invoices
              </label>
            </div>
          )}
        </div>

        <div>
          <div className="text-[12px] font-medium text-muted uppercase tracking-wider mb-2">Preview</div>
          {form.payment_qr_mode === "off" ? (
            <div className="p-6 text-center text-[13px] text-muted border border-dashed border-line rounded-xl">No QR will be shown</div>
          ) : (
            <PaymentQrCard
              settings={{ ...form, payment_qr_currency: "", payment_qr_on_quotes: true, payment_qr_on_invoices: true }}
              kind="invoice"
              currency={form.payment_qr_mode === "upi" ? "INR" : previewCurrency || "INR"}
              amount={1000}
              payee={company?.name || ""}
              reference="INV-00001"
            />
          )}
        </div>
      </div>
    </div>
  );
}
