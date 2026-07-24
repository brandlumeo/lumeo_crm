"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import {
  fetchAllCustomers,
  fetchAllDeals,
  fetchAllLeads,
  fetchAllNotes,
  fetchAllTasks,
  fetchCrmCounts,
  fetchCurrentCompany,
  fetchCurrentSubscription,
  fetchCustomerPage,
  fetchDealPage,
  fetchLeadPage,
  fetchMe,
  fetchNotePage,
  fetchNotifications,
  fetchPlanCatalogue,
  fetchTaskPage,
  fetchUnreadCount,
  getAccessToken,
  fetchActivities,
  fetchLead,
  createLead,
  updateLead,
  deleteLead,
  scoreLead,
  importLeads,
  exportLeads,
  fetchDeal,
  fetchCustomer,
  fetchAttachments,
  fetchProducts,
  fetchCustomFields,
  fetchWorkflowRules,
  createSubscriptionCheckout,
  verifySubscription,
  reorderDeals,
  patchDeal,
  fetchPremiumAnalytics,
  fetchSMTPConfigs,
  createSMTPConfig,
  updateSMTPConfig,
  fetchEmailTemplates,
  createEmailTemplate,
  deleteEmailTemplate,
  fetchWebhookSubscriptions,
  createWebhookSubscription,
  deleteWebhookSubscription,
  testWebhookSubscription,
  fetchWebhookDeliveryLogs,
  sendEmail,
  fetchAttendanceStatus,
  punchIn,
  punchOut,
  startBreak,
  endBreak,
  fetchShiftHistory,
  fetchLeaves,
  submitLeave,
  reviewLeave,
  fetchExpenses,
  submitExpense,
  reviewExpense,
  fetchAssets,
  createAsset,
  updateAsset,
  deleteAsset,
  fetchEmailAccounts,
  getOAuthUrl,
  handleOAuthCallback,
  deleteEmailAccount,
  fetchEmailMessages,
  fetchCalendarAccounts,
  connectCalendarAccount,
  deleteCalendarAccount,
  updateCalendarAccount,
  fetchBookingLinks,
  createBookingLink,
  updateBookingLink,
  deleteBookingLink,
  fetchCampaigns,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  sendCampaign,
  fetchTickets,
  fetchTicket,
  createTicket,
  updateTicket,
  deleteTicket,
  createTicketComment,
  fetchTicketComments,
  fetchPublicBookingLink,
  submitPublicBooking,
  aiAssistantAction,
  inviteCustomerToPortal,
  fetchPublicQuote,
  signPublicQuote,
  fetchPublicInvoice,
  signPublicInvoice,
  payPublicInvoice,
  verifyPublicInvoicePayment,
  getInvoiceSettings,
  updateInvoiceSettings,
  fetchExpenseClaims,
  createExpenseClaim,
  approveExpenseClaim,
  fetchOfficeAssets,
  createOfficeAsset,
  updateOfficeAsset,
  deleteOfficeAsset,
  fetchQuotes,
  createQuote,
  updateQuote,
  deleteQuote,
  fetchInvoices,
  getInvoice,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  addInvoicePayment,
  resetCustomerPassword,
  updateCompany,
  api,
  fetchOrders,
  createOrder,
  updateOrder,
  deleteOrder,
  fetchEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  fetchNotices,
  createNotice,
  updateNotice,
  deleteNotice,
} from "@/lib/api";
import type { ListParams, CampaignInput, TicketInput, TicketCommentInput } from "@/lib/types";

const fiveMinutes = 5 * 60 * 1000;

function authenticated() {
  // In a hybrid auth pattern (access token in sessionStorage, refresh token in HttpOnly cookie),
  // getAccessToken() is null when a user opens a new tab or returns after closing the browser.
  // If we return false here, useQuery stays in isPending:true forever and never attempts a fetch,
  // which prevents Axios interceptors from performing a silent token refresh or redirecting to /login.
  // Returning true ensures Axios fires, attempts silent refresh, and redirects to /login on failure.
  return typeof window !== "undefined";
}

export function useCurrentUser() {
  return useQuery({
    queryKey: ["me"],
    queryFn: fetchMe,
    staleTime: fiveMinutes,
    enabled: authenticated(),
    placeholderData: () => {
      if (typeof window === "undefined") return undefined;
      try {
        const token = getAccessToken();
        if (!token) return undefined;
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload && payload.user_id) {
          return {
            id: payload.user_id,
            first_name: payload.first_name || "",
            last_name: payload.last_name || "",
            username: payload.username || "",
            email: "",
            role: "employee",
            is_active: true,
          } as any;
        }
      } catch (e) {
        return undefined;
      }
      return undefined;
    }
  });
}

export function useCurrentCompany() {
  return useQuery({
    queryKey: ["company", "current"],
    queryFn: fetchCurrentCompany,
    staleTime: fiveMinutes,
    enabled: authenticated(),
  });
}

export function useCrmCounts() {
  return useQuery({
    queryKey: ["crm-counts"],
    queryFn: fetchCrmCounts,
    staleTime: 60 * 1000,
    enabled: authenticated(),
  });
}

export function useUpdateCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateCompany,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company"] });
    },
  });
}

export function useLeadPage(params: ListParams) {
  return useQuery({
    queryKey: ["crm", "leads", params],
    queryFn: () => fetchLeadPage(params),
    enabled: authenticated(),
    placeholderData: (previous) => previous,
  });
}

export function useCustomerPage(params: ListParams) {
  return useQuery({
    queryKey: ["crm", "customers", params],
    queryFn: () => fetchCustomerPage(params),
    enabled: authenticated(),
    placeholderData: (previous) => previous,
  });
}

export function useDealPage(params: ListParams) {
  return useQuery({
    queryKey: ["crm", "deals", params],
    queryFn: () => fetchDealPage(params),
    enabled: authenticated(),
    placeholderData: (previous) => previous,
  });
}

export function useAllDealsBoard() {
  return useQuery({
    queryKey: ["deals-board"],
    queryFn: () => fetchAllDeals({ ordering: "row_order,-created_at" }),
    enabled: authenticated(),
    staleTime: 30 * 1000,
  });
}

export function useTaskPage(params: ListParams) {
  return useQuery({
    queryKey: ["crm", "tasks", params],
    queryFn: () => fetchTaskPage(params),
    enabled: authenticated(),
    placeholderData: (previous) => previous,
  });
}

export function useNotePage(params: ListParams) {
  return useQuery({
    queryKey: ["crm", "notes", params],
    queryFn: () => fetchNotePage(params),
    enabled: authenticated(),
    placeholderData: (previous) => previous,
  });
}

export function useActivities(params: ListParams) {
  return useQuery({
    queryKey: ["crm", "activities", params],
    queryFn: () => fetchActivities(params),
    enabled: authenticated(),
  });
}

export function useLead(id: number) {
  return useQuery({
    queryKey: ["crm", "leads", id],
    queryFn: () => fetchLead(id),
    enabled: authenticated(),
  });
}

export function useDeal(id: number) {
  return useQuery({
    queryKey: ["crm", "deals", id],
    queryFn: () => fetchDeal(id),
    enabled: authenticated(),
  });
}

export function useCustomer(id: number) {
  return useQuery({
    queryKey: ["crm", "customers", id],
    queryFn: () => fetchCustomer(id),
    enabled: authenticated() && !isNaN(id),
  });
}

export function useAttachments(params: ListParams) {
  return useQuery({
    queryKey: ["crm", "attachments", params],
    queryFn: () => fetchAttachments(params),
    enabled: authenticated(),
  });
}

export function useProductPage(params: ListParams) {
  return useQuery({
    queryKey: ["crm", "products", params],
    queryFn: () => fetchProducts(params),
    enabled: authenticated(),
  });
}

export function useResetCustomerPassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: resetCustomerPassword,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm", "customers"] });
    },
  });
}

export function useQuotePage(params: ListParams) {
  return useQuery({
    queryKey: ["crm", "quotes", params],
    queryFn: () => fetchQuotes(params),
    enabled: authenticated(),
  });
}

export function useInvoicePage(params: ListParams) {
  return useQuery({
    queryKey: ["crm", "invoices", params],
    queryFn: () => fetchInvoices(params),
    enabled: authenticated(),
  });
}




export function useDashboardBundle() {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: ["dashboard-bundle"],
    queryFn: async () => {
      const [me, company, leadsRes, customersRes, dealsRes, tasksRes, notesRes] = await Promise.all([
        fetchMe(),
        fetchCurrentCompany(),
        fetchLeadPage({ limit: 100 }),
        fetchCustomerPage({ limit: 100 }),
        fetchDealPage({ limit: 100 }),
        fetchTaskPage({ limit: 100 }),
        fetchNotePage({ limit: 100 }),
      ]);

      queryClient.setQueryData(["me"], me);
      queryClient.setQueryData(["company", "current"], company);

      return {
        me,
        company,
        leads: leadsRes.results,
        customers: customersRes.results,
        deals: dealsRes.results,
        tasks: tasksRes.results,
        notes: notesRes.results,
      };
    },
    staleTime: 60 * 1000,
    enabled: authenticated(),
  });
}

export function useCurrentSubscription() {
  return useQuery({
    queryKey: ["subscription", "current"],
    queryFn: fetchCurrentSubscription,
    staleTime: 5 * 60 * 1000,
    enabled: authenticated(),
  });
}

export function usePlanCatalogue() {
  return useQuery({
    queryKey: ["subscription", "plans"],
    queryFn: fetchPlanCatalogue,
    staleTime: 10 * 60 * 1000,
    enabled: authenticated(),
  });
}

export function useNotifications(params?: { unreadOnly?: boolean; date?: string; limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ["notifications", params],
    queryFn: () => fetchNotifications(params),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    enabled: authenticated(),
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: fetchUnreadCount,
    staleTime: 20 * 1000,
    refetchInterval: 30 * 1000, // Poll every 30s for bell badge
    enabled: authenticated(),
  });
}

export function useCustomFields(params?: ListParams) {
  return useQuery({
    queryKey: ["crm", "custom-fields", params],
    queryFn: () => fetchCustomFields(params),
    enabled: authenticated(),
  });
}

export function useWorkflowRules(params?: ListParams) {
  return useQuery({
    queryKey: ["crm", "workflow-rules", params],
    queryFn: () => fetchWorkflowRules(params),
    enabled: authenticated(),
  });
}

export function useCreateSubscriptionCheckout() {
  return useMutation({
    mutationFn: createSubscriptionCheckout,
  });
}

export function useVerifySubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: verifySubscription,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
      queryClient.invalidateQueries({ queryKey: ["company"] });
    },
  });
}

export function usePremiumAnalytics() {
  return useQuery({
    queryKey: ["premium-analytics"],
    queryFn: fetchPremiumAnalytics,
    staleTime: 60 * 1000,
    enabled: authenticated(),
  });
}

export function useReorderDeals() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: reorderDeals,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm", "deals"] });
    },
  });
}

export function useSMTPConfigs() {
  return useQuery({
    queryKey: ["crm", "smtp-configs"],
    queryFn: fetchSMTPConfigs,
    enabled: authenticated(),
  });
}

export function useCreateSMTPConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createSMTPConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm", "smtp-configs"] });
    },
  });
}

export function useUpdateSMTPConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) => updateSMTPConfig(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm", "smtp-configs"] });
    },
  });
}

export function useEmailTemplates() {
  return useQuery({
    queryKey: ["crm", "email-templates"],
    queryFn: fetchEmailTemplates,
    enabled: authenticated(),
  });
}

export function useCreateEmailTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createEmailTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm", "email-templates"] });
    },
  });
}

export function useDeleteEmailTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteEmailTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm", "email-templates"] });
    },
  });
}

export function useWebhookSubscriptions() {
  return useQuery({
    queryKey: ["crm", "webhook-subscriptions"],
    queryFn: fetchWebhookSubscriptions,
    enabled: authenticated(),
  });
}

export function useCreateWebhookSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createWebhookSubscription,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm", "webhook-subscriptions"] });
    },
  });
}

export function useDeleteWebhookSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteWebhookSubscription,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm", "webhook-subscriptions"] });
    },
  });
}

export function useTestWebhookSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: testWebhookSubscription,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm", "webhook-delivery-logs"] });
    },
  });
}

export function useWebhookDeliveryLogs() {
  return useQuery({
    queryKey: ["crm", "webhook-delivery-logs"],
    queryFn: fetchWebhookDeliveryLogs,
    refetchInterval: 10000,
    enabled: authenticated(),
  });
}

export function useSendEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: sendEmail,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm", "activities"] });
    },
  });
}

// ── Operational Hooks (Attendance, Leaves, Expenses, Assets) ──

export function useAttendanceStatus() {
  return useQuery({
    queryKey: ["attendance", "status"],
    queryFn: fetchAttendanceStatus,
    enabled: authenticated(),
    refetchInterval: 30000,
  });
}

export function usePunchIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: punchIn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance", "status"] });
      queryClient.invalidateQueries({ queryKey: ["attendance", "history"] });
    },
  });
}

export function usePunchOut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: punchOut,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance", "status"] });
      queryClient.invalidateQueries({ queryKey: ["attendance", "history"] });
    },
  });
}

export function useDeleteLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteLead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm", "leads"] });
      queryClient.invalidateQueries({ queryKey: ["crm", "counts"] });
    },
  });
}

export function useScoreLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: scoreLead,
    onSuccess: (_, id) => {
      void queryClient.invalidateQueries({ queryKey: ["lead", id.toString()] });
      void queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });
}

export function useImportLeads() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: importLeads,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });
}

export function useStartBreak() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: startBreak,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance", "status"] });
      queryClient.invalidateQueries({ queryKey: ["attendance", "history"] });
    },
  });
}

export function useEndBreak() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: endBreak,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance", "status"] });
      queryClient.invalidateQueries({ queryKey: ["attendance", "history"] });
    },
  });
}

export function useShiftHistory(all: boolean = false) {
  return useQuery<any[]>({
    queryKey: ["attendance-history", all],
    queryFn: async () => {
      const res = await api.get(`/attendance/history/${all ? "?all=true" : ""}`);
      return res.data;
    },
  });
}

export function useAttendanceMatrix(month: number, year: number) {
  return useQuery({
    queryKey: ["attendance-matrix", month, year],
    queryFn: async () => {
      const { fetchAttendanceMatrix } = await import("./api");
      return fetchAttendanceMatrix(month, year);
    },
    enabled: !!month && !!year,
  });
}


export function useLeaves(all?: boolean) {
  return useQuery({
    queryKey: ["attendance", "leaves", { all }],
    queryFn: () => fetchLeaves(all),
    enabled: authenticated(),
  });
}

export function useSubmitLeave() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: submitLeave,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance", "leaves"] });
    },
  });
}

export function useApproveLeave() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { status: "approved" | "rejected"; manager_notes?: string } }) =>
      reviewLeave(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance", "leaves"] });
    },
  });
}

export function useExpenses(all?: boolean) {
  return useQuery({
    queryKey: ["attendance", "expenses", { all }],
    queryFn: () => fetchExpenses(all),
    enabled: authenticated(),
  });
}

export function useSubmitExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: submitExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance", "expenses"] });
    },
  });
}

export function useApproveExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { status: "approved" | "rejected"; manager_notes?: string } }) =>
      reviewExpense(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance", "expenses"] });
    },
  });
}

export function useAssets(params?: { unassigned?: boolean; assigned_to?: number }) {
  return useQuery({
    queryKey: ["attendance", "assets", params],
    queryFn: () => fetchAssets(params),
    enabled: authenticated(),
  });
}

export function useCreateAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createAsset,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance", "assets"] });
    },
  });
}

export function useUpdateAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: {
      id: string;
      payload: {
        assigned_to?: number | null;
        condition?: "new" | "good" | "fair" | "damaged";
        name?: string;
        serial_number?: string;
        purchase_date?: string | null;
      };
    }) => updateAsset(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance", "assets"] });
    },
  });
}

export function useDeleteAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteAsset,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance", "assets"] });
    },
  });
}

export function useEmailAccounts(params?: ListParams) {
  return useQuery({
    queryKey: ["crm", "email-accounts", params],
    queryFn: () => fetchEmailAccounts(params),
    enabled: authenticated(),
  });
}

export function useGetOAuthUrl() {
  return useMutation({
    mutationFn: getOAuthUrl,
  });
}

export function useHandleOAuthCallback() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: handleOAuthCallback,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["crm", "email-accounts"] });
    },
  });
}

export function useDisconnectEmailAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteEmailAccount,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["emailAccounts"] });
    },
  });
}

export function useEmailMessages(params?: ListParams) {
  return useQuery({
    queryKey: ["crm", "email-messages", params],
    queryFn: () => fetchEmailMessages(params),
    enabled: authenticated(),
  });
}

export function useCalendarAccounts(params?: ListParams) {
  return useQuery({
    queryKey: ["crm", "calendar-accounts", params],
    queryFn: () => fetchCalendarAccounts(params),
    enabled: authenticated(),
  });
}

export function useConnectCalendarAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: connectCalendarAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm", "calendar-accounts"] });
    },
  });
}

export function useDeleteCalendarAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteCalendarAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm", "calendar-accounts"] });
    },
  });
}

export function useUpdateCalendarAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) => updateCalendarAccount(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm", "calendar-accounts"] });
    },
  });
}

export function useBookingLinks(params?: ListParams) {
  return useQuery({
    queryKey: ["crm", "booking-links", params],
    queryFn: () => fetchBookingLinks(params),
    enabled: authenticated(),
  });
}

export function useCreateBookingLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createBookingLink,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm", "booking-links"] });
    },
  });
}

export function useUpdateBookingLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) => updateBookingLink(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm", "booking-links"] });
    },
  });
}

export function useDeleteBookingLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteBookingLink,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["bookingLinks"] });
    },
  });
}

export function useCampaigns(params?: ListParams) {
  return useQuery({
    queryKey: ["campaigns", params],
    queryFn: () => fetchCampaigns(params),
  });
}

export function useCreateCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCampaign,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    },
  });
}

export function useUpdateCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<CampaignInput> }) => updateCampaign(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    },
  });
}

export function useDeleteCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteCampaign,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    },
  });
}

export function useSendCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: sendCampaign,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    },
  });
}

export function useTickets(params?: ListParams) {
  return useQuery({
    queryKey: ["tickets", params],
    queryFn: () => fetchTickets(params),
  });
}

export function useTicket(id: number) {
  return useQuery({
    queryKey: ["tickets", id],
    queryFn: () => fetchTicket(id),
    enabled: !!id,
  });
}

export function useCreateTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createTicket,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
  });
}

export function useUpdateTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<TicketInput> }) => updateTicket(id, payload),
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: ["tickets"] });
      void queryClient.invalidateQueries({ queryKey: ["tickets", id] });
    },
  });
}

export function useDeleteTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteTicket,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
  });
}

export function useCreateTicketComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ticketId, payload }: { ticketId: number; payload: TicketCommentInput }) => createTicketComment(ticketId, payload),
    onSuccess: (_, { ticketId }) => {
      void queryClient.invalidateQueries({ queryKey: ["tickets", ticketId] });
      void queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
  });
}

export function useTicketComments(ticketId: number) {
  return useQuery({
    queryKey: ["tickets", ticketId, "comments"],
    queryFn: () => fetchTicketComments(ticketId),
    enabled: !!ticketId,
  });
}

export function usePublicQuote(token: string) {
  return useQuery({
    queryKey: ["public", "quote", token],
    queryFn: () => fetchPublicQuote(token),
    enabled: !!token,
  });
}

export function useSignPublicQuote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ token, payload }: { token: string; payload: { signature_data: string; signed_by_name: string } }) => signPublicQuote(token, payload),
    onSuccess: (_, { token }) => {
      void queryClient.invalidateQueries({ queryKey: ["public", "quote", token] });
    },
  });
}

export function usePublicInvoice(token: string) {
  return useQuery({
    queryKey: ["public", "invoice", token],
    queryFn: () => fetchPublicInvoice(token),
    enabled: !!token,
  });
}

export function useSignPublicInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ token, payload }: { token: string; payload: { signature_data: string; signed_by_name: string } }) => signPublicInvoice(token, payload),
    onSuccess: (_, { token }) => {
      void queryClient.invalidateQueries({ queryKey: ["public", "invoice", token] });
    },
  });
}

export function usePayPublicInvoice() {
  return useMutation({
    mutationFn: ({ token }: { token: string }) => payPublicInvoice(token),
  });
}

export function useVerifyPublicInvoicePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ token, payload }: { token: string; payload: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string } }) => verifyPublicInvoicePayment(token, payload),
    onSuccess: (_, { token }) => {
      void queryClient.invalidateQueries({ queryKey: ["public", "invoice", token] });
    },
  });
}

// ── HR: Expenses ─────────────────────────────────────────────────────────────

export function useExpenseClaims(all = false) {
  return useQuery({
    queryKey: ["attendance", "expenses", { all }],
    queryFn: () => fetchExpenseClaims(all),
    enabled: authenticated(),
  });
}

export function useCreateExpenseClaim() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createExpenseClaim,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["attendance", "expenses"] });
    },
  });
}

export function useApproveExpenseClaim() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { status: "approved" | "rejected"; manager_notes?: string } }) =>
      approveExpenseClaim(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["attendance", "expenses"] });
    },
  });
}

// ── HR: Office Assets ────────────────────────────────────────────────────────

export function useOfficeAssets() {
  return useQuery({
    queryKey: ["attendance", "assets"],
    queryFn: fetchOfficeAssets,
    enabled: authenticated(),
  });
}

export function useCreateOfficeAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createOfficeAsset,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["attendance", "assets"] });
    },
  });
}

export function useUpdateOfficeAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => updateOfficeAsset(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["attendance", "assets"] });
    },
  });
}

export function useDeleteOfficeAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteOfficeAsset,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["attendance", "assets"] });
    },
  });
}

export function usePublicBookingLink(slug: string) {
  return useQuery({
    queryKey: ["public", "booking-link", slug],
    queryFn: () => fetchPublicBookingLink(slug),
    enabled: !!slug,
  });
}

export function useQuotes(params?: ListParams) {
  return useQuery({
    queryKey: ["quotes", params],
    queryFn: () => fetchQuotes(params),
  });
}

export function useCreateQuote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createQuote,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["quotes"] });
    },
  });
}

export function useUpdateQuote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) => updateQuote(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["quotes"] });
    },
  });
}

export function useDeleteQuote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteQuote,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["quotes"] });
    },
  });
}

export function useInvoices(params?: ListParams) {
  return useQuery({
    queryKey: ["invoices", params],
    queryFn: () => fetchInvoices(params),
  });
}

export function useInvoice(id: number) {
  return useQuery({
    queryKey: ["invoice", id],
    queryFn: () => getInvoice(id),
    enabled: !!id,
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createInvoice,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
  });
}

export function useUpdateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) => updateInvoice(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
  });
}

export function useDeleteInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
  });
}

export function useAddInvoicePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number, payload: { amount: number, payment_method: string, transaction_id?: string, notes?: string } }) => addInvoicePayment(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
  });
}


export function useSubmitPublicBooking(slug: string) {
  return useMutation({
    mutationFn: (payload: { name: string; email: string; date: string; time: string }) => submitPublicBooking(slug, payload),
  });
}

export function useAIAssistant() {
  return useMutation({
    mutationFn: aiAssistantAction,
  });
}

// ----------------------------------------------------------------------
// Payroll API Hooks
// ----------------------------------------------------------------------
export function usePayrolls(all: boolean = false) {
  return useQuery<any[]>({
    queryKey: ["payrolls", all],
    queryFn: async () => {
      const res = await api.get(`/attendance/payrolls/${all ? "?all=true" : ""}`);
      return res.data;
    },
  });
}

export function useCreatePayroll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post("/attendance/payrolls/", payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payrolls"] });
    },
  });
}

export function useUpdatePayroll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const res = await api.put(`/attendance/payrolls/${id}/`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payrolls"] });
    },
  });
}

export function useDeletePayroll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/attendance/payrolls/${id}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payrolls"] });
    },
  });
}

// ----------------------------------------------------------------------
// Holiday API Hooks
// ----------------------------------------------------------------------
export function useTeam() {
  return useQuery<any[]>({
    queryKey: ["team"],
    queryFn: async () => {
      const res = await api.get("/accounts/team/");
      return res.data.users || [];
    },
  });
}

export function useHolidays() {
  return useQuery<any[]>({
    queryKey: ["holidays"],
    queryFn: async () => {
      const res = await api.get("/attendance/holidays/");
      return res.data;
    },
  });
}

export function useCreateHoliday() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; date: string; description?: string }) => {
      const res = await api.post("/attendance/holidays/", payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holidays"] });
    },
  });
}

export function useDeleteHoliday() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/attendance/holidays/${id}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holidays"] });
    },
  });
}

export function useInviteCustomerToPortal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: inviteCustomerToPortal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm", "customers"] });
    },
  });
}

// ── Orders ────────────────────────────────────────────────────────────────────

export function useOrders(params?: any) {
  return useQuery({
    queryKey: ["crm", "orders", params],
    queryFn: () => fetchOrders(params),
    enabled: authenticated(),
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createOrder,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["crm", "orders"] }); },
  });
}

export function useUpdateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) => updateOrder(id, payload),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["crm", "orders"] }); },
  });
}

export function useDeleteOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteOrder,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["crm", "orders"] }); },
  });
}

// ── Events ────────────────────────────────────────────────────────────────────

export function useEvents(params?: any) {
  return useQuery({
    queryKey: ["crm", "events", params],
    queryFn: () => fetchEvents(params),
    enabled: authenticated(),
  });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createEvent,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["crm", "events"] }); },
  });
}

export function useUpdateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) => updateEvent(id, payload),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["crm", "events"] }); },
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteEvent,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["crm", "events"] }); },
  });
}

// ── Notices ───────────────────────────────────────────────────────────────────

export function useNotices(params?: any) {
  return useQuery({
    queryKey: ["crm", "notices", params],
    queryFn: () => fetchNotices(params),
    enabled: authenticated(),
  });
}

export function useCreateNotice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createNotice,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["crm", "notices"] }); },
  });
}

export function useUpdateNotice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) => updateNotice(id, payload),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["crm", "notices"] }); },
  });
}

export function useDeleteNotice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteNotice,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["crm", "notices"] }); },
  });
}

// ── Products (Additional) ───────────────────────────────────────────────────

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) => import("./api").then(m => m.updateProduct(id, payload)),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["crm", "products"] }); },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => import("./api").then(m => m.deleteProduct(id)),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["crm", "products"] }); },
  });
}

// Invoice Settings hooks
export function useInvoiceSettings() {
  return useQuery({
    queryKey: ["invoiceSettings"],
    queryFn: getInvoiceSettings,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateInvoiceSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateInvoiceSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoiceSettings"] });
    },
  });
}

export function usePaymentMethods() { return useQuery({ queryKey: ['paymentMethods'], queryFn: () => import('./api').then(m => m.getPaymentMethods()) }); }
export function useCreatePaymentMethod() { const queryClient = useQueryClient(); return useMutation({ mutationFn: (data: any) => import('./api').then(m => m.createPaymentMethod(data)), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['paymentMethods'] }); } }); }
export function useUpdatePaymentMethod() { const queryClient = useQueryClient(); return useMutation({ mutationFn: (args: {id: number, data: any}) => import('./api').then(m => m.updatePaymentMethod(args)), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['paymentMethods'] }); } }); }
export function useDeletePaymentMethod() { const queryClient = useQueryClient(); return useMutation({ mutationFn: (id: number) => import('./api').then(m => m.deletePaymentMethod(id)), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['paymentMethods'] }); } }); }
