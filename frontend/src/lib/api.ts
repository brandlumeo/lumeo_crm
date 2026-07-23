import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";

import type {
  CompanyDetail,
  Customer,
  CustomerInput,
  Deal,
  DealInput,
  Lead,
  LeadInput,
  ListParams,
  LoginPayload,
  Notification,
  Note,
  NoteInput,
  PaginatedResponse,
  PlanDetail,
  Subscription,
  Task,
  TaskInput,
  TokenPair,
  UnreadCount,
  UserProfile,
  TeamData,
  TeamInvitation,
  SearchData,
  Activity,
  ActivityInput,
  Attachment,
  Product,
  ProductInput,
  Quote,
  QuoteInput,
  Invoice,
  InvoiceInput,
  CustomFieldDefinition,
  CustomFieldDefinitionInput,
  WorkflowRule,
  WorkflowRuleInput,
  SMTPConfig,
  SMTPConfigInput,
  EmailTemplate,
  EmailTemplateInput,
  WebhookSubscription,
  WebhookSubscriptionInput,
  WebhookDeliveryLog,
  EmailSendInput,
  TimeLog,
  BreakLog,
  LeaveRequest,
  ExpenseClaim,
  OfficeAsset,
  AttendanceStatus,
  EmailAccount,
  EmailMessage,
  CalendarAccount,
  BookingLink,
  Campaign,
  CampaignInput,
  Ticket,
  TicketInput,
  TicketComment,
  TicketCommentInput,
} from "@/lib/types";

// Hybrid auth pattern:
//   - Access token  → sessionStorage (cleared on browser close, not localStorage)
//   - Refresh token → HttpOnly cookie set by backend (never readable by JS)
//   - lumeo_session → plain cookie set by backend, read by Next.js middleware
const ACCESS_TOKEN_KEY = "lumeo_access_token";


// C5 fix: Validate NEXT_PUBLIC_API_URL at startup.
// In production (NODE_ENV=production) a missing URL would silently point to localhost and break everything.
const rawApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();

if (!rawApiUrl) {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "[Lumeo] NEXT_PUBLIC_API_URL is not set. " +
      "Set it to your backend API URL (e.g. https://api.yourdomain.com/api/v1) " +
      "before building for production."
    );
  } else {
    // Development fallback with visible warning
    console.warn(
      "[Lumeo] NEXT_PUBLIC_API_URL is not set. Falling back to http://127.0.0.1:8000/api/v1 for development."
    );
  }
}

const apiBaseUrl = rawApiUrl ?? "http://127.0.0.1:8000/api/v1";

export const api = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    Accept: "application/json",
  },
  // Must be true so the browser sends HttpOnly cookies with every request
  withCredentials: true,
});

const endpoints = {
  token: "/accounts/token/",
  refresh: "/accounts/token/refresh/",
  register: "/accounts/register/",
  me: "/accounts/me/",
  password: "/accounts/password/",
  currentCompany: "/companies/current/",
  leads: "/crm/leads/",
  customers: "/crm/customers/",
  deals: "/crm/deals/",
  tasks: "/crm/tasks/",
  notes: "/crm/notes/",
  activities: "/crm/activities/",
  attachments: "/crm/attachments/",
  products: "/crm/products/",
  quotes: "/crm/quotes/",
  invoices: "/crm/invoices/",
  customFields: "/crm/custom-fields/",
  workflowRules: "/crm/workflow-rules/",
  currentSubscription: "/subscriptions/current/",
  planCatalogue: "/subscriptions/plans/",
  checkoutSubscription: "/subscriptions/checkout/",
  verifySubscription: "/subscriptions/verify/",
  notifications: "/notifications/",
  notificationsUnreadCount: "/notifications/unread-count/",
  notificationsMarkRead: "/notifications/mark-read/",
  team: "/accounts/team/",
  invites: "/accounts/invites/",
  acceptInvite: "/accounts/invites/accept/",
  search: "/crm/search/",
  smtpConfig: "/crm/smtp-config/",
  emailTemplates: "/crm/email-templates/",
  webhookSubscriptions: "/crm/webhooks/subscriptions/",
  webhookLogs: "/crm/webhooks/logs/",
  emailsSend: "/crm/emails/send/",
  logout: "/accounts/logout/",
  passwordResetRequest: "/accounts/password-reset/",
  passwordResetConfirm: "/accounts/password-reset/confirm/",
  attendanceStatus: "/attendance/status/",
  attendancePunchIn: "/attendance/punch-in/",
  attendancePunchOut: "/attendance/punch-out/",
  attendanceBreakStart: "/attendance/break-start/",
  attendanceBreakEnd: "/attendance/break-end/",
  attendanceHistory: "/attendance/history/",
  attendanceMatrix: "/attendance/matrix/",
  attendanceLeaves: "/attendance/leaves/",
  attendanceExpenses: "/attendance/expenses/",
  attendanceAssets: "/attendance/assets/",
  attendanceHolidays: "/attendance/holidays/",
  emailAccounts: "/crm/email-accounts/",
  emailMessages: "/crm/email-messages/",
  calendarAccounts: "/crm/calendar-accounts/",
  bookingLinks: "/crm/booking-links/",
  campaigns: "/crm/campaigns/",
  tickets: "/crm/tickets/",
  orders: "/crm/orders/",
  events: "/crm/events/",
  notices: "/crm/notices/",
} as const;

function isBrowser() {
  return typeof window !== "undefined";
}// ── Auth helpers ─────────────────────────────────────────────────────────────
//
// Hybrid pattern:
//  • Access token  → sessionStorage (survives page refresh in same tab,
//                    cleared when the browser/tab is closed, NOT localStorage)
//  • Refresh token → HttpOnly cookie (set by Django, never touchable by JS)
//  • lumeo_session → plain cookie (set by Django, lets Next.js middleware
//                    know the user is authenticated without reading the token)

export function getAccessToken(): string | null {
  if (!isBrowser()) return null;
  return sessionStorage.getItem(ACCESS_TOKEN_KEY);
}

export function storeTokens(tokens: TokenPair): void {
  if (!isBrowser()) return;
  // Only store the access token — refresh token lives in HttpOnly cookie
  sessionStorage.setItem(ACCESS_TOKEN_KEY, tokens.access);
  // Set the lumeo_session indicator cookie on the frontend domain so Next.js middleware detects it across decoupled domains
  document.cookie = "lumeo_session=1; path=/; max-age=2592000; SameSite=Lax; Secure";
}

export async function clearSession(): Promise<void> {
  if (!isBrowser()) return;
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  document.cookie = "lumeo_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; Secure";
  // Tell backend to clear the HttpOnly refresh cookie
  try {
    await axios.post(
      `${apiBaseUrl}${endpoints.logout}`,
      {},
      { withCredentials: true },
    );
  } catch {
    // best-effort
  }
  if (window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
}

// ── Axios interceptors ────────────────────────────────────────────────────────

// Request: inject access token as Authorization header
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  config.headers = config.headers ?? {};
  if (
    token &&
    !config.url?.includes(endpoints.token) &&
    !config.url?.includes(endpoints.refresh) &&
    !config.url?.includes(endpoints.register) &&
    !config.url?.includes(endpoints.passwordResetRequest)
  ) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // Prevent browser caching for GET requests (specifically for settings/matrix endpoints)
  if (config.method?.toLowerCase() === 'get') {
    config.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
    config.headers['Pragma'] = 'no-cache';
    config.headers['Expires'] = '0';
  }
  
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

async function silentTokenRefresh(): Promise<string | null> {
  try {
    // Refresh endpoint reads the HttpOnly lumeo_refresh cookie and
    // returns a new access token in the response body.
    const { data } = await axios.post<{ access: string }>(
      `${apiBaseUrl}${endpoints.refresh}`,
      {},
      { withCredentials: true },
    );
    if (data.access) {
      sessionStorage.setItem(ACCESS_TOKEN_KEY, data.access);
      return data.access;
    }
    return null;
  } catch {
    return null;
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;

    if (error.response?.status === 503 && (error.response?.data as any)?.code === "maintenance_mode") {
      if (isBrowser() && window.location.pathname !== "/maintenance") {
        window.location.href = "/maintenance";
      }
      return Promise.reject(error);
    }

    if (
      !originalRequest ||
      originalRequest._retry ||
      error.response?.status !== 401 ||
      originalRequest.url?.includes(endpoints.token) ||
      originalRequest.url?.includes(endpoints.refresh)
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    refreshPromise ??= silentTokenRefresh().finally(() => {
      refreshPromise = null;
    });

    const newToken = await refreshPromise;

    if (!newToken) {
      await clearSession();
      return Promise.reject(error);
    }

    originalRequest.headers = originalRequest.headers ?? {};
    originalRequest.headers.Authorization = `Bearer ${newToken}`;
    return api(originalRequest);
  },
);


function cleanParams(params?: ListParams | Record<string, unknown>) {
  if (!params) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => {
      if (value === undefined || value === null) {
        return false;
      }
      if (typeof value === "string") {
        return value.trim().length > 0;
      }
      return true;
    }),
  );
}

async function listPage<T>(path: string, params?: ListParams) {
  const { data } = await api.get<PaginatedResponse<T>>(path, {
    params: cleanParams(params),
  });
  return data;
}

async function fetchAllPages<T>(path: string, params?: ListParams) {
  const results: T[] = [];
  let page = 1;

  while (true) {
    const data = await listPage<T>(path, { ...params, page });
    results.push(...data.results);

    if (!data.next) {
      break;
    }

    page += 1;
  }

  return results;
}

export async function login(payload: LoginPayload) {
  const { data } = await api.post<any>(endpoints.token, payload);
  if (data.two_factor_required) {
    return data;
  }
  storeTokens(data);
  return data;
}

export async function verify2FA(payload: {
  username: string;
  password: string;
  two_factor_code: string;
}) {
  const { data } = await api.post<TokenPair>("/accounts/token/verify-2fa/", payload);
  storeTokens(data);
  return data;
}

export async function register(payload: Record<string, string>) {
  const { data } = await api.post<TokenPair>(endpoints.register, payload);
  storeTokens(data);
  return data;
}

export async function fetchMe() {
  const { data } = await api.get<UserProfile>(endpoints.me);
  return data;
}

export async function fetchCurrentCompany() {
  const { data } = await api.get<CompanyDetail>(endpoints.currentCompany);
  if (typeof window !== "undefined" && data?.currency) {
    (window as any).__CRM_CURRENCY__ = data.currency;
  }
  return data;
}

export async function fetchLeadPage(params?: ListParams) {
  return listPage<Lead>(endpoints.leads, params);
}

export async function fetchCustomerPage(params?: ListParams) {
  return listPage<Customer>(endpoints.customers, params);
}

export async function fetchDealPage(params?: ListParams) {
  return listPage<Deal>(endpoints.deals, params);
}

export async function fetchTaskPage(params?: ListParams) {
  return listPage<Task>(endpoints.tasks, params);
}

export async function fetchNotePage(params?: ListParams) {
  return listPage<Note>(endpoints.notes, params);
}

export async function fetchAllLeads(params?: ListParams) {
  return fetchAllPages<Lead>(endpoints.leads, params);
}

export async function fetchAllCustomers(params?: ListParams) {
  return fetchAllPages<Customer>(endpoints.customers, params);
}

export async function fetchAllDeals(params?: ListParams) {
  return fetchAllPages<Deal>(endpoints.deals, params);
}

export async function fetchAllTasks(params?: ListParams) {
  return fetchAllPages<Task>(endpoints.tasks, params);
}

export async function fetchAllNotes(params?: ListParams) {
  return fetchAllPages<Note>(endpoints.notes, params);
}

export async function createLead(payload: LeadInput) {
  const { data } = await api.post<Lead>(endpoints.leads, payload);
  return data;
}

export async function scoreLead(id: number) {
  const { data } = await api.post<Lead>(`${endpoints.leads}${id}/predictive_score/`);
  return data;
}

export async function updateLead(id: number, payload: Partial<LeadInput>) {
  const { data } = await api.patch<Lead>(`${endpoints.leads}${id}/`, payload);
  return data;
}

export async function deleteLead(id: number) {
  await api.delete(`${endpoints.leads}${id}/`);
}

export async function importLeads(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await api.post(`${endpoints.leads}import-csv/`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return data;
}

export async function exportLeads() {
  const response = await api.get(`${endpoints.leads}export-csv/`, {
    responseType: "blob",
  });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", "leads_export.csv");
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export async function createCustomer(payload: CustomerInput) {
  const { data } = await api.post<Customer>(endpoints.customers, payload);
  return data;
}

export async function patchCustomer(id: number | string, payload: Partial<CustomerInput>) {
  const { data } = await api.patch<Customer>(`${endpoints.customers}${id}/`, payload);
  return data;
}

export async function deleteCustomer(id: number | string) {
  await api.delete(`${endpoints.customers}${id}/`);
}

export async function inviteCustomerToPortal(id: number) {
  const { data } = await api.post<{ status: string; message: string; credentials: { email: string; password: string } }>(
    `${endpoints.customers}${id}/invite-portal/`
  );
  return data;
}

export async function createDeal(payload: DealInput) {
  const { data } = await api.post<Deal>(endpoints.deals, payload);
  return data;
}

export async function patchDeal(id: number, payload: Partial<DealInput & { row_order: number }>) {
  const { data } = await api.patch<Deal>(`${endpoints.deals}${id}/`, payload);
  return data;
}

export async function createTask(payload: TaskInput) {
  const { data } = await api.post<Task>(endpoints.tasks, payload);
  return data;
}

export async function updateTask({ id, payload }: { id: number; payload: Partial<TaskInput> }) {
  const { data } = await api.patch<Task>(`${endpoints.tasks}${id}/`, payload);
  return data;
}

export async function deleteTask(id: number) {
  const { data } = await api.delete(`${endpoints.tasks}${id}/`);
  return data;
}

export async function createNote(payload: NoteInput) {
  const { data } = await api.post<Note>(endpoints.notes, payload);
  return data;
}

export async function updateNote(id: number, payload: Partial<NoteInput>) {
  const { data } = await api.patch<Note>(`${endpoints.notes}${id}/`, payload);
  return data;
}

export async function deleteNote(id: number) {
  await api.delete(`${endpoints.notes}${id}/`);
}

export async function fetchActivities(params?: ListParams) {
  return listPage<Activity>(endpoints.activities, params);
}

export async function createActivity(payload: ActivityInput) {
  const { data } = await api.post<Activity>(endpoints.activities, payload);
  return data;
}

export async function deleteActivity(id: number) {
  await api.delete(`${endpoints.activities}${id}/`);
}

export async function updateActivity(id: number, payload: Partial<ActivityInput>) {
  const { data } = await api.patch<Activity>(`${endpoints.activities}${id}/`, payload);
  return data;
}

export async function fetchLead(id: number) {
  const { data } = await api.get<Lead>(`${endpoints.leads}${id}/`);
  return data;
}

export async function fetchDeal(id: number) {
  const { data } = await api.get<Deal>(`${endpoints.deals}${id}/`);
  return data;
}

export async function fetchCustomer(id: number) {
  const { data } = await api.get<Customer>(`${endpoints.customers}${id}/`);
  return data;
}

export async function fetchAttachments(params?: ListParams) {
  return listPage<Attachment>(endpoints.attachments, params);
}

export async function uploadAttachment(payload: FormData) {
  const { data } = await api.post<Attachment>(endpoints.attachments, payload, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return data;
}

export async function fetchProducts(params?: ListParams) {
  return listPage<Product>(endpoints.products, params);
}

export async function createProduct(payload: ProductInput) {
  const { data } = await api.post<Product>(endpoints.products, payload);
  return data;
}

export async function updateProduct(id: number, payload: Partial<ProductInput>) {
  const { data } = await api.patch<Product>(`${endpoints.products}${id}/`, payload);
  return data;
}

export async function deleteProduct(id: number) {
  await api.delete(`${endpoints.products}${id}/`);
}




export async function fetchCrmCounts() {
  const [leads, customers, deals, tasks, notes, products] = await Promise.all([
    fetchLeadPage(),
    fetchCustomerPage(),
    fetchDealPage(),
    fetchTaskPage(),
    fetchNotePage(),
    fetchProducts(),
  ]);

  return {
    leads: leads.count,
    customers: customers.count,
    deals: deals.count,
    tasks: tasks.count,
    notes: notes.count,
    products: products.count,
  };
}

export async function fetchCurrentSubscription() {
  const { data } = await api.get<Subscription>(endpoints.currentSubscription);
  return data;
}

export async function fetchPlanCatalogue() {
  const { data } = await api.get<PlanDetail[]>(endpoints.planCatalogue);
  return data;
}

export async function fetchNotifications(params?: { unreadOnly?: boolean; date?: string; limit?: number; offset?: number }) {
  let url = endpoints.notifications;
  const searchParams = new URLSearchParams();
  if (params?.unreadOnly) searchParams.append("unread", "true");
  if (params?.date) searchParams.append("date", params.date);
  if (params?.limit) searchParams.append("limit", String(params.limit));
  if (params?.offset) searchParams.append("offset", String(params.offset));
  
  if (searchParams.toString()) url += `?${searchParams.toString()}`;
  
  const { data } = await api.get<PaginatedResponse<Notification>>(url);
  return data;
}

export async function fetchUnreadCount() {
  const { data } = await api.get<UnreadCount>(endpoints.notificationsUnreadCount);
  return data;
}

export async function markNotificationsRead(ids?: number[]) {
  const { data } = await api.post<{ marked_read: number }>(
    endpoints.notificationsMarkRead,
    ids ? { ids } : {},
  );
  return data;
}

export async function fetchTeam(): Promise<TeamData> {
  const { data } = await api.get<TeamData>(endpoints.team);
  return data;
}

export async function inviteTeamMember(payload: {
  email: string;
  role: string;
  first_name?: string;
  last_name?: string;
  designation?: string;
  department?: string;
  personal_message?: string;
}): Promise<TeamInvitation> {
  const { data } = await api.post<TeamInvitation>(endpoints.invites, payload);
  return data;
}

export async function removeTeamMember(id: number): Promise<void> {
  await api.delete(`${endpoints.team}${id}/`);
}

export async function fetchInviteDetails(token: string): Promise<any> {
  const { data } = await axios.get(apiBaseUrl + endpoints.acceptInvite, { params: { token } });
  return data;
}

export async function acceptInvite(payload: any): Promise<TokenPair> {
  // Not authenticated, use direct axios instance
  const { data } = await axios.post<TokenPair>(apiBaseUrl + endpoints.acceptInvite, payload);
  return data;
}

export async function searchCrm(query: string): Promise<SearchData> {
  const { data } = await api.get<SearchData>(endpoints.search, { params: { q: query } });
  return data;
}

export async function updateProfile(payload: Partial<UserProfile>) {
  const { data } = await api.put<UserProfile>(endpoints.me, payload);
  return data;
}

export async function updatePassword(payload: any) {
  const { data } = await api.put(endpoints.password, payload);
  return data;
}

export async function updateCompany(payload: Partial<CompanyDetail>) {
  const { data } = await api.put<CompanyDetail>(endpoints.currentCompany, payload);
  return data;
}

export async function fetchQuotes(params?: ListParams) {
  return listPage<Quote>(endpoints.quotes, params);
}

export async function createQuote(payload: QuoteInput) {
  const { data } = await api.post<Quote>(endpoints.quotes, payload);
  return data;
}

export async function fetchInvoices(params?: ListParams) {
  return listPage<Invoice>(endpoints.invoices, params);
}

export async function createInvoice(payload: InvoiceInput) {
  const { data } = await api.post<Invoice>(endpoints.invoices, payload);
  return data;
}

export async function downloadQuotePdf(id: number, quoteNumber: string) {
  const timestamp = new Date().getTime();
  const response = await api.get(`${endpoints.quotes}${id}/pdf/?t=${timestamp}`, {
    responseType: "blob",
  });
  const blob = new Blob([response.data], { type: "application/pdf" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `Quote_${quoteNumber}.pdf`);
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export async function downloadInvoicePdf(id: number, invoiceNumber: string) {
  const timestamp = new Date().getTime();
  const response = await api.get(`${endpoints.invoices}${id}/pdf/?t=${timestamp}`, {
    responseType: "blob",
  });
  const blob = new Blob([response.data], { type: "application/pdf" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `Invoice_${invoiceNumber}.pdf`);
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export async function fetchCustomFields(params?: ListParams) {
  return listPage<CustomFieldDefinition>(endpoints.customFields, params);
}

export async function createCustomField(payload: CustomFieldDefinitionInput) {
  const { data } = await api.post<CustomFieldDefinition>(endpoints.customFields, payload);
  return data;
}

export async function deleteCustomField(id: number) {
  await api.delete(`${endpoints.customFields}${id}/`);
}

export async function fetchWorkflowRules(params?: ListParams) {
  return listPage<WorkflowRule>(endpoints.workflowRules, params);
}

export async function createWorkflowRule(payload: WorkflowRuleInput) {
  const { data } = await api.post<WorkflowRule>(endpoints.workflowRules, payload);
  return data;
}

export async function updateWorkflowRule(id: number, payload: Partial<WorkflowRuleInput>) {
  const { data } = await api.patch<WorkflowRule>(`${endpoints.workflowRules}${id}/`, payload);
  return data;
}

export async function deleteWorkflowRule(id: number) {
  await api.delete(`${endpoints.workflowRules}${id}/`);
}

export async function createSubscriptionCheckout(payload: { plan_key: string; billing_period: "monthly" | "yearly" }) {
  const { data } = await api.post<{ subscription_id: string; key_id: string; is_mock: boolean; detail?: string }>(
    endpoints.checkoutSubscription,
    payload,
  );
  return data;
}

export async function verifySubscription(payload: {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
  plan_key: string;
  billing_period: "monthly" | "yearly";
}) {
  const { data } = await api.post<{ detail: string; subscription: Subscription }>(
    endpoints.verifySubscription,
    payload,
  );
  return data;
}

export async function reorderDeals(payload: { deals: { id: number; stage: string; row_order: number }[] }) {
  const { data } = await api.post<{ status: string }>(`${endpoints.deals}reorder/`, payload);
  return data;
}

export interface PremiumAnalyticsResponse {
  expected_pipeline_value: number;
  funnel: { stage: string; count: number; total_value: number; weighted_value: number }[];
  leaderboard: { username: string; total_closed: string; deal_count: number }[];
  win_loss: { won: number; lost: number; ratio: number };
  sales_velocity_days: number;
  revenue_by_month: { month: string; revenue: number }[];
  lead_conversion: { month: string; total: number; won: number; rate: number }[];
  revenue_forecast: { month: string; expected_revenue: number }[];
}

export async function fetchPremiumAnalytics() {
  const { data } = await api.get<PremiumAnalyticsResponse>("/crm/analytics/");
  return data;
}

export async function fetchSMTPConfigs() {
  return fetchAllPages<SMTPConfig>(endpoints.smtpConfig);
}

export async function createSMTPConfig(payload: SMTPConfigInput) {
  const { data } = await api.post<SMTPConfig>(endpoints.smtpConfig, payload);
  return data;
}

export async function updateSMTPConfig(id: number, payload: Partial<SMTPConfigInput>) {
  const { data } = await api.patch<SMTPConfig>(`${endpoints.smtpConfig}${id}/`, payload);
  return data;
}

export async function fetchEmailTemplates() {
  return fetchAllPages<EmailTemplate>(endpoints.emailTemplates);
}

export async function createEmailTemplate(payload: EmailTemplateInput) {
  const { data } = await api.post<EmailTemplate>(endpoints.emailTemplates, payload);
  return data;
}

export async function deleteEmailTemplate(id: number) {
  await api.delete(`${endpoints.emailTemplates}${id}/`);
}

export async function fetchWebhookSubscriptions() {
  return fetchAllPages<WebhookSubscription>(endpoints.webhookSubscriptions);
}

export async function createWebhookSubscription(payload: WebhookSubscriptionInput) {
  const { data } = await api.post<WebhookSubscription>(endpoints.webhookSubscriptions, payload);
  return data;
}

export async function deleteWebhookSubscription(id: number) {
  await api.delete(`${endpoints.webhookSubscriptions}${id}/`);
}

export async function testWebhookSubscription(id: number) {
  const { data } = await api.post<WebhookDeliveryLog>(`${endpoints.webhookSubscriptions}${id}/test-event/`);
  return data;
}

export async function fetchWebhookDeliveryLogs() {
  return fetchAllPages<WebhookDeliveryLog>(endpoints.webhookLogs);
}

export async function sendContactSupport(payload: { subject: string; message: string }) {
  const { data } = await api.post<{ detail: string }>("/accounts/contact-support/", payload);
  return data;
}

export async function sendEmail(payload: EmailSendInput) {
  const { data } = await api.post<{ status: string; to: string; subject: string }>(endpoints.emailsSend, payload);
  return data;
}

/** Request a password reset link — always resolves (never leaks whether email exists) */
export async function requestPasswordReset(email: string): Promise<{ detail: string }> {
  const { data } = await api.post<{ detail: string }>(endpoints.passwordResetRequest, { email });
  return data;
}

/** Confirm a password reset with uid + token from the email link */
export async function confirmPasswordReset(payload: {
  uid: string;
  token: string;
  password: string;
}): Promise<{ detail: string }> {
  const { data } = await api.post<{ detail: string }>(endpoints.passwordResetConfirm, payload);
  return data;
}

// ── Operational Operations (Attendance, Breaks, Leaves, Expenses, Assets) ──

export async function fetchAttendanceStatus() {
  const { data } = await api.get<AttendanceStatus>(endpoints.attendanceStatus);
  return data;
}

export async function punchIn(payload: {
  work_location: "office" | "wfh" | "onsite" | "field";
  latitude?: number | null;
  longitude?: number | null;
  notes?: string;
}) {
  const { data } = await api.post<TimeLog>(endpoints.attendancePunchIn, payload);
  return data;
}

export async function punchOut(payload: { notes?: string }) {
  const { data } = await api.post<TimeLog>(endpoints.attendancePunchOut, payload);
  return data;
}

export async function startBreak(payload: { reason?: string }) {
  const { data } = await api.post<BreakLog>(endpoints.attendanceBreakStart, payload);
  return data;
}

export async function endBreak() {
  const { data } = await api.post<BreakLog>(endpoints.attendanceBreakEnd);
  return data;
}

export async function fetchShiftHistory() {
  const { data } = await api.get<TimeLog[]>(endpoints.attendanceHistory);
  return data;
}

export async function fetchAttendanceMatrix(month: number, year: number) {
  const { data } = await api.get(`${endpoints.attendanceMatrix}?month=${month}&year=${year}`);
  return data;
}

export async function downloadAttendanceMatrixCSV(month: number, year: number) {
  const response = await api.get(`${endpoints.attendanceMatrix}?month=${month}&year=${year}&export=csv`, {
    responseType: 'blob',
  });
  
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  
  const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });
  link.setAttribute('download', `Team_Attendance_Matrix_${monthName}_${year}.csv`);
  
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export async function fetchLeaves(all?: boolean) {
  const { data } = await api.get<LeaveRequest[]>(
    all ? `${endpoints.attendanceLeaves}?all=true` : endpoints.attendanceLeaves
  );
  return data;
}

export async function submitLeave(payload: {
  leave_type: "paid" | "sick" | "casual" | "unpaid";
  start_date: string;
  end_date: string;
  reason: string;
  attachment?: File | null;
}) {
  if (payload.attachment) {
    const formData = new FormData();
    formData.append("leave_type", payload.leave_type);
    formData.append("start_date", payload.start_date);
    formData.append("end_date", payload.end_date);
    formData.append("reason", payload.reason);
    formData.append("attachment", payload.attachment);
    
    const { data } = await api.post<LeaveRequest>(endpoints.attendanceLeaves, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  }

  const { data } = await api.post<LeaveRequest>(endpoints.attendanceLeaves, payload);
  return data;
}


export async function reviewLeave(id: string, payload: { status: "approved" | "rejected"; manager_notes?: string }) {
  const { data } = await api.patch<LeaveRequest>(`${endpoints.attendanceLeaves}${id}/approve/`, payload);
  return data;
}

export async function fetchExpenses(all?: boolean) {
  const { data } = await api.get<ExpenseClaim[]>(
    all ? `${endpoints.attendanceExpenses}?all=true` : endpoints.attendanceExpenses
  );
  return data;
}

export async function submitExpense(formData: FormData) {
  const { data } = await api.post<ExpenseClaim>(endpoints.attendanceExpenses, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return data;
}

export async function reviewExpense(id: string, payload: { status: "approved" | "rejected"; manager_notes?: string }) {
  const { data } = await api.patch<ExpenseClaim>(`${endpoints.attendanceExpenses}${id}/approve/`, payload);
  return data;
}

export async function fetchAssets(params?: { unassigned?: boolean; assigned_to?: number }) {
  let url = endpoints.attendanceAssets;
  const parts: string[] = [];
  if (params?.unassigned) parts.push("unassigned=true");
  if (params?.assigned_to) parts.push(`assigned_to=${params.assigned_to}`);
  if (parts.length > 0) {
    url += `?${parts.join("&")}`;
  }
  const { data } = await api.get<OfficeAsset[]>(url);
  return data;
}

export async function createAsset(payload: any) {
  const { data } = await api.post<OfficeAsset>(endpoints.attendanceAssets, payload);
  return data;
}
export async function updateAsset(id: string, payload: any) {
  const { data } = await api.put<OfficeAsset>(`${endpoints.attendanceAssets}${id}/`, payload);
  return data;
}

export async function deleteAsset(id: string) {
  await api.delete(`${endpoints.attendanceAssets}${id}/`);
}

export async function fetchEmailAccounts(params?: ListParams) {
  return listPage<EmailAccount>(endpoints.emailAccounts, params);
}

export async function getOAuthUrl(provider: "google" | "outlook") {
  const { data } = await api.post<{ url: string }>(`${endpoints.emailAccounts}auth-url/`, { provider });
  return data;
}

export async function handleOAuthCallback(code: string) {
  const { data } = await api.post<EmailAccount>(`${endpoints.emailAccounts}callback/`, { code });
  return data;
}

export async function deleteEmailAccount(id: number) {
  await api.delete(`${endpoints.emailAccounts}${id}/`);
}

export async function fetchEmailMessages(params?: ListParams) {
  return listPage<EmailMessage>(endpoints.emailMessages, params);
}

export async function fetchCalendarAccounts(params?: ListParams) {
  return listPage<CalendarAccount>(endpoints.calendarAccounts, params);
}

export async function connectCalendarAccount(payload: { provider: "google" | "outlook" | "apple"; account_email?: string }) {
  const { data } = await api.post<CalendarAccount>(`${endpoints.calendarAccounts}connect/`, payload);
  return data;
}

export async function deleteCalendarAccount(id: number) {
  await api.delete(`${endpoints.calendarAccounts}${id}/`);
}

export async function updateCalendarAccount(id: number, payload: any) {
  const { data } = await api.patch<CalendarAccount>(`${endpoints.calendarAccounts}${id}/`, payload);
  return data;
}

export async function fetchBookingLinks(params?: ListParams) {
  return listPage<BookingLink>(endpoints.bookingLinks, params);
}

export async function createBookingLink(payload: Partial<BookingLink>) {
  const { data } = await api.post<BookingLink>(endpoints.bookingLinks, payload);
  return data;
}

export async function updateBookingLink(id: number, payload: Partial<BookingLink>) {
  const { data } = await api.patch<BookingLink>(`${endpoints.bookingLinks}${id}/`, payload);
  return data;
}

export async function deleteBookingLink(id: number) {
  await api.delete(`${endpoints.bookingLinks}${id}/`);
}

export async function fetchPublicBookingLink(slug: string) {
  // We use the basic fetch/axios directly if we want to avoid authentication headers,
  // but since we handle 401s globally, we might just bypass auth token attachment if we write a custom instance.
  // Actually, standard api.get will attach token if logged in, which is fine.
  const { data } = await api.get(`/crm/book/${slug}/`);
  return data;
}

export async function submitPublicBooking(slug: string, payload: { name: string; email: string; date: string; time: string }) {
  const { data } = await api.post(`/crm/book/${slug}/`, payload);
  return data;
}

export async function aiAssistantAction(payload: { action: "draft_email" | "summarize" | "executive_brief"; context?: string; prompt?: string }) {
  const { data } = await api.post<{ result: string }>(`/crm/ai/assistant/`, payload);
  return data;
}

export async function fetchCampaigns(params?: ListParams) {
  return listPage<Campaign>(endpoints.campaigns, params);
}

export async function createCampaign(payload: CampaignInput) {
  const { data } = await api.post<Campaign>(endpoints.campaigns, payload);
  return data;
}

export async function updateCampaign(id: number, payload: Partial<CampaignInput>) {
  const { data } = await api.patch<Campaign>(`${endpoints.campaigns}${id}/`, payload);
  return data;
}

export async function deleteCampaign(id: number) {
  await api.delete(`${endpoints.campaigns}${id}/`);
}

export async function sendCampaign(id: number) {
  const { data } = await api.post<{ message: string; sent: number; failed: number }>(`${endpoints.campaigns}${id}/send/`);
  return data;
}

export async function fetchTickets(params?: ListParams) {
  return listPage<Ticket>(endpoints.tickets, params);
}

export async function fetchTicket(id: number) {
  const { data } = await api.get<Ticket>(`${endpoints.tickets}${id}/`);
  return data;
}

export async function createTicket(payload: TicketInput) {
  const { data } = await api.post<Ticket>(endpoints.tickets, payload);
  return data;
}

export async function updateTicket(id: number, payload: Partial<TicketInput>) {
  const { data } = await api.patch<Ticket>(`${endpoints.tickets}${id}/`, payload);
  return data;
}

export async function fetchTicketComments(ticketId: number) {
  const { data } = await api.get<TicketComment[]>(`${endpoints.tickets}${ticketId}/comments/`);
  return data;
}

export async function createTicketComment(ticketId: number, payload: TicketCommentInput) {
  const { data } = await api.post<TicketComment>(`${endpoints.tickets}${ticketId}/comments/`, payload);
  return data;
}

export async function deleteTicket(id: number) {
  await api.delete(`${endpoints.tickets}${id}/`);
}


export async function fetchPublicQuote(token: string) {
  const { data } = await api.get<Quote>(`/crm/public/quote/${token}/`);
  return data;
}

export async function signPublicQuote(token: string, payload: { signature_data: string; signed_by_name: string }) {
  const { data } = await api.post<{ message: string }>(`/crm/public/quote/${token}/`, payload);
  return data;
}

export async function fetchPublicInvoice(token: string) {
  const { data } = await api.get<Invoice>(`/crm/public/invoice/${token}/`);
  return data;
}

export async function signPublicInvoice(token: string, payload: { signature_data: string; signed_by_name: string }) {
  const { data } = await api.post<{ message: string }>(`/crm/public/invoice/${token}/`, payload);
  return data;
}

export async function payPublicInvoice(token: string) {
  const { data } = await api.post<{ order_id: string; amount: number; currency: string; key: string }>(`/crm/public/invoice/${token}/pay/`);
  return data;
}

export async function verifyPublicInvoicePayment(token: string, payload: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) {
  const { data } = await api.post<{ message: string }>(`/crm/public/invoice/${token}/verify-payment/`, payload);
  return data;
}

// ── HR: Expenses ─────────────────────────────────────────────────────────────

export async function fetchExpenseClaims(all = false) {
  const { data } = await api.get<ExpenseClaim[]>(
    `${endpoints.attendanceExpenses}${all ? "?all=true" : ""}`
  );
  return data;
}

export async function createExpenseClaim(payload: FormData) {
  const { data } = await api.post<ExpenseClaim>(endpoints.attendanceExpenses, payload, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function approveExpenseClaim(id: string, payload: { status: "approved" | "rejected"; manager_notes?: string }) {
  const { data } = await api.post<ExpenseClaim>(`${endpoints.attendanceExpenses}${id}/approve/`, payload);
  return data;
}

// ── HR: Office Assets ────────────────────────────────────────────────────────

export async function fetchOfficeAssets() {
  const { data } = await api.get<OfficeAsset[]>(endpoints.attendanceAssets);
  return data;
}

export async function createOfficeAsset(payload: any) {
  const { data } = await api.post<OfficeAsset>(endpoints.attendanceAssets, payload);
  return data;
}

export async function updateOfficeAsset(id: string, payload: any) {
  const { data } = await api.patch<OfficeAsset>(`${endpoints.attendanceAssets}${id}/`, payload);
  return data;
}

export async function deleteOfficeAsset(id: string) {
  await api.delete(`${endpoints.attendanceAssets}${id}/`);
}

export async function updateQuote(id: number, payload: any) {
  const { data } = await api.patch<Quote>(`${endpoints.quotes}${id}/`, payload);
  return data;
}

export async function deleteQuote(id: number) {
  await api.delete(`${endpoints.quotes}${id}/`);
}


export async function getInvoice(id: number) {
  const { data } = await api.get<Invoice>(`${endpoints.invoices}${id}/`);
  return data;
}

export async function updateInvoice(id: number, payload: any) {
  const { data } = await api.patch<Invoice>(`${endpoints.invoices}${id}/`, payload);
  return data;
}

export async function deleteInvoice(id: number) {
  await api.delete(`${endpoints.invoices}${id}/`);
}

export async function addInvoicePayment(id: number, payload: { amount: number, payment_method: string, transaction_id?: string, notes?: string }) {
  const { data } = await api.post(`${endpoints.invoices}${id}/add_payment/`, payload);
  return data;
}

export async function fetchHolidays() {
  const { data } = await api.get<any[]>(endpoints.attendanceHolidays);
  return data;
}

export async function createHoliday(payload: { name: string; date: string; description?: string }) {
  const { data } = await api.post<any>(endpoints.attendanceHolidays, payload);
  return data;
}

export async function deleteHoliday(id: string) {
  await api.delete(`${endpoints.attendanceHolidays}${id}/`);
}


export async function resetCustomerPassword(id: string) {
  const { data } = await api.post<{ credentials: { email: string; password: string } }>(`${endpoints.customers}${id}/reset-portal-password/`);
  return data;
}

// ── Orders ───────────────────────────────────────────────────────────────────

export async function fetchOrders(params?: ListParams) {
  return listPage<any>(endpoints.orders, params);
}

export async function createOrder(payload: any) {
  const { data } = await api.post<any>(endpoints.orders, payload);
  return data;
}

export async function updateOrder(id: number, payload: any) {
  const { data } = await api.patch<any>(`${endpoints.orders}${id}/`, payload);
  return data;
}

export async function deleteOrder(id: number) {
  await api.delete(`${endpoints.orders}${id}/`);
}

// ── Events ───────────────────────────────────────────────────────────────────

export async function fetchEvents(params?: ListParams) {
  return listPage<any>(endpoints.events, params);
}

export async function createEvent(payload: any) {
  const { data } = await api.post<any>(endpoints.events, payload);
  return data;
}

export async function updateEvent(id: number, payload: any) {
  const { data } = await api.patch<any>(`${endpoints.events}${id}/`, payload);
  return data;
}

export async function deleteEvent(id: number) {
  await api.delete(`${endpoints.events}${id}/`);
}

// ── Notices ───────────────────────────────────────────────────────────────────

export async function fetchNotices(params?: ListParams) {
  return listPage<any>(endpoints.notices, params);
}

export async function createNotice(payload: any) {
  const { data } = await api.post<any>(endpoints.notices, payload);
  return data;
}

export async function updateNotice(id: number, payload: any) {
  const { data } = await api.patch<any>(`${endpoints.notices}${id}/`, payload);
  return data;
}

export async function deleteNotice(id: number) {
  await api.delete(`${endpoints.notices}${id}/`);
}

