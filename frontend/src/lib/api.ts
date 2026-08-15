import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";

import type {
  CompanyDetail,
  Customer,
  CustomerInput,
  Deal,
  DealInput,
  Lead,
  LeadInput,
  ServiceCategory,
  ServiceCategoryInput,
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
  WorkflowSequence,
  WorkflowSequenceInput,
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
  Project,
  ProjectInput,
  Timesheet,
  TimesheetInput,
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
  projects: "/crm/projects/",
  timesheets: "/crm/timesheets/",
  tasks: "/crm/tasks/",
  notes: "/crm/notes/",
  activities: "/crm/activities/",
  attachments: "/crm/attachments/",
  products: "/crm/products/",
  quotes: "/crm/quotes/",
  invoices: "/crm/invoices/",
  customFields: "/crm/custom-fields/",
  workflowRules: "/crm/workflow-rules/",
  workflowSequences: "/crm/workflow-sequences/",
  currentSubscription: "/subscriptions/current/",
  planCatalogue: "/subscriptions/plans/",
  checkoutSubscription: "/subscriptions/checkout/",
  verifySubscription: "/subscriptions/verify/",
  requestSetup: "/subscriptions/request-setup/",
  notifications: "/notifications/",
  notificationsUnreadCount: "/notifications/unread-count/",
  notificationsMarkRead: "/notifications/mark-read/",
  counts: "/crm/counts/",
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
// Hybrid pattern + Local Storage Fallback:
//  • Access token  → sessionStorage
//  • Refresh token → localStorage (to bypass third-party cookie blocking) + HttpOnly cookie
//  • lumeo_session → plain cookie (for Next.js middleware)

export function getAccessToken(): string | null {
  if (!isBrowser()) return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY) || sessionStorage.getItem(ACCESS_TOKEN_KEY);
}

export function storeTokens(tokens: TokenPair, rememberMe = true): void {
  if (!isBrowser()) return;
  
  if (rememberMe) {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access);
    if (tokens.refresh) {
      localStorage.setItem("lumeo_refresh_token", tokens.refresh);
    }
  } else {
    sessionStorage.setItem(ACCESS_TOKEN_KEY, tokens.access);
    if (tokens.refresh) {
      sessionStorage.setItem("lumeo_refresh_token", tokens.refresh);
    }
  }
  
  // Set the lumeo_session indicator cookie on the frontend domain so Next.js middleware detects it across decoupled domains
  const maxAge = rememberMe ? "max-age=2592000;" : "";
  document.cookie = `lumeo_session=1; path=/; ${maxAge} SameSite=Lax; Secure`;
}

export async function clearSession(): Promise<void> {
  if (!isBrowser()) return;
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem("lumeo_refresh_token");
  localStorage.removeItem("lumeo_refresh_token");
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

let refreshPromise: Promise<string | null> | null = null;

async function silentTokenRefresh(): Promise<string | null> {
  try {
    const refreshToken = localStorage.getItem("lumeo_refresh_token") || sessionStorage.getItem("lumeo_refresh_token");
    
    // Refresh endpoint reads the HttpOnly lumeo_refresh cookie OR the refresh body param
    // returns a new access and refresh token in the response body.
    const { data } = await axios.post<{ access: string; refresh?: string }>(
      `${apiBaseUrl}${endpoints.refresh}`,
      { refresh: refreshToken || undefined },
      { withCredentials: true },
    );
    if (data.access) {
      if (localStorage.getItem(ACCESS_TOKEN_KEY) !== null) {
        localStorage.setItem(ACCESS_TOKEN_KEY, data.access);
        if (data.refresh) {
          localStorage.setItem("lumeo_refresh_token", data.refresh);
        }
      } else {
        sessionStorage.setItem(ACCESS_TOKEN_KEY, data.access);
        if (data.refresh) {
          sessionStorage.setItem("lumeo_refresh_token", data.refresh);
        }
      }
      return data.access;
    }
    return null;
  } catch {
    return null;
  }
}


/** Returns true if the JWT access token expires within `bufferSeconds` seconds. */
function isTokenExpiringSoon(bufferSeconds = 120): boolean {
  const token = getAccessToken();
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (!payload?.exp) return false;
    return payload.exp * 1000 - Date.now() < bufferSeconds * 1000;
  } catch {
    return false;
  }
}

// Request: inject access token as Authorization header.
// If the token is about to expire, proactively refresh it first to avoid
// a cascade of 401 errors from simultaneous requests.
api.interceptors.request.use(async (config) => {
  const isAuthEndpoint =
    config.url?.includes(endpoints.token) ||
    config.url?.includes(endpoints.refresh) ||
    config.url?.includes(endpoints.register) ||
    config.url?.includes(endpoints.passwordResetRequest);

  config.headers = config.headers ?? {};

  if (!isAuthEndpoint) {
    const token = getAccessToken();
    const hasSession = isBrowser() && document.cookie.includes("lumeo_session");
    const needsRefresh = (!token && hasSession) || isTokenExpiringSoon(120);

    // Proactively refresh if token is expiring within 2 minutes or missing but session exists
    if (needsRefresh) {
      refreshPromise ??= silentTokenRefresh().finally(() => {
        refreshPromise = null;
      });
      const freshToken = await refreshPromise;
      if (freshToken) {
        config.headers.Authorization = `Bearer ${freshToken}`;
      }
      // If refresh failed, fall through and let the response interceptor handle the 401
    } else if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  // Prevent browser caching for GET requests (specifically for settings/matrix endpoints)
  if (config.method?.toLowerCase() === 'get') {
    config.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
    config.headers['Pragma'] = 'no-cache';
    config.headers['Expires'] = '0';
  }

  return config;
});

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
  const { rememberMe, ...apiPayload } = payload;
  const { data } = await api.post<any>(endpoints.token, apiPayload);
  if (data.two_factor_required) {
    return data;
  }
  storeTokens(data, rememberMe);
  return data;
}

export async function verify2FA(payload: {
  username: string;
  password: string;
  two_factor_code: string;
  rememberMe?: boolean;
}) {
  const { rememberMe, ...apiPayload } = payload;
  const { data } = await api.post<TokenPair>("/accounts/token/verify-2fa/", apiPayload);
  storeTokens(data, rememberMe);
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

export async function convertLead(id: number) {
  const { data } = await api.post<{ message: string, customer_id: number, deal_id: number }>(`${endpoints.leads}${id}/convert/`);
  return data;
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

// ------------------------------------------------------------------
// Projects
// ------------------------------------------------------------------

export async function fetchProjects(params?: Record<string, any>) {
  const { data } = await api.get<{ count: number; next: string | null; previous: string | null; results: Project[] }>(
    endpoints.projects,
    { params }
  );
  return data;
}

export async function fetchProject(id: number) {
  const { data } = await api.get<Project>(`${endpoints.projects}${id}/`);
  return data;
}

export async function createProject(payload: ProjectInput) {
  const { data } = await api.post<Project>(endpoints.projects, payload);
  return data;
}

export async function updateProject({ id, payload }: { id: number; payload: Partial<ProjectInput> }) {
  const { data } = await api.patch<Project>(`${endpoints.projects}${id}/`, payload);
  return data;
}

export async function deleteProject(id: number) {
  await api.delete(`${endpoints.projects}${id}/`);
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
  try {
    const { data } = await api.get<{
      leads: number;
      customers: number;
      deals: number;
      tasks: number;
      notes: number;
      products: number;
    }>(endpoints.counts);
    return data;
  } catch {
    return { leads: 0, customers: 0, deals: 0, tasks: 0, notes: 0, products: 0 };
  }
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

export async function resetTeamMemberPassword(id: number): Promise<{ detail: string; temporary_password: string }> {
  const { data } = await api.post<{ detail: string; temporary_password: string }>(`${endpoints.team}${id}/reset-password/`);
  return data;
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

// Invoice Settings
export const getInvoiceSettings = async () => {
  const res = await api.get<any>("/companies/invoice-settings/");
  return res.data || null;
};

export const updateInvoiceSettings = async ({ id, data }: { id?: number; data: any }) => {
  const res = await api.put(`/companies/invoice-settings/`, data);
  return res.data;
};

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

export async function fetchWorkflowSequences(params?: ListParams) {
  return listPage<WorkflowSequence>(endpoints.workflowSequences, params);
}

export async function createWorkflowSequence(payload: WorkflowSequenceInput) {
  const { data } = await api.post<WorkflowSequence>(endpoints.workflowSequences, payload);
  return data;
}

export async function updateWorkflowSequence(id: number, payload: Partial<WorkflowSequenceInput>) {
  const { data } = await api.patch<WorkflowSequence>(`${endpoints.workflowSequences}${id}/`, payload);
  return data;
}

export async function deleteWorkflowSequence(id: number) {
  await api.delete(`${endpoints.workflowSequences}${id}/`);
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
  const { data } = await api.post<ExpenseClaim>(endpoints.attendanceExpenses, formData);
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

export async function sendTestCampaign(id: number, email: string) {
  const { data } = await api.post<{ status: string }>(`${endpoints.campaigns}${id}/send-test/`, { email });
  return data;
}

export async function scheduleCampaign(id: number, scheduled_at: string) {
  const { data } = await api.post<{ status: string; scheduled_at: string }>(`${endpoints.campaigns}${id}/schedule/`, { scheduled_at });
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
  const { data } = await api.post<ExpenseClaim>(endpoints.attendanceExpenses, payload);
  return data;
}

export async function approveExpenseClaim(id: string, payload: { status: "approved" | "rejected"; manager_notes?: string }) {
  const { data } = await api.patch<ExpenseClaim>(`${endpoints.attendanceExpenses}${id}/approve/`, payload);
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

// ── Setup Request ───────────────────────────────────────────────────────────────────

export async function requestSetup() {
  const { data } = await api.post<{ status: string; message: string }>(endpoints.requestSetup);
  return data;
}

// ── Payment Methods ───────────────────────────────────────────────────────────────────

export const getPaymentMethods = async () => {
  const res = await api.get<any[]>("/companies/payment-methods/");
  return res.data;
};

export const createPaymentMethod = async (data: any) => {
  const res = await api.post("/companies/payment-methods/", data);
  return res.data;
};

export const updatePaymentMethod = async ({ id, data }: { id: number; data: any }) => {
  const res = await api.put(`/companies/payment-methods/${id}/`, data);
  return res.data;
};

export const deletePaymentMethod = async (id: number) => {
  const res = await api.delete(`/companies/payment-methods/${id}/`);
  return res.data;
};



// ── Timesheets ──────────────────────────────────────────────────────────────
export async function fetchTimesheets(params?: Record<string, any>) {
  const { data } = await api.get<{ count: number; next: string | null; previous: string | null; results: Timesheet[] }>(
    endpoints.timesheets,
    { params }
  );
  return data;
}

export async function fetchTimesheet(id: number) {
  const { data } = await api.get<Timesheet>(`${endpoints.timesheets}${id}/`);
  return data;
}

export async function createTimesheet(payload: TimesheetInput) {
  const { data } = await api.post<Timesheet>(endpoints.timesheets, payload);
  return data;
}

export async function updateTimesheet({ id, payload }: { id: number; payload: Partial<TimesheetInput> }) {
  const { data } = await api.patch<Timesheet>(`${endpoints.timesheets}${id}/`, payload);
  return data;
}

export async function deleteTimesheet(id: number) {
  await api.delete(`${endpoints.timesheets}${id}/`);
}

// ── Tasks ───────────────────────────────────────────────────────────────────

export const fetchUnits = async () => {
  const res = await api.get("/companies/units/");
  return res.data;
};

export const createUnit = async (data: any) => {
  const res = await api.post("/companies/units/", data);
  return res.data;
};

export const updateUnit = async ({ id, data }: { id: number; data: any }) => {
  const res = await api.patch(`/companies/units/${id}/`, data);
  return res.data;
};

export const deleteUnit = async (id: number | string) => {
  const res = await api.delete(`/companies/units/${id}/`);
  return res.data;
};

// ── Service Categories ──────────────────────────────────────────────────────────

export const fetchServiceCategories = async () => {
  const res = await api.get<ServiceCategory[]>("/crm/service-categories/");
  return res.data;
};

export const createServiceCategory = async (data: ServiceCategoryInput) => {
  const res = await api.post<ServiceCategory>("/crm/service-categories/", data);
  return res.data;
};

export const updateServiceCategory = async ({ id, data }: { id: number; data: Partial<ServiceCategoryInput> }) => {
  const res = await api.patch<ServiceCategory>(`/crm/service-categories/${id}/`, data);
  return res.data;
};

export const deleteServiceCategory = async (id: number | string) => {
  const res = await api.delete(`/crm/service-categories/${id}/`);
  return res.data;
};

// --- Vendors ---
export async function fetchVendors(params?: ListParams) {
  return listPage<any>("/crm/vendors/", params);
}
export async function createVendor(payload: any) {
  const { data } = await api.post<any>("/crm/vendors/", payload);
  return data;
}
export async function updateVendor(id: number, payload: any) {
  const { data } = await api.patch<any>(`/crm/vendors/${id}/`, payload);
  return data;
}
export async function deleteVendor(id: number) {
  await api.delete(`/crm/vendors/${id}/`);
}
export async function getVendor(id: number) {
  const { data } = await api.get<any>(`/crm/vendors/${id}/`);
  return data;
}

// --- Purchase Orders ---
export async function fetchPurchaseOrders(params?: ListParams) {
  return listPage<any>("/crm/purchase-orders/", params);
}
export async function createPurchaseOrder(payload: any) {
  const { data } = await api.post<any>("/crm/purchase-orders/", payload);
  return data;
}
export async function updatePurchaseOrder(id: number, payload: any) {
  const { data } = await api.patch<any>(`/crm/purchase-orders/${id}/`, payload);
  return data;
}
export async function deletePurchaseOrder(id: number) {
  await api.delete(`/crm/purchase-orders/${id}/`);
}
export async function getPurchaseOrder(id: number) {
  const { data } = await api.get<any>(`/crm/purchase-orders/${id}/`);
  return data;
}
export async function updatePurchaseOrderStatus(id: number, status: string) {
  const { data } = await api.post<any>(`/crm/purchase-orders/${id}/change_status/`, { status });
  return data;
}

export async function convertPurchaseOrderToBill(id: number) {
  const { data } = await api.post<any>(`/crm/purchase-orders/${id}/convert_to_bill/`);
  return data;
}

export async function downloadPurchaseOrderPdf(id: number, poNumber: string) {
  const timestamp = new Date().getTime();
  const response = await api.get(`/crm/purchase-orders/${id}/pdf/?t=${timestamp}`, {
    responseType: "blob",
  });
  const blob = new Blob([response.data], { type: "application/pdf" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `PO_${poNumber}.pdf`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

// Bills
export async function getBills(params?: any) {
  return listPage<any>("/crm/bills/", params);
}
export async function createBill(payload: any) {
  const { data } = await api.post<any>("/crm/bills/", payload);
  return data;
}
export async function updateBill(id: number, payload: any) {
  const { data } = await api.patch<any>(`/crm/bills/${id}/`, payload);
  return data;
}
export async function deleteBill(id: number) {
  await api.delete(`/crm/bills/${id}/`);
}
export async function getBill(id: number) {
  const { data } = await api.get<any>(`/crm/bills/${id}/`);
  return data;
}
export async function updateBillStatus(id: number, status: string) {
  const { data } = await api.post<any>(`/crm/bills/${id}/change_status/`, { status });
  return data;
}
