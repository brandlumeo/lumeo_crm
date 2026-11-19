import { api, storeTokens } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────

export type Health = { score: number; label: "healthy" | "attention" | "at_risk" };
export type PlanKey = "free" | "starter" | "pro" | "enterprise";

export type TenantRow = {
  id: string;
  name: string;
  slug: string;
  status: "active" | "trial" | "suspended" | string;
  country: string;
  currency: string;
  created_at: string;
  trial_ends_at: string | null;
  plan: PlanKey;
  plan_display: string;
  billing_period: "monthly" | "yearly" | string;
  subscription_active: boolean;
  expires_at: string | null;
  mrr: number;
  users: number;
  active_users: number;
  active_users_30d: number;
  max_users: number;
  last_active: string | null;
  last_login: string | null;
  subscription_expired: boolean;
  usage: { leads: number; deals: number; customers: number; invoices: number; quotes: number };
  records_30d: number;
  owner: { id: number; name: string; email: string } | null;
  health: Health;
};

export type SaasUser = {
  id: number;
  name: string;
  email: string;
  role: string;
  designation: string;
  company: { id: string; name: string } | null;
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  last_login: string | null;
  date_joined: string;
};

export type AuditEntry = {
  id: number;
  action: string;
  summary: string;
  actor: string;
  company?: { id: string; name: string } | null;
  ip_address?: string | null;
  details?: Record<string, unknown>;
  created_at: string;
};

export type Page<T> = { count: number; page: number; page_size: number; results: T[] };

export type SaasStats = {
  kpis: {
    mrr: number;
    arr: number;
    new_mrr_30d: number;
    paying_tenants: number;
    arpa: number;
    total_tenants: number;
    active_tenants: number;
    trial_tenants: number;
    suspended_tenants: number;
    new_tenants_30d: number;
    new_tenants_change: number | null;
    total_users: number;
    active_users_7d: number;
    active_users_30d: number;
    new_users_30d: number;
    new_users_change: number | null;
    paid_share: number;
    currency: string;
  };
  series: { month: string; new_tenants: number; new_users: number; total_tenants: number; mrr: number; new_mrr: number }[];
  plan_mix: { plan: PlanKey; label: string; tenants: number; mrr: number }[];
  status_mix: Record<string, number>;
  expiring_trials: TenantRow[];
  at_risk: TenantRow[];
  top_tenants: TenantRow[];
  recent_signups: TenantRow[];
  recent_logins: SaasUser[];
  recent_audit: AuditEntry[];
  generated_at: string;
};

export type TenantDetail = TenantRow & {
  contact: { email: string; website: string; address: string; timezone: string; domain: string };
  modules: Record<string, boolean>;
  limits: Record<"users" | "leads_this_month" | "deals_this_month", { used: number; max: number }>;
  invoiced: { currency: string; total: number; count: number }[];
  activity: { month: string; leads: number; deals: number; invoices: number }[];
  recent_records: { type: string; title: string; created_at: string }[];
  team: SaasUser[];
  audit: AuditEntry[];
};

export type PlanRow = {
  key: PlanKey;
  name: string;
  max_users: number;
  max_leads_monthly: number;
  max_deals_monthly: number;
  max_leads_yearly: number;
  max_deals_yearly: number;
  price_monthly: number;
  price_yearly: number;
  defaults: Omit<PlanRow, "key" | "name" | "defaults" | "customised" | "tenants" | "mrr">;
  customised: boolean;
  tenants: number;
  mrr: number;
};

export type BillingData = {
  summary: { mrr: number; arr: number; monthly_mrr: number; yearly_mrr: number; expiring_30d: number; paying: number };
  plans: PlanRow[];
  subscriptions: Page<{
    id: number;
    company: { id: string; name: string; status: string };
    plan: PlanKey;
    plan_display: string;
    billing_period: string;
    is_active: boolean;
    expires_at: string | null;
    days_remaining: number | null;
    mrr: number;
    razorpay: boolean;
    created_at: string;
  }>;
};

// ── API ───────────────────────────────────────────────────────────────────────

type Params = Record<string, string | number | undefined | null>;
const clean = (p: Params) => Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined && v !== null && v !== ""));

export const saasApi = {
  stats: () => api.get<SaasStats>("/saas/stats/").then((r) => r.data),
  tenants: (p: Params) => api.get<Page<TenantRow>>("/saas/tenants/", { params: clean(p) }).then((r) => r.data),
  tenant: (id: string) => api.get<TenantDetail>(`/saas/tenants/${id}/`).then((r) => r.data),
  tenantAction: (id: string, action: "change-plan" | "extend-trial" | "suspend" | "reactivate", body: Record<string, unknown> = {}) =>
    api.post<TenantRow>(`/saas/tenants/${id}/${action}/`, body).then((r) => r.data),
  tenantBulk: (ids: string[], action: "suspend" | "reactivate") => api.post("/saas/tenants/bulk/", { ids, action }).then((r) => r.data),
  users: (p: Params) => api.get<Page<SaasUser>>("/saas/users/", { params: clean(p) }).then((r) => r.data),
  setUserActive: (id: number, is_active: boolean) => api.patch<SaasUser>(`/saas/users/${id}/`, { is_active }).then((r) => r.data),
  userBulk: (ids: number[], action: "activate" | "deactivate") => api.post("/saas/users/bulk/", { ids, action }).then((r) => r.data),
  billing: (p: Params) => api.get<BillingData>("/saas/billing/", { params: clean(p) }).then((r) => r.data),
  updatePlans: (body: Record<string, Partial<Record<string, number>> | null>) => api.patch("/saas/billing/plans/", body).then((r) => r.data),
  audit: (p: Params) => api.get<Page<AuditEntry>>("/saas/audit/", { params: clean(p) }).then((r) => r.data),
  settings: () => api.get("/saas/settings/").then((r) => r.data),
  updateSettings: (body: Record<string, unknown>) => api.patch("/saas/settings/", body).then((r) => r.data),
};

/** Download a CSV export (authenticated) as a file. */
export async function downloadCsv(path: string, params: Params, filename: string) {
  const res = await api.get(path, { params: clean(params), responseType: "blob" });
  const url = URL.createObjectURL(res.data as Blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

// ── Impersonation ("Login as tenant") ─────────────────────────────────────────

const BACKUP_KEY = "lumeo_admin_backup";
export const IMPERSONATION_KEY = "lumeo_impersonation";

export type ImpersonationInfo = {
  user: { id: number; name: string; email: string };
  company: { id: string; name: string };
  started_at: string;
  expires_in_hours: number;
};

export function getImpersonation(): ImpersonationInfo | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(IMPERSONATION_KEY);
    return raw ? (JSON.parse(raw) as ImpersonationInfo) : null;
  } catch {
    return null;
  }
}

export async function startImpersonation(userId: number) {
  const { data } = await api.post<{
    access: string;
    refresh: string;
    user: ImpersonationInfo["user"];
    company: ImpersonationInfo["company"];
    expires_in_hours: number;
  }>(`/saas/users/${userId}/impersonate/`);
  // Keep the admin's own session so "Return to admin" can restore it.
  const backup = {
    access: localStorage.getItem("lumeo_access_token") || sessionStorage.getItem("lumeo_access_token"),
    refresh: localStorage.getItem("lumeo_refresh_token") || sessionStorage.getItem("lumeo_refresh_token"),
  };
  localStorage.setItem(BACKUP_KEY, JSON.stringify(backup));
  sessionStorage.removeItem("lumeo_access_token");
  sessionStorage.removeItem("lumeo_refresh_token");
  storeTokens({ access: data.access, refresh: data.refresh }, true);
  const info: ImpersonationInfo = { user: data.user, company: data.company, started_at: new Date().toISOString(), expires_in_hours: data.expires_in_hours };
  localStorage.setItem(IMPERSONATION_KEY, JSON.stringify(info));
  window.location.href = "/dashboard";
}

/** Restore the admin session. Returns false when there was nothing to restore. */
export function restoreAdminSession(): boolean {
  if (typeof window === "undefined") return false;
  const raw = localStorage.getItem(BACKUP_KEY);
  const info = getImpersonation();
  localStorage.removeItem(IMPERSONATION_KEY);
  localStorage.removeItem(BACKUP_KEY);
  if (!raw) return false;
  try {
    const backup = JSON.parse(raw) as { access: string | null; refresh: string | null };
    if (!backup.access) return false;
    storeTokens({ access: backup.access, refresh: backup.refresh || undefined } as any, true);
    if (info) {
      // Best-effort audit entry, sent with the restored admin token.
      void api.post("/saas/impersonation/end/", { user_id: info.user.id }).catch(() => undefined);
    }
    return true;
  } catch {
    return false;
  }
}

export async function endImpersonation() {
  const info = getImpersonation();
  const restored = restoreAdminSession();
  window.location.href = restored ? (info ? `/saas/companies/${info.company.id}` : "/saas") : "/login";
}

// ── Formatting ────────────────────────────────────────────────────────────────

export function inr(n: number, compact = false) {
  if (compact && Math.abs(n) >= 1000) {
    if (Math.abs(n) >= 1e7) return `₹${(n / 1e7).toFixed(2)}Cr`;
    if (Math.abs(n) >= 1e5) return `₹${(n / 1e5).toFixed(2)}L`;
    return `₹${(n / 1e3).toFixed(1)}k`;
  }
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: n % 1 === 0 ? 0 : 2 }).format(n);
}

export function relTime(iso: string | null | undefined) {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.round(d / 30);
  return mo < 12 ? `${mo}mo ago` : `${Math.round(mo / 12)}y ago`;
}

export function shortDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function daysUntil(iso: string | null | undefined) {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}
