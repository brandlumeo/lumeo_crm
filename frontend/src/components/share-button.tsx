"use client";

import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Share2, X, Loader2, MessageCircle, Mail, Link2, Download, Smartphone, Users, User, Contact, Settings2 } from "lucide-react";
import { updateInvoiceSettings } from "@/lib/api";
import {
  DEFAULT_TEMPLATES,
  TEMPLATE_PLACEHOLDERS,
  fetchShareContext,
  fillTemplate,
  logShare,
  toWhatsAppNumber,
  whatsAppUrl,
  type RecipientType,
  type ShareChannel,
  type ShareDocType,
} from "@/lib/share";

type Mode = "party" | "team" | "pick";

export function ShareButton({
  docType,
  docId,
  variant = "icon",
  className = "",
  label = "Share",
}: {
  docType: ShareDocType;
  docId: number;
  variant?: "icon" | "button";
  className?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        {variant === "icon" ? (
          <button
            type="button"
            title={label}
            aria-label={label}
            className={`p-2 text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors border border-line ${className}`}
          >
            <Share2 className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md border border-line bg-bone hover:bg-bone-2 text-ink transition-colors ${className}`}
          >
            <Share2 className="w-4 h-4" /> {label}
          </button>
        )}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed z-[81] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-2rem)] max-w-lg max-h-[90vh] overflow-y-auto bg-paper border border-line rounded-2xl shadow-xl focus:outline-none">
          {open && <SharePanel docType={docType} docId={docId} onDone={() => setOpen(false)} />}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function SharePanel({ docType, docId, onDone }: { docType: ShareDocType; docId: number; onDone: () => void }) {
  const queryClient = useQueryClient();
  const { data: ctx, isLoading, isError } = useQuery({
    queryKey: ["share", docType, docId],
    queryFn: () => fetchShareContext(docType, docId),
    staleTime: 0,
  });

  const [mode, setMode] = useState<Mode>("party");
  const [teamId, setTeamId] = useState<number | null>(null);
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [edited, setEdited] = useState(false);
  const [markSent, setMarkSent] = useState(true);
  const [busy, setBusy] = useState<ShareChannel | null>(null);
  const [showTemplate, setShowTemplate] = useState(false);
  const [templateDraft, setTemplateDraft] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templates, setTemplates] = useState<Record<string, string>>({});

  useEffect(() => {
    if (ctx) setTemplates(ctx.templates || {});
  }, [ctx]);

  const link = ctx ? (ctx.page_path ? `${window.location.origin}${ctx.page_path}` : ctx.pdf_url) : "";
  const member = ctx?.team.find((m) => m.id === teamId) || null;
  const templateKey = mode === "team" ? "team" : docType;
  const template = templates[templateKey] || DEFAULT_TEMPLATES[templateKey];
  const recipientName = mode === "party" ? ctx?.recipient.name || "" : mode === "team" ? member?.name.split(" ")[0] || "" : "";
  const hints = [ctx?.currency, ctx?.company_country];

  // Recompute phone + message when the recipient changes (unless the message was hand-edited).
  useEffect(() => {
    if (!ctx) return;
    if (mode === "party") setPhone(ctx.recipient.phone || "");
    else if (mode === "team") setPhone(member?.mobile || "");
    else setPhone("");
  }, [ctx, mode, member]);
  useEffect(() => {
    if (!ctx || edited) return;
    setMessage(fillTemplate(template, ctx, recipientName, link));
  }, [ctx, template, recipientName, link, edited]);

  const waNumber = mode === "pick" ? "" : toWhatsAppNumber(phone, ...(mode === "team" ? [ctx?.company_country] : hints));
  const recipientType: RecipientType = mode === "party" ? (ctx?.recipient.kind === "vendor" ? "vendor" : "client") : mode === "team" ? "team" : "other";
  const showMarkSent = Boolean(ctx?.can_mark_sent) && mode === "party";
  const partyLabel = ctx?.recipient.kind === "vendor" ? "Vendor" : "Client";

  const record = async (channel: ShareChannel) => {
    try {
      const res = await logShare(docType, docId, {
        channel,
        recipient_type: recipientType,
        recipient_name: mode === "party" ? ctx?.recipient.name : mode === "team" ? member?.name : "",
        recipient_phone: waNumber ? `+${waNumber}` : "",
        mark_sent: showMarkSent && markSent,
      });
      if (res.marked_sent) toast.success(`${ctx?.doc_label} marked as Sent`);
      void queryClient.invalidateQueries();
    } catch {
      /* logging is best-effort; the share itself already happened */
    }
  };

  const handleWhatsApp = () => {
    if (mode === "team" && !waNumber) return toast.error("Add this team member's mobile number, or use “Choose in WhatsApp”.");
    window.open(whatsAppUrl(waNumber, message), "_blank", "noopener,noreferrer");
    void record("whatsapp");
    onDone();
  };

  const handleEmail = () => {
    const to = mode === "party" ? ctx?.recipient.email || "" : "";
    const subject = `${ctx?.doc_label} ${ctx?.number} from ${ctx?.company_name}`;
    window.location.href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
    void record("email");
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      toast.success("Message with link copied");
      void record("copy");
    } catch {
      toast.error("Couldn't copy. Select the text and copy it manually.");
    }
  };

  const canNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
  const handleNativeShare = async () => {
    if (!ctx) return;
    setBusy("native");
    try {
      let shared = false;
      try {
        const blob = await fetch(ctx.pdf_url).then((r) => (r.ok ? r.blob() : Promise.reject()));
        const file = new File([blob], `${ctx.number}.pdf`, { type: "application/pdf" });
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], text: message, title: `${ctx.doc_label} ${ctx.number}` });
          shared = true;
        }
      } catch (err: any) {
        if (err?.name === "AbortError") return;
      }
      if (!shared) await navigator.share({ text: message, title: `${ctx.doc_label} ${ctx.number}` });
      void record("native");
      onDone();
    } catch (err: any) {
      if (err?.name !== "AbortError") toast.error("Sharing isn't available on this device.");
    } finally {
      setBusy(null);
    }
  };

  const handleDownload = () => {
    if (!ctx) return;
    window.open(ctx.pdf_url, "_blank", "noopener,noreferrer");
    void record("download");
  };

  const saveTemplate = async () => {
    setSavingTemplate(true);
    try {
      const next = { ...templates, [templateKey]: templateDraft };
      await updateInvoiceSettings({ data: { share_templates: next } });
      setTemplates(next);
      setEdited(false);
      setShowTemplate(false);
      toast.success("Default message saved");
    } catch {
      toast.error("Only admins can change the default message.");
    } finally {
      setSavingTemplate(false);
    }
  };

  const pill = (value: Mode, icon: React.ReactNode, text: string) => (
    <button
      type="button"
      onClick={() => {
        setMode(value);
        setEdited(false);
      }}
      className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg border text-[12.5px] font-medium transition-colors ${
        mode === value ? "border-ink bg-ink text-paper" : "border-line text-ink hover:bg-bone"
      }`}
    >
      {icon}
      {text}
    </button>
  );

  return (
    <div>
      <div className="flex items-center justify-between p-4 border-b border-line">
        <Dialog.Title className="font-semibold text-ink text-[15px]">
          Share {ctx ? `${ctx.doc_label} ${ctx.number}` : ""}
        </Dialog.Title>
        <Dialog.Close className="p-1 text-muted hover:text-ink rounded-md" aria-label="Close">
          <X className="w-5 h-5" />
        </Dialog.Close>
      </div>
      <Dialog.Description className="sr-only">Send this document on WhatsApp, email or as a link.</Dialog.Description>

      {isLoading ? (
        <div className="p-10 flex justify-center text-muted">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : isError || !ctx ? (
        <div className="p-6 text-sm text-rose-600">Couldn't load sharing details. Please try again.</div>
      ) : (
        <div className="p-4 space-y-4">
          <div className="flex gap-2">
            {pill("party", <User className="w-3.5 h-3.5" />, partyLabel)}
            {pill("team", <Users className="w-3.5 h-3.5" />, "Team member")}
            {pill("pick", <Contact className="w-3.5 h-3.5" />, "Choose in WhatsApp")}
          </div>

          {mode === "team" && (
            <select
              className="w-full px-3 py-2 bg-bone border border-line rounded-md text-sm outline-none focus:border-ink"
              value={teamId ?? ""}
              onChange={(e) => {
                setTeamId(parseInt(e.target.value, 10) || null);
                setEdited(false);
              }}
            >
              <option value="">Select a manager or colleague…</option>
              {ctx.team.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                  {m.designation ? ` · ${m.designation}` : m.role ? ` · ${m.role}` : ""}
                  {m.mobile ? "" : " (no mobile)"}
                </option>
              ))}
            </select>
          )}

          {mode !== "pick" ? (
            <div>
              <label className="block text-xs font-medium text-ink mb-1.5">WhatsApp number</label>
              <input
                type="tel"
                className="w-full px-3 py-2 bg-bone border border-line rounded-md text-sm font-mono outline-none focus:border-ink"
                placeholder="+971 50 123 4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <p className="text-[11px] text-muted mt-1">
                {waNumber ? `Will open chat with +${waNumber}` : mode === "party" ? `No number saved for this ${partyLabel.toLowerCase()}. Type one, or WhatsApp will ask you to pick a contact.` : "Select a team member or type a number."}
              </p>
            </div>
          ) : (
            <p className="text-[12px] text-muted bg-bone/60 border border-line rounded-lg p-3">
              WhatsApp will open with the message ready and let you pick any contact or group (e.g. your manager or an internal group).
            </p>
          )}

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-ink">Message</label>
              <button
                type="button"
                onClick={() => {
                  setTemplateDraft(template);
                  setShowTemplate((v) => !v);
                }}
                className="text-[11px] text-muted hover:text-ink flex items-center gap-1"
              >
                <Settings2 className="w-3 h-3" /> Default message
              </button>
            </div>
            <textarea
              rows={7}
              className="w-full px-3 py-2 bg-bone border border-line rounded-md text-sm outline-none focus:border-ink leading-relaxed"
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                setEdited(true);
              }}
            />
            {edited && (
              <button type="button" onClick={() => setEdited(false)} className="text-[11px] text-muted hover:text-ink mt-1">
                Reset to default message
              </button>
            )}
          </div>

          {showTemplate && (
            <div className="p-3 rounded-lg border border-line bg-bone/40 space-y-2">
              <p className="text-[11px] text-muted">
                Default {mode === "team" ? "team" : ctx.doc_label.toLowerCase()} message for everyone in your company. Placeholders:{" "}
                <span className="font-mono">{TEMPLATE_PLACEHOLDERS.join(" ")}</span>
              </p>
              <textarea
                rows={6}
                className="w-full px-3 py-2 bg-paper border border-line rounded-md text-xs font-mono outline-none focus:border-ink"
                value={templateDraft}
                onChange={(e) => setTemplateDraft(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setTemplateDraft(DEFAULT_TEMPLATES[templateKey])} className="text-[12px] px-2 py-1 text-muted hover:text-ink">
                  Restore original
                </button>
                <button
                  type="button"
                  disabled={savingTemplate}
                  onClick={saveTemplate}
                  className="text-[12px] px-3 py-1 rounded-md bg-ink text-paper disabled:opacity-60 flex items-center gap-1"
                >
                  {savingTemplate && <Loader2 className="w-3 h-3 animate-spin" />} Save default
                </button>
              </div>
            </div>
          )}

          {showMarkSent && (
            <label className="flex items-center gap-2 text-[13px] text-ink">
              <input type="checkbox" className="accent-ink" checked={markSent} onChange={(e) => setMarkSent(e.target.checked)} />
              Mark this {ctx.doc_label.toLowerCase()} as <b>Sent</b>
            </label>
          )}

          <button
            type="button"
            onClick={handleWhatsApp}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#25D366] hover:bg-[#1ebe5b] text-white text-sm font-semibold transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            {mode === "pick" ? "Open WhatsApp & choose contact" : "Send on WhatsApp"}
          </button>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {canNativeShare && (
              <button type="button" onClick={handleNativeShare} disabled={busy === "native"} className="flex flex-col items-center gap-1 p-2 rounded-lg border border-line hover:bg-bone text-[11.5px] text-ink">
                {busy === "native" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Smartphone className="w-4 h-4" />}
                Share PDF
              </button>
            )}
            <button type="button" onClick={handleEmail} className="flex flex-col items-center gap-1 p-2 rounded-lg border border-line hover:bg-bone text-[11.5px] text-ink">
              <Mail className="w-4 h-4" /> Email
            </button>
            <button type="button" onClick={handleCopy} className="flex flex-col items-center gap-1 p-2 rounded-lg border border-line hover:bg-bone text-[11.5px] text-ink">
              <Link2 className="w-4 h-4" /> Copy
            </button>
            <button type="button" onClick={handleDownload} className="flex flex-col items-center gap-1 p-2 rounded-lg border border-line hover:bg-bone text-[11.5px] text-ink">
              <Download className="w-4 h-4" /> PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Share for a specific payment receipt. */
export function ShareReceiptButton({ paymentId }: { paymentId: number }) {
  return <ShareButton docType="receipt" docId={paymentId} label="Share receipt" />;
}

export default ShareButton;
