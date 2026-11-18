import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

export type ShareDocType = "quote" | "invoice" | "order" | "purchase_order" | "receipt";
export type ShareChannel = "whatsapp" | "email" | "native" | "copy" | "download";
export type RecipientType = "client" | "vendor" | "team" | "other";

export type ShareContext = {
  doc_type: ShareDocType;
  doc_label: string;
  number: string;
  reference: string;
  amount: string;
  balance: string;
  currency: string;
  date: string | null;
  date_label: string;
  status: string;
  company_name: string;
  company_country: string;
  sender_name: string;
  recipient: { kind: "client" | "vendor"; name: string; phone: string; email: string };
  page_path: string | null;
  pdf_url: string;
  can_mark_sent: boolean;
  team: { id: number; name: string; role: string; designation: string; mobile: string }[];
  templates: Record<string, string>;
};

export async function fetchShareContext(docType: ShareDocType, id: number) {
  const { data } = await api.get<ShareContext>(`/crm/share/${docType}/${id}/`);
  return data;
}

export async function logShare(
  docType: ShareDocType,
  id: number,
  payload: { channel: ShareChannel; recipient_type: RecipientType; recipient_name?: string; recipient_phone?: string; mark_sent?: boolean },
) {
  const { data } = await api.post<{ logged: boolean; marked_sent: boolean; status: string }>(`/crm/share/${docType}/${id}/`, payload);
  return data;
}

/** Placeholders usable in message templates. */
export const TEMPLATE_PLACEHOLDERS = ["{name}", "{doc}", "{number}", "{amount}", "{balance}", "{date}", "{link}", "{company}", "{sender}", "{reference}"];

export const DEFAULT_TEMPLATES: Record<ShareDocType | "team", string> = {
  quote:
    "Hi {name},\n\nPlease find our quotation {number} from {company} for {amount}{date}.\n\nView & download: {link}\n\nHappy to answer any questions.\n– {sender}",
  invoice:
    "Hi {name},\n\nHere is invoice {number} from {company} for {amount}{date}. Balance due: {balance}.\n\nView, download & pay: {link}\n\nThank you!\n– {sender}",
  order:
    "Hi {name},\n\nYour order {number} with {company} ({amount}) is confirmed.\n\nDetails: {link}\n\n– {sender}",
  purchase_order:
    "Hello {name},\n\nPlease find purchase order {number} from {company} for {amount}{date}.\n\nPO document: {link}\n\nKindly confirm receipt.\n– {sender}",
  receipt:
    "Hi {name},\n\nThank you for your payment of {amount} against invoice {reference}. Your receipt {number}: {link}\n\n– {sender}, {company}",
  team: "Hi {name}, sharing {doc} {number} ({amount}){date}.\n{link}\n– {sender}",
};

export function fillTemplate(template: string, ctx: ShareContext, recipientName: string, link: string) {
  const fmt = (v: string) => formatCurrency(parseFloat(v || "0") || 0, ctx.currency);
  const date = ctx.date
    ? `, ${ctx.date_label} ${new Date(`${ctx.date}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`
    : "";
  const values: Record<string, string> = {
    "{name}": recipientName || "there",
    "{doc}": ctx.doc_label.toLowerCase(),
    "{number}": ctx.number,
    "{amount}": fmt(ctx.amount),
    "{balance}": fmt(ctx.balance),
    "{date}": date,
    "{link}": link,
    "{company}": ctx.company_name,
    "{sender}": ctx.sender_name,
    "{reference}": ctx.reference,
  };
  return template.replace(/\{(name|doc|number|amount|balance|date|link|company|sender|reference)\}/g, (m) => values[m] ?? m);
}

const COUNTRY_CODES: { match: RegExp; code: string; trunkLen: number }[] = [
  { match: /india|^in$|^ind$|bharat|^inr$/i, code: "91", trunkLen: 10 },
  { match: /emirates|uae|dubai|abu dhabi|sharjah|^ae$|^aed$/i, code: "971", trunkLen: 9 },
  { match: /saudi|ksa|^sa$|^sar$/i, code: "966", trunkLen: 9 },
  { match: /qatar|^qa$|^qar$/i, code: "974", trunkLen: 8 },
  { match: /kuwait|^kw$|^kwd$/i, code: "965", trunkLen: 8 },
  { match: /oman|^om$|^omr$/i, code: "968", trunkLen: 8 },
  { match: /bahrain|^bh$|^bhd$/i, code: "973", trunkLen: 8 },
  { match: /united kingdom|^uk$|^gb$|britain|england|^gbp$/i, code: "44", trunkLen: 10 },
  { match: /united states|^usa?$|america|^usd$/i, code: "1", trunkLen: 10 },
  { match: /singapore|^sg$|^sgd$/i, code: "65", trunkLen: 8 },
  { match: /australia|^au$|^aud$/i, code: "61", trunkLen: 9 },
  { match: /canada|^ca$|^cad$/i, code: "1", trunkLen: 10 },
];

/** Country dialling code from a country name or currency hint (document currency first, then company country). */
export function dialCodeFor(...hints: (string | null | undefined)[]) {
  for (const hint of hints) {
    const h = (hint || "").trim();
    if (!h) continue;
    const hit = COUNTRY_CODES.find((c) => c.match.test(h));
    if (hit) return hit;
  }
  return null;
}

/**
 * Digits-only international number for wa.me.
 * "+971 50 123 4567" -> 971501234567, "0501234567" (UAE) -> 971501234567, "98470 12345" (India) -> 919847012345.
 */
export function toWhatsAppNumber(raw: string, ...hints: (string | null | undefined)[]) {
  const trimmed = (raw || "").trim();
  if (!trimmed) return "";
  let digits = trimmed.replace(/[^\d]/g, "");
  if (trimmed.startsWith("+")) return digits;
  if (digits.startsWith("00")) return digits.slice(2);
  const cc = dialCodeFor(...hints);
  if (!cc) return digits.replace(/^0+/, "");
  if (digits.startsWith(cc.code) && digits.length === cc.code.length + cc.trunkLen) return digits;
  digits = digits.replace(/^0+/, "");
  return digits.length === cc.trunkLen ? cc.code + digits : digits;
}

/** wa.me with a number opens that chat; without one, WhatsApp asks you to pick any contact or group. */
export function whatsAppUrl(number: string, text: string) {
  const q = `text=${encodeURIComponent(text)}`;
  return number ? `https://wa.me/${number}?${q}` : `https://wa.me/?${q}`;
}
