import uuid

from django.db import models
from django.utils import timezone
from django.utils.text import slugify


class CompanyQuerySet(models.QuerySet):
    def active(self):
        return self.filter(status=Company.Status.ACTIVE)

    def trialing(self):
        return self.filter(
            status=Company.Status.TRIAL,
            trial_ends_at__isnull=False,
            trial_ends_at__gte=timezone.now(),
        )
def default_project_statuses():
    return [
        {"id": "1", "name": "in progress", "color": "#3b82f6", "isDefault": True},
        {"id": "2", "name": "not started", "color": "#6b7280", "isDefault": False},
        {"id": "3", "name": "on hold", "color": "#eab308", "isDefault": False},
        {"id": "4", "name": "canceled", "color": "#ef4444", "isDefault": False},
        {"id": "5", "name": "finished", "color": "#22c55e", "isDefault": False},
    ]


def default_lead_sources():
    return [
        {"id": "1", "name": "Email"},
        {"id": "2", "name": "Google"},
        {"id": "3", "name": "Facebook"},
        {"id": "4", "name": "Friend"},
        {"id": "5", "name": "Direct"},
        {"id": "6", "name": "Tv"},
    ]


def default_lead_pipelines():
    return [
        {"id": "1", "name": "Prospect", "color": "#8B8580"},
        {"id": "2", "name": "Qualified", "color": "#3B82F6"},
        {"id": "3", "name": "Proposal", "color": "#D97706"},
        {"id": "4", "name": "Negotiation", "color": "#7C3AED"},
        {"id": "5", "name": "Won", "color": "#16A34A"},
        {"id": "6", "name": "Lost", "color": "#9CA3AF"},
    ]


def default_deal_categories():
    return [
        {"id": "1", "name": "New Business"},
        {"id": "2", "name": "Existing Business"},
    ]

def default_task_client_visible_fields():
    return {
        "task_category": True,
        "project": True,
        "start_date": True,
        "due_date": True,
        "assigned_to": True,
        "description": True,
        "label": True,
        "assigned_by": True,
        "status": True,
        "priority": True,
        "make_private": True,
        "time_estimate": True,
        "comment": True,
        "add_file": True,
        "sub_task": True,
        "timesheet": True,
        "notes": True,
        "history": True,
        "hours_logged": True,
        "custom_fields": True,
        "copy_task_link": True,
    }


def default_roles():
    return [
        {
            "id": "admin", 
            "name": "App Administrator", 
            "members": 1, 
            "isAdmin": True,
            "permissions": {}
        },
        {
            "id": "manager", 
            "name": "Secondary Admin", 
            "members": 0, 
            "isAdmin": False,
            "permissions": {
                "Clients": {"Add": "All", "View": "All", "Update": "All", "Delete": "None"},
                "Employees": {"Add": "All", "View": "All", "Update": "All", "Delete": "None"},
                "Projects": {"Add": "All", "View": "All", "Update": "All", "Delete": "None"},
                "Attendance": {"Add": "All", "View": "All", "Update": "All", "Delete": "None"},
                "Tasks": {"Add": "All", "View": "All", "Update": "All", "Delete": "None"},
                "Estimates": {"Add": "All", "View": "All", "Update": "All", "Delete": "None"},
                "Invoices": {"Add": "All", "View": "All", "Update": "All", "Delete": "None"},
                "Payments": {"Add": "All", "View": "All", "Update": "All", "Delete": "None"},
                "Time Logs": {"Add": "All", "View": "All", "Update": "All", "Delete": "None"},
                "Tickets": {"Add": "All", "View": "All", "Update": "All", "Delete": "None"},
                "Events": {"Add": "All", "View": "All", "Update": "All", "Delete": "None"},
                "Notices": {"Add": "All", "View": "All", "Update": "All", "Delete": "None"},
                "Leaves": {"Add": "All", "View": "All", "Update": "All", "Delete": "None"},
                "Leads": {"Add": "All", "View": "All", "Update": "All", "Delete": "None"}
            }
        },
        {
            "id": "employee", 
            "name": "Employee", 
            "members": 0, 
            "isAdmin": False,
            "permissions": {
                "Clients": {"Add": "None", "View": "Owned", "Update": "Owned", "Delete": "None"},
                "Employees": {"Add": "None", "View": "All", "Update": "None", "Delete": "None"},
                "Projects": {"Add": "None", "View": "Owned", "Update": "Owned", "Delete": "None"},
                "Attendance": {"Add": "Owned", "View": "Owned", "Update": "None", "Delete": "None"},
                "Tasks": {"Add": "Owned", "View": "Owned", "Update": "Owned", "Delete": "None"},
                "Estimates": {"Add": "None", "View": "None", "Update": "None", "Delete": "None"},
                "Invoices": {"Add": "None", "View": "None", "Update": "None", "Delete": "None"},
                "Payments": {"Add": "None", "View": "None", "Update": "None", "Delete": "None"},
                "Time Logs": {"Add": "Owned", "View": "Owned", "Update": "Owned", "Delete": "None"},
                "Tickets": {"Add": "Owned", "View": "Owned", "Update": "Owned", "Delete": "None"},
                "Events": {"Add": "None", "View": "All", "Update": "None", "Delete": "None"},
                "Notices": {"Add": "None", "View": "All", "Update": "None", "Delete": "None"},
                "Leaves": {"Add": "Owned", "View": "Owned", "Update": "None", "Delete": "None"},
                "Leads": {"Add": "Owned", "View": "Owned", "Update": "Owned", "Delete": "None"}
            }
        },
        {
            "id": "team_leader", "name": "Team Leader", "members": 0, "isAdmin": False,
            "permissions": {
                "Projects": {"Add": "All", "View": "All", "Update": "All", "Delete": "None"},
                "Tasks": {"Add": "All", "View": "All", "Update": "All", "Delete": "None"},
                "Attendance": {"Add": "Owned", "View": "All", "Update": "None", "Delete": "None"}
            }
        },
        {
            "id": "it", "name": "IT", "members": 0, "isAdmin": False,
            "permissions": {
                "Tickets": {"Add": "All", "View": "All", "Update": "All", "Delete": "None"}
            }
        },
        {
            "id": "hr", "name": "HR", "members": 0, "isAdmin": False,
            "permissions": {
                "Clients": {"Add": "All", "View": "All", "Update": "All", "Delete": "None"},
                "Employees": {"Add": "All", "View": "All", "Update": "All", "Delete": "None"},
                "Projects": {"Add": "All", "View": "All", "Update": "All", "Delete": "None"},
                "Attendance": {"Add": "All", "View": "All", "Update": "All", "Delete": "None"},
                "Tasks": {"Add": "All", "View": "All", "Update": "All", "Delete": "None"},
                "Estimates": {"Add": "All", "View": "All", "Update": "All", "Delete": "None"},
                "Invoices": {"Add": "All", "View": "All", "Update": "All", "Delete": "None"},
                "Payments": {"Add": "All", "View": "All", "Update": "All", "Delete": "None"},
                "Time Logs": {"Add": "All", "View": "All", "Update": "All", "Delete": "None"},
                "Tickets": {"Add": "All", "View": "All", "Update": "All", "Delete": "None"},
                "Events": {"Add": "All", "View": "All", "Update": "All", "Delete": "None"},
                "Notices": {"Add": "All", "View": "All", "Update": "All", "Delete": "None"},
                "Leaves": {"Add": "All", "View": "All", "Update": "All", "Delete": "None"},
                "Leads": {"Add": "All", "View": "All", "Update": "All", "Delete": "None"}
            }
        },
        {
            "id": "accounts", "name": "Accounts", "members": 0, "isAdmin": False,
            "permissions": {
                "Invoices": {"Add": "All", "View": "All", "Update": "All", "Delete": "None"},
                "Payments": {"Add": "All", "View": "All", "Update": "All", "Delete": "None"},
                "Estimates": {"Add": "All", "View": "All", "Update": "All", "Delete": "None"}
            }
        },
        {
            "id": "sales", "name": "Sales", "members": 0, "isAdmin": False,
            "permissions": {
                "Leads": {"Add": "All", "View": "All", "Update": "All", "Delete": "None"},
                "Clients": {"Add": "All", "View": "All", "Update": "All", "Delete": "None"}
            }
        },
        {
            "id": "client", 
            "name": "Client", 
            "members": 0, 
            "isAdmin": False,
            "permissions": {
                "Projects": {"Add": "None", "View": "Owned", "Update": "None", "Delete": "None"},
                "Tasks": {"Add": "None", "View": "Owned", "Update": "None", "Delete": "None"},
                "Estimates": {"Add": "None", "View": "Owned", "Update": "None", "Delete": "None"},
                "Invoices": {"Add": "None", "View": "Owned", "Update": "None", "Delete": "None"},
                "Payments": {"Add": "Owned", "View": "Owned", "Update": "None", "Delete": "None"},
                "Tickets": {"Add": "Owned", "View": "Owned", "Update": "Owned", "Delete": "None"}
            }
        }
    ]
def default_weekend_policy():
    return {
        "0": [], # Monday
        "1": [], # Tuesday
        "2": [], # Wednesday
        "3": [], # Thursday
        "4": [], # Friday
        "5": [], # Saturday
        "6": ["all"]  # Sunday
    }

class Company(models.Model):
    class Status(models.TextChoices):
        TRIAL = "trial", "Trial"
        ACTIVE = "active", "Active"
        SUSPENDED = "suspended", "Suspended"
        CANCELLED = "cancelled", "Cancelled"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    slug = models.SlugField(
        max_length=255,
        unique=True,
        blank=True,
        help_text="Stable workspace identifier used in URLs and tenant resolution.",
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.TRIAL,
        db_index=True,
    )
    currency = models.CharField(
        max_length=3,
        default="USD",
        help_text="Default 3-letter currency code for the workspace.",
    )
    domain = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        help_text="Custom domain for the workspace.",
    )
    address_line1 = models.CharField(max_length=255, blank=True, null=True)
    address_line2 = models.CharField(max_length=255, blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    state = models.CharField(max_length=100, blank=True, null=True)
    postal_code = models.CharField(max_length=20, blank=True, null=True)
    country = models.CharField(max_length=100, blank=True, null=True)
    
    timezone = models.CharField(max_length=50, default="UTC", help_text="Default timezone for the workspace.")
    date_format = models.CharField(max_length=20, default="MMM DD, YYYY", help_text="Default date format for the workspace.")
    time_format = models.CharField(max_length=10, default="12h", help_text="12h or 24h time format.")

    # Attendance Settings
    shift_start_time = models.TimeField(default="09:30:00", help_text="Default shift start time")
    shift_end_time = models.TimeField(default="18:00:00", help_text="Default shift end time")
    late_grace_period_minutes = models.IntegerField(default=15, help_text="Grace period before marking as Late")
    language = models.CharField(max_length=50, default="en", help_text="Default language.")
    datatable_row_limit = models.IntegerField(default=10)
    employee_can_export_data = models.BooleanField(default=False)
    allow_client_signup = models.BooleanField(default=False)
    need_admin_approval_after_client_signup = models.BooleanField(default=True)
    stripe_public_key = models.CharField(max_length=255, blank=True, null=True)
    stripe_secret_key = models.CharField(max_length=255, blank=True, null=True)
    paypal_client_id = models.CharField(max_length=255, blank=True, null=True)
    paypal_secret = models.CharField(max_length=255, blank=True, null=True)
    
    invoice_prefix = models.CharField(max_length=20, default="INV-")
    quote_prefix = models.CharField(max_length=20, default="QT-")
    default_tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    payment_terms = models.CharField(max_length=50, default="due_on_receipt")
    
    # Advanced Invoice Settings
    invoice_logo = models.URLField(max_length=512, blank=True, null=True)
    authorised_signatory_signature = models.URLField(max_length=512, blank=True, null=True)
    invoice_language = models.CharField(max_length=50, default="en")
    invoice_due_after_days = models.IntegerField(default=15)
    send_reminder_before_days = models.IntegerField(default=0)
    send_reminder_after_days = models.IntegerField(default=3)
    
    show_tax_number_on_invoice = models.BooleanField(default=False)
    hsn_sac_code_show = models.BooleanField(default=False)
    show_tax_calculation_message = models.BooleanField(default=False)
    show_status_on_invoice = models.BooleanField(default=True)
    show_authorised_signatory = models.BooleanField(default=False)
    
    show_client_name = models.BooleanField(default=True)
    show_client_company_name = models.BooleanField(default=True)
    show_client_email = models.BooleanField(default=True)
    show_client_phone = models.BooleanField(default=True)
    show_client_address = models.BooleanField(default=True)
    show_project_on_invoice = models.BooleanField(default=True)
    
    invoice_template = models.CharField(max_length=50, default="template1")
    
    invoice_terms = models.TextField(default="Thank you for your business.", blank=True)
    invoice_other_information = models.TextField(blank=True, null=True)
    
    contract_prefix = models.CharField(max_length=20, default="CONT")
    contract_number_separator = models.CharField(max_length=5, default="#")
    contract_number_digits = models.IntegerField(default=3)
    
    tax_id = models.CharField(max_length=100, blank=True, null=True)
    tax_id_label = models.CharField(max_length=50, blank=True, null=True, help_text="e.g. VAT, EIN, GST")
    taxes = models.JSONField(default=list, blank=True)
    
    ticket_prefix = models.CharField(max_length=20, default="TCK-")
    default_ticket_priority = models.CharField(max_length=20, default="low")
    allow_customer_portal_tickets = models.BooleanField(default=True)
    ticket_visibility_setting = models.CharField(max_length=50, default="Global")
    ticket_agents = models.JSONField(default=list, blank=True)
    ticket_groups = models.JSONField(default=list, blank=True)
    ticket_types = models.JSONField(default=list, blank=True)
    ticket_channels = models.JSONField(default=list, blank=True)
    ticket_reply_templates = models.JSONField(default=list, blank=True)
    ticket_round_robin = models.BooleanField(default=False)
    
    project_prefix = models.CharField(max_length=20, default="PRJ-")
    default_project_view = models.CharField(max_length=20, default="list")
    require_project_approval = models.BooleanField(default=False)
    project_send_reminder = models.BooleanField(default=False)
    project_statuses = models.JSONField(default=default_project_statuses, blank=True)
    project_categories = models.JSONField(default=list, blank=True)
    
    office_start_time = models.TimeField(default="09:00:00")
    office_end_time = models.TimeField(default="18:00:00")
    late_mark_after_minutes = models.IntegerField(default=15)
    
    # Advanced Attendance Settings
    allow_shift_change_request = models.BooleanField(default=True)
    save_clock_in_location = models.BooleanField(default=True)
    allow_self_clock_in = models.BooleanField(default=True)
    auto_clock_in_first_sign_in = models.BooleanField(default=False)
    clock_in_location_radius_check = models.BooleanField(default=False)
    allow_clock_in_outside_shift = models.BooleanField(default=False)
    clock_in_ip_address_check = models.BooleanField(default=False)
    send_monthly_attendance_report = models.BooleanField(default=True)
    
    email_report_role = models.CharField(max_length=100, default="App Administrator")
    week_starts_from = models.CharField(max_length=20, default="Monday")
    attendance_reminder_status = models.BooleanField(default=False)
    
    employee_shifts = models.JSONField(default=list, blank=True)
    weekend_policy = models.JSONField(default=default_weekend_policy, blank=True)
    shift_rotations = models.JSONField(default=list, blank=True)
    automated_shifts = models.JSONField(default=list, blank=True)
    
    default_leave_quota = models.IntegerField(default=20, help_text="Default annual leave quota.")
    allow_half_day_leaves = models.BooleanField(default=True)
    require_leave_approval = models.BooleanField(default=True)
    
    leave_count_from = models.CharField(max_length=20, default="joining_date")
    reporting_manager_leave_approval_role = models.CharField(max_length=20, default="Pre-Approve")
    
    leave_types = models.JSONField(default=list, blank=True)
    
    allow_employee_invite = models.BooleanField(default=False)
    default_new_user_role = models.CharField(max_length=20, default="employee")
    roles = models.JSONField(default=default_roles, blank=True)
    
    lead_prefix = models.CharField(max_length=20, default="LD-")
    default_lead_status = models.CharField(max_length=50, default="new")
    lead_assignment_round_robin = models.BooleanField(default=False)
    
    lead_sources = models.JSONField(default=default_lead_sources, blank=True)
    lead_pipelines = models.JSONField(default=default_lead_pipelines, blank=True)
    deal_agents = models.JSONField(default=list, blank=True)
    deal_categories = models.JSONField(default=default_deal_categories, blank=True)
    lead_round_robin_agents = models.JSONField(default=list, blank=True)
    
    require_time_log_approval = models.BooleanField(default=False)
    allow_manual_time_entry = models.BooleanField(default=True)
    default_billable_rate = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    
    timelog_stop_timer_after_shift = models.BooleanField(default=False)
    timelog_send_tracker_reminders = models.BooleanField(default=False)
    timelog_send_daily_report = models.BooleanField(default=False)
    timelog_report_roles = models.JSONField(default=list, blank=True)
    
    task_default_priority = models.CharField(max_length=20, default="medium")
    task_require_due_date = models.BooleanField(default=False)
    task_allow_subtasks = models.BooleanField(default=True)
    task_auto_assign_creator = models.BooleanField(default=True)
    
    task_reminder_before_days = models.IntegerField(default=0)
    task_reminder_on_due_day = models.BooleanField(default=True)
    task_reminder_after_days = models.IntegerField(default=0)
    task_default_status_filter = models.CharField(max_length=50, default="incomplete")
    task_board_default_length = models.IntegerField(default=10)
    task_client_visible_fields = models.JSONField(default=default_task_client_visible_fields, blank=True)
    
    module_crm_enabled = models.BooleanField(default=True)
    module_hr_enabled = models.BooleanField(default=True)
    module_finance_enabled = models.BooleanField(default=True)
    module_projects_enabled = models.BooleanField(default=True)
    module_attendance_enabled = models.BooleanField(default=True)
    module_tickets_enabled = models.BooleanField(default=True)
    module_events_enabled = models.BooleanField(default=True)
    module_notice_board_enabled = models.BooleanField(default=True)
    
    custom_links = models.JSONField(default=list, blank=True)
    
    trial_ends_at = models.DateTimeField(null=True, blank=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = CompanyQuerySet.as_manager()

    class Meta:
        ordering = ("name",)
        indexes = [
            models.Index(fields=("status", "trial_ends_at")),
        ]

    def __str__(self):
        return self.name
        
    def is_day_off(self, target_date):
        import math
        weekday = str(target_date.weekday())
        policy = self.weekend_policy.get(weekday, [])
        if "all" in policy:
            return True
        if not policy:
            return False
            
        # Calculate week number of the month for this specific weekday
        # e.g. 1st Saturday, 2nd Saturday
        day_of_month = target_date.day
        week_num = str(math.ceil(day_of_month / 7))
        
        return week_num in policy

    @property
    def is_trial_active(self):
        return (
            self.status == self.Status.TRIAL
            and self.trial_ends_at is not None
            and self.trial_ends_at >= timezone.now()
        )

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = self._generate_unique_slug()
        super().save(*args, **kwargs)

    def _generate_unique_slug(self):
        base_slug = slugify(self.name) or "company"
        slug = base_slug
        counter = 2

        while type(self).objects.exclude(pk=self.pk).filter(slug=slug).exists():
            slug = f"{base_slug}-{counter}"
            counter += 1

        return slug

class PlatformSettings(models.Model):
    """Global configuration settings for the entire SaaS platform."""
    maintenance_mode = models.BooleanField(default=False, help_text="Disable tenant access when true")
    allow_new_registrations = models.BooleanField(default=True)
    require_email_verification = models.BooleanField(default=False)
    
    # Feature flags
    enable_ai_features = models.BooleanField(default=True)
    enable_custom_domains = models.BooleanField(default=False)
    
    # Keys / Configs (In reality, these should be encrypted or in env vars, but this is for demo UI)
    stripe_public_key = models.CharField(max_length=255, blank=True)
    support_email = models.EmailField(default='support@crm.estgrp.in')
    
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Platform Settings"

    def __str__(self):
        return "Global Platform Settings"

    @classmethod
    def get_settings(cls):
        obj, created = cls.objects.get_or_create(id=1)
        return obj
