from rest_framework import serializers
from django.db import models

from .models import Company


class CompanySerializer(serializers.ModelSerializer):
    is_trial_active = serializers.BooleanField(read_only=True)

    class Meta:
        model = Company
        fields = (
            "id",
            "name",
            "slug",
            "status",
            "trial_ends_at",
            "is_trial_active",
            "created_at",
            "currency",
            "domain",
            "address_line1",
            "address_line2",
            "city",
            "state",
            "postal_code",
            "country",
            "timezone",
            "date_format",
            "time_format",
            "language",
            "datatable_row_limit",
            "employee_can_export_data",
            "allow_client_signup",
            "need_admin_approval_after_client_signup",
            "stripe_public_key",
            "stripe_secret_key",
            "paypal_client_id",
            "paypal_secret",
            "invoice_prefix",
            "quote_prefix",
            "default_tax_rate",
            "payment_terms",
            "invoice_logo",
            "authorised_signatory_signature",
            "invoice_language",
            "invoice_due_after_days",
            "send_reminder_before_days",
            "send_reminder_after_days",
            "show_tax_number_on_invoice",
            "hsn_sac_code_show",
            "show_tax_calculation_message",
            "show_status_on_invoice",
            "show_authorised_signatory",
            "show_client_name",
            "show_client_company_name",
            "show_client_email",
            "show_client_phone",
            "show_client_address",
            "show_project_on_invoice",
            "invoice_template",
            "invoice_terms",
            "invoice_other_information",
            "contract_prefix",
            "contract_number_separator",
            "contract_number_digits",
            "tax_id",
            "tax_id_label",
            "taxes",
            "ticket_prefix",
            "default_ticket_priority",
            "allow_customer_portal_tickets",
            "ticket_visibility_setting",
            "ticket_agents",
            "ticket_groups",
            "ticket_types",
            "ticket_channels",
            "ticket_reply_templates",
            "ticket_round_robin",
            "project_prefix",
            "default_project_view",
            "require_project_approval",
            "project_send_reminder",
            "project_statuses",
            "project_categories",
            "office_start_time",
            "office_end_time",
            "late_mark_after_minutes",
            "allow_shift_change_request",
            "save_clock_in_location",
            "allow_self_clock_in",
            "auto_clock_in_first_sign_in",
            "clock_in_location_radius_check",
            "allow_clock_in_outside_shift",
            "clock_in_ip_address_check",
            "send_monthly_attendance_report",
            "email_report_role",
            "week_starts_from",
            "attendance_reminder_status",
            "employee_shifts",
            "weekend_policy",
            "shift_rotations",
            "automated_shifts",
            "default_leave_quota",
            "allow_half_day_leaves",
            "require_leave_approval",
            "leave_count_from",
            "reporting_manager_leave_approval_role",
            "leave_types",
            "allow_employee_invite",
            "default_new_user_role",
            "roles",
            "lead_prefix",
            "default_lead_status",
            "lead_assignment_round_robin",
            "lead_sources",
            "lead_pipelines",
            "deal_agents",
            "deal_categories",
            "lead_round_robin_agents",
            "require_time_log_approval",
            "allow_manual_time_entry",
            "default_billable_rate",
            "timelog_stop_timer_after_shift",
            "timelog_send_tracker_reminders",
            "timelog_send_daily_report",
            "timelog_report_roles",
            "task_default_priority",
            "task_require_due_date",
            "task_allow_subtasks",
            "task_auto_assign_creator",
            "task_reminder_before_days",
            "task_reminder_on_due_day",
            "task_reminder_after_days",
            "task_default_status_filter",
            "task_board_default_length",
            "task_client_visible_fields",
            "module_crm_enabled",
            "module_hr_enabled",
            "module_finance_enabled",
            "module_projects_enabled",
            "module_attendance_enabled",
            "module_tickets_enabled",
            "module_events_enabled",
            "module_notice_board_enabled",
        )
        read_only_fields = ("id", "slug", "status", "trial_ends_at", "is_trial_active", "created_at")

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        roles_data = ret.get("roles") or []
        # Calculate real member counts from the database
        users = instance.users.all()
        
        # Update the members count for matching roles
        for r in roles_data:
            role_id = r.get("id")
            if not role_id:
                continue
                
            if role_id == "admin":
                r["members"] = users.filter(models.Q(role="admin") | models.Q(role="owner")).count()
            elif role_id == "manager":
                r["members"] = users.filter(models.Q(role="manager") | models.Q(can_manage_team=True)).count()
            elif role_id == "employee":
                r["members"] = users.filter(role__in=["staff", "employee"]).count()
            elif role_id == "client":
                r["members"] = users.filter(role__in=["customer", "client"]).count()
            else:
                r["members"] = users.filter(role=role_id).count()

        ret["roles"] = roles_data

        # Security: mask secret keys if they exist
        if ret.get("stripe_secret_key"):
            secret = ret["stripe_secret_key"]
            if len(secret) > 8:
                ret["stripe_secret_key"] = f"{secret[:7]}***{secret[-4:]}"
            else:
                ret["stripe_secret_key"] = "********"
                
        if ret.get("paypal_secret"):
            secret = ret["paypal_secret"]
            if len(secret) > 8:
                ret["paypal_secret"] = f"{secret[:4]}***{secret[-4:]}"
            else:
                ret["paypal_secret"] = "********"

        return ret
