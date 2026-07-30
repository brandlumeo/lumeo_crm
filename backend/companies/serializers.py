from rest_framework import serializers
from django.db import models

from .models import Company, Unit, PaymentMethod, InvoiceSettings

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
            "company_email",
            "company_website",
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
            "razorpay_key_id",
            "razorpay_key_secret",
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
            "deal_pipelines",
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
            "custom_links",
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

class UnitSerializer(serializers.ModelSerializer):
    class Meta:
        model = Unit
        fields = '__all__'
        read_only_fields = ('company',)

class PaymentMethodSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentMethod
        fields = '__all__'
        read_only_fields = ('company',)

class InvoiceSettingsSerializer(serializers.ModelSerializer):
    invoice_logo = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    authorised_signatory_signature = serializers.CharField(required=False, allow_null=True, allow_blank=True)

    class Meta:
        model = InvoiceSettings
        fields = '__all__'
        read_only_fields = ('company',)

    def _get_absolute_url(self, stored_url):
        """Return the correct public URL for a stored logo/signature value.

        - If the stored value is already an absolute http/https URL (e.g. an S3 URL),
          return it unchanged — calling build_absolute_uri on it would prepend the
          backend domain a second time and break the link.
        - If it looks like a legacy relative /media/... path, prefix it with the
          backend origin so the browser can fetch it.
        - Otherwise return as-is.
        """
        if not stored_url:
            return None
        if stored_url.startswith(('http://', 'https://')):
            # Already a fully-qualified URL (S3, Supabase, CDN, etc.) — don't touch it.
            return stored_url
        # Legacy relative path — build a full URL from the current request.
        request = self.context.get('request')
        if request is not None:
            return request.build_absolute_uri(stored_url)
        return stored_url

    def _normalize_url(self, url):
        """Normalise a URL before saving it to the database.

        - External http/https URLs (S3, Supabase, etc.) are stored exactly as provided.
        - data: URIs (base64 inline images) are stored as-is.
        - Legacy absolute URLs pointing to our own /media/ path are stored as just
          the relative path so they stay portable across domain changes.
        - Anything else is stored unchanged.
        """
        if not url:
            return url
        if url.startswith('data:'):
            return url
        if url.startswith(('http://', 'https://')):
            from urllib.parse import urlparse
            parsed = urlparse(url)
            # Only strip the origin for old-style /media/ paths on our own backend.
            # External CDN / S3 URLs must be stored in full.
            if parsed.path.startswith('/media/'):
                return parsed.path
            # External URL (S3, Supabase, etc.) — store as-is.
            return url
        # Relative path — store as-is.
        return url

    def to_internal_value(self, data):
        ret = super().to_internal_value(data)
        # Normalize logo and signature URLs before saving to DB
        if 'invoice_logo' in ret:
            ret['invoice_logo'] = self._normalize_url(ret['invoice_logo'])
        if 'authorised_signatory_signature' in ret:
            ret['authorised_signatory_signature'] = self._normalize_url(ret['authorised_signatory_signature'])
        return ret

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        if ret.get('invoice_logo'):
            ret['invoice_logo'] = self._get_absolute_url(ret['invoice_logo'])
        if ret.get('authorised_signatory_signature'):
            ret['authorised_signatory_signature'] = self._get_absolute_url(ret['authorised_signatory_signature'])
        return ret



class PublicInvoiceSettingsSerializer(serializers.ModelSerializer):
    invoice_logo = serializers.SerializerMethodField()
    authorised_signatory_signature = serializers.SerializerMethodField()

    class Meta:
        model = InvoiceSettings
        # Exclude internal configs like reminder sweeps
        exclude = ('id', 'company', 'send_reminder_before_days', 'send_reminder_after_days')
        read_only_fields = [f.name for f in InvoiceSettings._meta.fields]

    def _get_absolute_url(self, stored_url):
        if not stored_url:
            return None
        # External URLs (S3, Supabase, CDN) are already fully-qualified — return as-is.
        if stored_url.startswith(('http://', 'https://')):
            return stored_url
        request = self.context.get('request')
        if request is not None:
            return request.build_absolute_uri(stored_url)
        return stored_url

    def get_invoice_logo(self, obj):
        return self._get_absolute_url(obj.invoice_logo)

    def get_authorised_signatory_signature(self, obj):
        return self._get_absolute_url(obj.authorised_signatory_signature)

