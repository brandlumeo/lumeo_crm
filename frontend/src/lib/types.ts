export interface CompanySummary {
  id: string;
  name: string;
  slug: string;
  status: string;
}

export interface CompanyDetail extends CompanySummary {
  trial_ends_at: string | null;
  is_trial_active: boolean;
  created_at: string;
  currency: string;
  domain: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  timezone: string;
  date_format: string;
  time_format: string;
  language: string;
  datatable_row_limit: number;
  employee_can_export_data: boolean;
  allow_client_signup: boolean;
  need_admin_approval_after_client_signup: boolean;
  stripe_public_key: string | null;
  stripe_secret_key: string | null;
  paypal_client_id: string | null;
  paypal_secret: string | null;
  invoice_prefix: string;
  quote_prefix: string;
  default_tax_rate: string;
  payment_terms: string;
  invoice_logo: string | null;
  authorised_signatory_signature: string | null;
  invoice_language: string;
  invoice_due_after_days: number;
  send_reminder_before_days: number;
  send_reminder_after_days: number;
  show_tax_number_on_invoice: boolean;
  hsn_sac_code_show: boolean;
  show_tax_calculation_message: boolean;
  show_status_on_invoice: boolean;
  show_authorised_signatory: boolean;
  show_client_name: boolean;
  show_client_company_name: boolean;
  show_client_email: boolean;
  show_client_phone: boolean;
  show_client_address: boolean;
  show_project_on_invoice: boolean;
  invoice_template: string;
  invoice_terms: string;
  invoice_other_information: string | null;
  contract_prefix: string;
  contract_number_separator: string;
  contract_number_digits: number;
  tax_id: string | null;
  tax_id_label: string | null;
  taxes: { id: string; name: string; rate: number; is_default: boolean }[];
  ticket_prefix: string;
  default_ticket_priority: string;
  allow_customer_portal_tickets: boolean;
  ticket_visibility_setting: string;
  ticket_agents: { id: string; name: string; group: string; status: string }[];
  ticket_groups: { id: string; name: string }[];
  ticket_types: { id: string; name: string }[];
  ticket_channels: { id: string; name: string }[];
  ticket_reply_templates: { id: string; name: string; body: string }[];
  ticket_round_robin: boolean;
  project_prefix: string;
  default_project_view: string;
  require_project_approval: boolean;
  project_send_reminder: boolean;
  project_statuses: { id: string; name: string; color: string; isDefault: boolean }[];
  project_categories: { id: string; name: string }[];
  office_start_time: string;
  office_end_time: string;
  late_mark_after_minutes: number;
  allow_shift_change_request: boolean;
  save_clock_in_location: boolean;
  allow_self_clock_in: boolean;
  auto_clock_in_first_sign_in: boolean;
  clock_in_location_radius_check: boolean;
  allow_clock_in_outside_shift: boolean;
  clock_in_ip_address_check: boolean;
  send_monthly_attendance_report: boolean;
  email_report_role: string;
  week_starts_from: string;
  attendance_reminder_status: boolean;
  employee_shifts: any[];
  shift_rotations: any[];
  default_leave_quota: number;
  allow_half_day_leaves: boolean;
  require_leave_approval: boolean;
  leave_count_from: string;
  reporting_manager_leave_approval_role: string;
  leave_types: any[];
  allow_employee_invite: boolean;
  default_new_user_role: string;
  roles: any[];
  lead_prefix: string;
  default_lead_status: string;
  lead_assignment_round_robin: boolean;
  lead_sources?: { id: string; name: string }[];
  lead_pipelines?: { id: string; name: string; color: string }[];
  deal_agents?: string[];
  deal_categories?: { id: string; name: string }[];
  lead_round_robin_agents?: string[];
  require_time_log_approval: boolean;
  allow_manual_time_entry: boolean;
  default_billable_rate: string | number;
  timelog_stop_timer_after_shift?: boolean;
  timelog_send_tracker_reminders?: boolean;
  timelog_send_daily_report?: boolean;
  timelog_report_roles?: string[];
  task_default_priority: string;
  task_require_due_date: boolean;
  task_allow_subtasks: boolean;
  task_auto_assign_creator: boolean;
  task_reminder_before_days?: number;
  task_reminder_on_due_day?: boolean;
  task_reminder_after_days?: number;
  task_default_status_filter?: string;
  task_board_default_length?: number;
  task_client_visible_fields?: Record<string, boolean>;
  module_crm_enabled: boolean;
  module_hr_enabled: boolean;
  module_finance_enabled: boolean;
  module_projects_enabled: boolean;
  module_attendance_enabled: boolean;
  module_tickets_enabled: boolean;
  module_events_enabled: boolean;
  module_notice_board_enabled: boolean;
}

export interface UserSummary {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  role: string;
}

export interface UserProfile extends UserSummary {
  email: string;
  company: CompanySummary | null;
  avatar: string | null;
  designation?: string;
  department?: string;
  timezone: string;
  prefix: string | null;
  mobile: string | null;
  country: string | null;
  language: string | null;
  gender: string | null;
  receive_email_notifications: boolean;
  enable_google_calendar: boolean;
  notify_new_lead: boolean;
  notify_deal_stage: boolean;
  notify_task_deadline: boolean;
  notify_workspace_updates: boolean;
  email_notifications: Record<string, boolean>;
  slack_notifications: Record<string, boolean>;
  push_notifications: Record<string, boolean>;
  emergency_contacts: any[];
  can_manage_team: boolean;
  has_management_access: boolean;
  is_superuser: boolean;
  is_staff: boolean;
  two_factor_enabled: boolean;
  two_factor_method: "disabled" | "email" | "google_authenticator";
  two_factor_secret?: string;
  two_factor_code?: string;
}

export interface Lead {
  id: number;
  company: CompanySummary;
  name: string;
  email: string;
  status: string;
  assigned_to: UserSummary | null;
  custom_data: Record<string, any>;
  score?: number | null;
  score_rationale?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: number;
  company: CompanySummary;
  name: string;
  email: string;
  phone: string;
  custom_data: Record<string, any>;
  has_portal_access?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Deal {
  id: number;
  company: CompanySummary;
  title: string;
  amount: string;
  stage: string;
  customer_name?: string;
  custom_data: Record<string, any>;
  expected_close_date?: string | null;
  created_at: string;
  updated_at: string;
  row_order?: number;
  assigned_to?: UserSummary | null;
}


export interface Task {
  id: number;
  company: CompanySummary;
  title: string;
  due_date: string;
  status: string;
  assigned_to: UserSummary | null;
  created_at: string;
  updated_at: string;
}

export interface Note {
  id: number;
  company: CompanySummary;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface LoginPayload {
  username: string;
  password: string;
}

export interface TokenPair {
  access: string;
  refresh: string;
}

export interface LeadInput {
  name: string;
  email: string;
  status?: string;
  assigned_to_id?: number | null;
  custom_data?: Record<string, any>;
}

export interface CustomerInput {
  name: string;
  email: string;
  phone: string;
  custom_data?: Record<string, any>;
}

export interface DealInput {
  title: string;
  amount: string;
  stage?: string;
  expected_close_date?: string | null;
  custom_data?: Record<string, any>;
}

export interface TaskInput {
  title: string;
  due_date: string;
  status?: string;
  assigned_to_id?: number | null;
}

export interface NoteInput {
  content: string;
}

export interface ListParams {
  page?: number;
  search?: string;
  ordering?: string;
  status?: string;
  stage?: string;
  email?: string;
  assigned_to?: number;
  due_date_from?: string;
  due_date_to?: string;
  min_amount?: string;
  max_amount?: string;
  deal?: number;
  limit?: number;
}

export interface PlanLimits {
  max_users: number;
  max_leads: number;
  max_deals: number;
  price_monthly: number;
  price_yearly: number;
}

export interface Subscription {
  id: number;
  plan: string;
  plan_display: string;
  is_active: boolean;
  is_expired: boolean;
  is_trial: boolean;
  days_remaining: number | null;
  expires_at: string | null;
  plan_limits: PlanLimits;
  created_at: string;
  updated_at: string;
}

export interface PlanDetail {
  key: string;
  name: string;
  price_monthly: number;
  price_yearly: number;
  max_users: number;
  max_leads: number;
  max_deals: number;
  is_current: boolean;
}

export interface Notification {
  id: number;
  notification_type: string;
  notification_type_display: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

export interface UnreadCount {
  unread_count: number;
}

export interface TeamInvitation {
  id: number;
  email: string;
  first_name?: string;
  last_name?: string;
  designation?: string;
  department?: string;
  personal_message?: string;
  role: string;
  is_accepted: boolean;
  created_at: string;
  expires_at: string;
  is_expired: boolean;
}

export interface TeamData {
  users: UserProfile[];
  invites: TeamInvitation[];
}

export interface SearchData {
  leads: Lead[];
  customers: Customer[];
  deals: Deal[];
  tasks: Task[];
  quotes: Quote[];
  invoices: Invoice[];
}

export interface Activity {
  id: number;
  company: CompanySummary;
  lead: number | null;
  deal: number | null;
  customer: number | null;
  activity_type: "call" | "meeting" | "email" | "note" | "status_change";
  description: string;
  created_by: UserSummary | null;
  created_at: string;
}

export interface ActivityInput {
  lead?: number;
  deal?: number;
  customer?: number;
  activity_type: string;
  description: string;
}

export interface Attachment {
  id: number;
  company: CompanySummary;
  lead: number | null;
  deal: number | null;
  customer: number | null;
  file: string;
  file_url: string;
  file_name: string;
  file_size: number;
  content_type: string;
  uploaded_by: UserSummary | null;
  created_at: string;
}

export interface Product {
  id: number;
  company: CompanySummary;
  name: string;
  sku: string;
  description: string;
  price: string;
  tax_rate: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductInput {
  name: string;
  sku?: string;
  description?: string;
  price: string;
  tax_rate?: string;
  is_active?: boolean;
}

export interface QuoteLineItem {
  id?: number;
  product?: number;
  name: string;
  description?: string;
  quantity: number;
  unit_price: string;
  tax_rate: string;
  subtotal?: string;
  tax_amount?: string;
  total?: string;
}

export interface Quote {
  id: number;
  company: CompanySummary;
  deal: number | null;
  quote_number: string;
  title: string;
  status: "draft" | "sent" | "accepted" | "declined" | "expired";
  valid_until: string | null;
  subtotal: string;
  tax_amount: string;
  total: string;
  items: QuoteLineItem[];
  public_token: string;
  signature_data: string | null;
  signed_at: string | null;
  signed_by_name: string;
  signed_by_ip: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuoteInput {
  deal?: number;
  title: string;
  status?: string;
  valid_until?: string;
  items: QuoteLineItem[];
}

export interface InvoiceLineItem {
  id?: number;
  product?: number;
  name: string;
  description?: string;
  quantity: number;
  unit_price: string;
  tax_rate: string;
  subtotal?: string;
  tax_amount?: string;
  total?: string;
}

export interface Invoice {
  id: number;
  company: CompanySummary;
  deal: number | null;
  customer: number;
  invoice_number: string;
  status: "draft" | "sent" | "paid" | "overdue" | "void";
  issue_date: string;
  due_date: string | null;
  subtotal: string;
  tax_amount: string;
  total: string;
  items: InvoiceLineItem[];
  public_token: string;
  signature_data: string | null;
  signed_at: string | null;
  signed_by_name: string;
  signed_by_ip: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvoiceInput {
  deal?: number;
  customer: number;
  status?: string;
  due_date?: string;
  items: InvoiceLineItem[];
}

export interface CustomFieldDefinition {
  id: number;
  company: CompanySummary;
  model_name: "lead" | "customer" | "deal";
  name: string;
  label: string;
  field_type: "text" | "number" | "boolean" | "date";
  required: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomFieldDefinitionInput {
  model_name: "lead" | "customer" | "deal";
  name: string;
  label: string;
  field_type: "text" | "number" | "boolean" | "date";
  required?: boolean;
}

export interface WorkflowRule {
  id: number;
  company: CompanySummary;
  name: string;
  trigger_event: "deal_won" | "deal_lost" | "lead_qualified";
  action_type: "create_task" | "send_notification";
  action_payload: {
    task_title?: string;
    due_days_offset?: number;
    notification_title?: string;
    notification_body?: string;
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkflowRuleInput {
  name: string;
  trigger_event: "deal_won" | "deal_lost" | "lead_qualified";
  action_type: "create_task" | "send_notification";
  action_payload: {
    task_title?: string;
    due_days_offset?: number;
    notification_title?: string;
    notification_body?: string;
  };
  is_active?: boolean;
}

export interface SMTPConfig {
  id: number;
  company?: CompanySummary;
  host: string;
  port: number;
  username: string;
  password?: string;
  use_tls: boolean;
  from_email: string;
}

export interface SMTPConfigInput {
  host: string;
  port: number;
  username: string;
  password?: string;
  use_tls: boolean;
  from_email: string;
}

export interface EmailTemplate {
  id: number;
  company?: CompanySummary;
  name: string;
  subject: string;
  body_content: string;
}

export interface EmailTemplateInput {
  name: string;
  subject: string;
  body_content: string;
}

export interface WebhookSubscription {
  id: number;
  company?: CompanySummary;
  target_url: string;
  secret_token: string;
  event_triggers: string[];
  is_active: boolean;
  created_at: string;
}

export interface WebhookSubscriptionInput {
  target_url: string;
  secret_token: string;
  event_triggers: string[];
  is_active?: boolean;
}

export interface WebhookDeliveryLog {
  id: number;
  subscription: number;
  event_type: string;
  payload: Record<string, any>;
  response_status: number | null;
  response_body: string;
  timestamp: string;
}

export interface EmailSendInput {
  subject: string;
  body: string;
  lead_id?: number;
  customer_id?: number;
  deal_id?: number;
  to_email?: string;
}

export interface BreakLog {
  id: string;
  time_log: string;
  start_time: string;
  end_time: string | null;
  reason: string | null;
}

export interface TimeLog {
  id: string;
  user: number;
  user_email: string;
  user_full_name: string;
  company: number;
  clock_in: string;
  clock_out: string | null;
  work_location: "office" | "wfh" | "onsite" | "field";
  ip_address: string | null;
  latitude: string | number | null;
  longitude: string | number | null;
  notes: string | null;
  breaks: BreakLog[];
}

export interface AttendanceStatus {
  is_clocked_in: boolean;
  is_on_break: boolean;
  active_log: TimeLog | null;
  active_break: BreakLog | null;
}

export interface LeaveRequest {
  id: string;
  user: number;
  user_email: string;
  user_full_name: string;
  company: number;
  leave_type: "paid" | "sick" | "casual" | "unpaid";
  status: "pending" | "approved" | "rejected";
  start_date: string;
  end_date: string;
  reason: string;
  attachment: string | null;
  approved_by: number | null;
  approved_by_name: string | null;
  manager_notes: string | null;
  created_at: string;
}

export interface ExpenseClaim {
  id: string;
  user: number;
  user_email: string;
  user_full_name: string;
  company: number;
  deal: number | null;
  deal_name: string | null;
  title: string;
  amount: string;
  receipt: string | null;
  description: string | null;
  status: "pending" | "approved" | "rejected";
  approved_by: number | null;
  approved_by_name: string | null;
  manager_notes: string | null;
  created_at: string;
}

export interface OfficeAsset {
  id: string;
  company: number;
  assigned_to: number | null;
  assigned_to_email: string | null;
  assigned_to_name: string | null;
  name: string;
  serial_number: string | null;
  condition: "new" | "good" | "fair" | "damaged";
  purchase_date: string | null;
  created_at: string;
}

export interface EmailAccount {
  id: number;
  user?: UserSummary;
  provider: "google" | "outlook";
  email_address: string;
  is_active: boolean;
  created_at: string;
}

export interface EmailMessage {
  id: number;
  account: number;
  lead?: number | null;
  customer?: number | null;
  message_id: string;
  thread_id: string;
  direction: "inbound" | "outbound";
  from_address: string;
  to_addresses: string[];
  cc_addresses: string[];
  bcc_addresses: string[];
  subject: string;
  body_text: string;
  body_html: string;
  is_read: boolean;
  received_at: string;
  created_at: string;
}

export interface CalendarAccount {
  id: number;
  user?: UserSummary;
  provider: "google" | "outlook" | "apple";
  account_email: string;
  is_active: boolean;
  sync_conflicts: boolean;
  write_events: boolean;
  location_type: string;
  buffer_minutes: number;
  minimum_notice_hours: number;
  working_hours_start: string;
  working_hours_end: string;
  created_at: string;
}

export interface BookingLink {
  id: number;
  user?: UserSummary;
  slug: string;
  name: string;
  description: string;
  duration_minutes: number;
  is_active: boolean;
  created_at: string;
}

export interface Campaign {
  id: number;
  company?: CompanySummary;
  name: string;
  subject: string;
  body_html: string;
  status: "draft" | "sending" | "completed";
  target_audience: string;
  sent_count: number;
  failed_count: number;
  created_by?: UserSummary;
  created_at: string;
  sent_at: string | null;
}

export interface CampaignInput {
  name: string;
  subject: string;
  body_html: string;
  target_audience: string;
}

export interface TicketComment {
  id: number;
  ticket: number;
  author: UserSummary | null;
  body: string;
  is_internal: boolean;
  created_at: string;
}

export interface Ticket {
  id: number;
  company: CompanySummary;
  customer: number | null;
  subject: string;
  description: string;
  status: "open" | "in_progress" | "waiting" | "resolved" | "closed";
  priority: "low" | "medium" | "high" | "urgent";
  assigned_to: UserSummary | null;
  comments: TicketComment[];
  created_at: string;
  updated_at: string;
}

export interface TicketInput {
  customer?: number | null;
  subject: string;
  description: string;
  status?: string;
  priority?: string;
  assigned_to_id?: number | null;
}

export interface TicketCommentInput {
  body: string;
  is_internal?: boolean;
}
