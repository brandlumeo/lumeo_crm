from django.contrib.auth.models import AbstractUser
from django.core.exceptions import ValidationError
from django.db import models

from companies.models import Company


class User(AbstractUser):
    class Role(models.TextChoices):
        OWNER = "owner", "Owner"
        ADMIN = "admin", "Primary Admin"
        MANAGER = "manager", "Secondary Admin"
        STAFF = "staff", "Staff"
        CUSTOMER = "customer", "Customer"

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="users",
        null=True,
        blank=True,
        help_text="Company workspace this user belongs to.",
    )
    role = models.CharField(
        max_length=50,
        default="employee",
        db_index=True,
    )
    avatar = models.URLField(
        max_length=512,
        null=True,
        blank=True,
        help_text="URL to the user's avatar image.",
    )
    timezone = models.CharField(
        max_length=50,
        default="UTC",
        help_text="User's preferred timezone.",
    )
    designation = models.CharField(max_length=100, blank=True, null=True, help_text="User's job title or designation.")
    department = models.CharField(max_length=100, blank=True, null=True, help_text="Department the user belongs to.")
    prefix = models.CharField(max_length=10, blank=True, null=True)
    mobile = models.CharField(max_length=20, blank=True, null=True)
    country = models.CharField(max_length=100, blank=True, null=True)
    language = models.CharField(max_length=50, blank=True, null=True)
    gender = models.CharField(max_length=20, blank=True, null=True)
    receive_email_notifications = models.BooleanField(default=True)
    enable_google_calendar = models.BooleanField(default=False)
    notify_new_lead = models.BooleanField(default=True)
    notify_deal_stage = models.BooleanField(default=True)
    notify_task_deadline = models.BooleanField(default=True)
    notify_workspace_updates = models.BooleanField(default=True)
    email_notifications = models.JSONField(default=dict, blank=True)
    slack_notifications = models.JSONField(default=dict, blank=True)
    push_notifications = models.JSONField(default=dict, blank=True)
    can_manage_team = models.BooleanField(
        default=False,
        help_text="Grant team management access to this staff member."
    )
    emergency_contacts = models.JSONField(default=list, blank=True)
    two_factor_enabled = models.BooleanField(
        default=False,
        help_text="Designates whether this user has two-factor authentication enabled."
    )
    two_factor_method = models.CharField(
        max_length=30,
        default="disabled",
        choices=[
            ("disabled", "Disabled"),
            ("email", "Email Code"),
            ("google_authenticator", "Google Authenticator"),
        ],
        help_text="The preferred method for two-factor authentication."
    )
    two_factor_secret = models.CharField(
        max_length=64,
        blank=True,
        null=True,
        help_text="The base32 secret key used for two-factor authentication."
    )
    two_factor_email_code = models.CharField(
        max_length=10,
        blank=True,
        null=True,
        help_text="The temporary code sent via email for two-factor verification."
    )
    two_factor_email_code_created = models.DateTimeField(
        blank=True,
        null=True,
        help_text="The timestamp when the temporary email code was generated."
    )

    class Meta:
        ordering = ("username",)

    def __str__(self):
        return self.get_full_name() or self.username

    @property
    def is_company_owner(self):
        return self.role == self.Role.OWNER

    @property
    def has_management_access(self):
        return self.role in [self.Role.OWNER, self.Role.ADMIN, self.Role.MANAGER] or self.can_manage_team

    def clean(self):
        super().clean()
        if not self.is_superuser and self.company_id is None:
            raise ValidationError(
                {"company": "A company is required for non-superuser accounts."}
            )

    def save(self, *args, **kwargs):
        if not self.two_factor_secret:
            import base64
            import secrets
            random_bytes = secrets.token_bytes(10)
            secret = base64.b32encode(random_bytes).decode("utf-8")
            self.two_factor_secret = secret.rstrip("=")
        self.full_clean()
        super().save(*args, **kwargs)


class TeamInvitation(models.Model):
    import uuid
    from datetime import timedelta
    from django.utils import timezone

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="invitations",
    )
    email = models.EmailField(db_index=True)
    first_name = models.CharField(max_length=150, blank=True, null=True)
    last_name = models.CharField(max_length=150, blank=True, null=True)
    designation = models.CharField(max_length=100, blank=True, null=True)
    department = models.CharField(max_length=100, blank=True, null=True)
    personal_message = models.TextField(blank=True, null=True)
    role = models.CharField(
        max_length=50,
        default="employee",
    )
    token = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    invited_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name="sent_invitations",
    )
    is_accepted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    class Meta:
        ordering = ("-created_at",)
        unique_together = ("company", "email")

    def __str__(self):
        return f"{self.email} -> {self.company.name} ({self.role})"

    def save(self, *args, **kwargs):
        if not self.expires_at:
            from datetime import timedelta
            from django.utils import timezone
            self.expires_at = timezone.now() + timedelta(days=7)
        super().save(*args, **kwargs)

    @property
    def is_expired(self):
        from django.utils import timezone
        return timezone.now() > self.expires_at
