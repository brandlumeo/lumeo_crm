from django.conf import settings
from django.core.exceptions import ValidationError
import uuid
from django.db import models
from django.utils import timezone

from companies.models import Company


def default_workflow_sequence_stop_statuses():
    return ["won", "lost"]


class ServiceCategory(models.Model):
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="service_categories",
    )
    name = models.CharField(max_length=255)
    color = models.CharField(max_length=50, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ("name",)
        indexes = [
            models.Index(fields=("company", "name")),
        ]

    def __str__(self):
        return self.name

class Lead(models.Model):
    class Status(models.TextChoices):
        NEW = "new", "New"
        CONTACTED = "contacted", "Contacted"
        QUALIFIED = "qualified", "Qualified"
        LOST = "lost", "Lost"
        WON = "won", "Won"

    class Quality(models.TextChoices):
        UNREVIEWED = "unreviewed", "Unreviewed"
        HIGH_QUALITY = "high_quality", "Good Quality"
        LOW_QUALITY = "low_quality", "Low Quality"

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="leads",
    )
    name = models.CharField(max_length=255)
    email = models.EmailField(db_index=True)
    mobile = models.CharField(max_length=20, null=True, blank=True)
    source = models.CharField(max_length=100, null=True, blank=True)
    status = models.CharField(
        max_length=50,
        default=Status.NEW,
        db_index=True,
    )
    quality = models.CharField(
        max_length=50,
        choices=Quality.choices,
        default=Quality.UNREVIEWED,
        db_index=True,
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="assigned_leads",
        null=True,
        blank=True,
    )
    deal = models.ForeignKey(
        "Deal",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="leads",
        help_text="The deal this lead was converted into or is linked to.",
    )
    created_at = models.DateTimeField(default=timezone.now, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    custom_data = models.JSONField(default=dict, blank=True)
    categories = models.ManyToManyField(ServiceCategory, related_name="leads", blank=True)
    
    score = models.IntegerField(null=True, blank=True, help_text="AI generated lead score (1-100)")
    score_rationale = models.TextField(null=True, blank=True, help_text="AI rationale for the score")

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=("company", "status")),
        ]

    def __str__(self):
        return self.name

    def clean(self):
        super().clean()
        if self.assigned_to_id and self.assigned_to.company_id != self.company_id:
            raise ValidationError(
                {"assigned_to": "Assigned user must belong to the same company."}
            )

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


class Customer(models.Model):
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="customers",
    )
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="customer_profile",
        help_text="Linked User account for Client Portal access."
    )
    name = models.CharField(max_length=255)
    email = models.EmailField(db_index=True)
    phone = models.CharField(max_length=20)
    currency = models.CharField(max_length=3, blank=True, default="", help_text="Preferred currency for quotes and invoices")
    tax_id = models.CharField(max_length=30, blank=True, default="", help_text="Client GSTIN (India), TRN (UAE) or other tax number")
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    custom_data = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ("name",)
        indexes = [
            models.Index(fields=("company", "email")),
        ]

    def __str__(self):
        return self.name


class Deal(models.Model):
    class Stage(models.TextChoices):
        PROSPECT = "prospect", "Prospect"
        QUALIFIED = "qualified", "Qualified"
        PROPOSAL = "proposal", "Proposal"
        NEGOTIATION = "negotiation", "Negotiation"
        WON = "won", "Won"
        LOST = "lost", "Lost"

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="deals",
    )
    title = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    stage = models.CharField(
        max_length=50,
        default=Stage.PROSPECT,
        db_index=True,
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    expected_close_date = models.DateField(null=True, blank=True, db_index=True)
    deal_category = models.CharField(max_length=100, null=True, blank=True)
    custom_data = models.JSONField(default=dict, blank=True)
    row_order = models.PositiveIntegerField(default=0, db_index=True)

    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="assigned_deals",
        null=True,
        blank=True,
    )

    class Meta:
        ordering = ("row_order", "-created_at")
        indexes = [
            models.Index(fields=("company", "stage")),
            models.Index(fields=("company", "row_order")),
        ]

    def __str__(self):
        return self.title

    def clean(self):
        super().clean()
        if self.assigned_to_id and self.assigned_to.company_id != self.company_id:
            raise ValidationError(
                {"assigned_to": "Assigned user must belong to the same company."}
            )

    def save(self, *args, **kwargs):
        self.full_clean()
        if not self.pk and self.row_order == 0:
            max_order = Deal.objects.filter(
                company=self.company, stage=self.stage
            ).aggregate(models.Max("row_order"))["row_order__max"]
            self.row_order = (max_order or 0) + 1
        super().save(*args, **kwargs)



class Project(models.Model):
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="projects",
    )
    name = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    customer = models.ForeignKey(
        "Customer",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="projects",
    )
    deal = models.ForeignKey(
        "Deal",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="projects",
    )
    
    start_date = models.DateField(null=True, blank=True, db_index=True)
    deadline = models.DateField(null=True, blank=True, db_index=True)
    
    status = models.CharField(max_length=50, default="not started", db_index=True)
    category = models.CharField(max_length=100, null=True, blank=True)
    
    members = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name="assigned_projects",
        blank=True,
    )
    
    progress = models.IntegerField(default=0, help_text="0 to 100")
    custom_data = models.JSONField(default=dict, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=("company", "status")),
        ]

    def __str__(self):
        return self.name

    @property
    def calculated_progress(self):
        total_tasks = self.tasks.count()
        if total_tasks == 0:
            return self.progress
        completed_tasks = self.tasks.filter(status="done").count()
        return int((completed_tasks / total_tasks) * 100)


class Task(models.Model):
    class Status(models.TextChoices):
        TODO = "todo", "To Do"
        IN_PROGRESS = "in_progress", "In Progress"
        DONE = "done", "Done"

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="tasks",
    )
    title = models.CharField(max_length=255)
    due_date = models.DateField()
    status = models.CharField(
        max_length=50,
        choices=Status.choices,
        default=Status.TODO,
        db_index=True,
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="assigned_tasks",
        null=True,
        blank=True,
    )
    lead = models.ForeignKey(
        "Lead",
        on_delete=models.SET_NULL,
        related_name="tasks",
        null=True,
        blank=True,
    )
    deal = models.ForeignKey(
        "Deal",
        on_delete=models.SET_NULL,
        related_name="tasks",
        null=True,
        blank=True,
    )
    customer = models.ForeignKey(
        "Customer",
        on_delete=models.SET_NULL,
        related_name="tasks",
        null=True,
        blank=True,
    )
    project = models.ForeignKey(
        "Project",
        on_delete=models.SET_NULL,
        related_name="tasks",
        null=True,
        blank=True,
    )
    workflow_step_run = models.ForeignKey(
        "WorkflowStepRun",
        on_delete=models.SET_NULL,
        related_name="tasks",
        null=True,
        blank=True,
    )
    row_order = models.PositiveIntegerField(default=0, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("row_order", "due_date", "title")
        indexes = [
            models.Index(fields=("company", "due_date")),
            models.Index(fields=("company", "status")),
        ]

    def __str__(self):
        return self.title

    def clean(self):
        super().clean()
        if self.assigned_to_id and self.assigned_to.company_id != self.company_id:
            raise ValidationError(
                {"assigned_to": "Assigned user must belong to the same company."}
            )
        linked_objects = {
            "lead": self.lead,
            "deal": self.deal,
            "customer": self.customer,
        }
        populated_links = [name for name, value in linked_objects.items() if value is not None]
        if len(populated_links) > 1:
            raise ValidationError(
                "A task can be linked to at most one of Lead, Deal, or Customer."
            )
        for field_name, record in linked_objects.items():
            if record is not None and record.company_id != self.company_id:
                raise ValidationError(
                    {field_name: f"Linked {field_name} must belong to the same company."}
                )
        if self.workflow_step_run_id and self.workflow_step_run.company_id != self.company_id:
            raise ValidationError(
                {"workflow_step_run": "Workflow step run must belong to the same company."}
            )

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


class Note(models.Model):
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="notes",
    )
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self):
        snippet = self.content[:40].strip()
        return snippet or f"Note {self.pk}"

class Activity(models.Model):
    class ActivityType(models.TextChoices):
        CALL = "call", "Call"
        MEETING = "meeting", "Meeting"
        EMAIL = "email", "Email"
        NOTE = "note", "Note"
        STATUS_CHANGE = "status_change", "Status Change"

    class CallOutcome(models.TextChoices):
        CONNECTED = "connected", "Connected"
        NOT_CONNECTED = "not_connected", "Not Connected"

    class CallReason(models.TextChoices):
        NO_ANSWER = "no_answer", "No Answer"
        SWITCHED_OFF = "switched_off", "Switched Off"
        BUSY = "busy", "Busy"
        WRONG_NUMBER = "wrong_number", "Wrong Number"
        INVALID_NUMBER = "invalid_number", "Invalid Number"
        OTHER = "other", "Other"


    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="activities",
    )
    lead = models.ForeignKey(Lead, on_delete=models.CASCADE, related_name="activities", null=True, blank=True)
    deal = models.ForeignKey(Deal, on_delete=models.CASCADE, related_name="activities", null=True, blank=True)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name="activities", null=True, blank=True)
    project = models.ForeignKey("Project", on_delete=models.CASCADE, related_name="activities", null=True, blank=True)
    
    activity_type = models.CharField(
        max_length=50,
        choices=ActivityType.choices,
        db_index=True,
    )
    description = models.TextField()
    call_outcome = models.CharField(max_length=20, choices=CallOutcome.choices, null=True, blank=True, db_index=True)
    call_reason = models.CharField(max_length=20, choices=CallReason.choices, null=True, blank=True, db_index=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_activities",
    )
    is_pinned = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=("company", "activity_type")),
        ]

    def clean(self):
        super().clean()
        linked_objects = [self.lead_id, self.deal_id, self.customer_id]
        if sum(x is not None for x in linked_objects) != 1:
            raise ValidationError("An activity must be linked to exactly one of Lead, Deal, or Customer.")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


def attachment_upload_path(instance, filename):
    return f"attachments/company_{instance.company_id}/{filename}"


class Attachment(models.Model):
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="attachments",
    )
    lead = models.ForeignKey(Lead, on_delete=models.CASCADE, related_name="attachments", null=True, blank=True)
    deal = models.ForeignKey(Deal, on_delete=models.CASCADE, related_name="attachments", null=True, blank=True)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name="attachments", null=True, blank=True)
    
    file = models.FileField(upload_to=attachment_upload_path)
    file_name = models.CharField(max_length=255)
    file_size = models.PositiveIntegerField(help_text="File size in bytes")
    content_type = models.CharField(max_length=100, blank=True)
    
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="uploaded_attachments",
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=("company", "created_at")),
        ]

    def clean(self):
        super().clean()
        linked_objects = [self.lead_id, self.deal_id, self.customer_id]
        if sum(x is not None for x in linked_objects) > 1:
            raise ValidationError("An attachment cannot be linked to more than one of Lead, Deal, or Customer.")

    def save(self, *args, **kwargs):
        if self.file and not self.file_name:
            self.file_name = self.file.name.split("/")[-1]
        if self.file and not self.file_size:
            self.file_size = self.file.size
        self.full_clean()
        super().save(*args, **kwargs)


class Product(models.Model):
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="products",
    )
    name = models.CharField(max_length=255)
    sku = models.CharField(max_length=100, blank=True)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0.00, help_text="Tax rate in percentage (e.g., 18.00)")
    hsn_sac_code = models.CharField(max_length=50, blank=True, null=True)
    unit = models.CharField(max_length=50, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=("company", "is_active")),
        ]

    def __str__(self):
        return f"{self.name} ({self.price})"


TAX_REGIME_CHOICES = [("in_gst", "India GST"), ("ae_vat", "UAE VAT"), ("generic", "Generic tax")]
SUPPLY_TYPE_CHOICES = [("intra", "Intra-state (CGST + SGST)"), ("inter", "Inter-state (IGST)")]
TAX_CATEGORY_CHOICES = [("standard", "Standard"), ("zero", "Zero-rated / Nil"), ("exempt", "Exempt")]


class SalesTaxMixin(models.Model):
    """Regime-aware tax for documents we issue to clients (quotes, invoices).

    Mirrors the bill tax setup: India GST (CGST+SGST or IGST), UAE VAT, or a
    generic single tax, with optional reverse charge (the client accounts for
    the tax, so it is shown but not charged).
    """

    tax_regime = models.CharField(max_length=10, choices=TAX_REGIME_CHOICES, default="generic")
    customer_tax_id = models.CharField(max_length=30, blank=True, default="", help_text="Client GSTIN (India), TRN (UAE) or other tax number")
    place_of_supply = models.CharField(max_length=100, blank=True, default="")
    supply_type = models.CharField(max_length=10, choices=SUPPLY_TYPE_CHOICES, default="intra")
    reverse_charge = models.BooleanField(default=False, help_text="Client self-accounts the tax; it is not charged on this document")
    reverse_charge_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    cgst_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    sgst_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    igst_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)

    class Meta:
        abstract = True

    def apply_tax_totals(self, items):
        """Set subtotal, tax split, reverse charge and total from line items."""
        from decimal import Decimal, ROUND_HALF_UP
        two = Decimal("0.01")
        zero = Decimal("0")
        subtotal = zero
        tax = zero
        for item in items:
            if getattr(item, "is_included", False):
                continue
            line = Decimal(str(item.quantity or 0)) * Decimal(str(item.unit_price or 0))
            subtotal += line
            if getattr(item, "tax_category", "") not in ("zero", "exempt"):
                tax += line * Decimal(str(item.tax_rate or 0)) / 100
        subtotal = subtotal.quantize(two, ROUND_HALF_UP)
        tax = tax.quantize(two, ROUND_HALF_UP)

        self.subtotal = subtotal
        self.cgst_amount = self.sgst_amount = self.igst_amount = zero
        if self.reverse_charge:
            self.reverse_charge_amount = tax
            self.tax_amount = zero
        else:
            self.reverse_charge_amount = zero
            self.tax_amount = tax
            if self.tax_regime == "in_gst":
                if self.supply_type == "inter":
                    self.igst_amount = tax
                else:
                    half = (tax / 2).quantize(two, ROUND_HALF_UP)
                    self.cgst_amount, self.sgst_amount = half, tax - half
        self.total = self.subtotal + self.tax_amount


class Quote(SalesTaxMixin, models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        SENT = "sent", "Sent"
        ACCEPTED = "accepted", "Accepted"
        DECLINED = "declined", "Declined"
        EXPIRED = "expired", "Expired"

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="quotes",
    )
    deal = models.ForeignKey(
        "Deal",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="quotes",
    )
    customer = models.ForeignKey(
        "Customer",
        on_delete=models.CASCADE,
        related_name="quotes",
        null=True,
        blank=True,
    )
    lead = models.ForeignKey(
        "Lead",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="quotes",
    )
    client_name = models.CharField(max_length=255, blank=True, default="")
    client_address = models.TextField(blank=True, default="")
    client_phone = models.CharField(max_length=50, blank=True, default="")
    duration = models.CharField(max_length=100, blank=True, default="1 Month")
    overview = models.TextField(blank=True, default="", help_text="Executive overview paragraph")
    payment_schedule = models.JSONField(default=list, blank=True, help_text="List of milestones: [{milestone: str, amount: float}]")
    timeline = models.JSONField(default=list, blank=True, help_text="List of phases: [{phase: str, description: str}]")
    client_responsibilities = models.JSONField(default=list, blank=True, help_text="List of client requirement strings")
    exclusions = models.JSONField(default=list, blank=True, help_text="List of exclusion strings")
    terms_conditions = models.JSONField(default=list, blank=True, help_text="List of contract term strings")
    quote_number = models.CharField(max_length=50, unique=True, db_index=True)
    title = models.CharField(max_length=255)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
    )
    valid_until = models.DateField(null=True, blank=True)
    is_locked = models.BooleanField(default=False, help_text="If True, the quote is read-only")
    content = models.TextField(blank=True, help_text="HTML content of the contract/proposal")
    currency = models.CharField(max_length=3, blank=True, null=True, help_text='3-letter currency code')
    exchange_rate = models.DecimalField(max_digits=18, decimal_places=6, default=1, help_text="Base-currency units per 1 unit of this document's currency")
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)

    public_token = models.UUIDField(default=uuid.uuid4, editable=False)
    signature_data = models.TextField(blank=True, null=True)
    signed_at = models.DateTimeField(blank=True, null=True)
    signed_by_name = models.CharField(max_length=255, blank=True)
    signed_by_ip = models.GenericIPAddressField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self):
        return f"{self.quote_number} - {self.title}"

    def calculate_totals(self):
        self.apply_tax_totals(self.items.all())
        self.save()


class QuoteLineItem(models.Model):
    quote = models.ForeignKey(
        Quote,
        on_delete=models.CASCADE,
        related_name="items",
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    parent = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="sub_items",
    )
    item_number = models.CharField(max_length=20, blank=True, default="1")
    is_included = models.BooleanField(default=False, help_text="If True, marked as included under parent package")
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    hsn_sac_code = models.CharField(max_length=50, blank=True, null=True)
    unit = models.CharField(max_length=50, blank=True, null=True)
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    tax_category = models.CharField(max_length=10, choices=TAX_CATEGORY_CHOICES, blank=True, default="")

    @property
    def subtotal(self):
        if self.is_included:
            return 0
        return self.unit_price * self.quantity

    @property
    def tax_amount(self):
        if self.is_included or self.tax_category in ("zero", "exempt"):
            return 0
        return self.subtotal * (self.tax_rate / 100)

    @property
    def total(self):
        return self.subtotal + self.tax_amount

    def __str__(self):
        return f"{self.name} x {self.quantity}"


class QuoteTemplate(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="quote_templates",
    )
    name = models.CharField(max_length=255, help_text="Template display name (e.g. Growth Package, Standard Retainer, Supply Order)")
    title = models.CharField(max_length=255, blank=True, default="")
    duration = models.CharField(max_length=100, blank=True, default="1 Month")
    overview = models.TextField(blank=True, default="", help_text="Executive overview paragraph")
    items = models.JSONField(default=list, blank=True, help_text="Template deliverables and line items")
    payment_schedule = models.JSONField(default=list, blank=True, help_text="List of milestones: [{milestone: str, amount: float}]")
    timeline = models.JSONField(default=list, blank=True, help_text="List of phases: [{phase: str, description: str}]")
    client_responsibilities = models.JSONField(default=list, blank=True, help_text="List of client requirement strings")
    exclusions = models.JSONField(default=list, blank=True, help_text="List of exclusion strings")
    terms_conditions = models.JSONField(default=list, blank=True, help_text="List of contract term strings")
    is_default = models.BooleanField(default=False, help_text="If True, auto-loaded when creating quote from lead")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-is_default", "name")

    def __str__(self):
        return f"{self.company.name} - {self.name}"


class Invoice(SalesTaxMixin, models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        SENT = "sent", "Sent"
        PAID = "paid", "Paid"
        PARTIALLY_PAID = "partially_paid", "Partially Paid"
        OVERDUE = "overdue", "Overdue"
        VOID = "void", "Void"

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="invoices",
    )
    deal = models.ForeignKey(
        "Deal",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="invoices",
    )
    customer = models.ForeignKey(
        "Customer",
        on_delete=models.CASCADE,
        related_name="invoices",
    )
    invoice_number = models.CharField(max_length=50, unique=True, db_index=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
    )
    issue_date = models.DateField(auto_now_add=True)
    due_date = models.DateField(null=True, blank=True)
    currency = models.CharField(max_length=3, blank=True, null=True, help_text='3-letter currency code')
    exchange_rate = models.DecimalField(max_digits=18, decimal_places=6, default=1, help_text="Base-currency units per 1 unit of this document's currency")
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)

    public_token = models.UUIDField(default=uuid.uuid4, editable=False)
    signature_data = models.TextField(blank=True, null=True)
    signed_at = models.DateTimeField(blank=True, null=True)
    signed_by_name = models.CharField(max_length=255, blank=True)
    signed_by_ip = models.GenericIPAddressField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    notes = models.TextField(blank=True, null=True)
    terms = models.TextField(blank=True, null=True)


    class Meta:
        ordering = ("-created_at",)

    def __str__(self):
        return f"{self.invoice_number} ({self.total})"

    def calculate_totals(self):
        self.apply_tax_totals(self.items.all())
        self.save()

    @property
    def amount_paid(self):
        return sum(payment.amount for payment in self.payments.all())

    @property
    def amount_due(self):
        return self.total - self.amount_paid


class InvoiceLineItem(models.Model):
    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.CASCADE,
        related_name="items",
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    hsn_sac_code = models.CharField(max_length=50, blank=True, null=True)
    unit = models.CharField(max_length=50, blank=True, null=True)
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    tax_category = models.CharField(max_length=10, choices=TAX_CATEGORY_CHOICES, blank=True, default="")

    @property
    def subtotal(self):
        return self.unit_price * self.quantity

    @property
    def tax_amount(self):
        if self.tax_category in ("zero", "exempt"):
            return 0
        return self.subtotal * (self.tax_rate / 100)

    @property
    def total(self):
        return self.subtotal + self.tax_amount

    def __str__(self):
        return f"{self.name} x {self.quantity}"


class InvoicePayment(models.Model):
    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.CASCADE,
        related_name="payments",
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_date = models.DateField(auto_now_add=True)
    payment_method = models.CharField(max_length=50)
    transaction_id = models.CharField(max_length=255, blank=True, null=True)
    receipt_number = models.CharField(max_length=50, blank=True, null=True, unique=True, db_index=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self):
        return f"{self.receipt_number} - {self.amount}"


class CustomFieldDefinition(models.Model):
    class FieldType(models.TextChoices):
        TEXT = "text", "Text"
        NUMBER = "number", "Number"
        BOOLEAN = "boolean", "Boolean"
        DATE = "date", "Date"
        
    class ModelName(models.TextChoices):
        LEAD = "lead", "Lead"
        CUSTOMER = "customer", "Customer"
        DEAL = "deal", "Deal"

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="custom_field_definitions",
    )
    model_name = models.CharField(max_length=50, choices=ModelName.choices)
    name = models.CharField(max_length=100)
    label = models.CharField(max_length=100)
    field_type = models.CharField(max_length=50, choices=FieldType.choices, default=FieldType.TEXT)
    required = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("company", "model_name", "name")
        ordering = ("label",)

    def __str__(self):
        return f"{self.company.name} - {self.model_name} - {self.label}"


class WorkflowRule(models.Model):
    class TriggerEvent(models.TextChoices):
        DEAL_WON = "deal_won", "Deal Stage = Won"
        DEAL_LOST = "deal_lost", "Deal Stage = Lost"
        LEAD_QUALIFIED = "lead_qualified", "Lead Status = Qualified"

    class ActionType(models.TextChoices):
        CREATE_TASK = "create_task", "Create Task"
        SEND_NOTIFICATION = "send_notification", "Send Notification"

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="workflow_rules",
    )
    name = models.CharField(max_length=255)
    trigger_event = models.CharField(max_length=50, choices=TriggerEvent.choices)
    action_type = models.CharField(max_length=50, choices=ActionType.choices)
    action_payload = models.JSONField(
        default=dict,
        blank=True,
        help_text="Configuration payload (e.g., {'task_title': '...', 'due_days_offset': 3})"
    )
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self):
        return f"{self.company.name} - {self.name} ({self.get_trigger_event_display()})"


class WorkflowSequence(models.Model):
    class TriggerEvent(models.TextChoices):
        LEAD_CREATED = "lead_created", "Lead Created"
        LEAD_QUALIFIED = "lead_qualified", "Lead Qualified"

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="workflow_sequences",
    )
    name = models.CharField(max_length=255)
    trigger_event = models.CharField(max_length=50, choices=TriggerEvent.choices)
    stop_on_statuses = models.JSONField(
        default=default_workflow_sequence_stop_statuses,
        blank=True,
        help_text="Lead statuses that should stop active runs for this sequence.",
    )
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self):
        return f"{self.company.name} - {self.name} ({self.get_trigger_event_display()})"


class WorkflowStep(models.Model):
    class ActionType(models.TextChoices):
        CREATE_TASK = "create_task", "Create Task"
        SEND_NOTIFICATION = "send_notification", "Send Notification"
        SEND_EMAIL = "send_email", "Send Email"

    sequence = models.ForeignKey(
        WorkflowSequence,
        on_delete=models.CASCADE,
        related_name="steps",
    )
    order = models.PositiveIntegerField()
    delay_minutes = models.PositiveIntegerField(
        default=0,
        help_text="Delay after the previous step before this step becomes due.",
    )
    action_type = models.CharField(max_length=50, choices=ActionType.choices)
    action_payload = models.JSONField(default=dict, blank=True)
    email_template = models.ForeignKey(
        "EmailTemplate",
        on_delete=models.SET_NULL,
        related_name="workflow_steps",
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("order", "id")
        unique_together = ("sequence", "order")

    def __str__(self):
        return f"{self.sequence.name} - Step {self.order} ({self.get_action_type_display()})"


class WorkflowRun(models.Model):
    class RecordType(models.TextChoices):
        LEAD = "lead", "Lead"
        DEAL = "deal", "Deal"
        CUSTOMER = "customer", "Customer"

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        COMPLETED = "completed", "Completed"
        STOPPED = "stopped", "Stopped"
        FAILED = "failed", "Failed"

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="workflow_runs",
    )
    sequence = models.ForeignKey(
        WorkflowSequence,
        on_delete=models.CASCADE,
        related_name="runs",
    )
    record_type = models.CharField(max_length=50, choices=RecordType.choices)
    record_id = models.PositiveIntegerField(db_index=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ACTIVE,
        db_index=True,
    )
    stop_reason = models.CharField(max_length=255, blank=True)
    last_error = models.TextField(blank=True)
    started_at = models.DateTimeField(auto_now_add=True, db_index=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    stopped_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ("-started_at",)
        indexes = [
            models.Index(fields=("company", "status")),
            models.Index(fields=("company", "record_type", "record_id")),
        ]

    def __str__(self):
        return f"{self.sequence.name} - {self.record_type}:{self.record_id} ({self.status})"

    def clean(self):
        super().clean()
        if self.sequence_id and self.sequence.company_id != self.company_id:
            raise ValidationError(
                {"sequence": "Sequence must belong to the same company as the run."}
            )


class WorkflowStepRun(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        IN_PROGRESS = "in_progress", "In Progress"
        COMPLETED = "completed", "Completed"
        FAILED = "failed", "Failed"
        CANCELLED = "cancelled", "Cancelled"

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="workflow_step_runs",
    )
    run = models.ForeignKey(
        WorkflowRun,
        on_delete=models.CASCADE,
        related_name="step_runs",
    )
    step = models.ForeignKey(
        WorkflowStep,
        on_delete=models.CASCADE,
        related_name="step_runs",
    )
    due_at = models.DateTimeField(db_index=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )
    attempts = models.PositiveIntegerField(default=0)
    last_error = models.TextField(blank=True)
    executed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("due_at", "id")
        unique_together = ("run", "step")
        indexes = [
            models.Index(fields=("company", "status", "due_at")),
        ]

    def __str__(self):
        return f"{self.run} - Step {self.step.order} ({self.status})"

    def clean(self):
        super().clean()
        if self.run_id and self.run.company_id != self.company_id:
            raise ValidationError(
                {"run": "Workflow run must belong to the same company."}
            )
        if self.step_id and self.step.sequence_id != self.run.sequence_id:
            raise ValidationError(
                {"step": "Workflow step must belong to the same sequence as the run."}
            )


class SMTPConfig(models.Model):
    company = models.OneToOneField(Company, on_delete=models.CASCADE, related_name="smtp_config")
    host = models.CharField(max_length=255)
    port = models.PositiveIntegerField(default=587)
    username = models.CharField(max_length=255)
    password = models.CharField(max_length=255, help_text="Stored as encrypted vault string")
    use_tls = models.BooleanField(default=True)
    from_email = models.EmailField()

    class Meta:
        ordering = ("id",)

    def __str__(self):
        return f"SMTP for {self.company.name} ({self.host})"


class EmailTemplate(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="email_templates")
    name = models.CharField(max_length=255)
    subject = models.CharField(max_length=255)
    body_content = models.TextField(help_text="Supports template parsing tags")

    class Meta:
        ordering = ("name",)

    def __str__(self):
        return f"{self.name} ({self.company.name})"


class WebhookSubscription(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="webhooks")
    target_url = models.URLField()
    secret_token = models.CharField(max_length=255)
    event_triggers = models.JSONField(default=list, help_text="List of events e.g., ['deal.won']")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.company.name} - {self.target_url}"


class WebhookDeliveryLog(models.Model):
    subscription = models.ForeignKey(WebhookSubscription, on_delete=models.CASCADE, related_name="logs")
    event_type = models.CharField(max_length=100)
    payload = models.JSONField()
    response_status = models.IntegerField(null=True, blank=True)
    response_body = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-timestamp",)

    def __str__(self):
        return f"{self.event_type} -> {self.response_status} ({self.timestamp})"

class EmailAccount(models.Model):
    class Provider(models.TextChoices):
        GOOGLE = "google", "Google Workspace"
        OUTLOOK = "outlook", "Microsoft Outlook"
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="email_accounts")
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="email_accounts")
    provider = models.CharField(max_length=50, choices=Provider.choices)
    email_address = models.EmailField()
    access_token = models.TextField()
    refresh_token = models.TextField(blank=True)
    token_expires_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    
    sync_state_id = models.CharField(max_length=255, null=True, blank=True)
    subscription_id = models.CharField(max_length=255, null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ("user", "email_address")
        
    def __str__(self):
        return f"{self.email_address} ({self.provider})"


class EmailMessage(models.Model):
    class Direction(models.TextChoices):
        INBOUND = "inbound", "Inbound"
        OUTBOUND = "outbound", "Outbound"
        
    account = models.ForeignKey(EmailAccount, on_delete=models.CASCADE, related_name="messages")
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="email_messages")
    lead = models.ForeignKey('Lead', on_delete=models.SET_NULL, null=True, blank=True, related_name="emails")
    customer = models.ForeignKey('Customer', on_delete=models.SET_NULL, null=True, blank=True, related_name="emails")
    deal = models.ForeignKey('Deal', on_delete=models.SET_NULL, null=True, blank=True, related_name="emails")
    project = models.ForeignKey('Project', on_delete=models.SET_NULL, null=True, blank=True, related_name="emails")
    
    message_id = models.CharField(max_length=255, unique=True, db_index=True)
    thread_id = models.CharField(max_length=255, blank=True, db_index=True)
    direction = models.CharField(max_length=20, choices=Direction.choices)
    
    from_address = models.CharField(max_length=255)
    to_addresses = models.JSONField(default=list)
    cc_addresses = models.JSONField(default=list, blank=True)
    bcc_addresses = models.JSONField(default=list, blank=True)
    
    subject = models.CharField(max_length=1000, blank=True)
    body_text = models.TextField(blank=True)
    body_html = models.TextField(blank=True)
    
    is_read = models.BooleanField(default=False)
    received_at = models.DateTimeField(db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ("-received_at",)
        
    def __str__(self):
        return f"{self.subject} ({self.direction})"

class CalendarAccount(models.Model):
    class Provider(models.TextChoices):
        GOOGLE = "google", "Google Calendar"
        OUTLOOK = "outlook", "Outlook Calendar"
        APPLE = "apple", "Apple Calendar"
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="calendar_accounts")
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="calendar_accounts")
    provider = models.CharField(max_length=50, choices=Provider.choices)
    account_email = models.EmailField()
    is_active = models.BooleanField(default=True)
    
    # Professional Calendar Settings
    sync_conflicts = models.BooleanField(default=True, help_text="Check this calendar for conflicts.")
    write_events = models.BooleanField(default=True, help_text="Add booked meetings to this calendar.")
    location_type = models.CharField(max_length=50, default="google_meet", help_text="Default meeting medium (e.g. google_meet, zoom, phone, custom).")
    buffer_minutes = models.IntegerField(default=15, help_text="Buffer time between booked events in minutes.")
    minimum_notice_hours = models.IntegerField(default=4, help_text="Minimum notice required before booking in hours.")
    working_hours_start = models.CharField(max_length=5, default="09:00", help_text="Daily availability start time (HH:MM).")
    working_hours_end = models.CharField(max_length=5, default="17:00", help_text="Daily availability end time (HH:MM).")
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.provider} - {self.account_email}"

class BookingLink(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="booking_links")
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="booking_links")
    slug = models.SlugField(unique=True, help_text="e.g., /book/john-doe/30-min")
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    duration_minutes = models.IntegerField(default=30)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.slug})"

class Campaign(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        SCHEDULED = "scheduled", "Scheduled"
        SENDING = "sending", "Sending"
        COMPLETED = "completed", "Completed"

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="campaigns")
    name = models.CharField(max_length=255)
    subject = models.CharField(max_length=255)
    from_name = models.CharField(max_length=255, blank=True, null=True)
    from_email = models.EmailField(blank=True, null=True)
    body_html = models.TextField()
    status = models.CharField(max_length=50, choices=Status.choices, default=Status.DRAFT)
    
    target_audience = models.CharField(max_length=50, default="all_leads")
    
    sent_count = models.PositiveIntegerField(default=0)
    failed_count = models.PositiveIntegerField(default=0)
    
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    scheduled_at = models.DateTimeField(null=True, blank=True)
    sent_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self):
        return self.name

class Ticket(models.Model):
    class Status(models.TextChoices):
        OPEN = "open", "Open"
        IN_PROGRESS = "in_progress", "In Progress"
        WAITING = "waiting", "Waiting on Customer"
        RESOLVED = "resolved", "Resolved"
        CLOSED = "closed", "Closed"

    class Priority(models.TextChoices):
        LOW = "low", "Low"
        MEDIUM = "medium", "Medium"
        HIGH = "high", "High"
        URGENT = "urgent", "Urgent"

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="tickets")
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name="tickets", null=True, blank=True)
    subject = models.CharField(max_length=255)
    description = models.TextField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
    priority = models.CharField(max_length=20, choices=Priority.choices, default=Priority.MEDIUM)
    
    assigned_to = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="assigned_tickets")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self):
        return f"[{self.id}] {self.subject}"


class TicketComment(models.Model):
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name="comments")
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    body = models.TextField()
    is_internal = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("created_at",)

    def __str__(self):
        return f"Comment on {self.ticket.id} by {self.author}"


# ── Orders ──────────────────────────────────────────────────────────────────

class Order(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        PROCESSING = "processing", "Processing"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="orders")
    customer = models.ForeignKey(
        "Customer",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="orders",
    )
    order_number = models.CharField(max_length=50, unique=True, db_index=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING, db_index=True)
    notes = models.TextField(blank=True)
    currency = models.CharField(max_length=3, blank=True, null=True, help_text='3-letter currency code')
    exchange_rate = models.DecimalField(max_digits=18, decimal_places=6, default=1, help_text="Base-currency units per 1 unit of this document's currency")
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="created_orders"
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=("company", "status")),
        ]

    def __str__(self):
        return f"{self.order_number} ({self.status})"

    def calculate_totals(self):
        items = self.items.all()
        self.subtotal = sum(item.subtotal for item in items)
        self.tax_amount = sum(item.tax_amount for item in items)
        self.total = self.subtotal + self.tax_amount
        self.save(update_fields=["subtotal", "tax_amount", "total"])


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(
        "Product", on_delete=models.SET_NULL, null=True, blank=True
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    hsn_sac_code = models.CharField(max_length=50, blank=True, null=True)
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)

    @property
    def subtotal(self):
        return self.unit_price * self.quantity

    @property
    def tax_amount(self):
        return self.subtotal * (self.tax_rate / 100)

    @property
    def total(self):
        return self.subtotal + self.tax_amount

    def __str__(self):
        return f"{self.name} x {self.quantity}"


# ── Events ───────────────────────────────────────────────────────────────────

class Event(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="events")
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    location = models.CharField(max_length=255, blank=True)
    is_virtual = models.BooleanField(default=False)
    virtual_link = models.URLField(blank=True)
    color = models.CharField(max_length=30, blank=True, default="", help_text="Color category for calendar event (e.g. orange, purple, blue, green, indigo, rose)")
    start_time = models.DateTimeField(db_index=True)
    end_time = models.DateTimeField()
    organizer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="organized_events",
    )
    EVENT_TYPES = (
        ("meeting", "Meeting"),
        ("deadline", "Deadline"),
        ("leave", "Leave"),
        ("review", "Review"),
    )
    event_type = models.CharField(max_length=50, choices=EVENT_TYPES, default="meeting")
    attendees = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        blank=True,
        related_name="attended_events",
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("start_time",)
        indexes = [
            models.Index(fields=("company", "start_time")),
        ]

    def __str__(self):
        return self.title


# ── Notice Board ─────────────────────────────────────────────────────────────

class Notice(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="notices")
    title = models.CharField(max_length=255)
    content = models.TextField()
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="authored_notices",
    )
    is_pinned = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-is_pinned", "-created_at")
        indexes = [
            models.Index(fields=("company", "is_pinned")),
        ]

    def __str__(self):
        return self.title


class Timesheet(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        SUBMITTED = "submitted", "Submitted"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="timesheets")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="timesheets")
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="timesheets", null=True, blank=True)
    task = models.ForeignKey(Task, on_delete=models.SET_NULL, related_name="timesheets", null=True, blank=True)
    
    date = models.DateField(db_index=True)
    hours = models.DecimalField(max_digits=5, decimal_places=2)
    description = models.TextField(blank=True, null=True)
    
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT, db_index=True)
    approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="approved_timesheets")
    
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-date", "-created_at")

    def __str__(self):
        return f"{self.user.email} - {self.date} ({self.hours}h)"

class Vendor(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="vendors")
    name = models.CharField(max_length=255)
    email = models.EmailField(blank=True, null=True, db_index=True)
    phone = models.CharField(max_length=50, blank=True, null=True)
    contact_name = models.CharField(max_length=255, blank=True, null=True)
    website = models.URLField(max_length=200, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    tax_id = models.CharField(max_length=100, blank=True, null=True)
    payment_terms = models.CharField(max_length=100, blank=True, null=True)
    bank_details = models.TextField(blank=True, null=True)
    currency = models.CharField(max_length=3, blank=True, default="", help_text="Preferred currency for POs and bills")
    custom_data = models.JSONField(default=dict, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("name",)
        indexes = [
            models.Index(fields=["company", "name"]),
        ]

    def __str__(self):
        return self.name

class PurchaseOrder(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        PENDING_APPROVAL = "pending_approval", "Pending Approval"
        APPROVED = "approved", "Approved"
        SENT = "sent", "Sent"
        BILLED = "billed", "Billed"
        CANCELLED = "cancelled", "Cancelled"

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="purchase_orders")
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name="purchase_orders")
    assigned_to = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="assigned_purchase_orders")
    
    po_number = models.CharField(max_length=50, db_index=True)
    issue_date = models.DateField(default=timezone.now, db_index=True)
    expected_delivery_date = models.DateField(null=True, blank=True)
    
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT, db_index=True)

    currency = models.CharField(max_length=3, blank=True, null=True, help_text='3-letter currency code')
    exchange_rate = models.DecimalField(max_digits=18, decimal_places=6, default=1, help_text="Base-currency units per 1 unit of this document's currency")
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    
    notes = models.TextField(blank=True, null=True)
    terms_conditions = models.TextField(blank=True, null=True)
    delivery_address = models.TextField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["company", "status"]),
        ]
        unique_together = (("company", "po_number"),)

    def __str__(self):
        return f"{self.po_number} - {self.vendor.name}"

class PurchaseOrderItem(models.Model):
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name="items")
    description = models.CharField(max_length=500)
    quantity = models.DecimalField(max_digits=10, decimal_places=2, default=1.00)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)

    def save(self, *args, **kwargs):
        if self.quantity is not None and self.unit_price is not None:
            self.total = self.quantity * self.unit_price
        super().save(*args, **kwargs)


    class Meta:
        ordering = ("id",)

    def __str__(self):
        return f"{self.description} ({self.quantity})"


class Bill(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        OPEN = "open", "Open"
        PARTIAL = "partial", "Partially Paid"
        PAID = "paid", "Paid"
        CANCELLED = "cancelled", "Cancelled"

    class Category(models.TextChoices):
        SOFTWARE = "software", "Software & Cloud"
        OFFICE = "office", "Office & Rent"
        RAW_MATERIALS = "raw_materials", "Raw Materials & Supplies"
        EQUIPMENT = "equipment", "Equipment & Hardware"
        MARKETING = "marketing", "Marketing & Advertising"
        LEGAL = "legal", "Legal & Professional Services"
        LOGISTICS = "logistics", "Logistics & Shipping"
        MAINTENANCE = "maintenance", "Repairs & Maintenance"
        UTILITIES = "utilities", "Utilities & Internet"
        OTHER = "other", "Other Expenses"

    class TaxRegime(models.TextChoices):
        IN_GST = "in_gst", "India GST"
        AE_VAT = "ae_vat", "UAE VAT"
        GENERIC = "generic", "Generic tax"

    class SupplyType(models.TextChoices):
        INTRA = "intra", "Intra-state (CGST + SGST)"
        INTER = "inter", "Inter-state (IGST)"

    class TDSSection(models.TextChoices):
        S194C_IND = "194C_I", "194C - Contractor (Individual/HUF) 1%"
        S194C_OTH = "194C_O", "194C - Contractor (Others) 2%"
        S194J_TECH = "194J_T", "194J - Technical services 2%"
        S194J_PROF = "194J_P", "194J - Professional fees 10%"
        S194I_PM = "194I_PM", "194I - Rent (Plant & Machinery) 2%"
        S194I_LB = "194I_LB", "194I - Rent (Land & Building) 10%"
        S194H = "194H", "194H - Commission/Brokerage 2%"
        S194Q = "194Q", "194Q - Purchase of goods 0.1%"
        S194O = "194O", "194O - E-commerce operator 0.1%"
        OTHER = "other", "Other (custom rate)"

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="bills")
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name="bills")
    purchase_order = models.ForeignKey(PurchaseOrder, null=True, blank=True, on_delete=models.SET_NULL, related_name="bills")
    
    bill_number = models.CharField(max_length=50, db_index=True)
    vendor_reference = models.CharField(max_length=100, blank=True, default="", db_index=True, help_text="Invoice number printed on the vendor's own invoice")
    bill_date = models.DateField(default=timezone.now, db_index=True)
    due_date = models.DateField(null=True, blank=True)
    category = models.CharField(max_length=50, choices=Category.choices, default=Category.OTHER, db_index=True)
    payment_terms = models.CharField(max_length=100, blank=True, default="Net 30")
    attachment = models.FileField(upload_to="bills/vendor_invoices/", blank=True, null=True)
    
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT, db_index=True)

    currency = models.CharField(max_length=3, blank=True, null=True, help_text='3-letter currency code')
    exchange_rate = models.DecimalField(max_digits=18, decimal_places=6, default=1, help_text="Base-currency units per 1 unit of this document's currency")

    # Tax (regime-aware: India GST, UAE VAT, or a generic single tax)
    tax_regime = models.CharField(max_length=10, choices=TaxRegime.choices, default=TaxRegime.IN_GST)
    vendor_tax_id = models.CharField(max_length=30, blank=True, default="", help_text="GSTIN (India), TRN (UAE) or other tax number")
    place_of_supply = models.CharField(max_length=100, blank=True, default="")
    supply_type = models.CharField(max_length=10, choices=SupplyType.choices, default=SupplyType.INTRA)
    reverse_charge = models.BooleanField(default=False, help_text="Recipient self-accounts the tax; vendor is paid the pre-tax amount")
    reverse_charge_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)

    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    taxable_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    cgst_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    sgst_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    igst_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    round_off = models.DecimalField(max_digits=6, decimal_places=2, default=0.00)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)

    # TDS (deducted at source on the taxable value, excluding GST)
    tds_section = models.CharField(max_length=10, choices=TDSSection.choices, blank=True, default="")
    tds_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    tds_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    net_payable = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, help_text="Total minus TDS: the amount actually owed to the vendor")

    amount_paid = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    amount_due = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)

    notes = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ("-bill_date", "-id")

    def __str__(self):
        return f"{self.bill_number} - {self.vendor.name}"

    @classmethod
    def default_tax_regime(cls, company):
        """India -> GST, UAE -> VAT, anything else -> a single generic tax."""
        if company is None:
            return cls.TaxRegime.GENERIC
        country = (getattr(company, "country", "") or "").strip().lower()
        currency = (getattr(company, "currency", "") or "").strip().upper()
        if ("india" in country or country in {"in", "ind", "bharat"}) or (not country and currency == "INR"):
            return cls.TaxRegime.IN_GST
        if ("emirates" in country or "uae" in country.replace(".", "") or country in {"ae", "are", "dubai", "abu dhabi", "sharjah"}) or (not country and currency == "AED"):
            return cls.TaxRegime.AE_VAT
        return cls.TaxRegime.GENERIC

    @classmethod
    def next_bill_number(cls, company):
        """Sequential per-company number: BILL-00001, BILL-00002, ..."""
        import re
        highest = 0
        for number in cls.objects.filter(company=company, bill_number__startswith="BILL-").values_list("bill_number", flat=True):
            match = re.match(r"^BILL-(\d+)$", number)
            if match:
                highest = max(highest, int(match.group(1)))
        candidate = highest + 1
        while cls.objects.filter(company=company, bill_number=f"BILL-{candidate:05d}").exists():
            candidate += 1
        return f"BILL-{candidate:05d}"

    def recalculate_totals(self, items=None):
        """Recompute GST, TDS and payable figures from the line items.

        The bill-level discount is applied before tax and spread proportionally
        across lines. `round_off` is kept as entered (clamped to +/- 1).
        """
        from decimal import Decimal, ROUND_HALF_UP
        two = Decimal("0.01")
        items = list(items if items is not None else self.items.all())

        subtotal = sum((Decimal(str(i.quantity or 0)) * Decimal(str(i.unit_price or 0)) for i in items), Decimal("0"))
        discount = min(max(Decimal(str(self.discount_amount or 0)), Decimal("0")), subtotal)
        ratio = (subtotal - discount) / subtotal if subtotal else Decimal("0")

        tax = sum(
            (Decimal(str(i.quantity or 0)) * Decimal(str(i.unit_price or 0)) * ratio * Decimal(str(i.tax_rate or 0)) / 100 for i in items),
            Decimal("0"),
        ).quantize(two, ROUND_HALF_UP)

        self.subtotal = subtotal.quantize(two, ROUND_HALF_UP)
        self.discount_amount = discount.quantize(two, ROUND_HALF_UP)
        self.taxable_amount = (subtotal - discount).quantize(two, ROUND_HALF_UP)
        zero = Decimal("0")
        self.cgst_amount = self.sgst_amount = self.igst_amount = zero

        if self.reverse_charge:
            # Vendor does not charge the tax; we account for it ourselves
            # (output + input) so it is recorded but never payable to the vendor.
            self.reverse_charge_amount = tax
            self.tax_amount = zero
        else:
            self.reverse_charge_amount = zero
            self.tax_amount = tax
            if self.tax_regime == self.TaxRegime.IN_GST:
                if self.supply_type == self.SupplyType.INTER:
                    self.igst_amount = tax
                else:
                    half = (tax / 2).quantize(two, ROUND_HALF_UP)
                    self.cgst_amount, self.sgst_amount = half, tax - half

        self.round_off = min(max(Decimal(str(self.round_off or 0)), Decimal("-1")), Decimal("1")).quantize(two)
        self.total_amount = self.taxable_amount + self.tax_amount + self.round_off

        if self.tax_regime != self.TaxRegime.IN_GST:
            self.tds_section = ""  # TDS is an Indian income-tax concept
        if not self.tds_section:
            self.tds_rate = Decimal("0")
        self.tds_amount = (self.taxable_amount * Decimal(str(self.tds_rate or 0)) / 100).quantize(two, ROUND_HALF_UP)
        self.net_payable = self.total_amount - self.tds_amount

    def save(self, *args, **kwargs):
        from decimal import Decimal
        payable = Decimal(str(self.net_payable or 0)) or Decimal(str(self.total_amount or 0))
        self.amount_due = max(payable - Decimal(str(self.amount_paid or 0)), Decimal("0"))
        super().save(*args, **kwargs)


class BillPayment(models.Model):
    class PaymentMethod(models.TextChoices):
        BANK_TRANSFER = "bank_transfer", "Bank Transfer (NEFT/RTGS/IMPS)"
        UPI = "upi", "UPI / QR"
        CHEQUE = "cheque", "Cheque"
        CREDIT_CARD = "credit_card", "Corporate Credit Card"
        DEBIT_CARD = "debit_card", "Debit Card"
        CASH = "cash", "Cash"
        OTHER = "other", "Other"

    bill = models.ForeignKey(Bill, on_delete=models.CASCADE, related_name="payments")
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_date = models.DateField(default=timezone.localdate)
    payment_method = models.CharField(max_length=50, choices=PaymentMethod.choices, default=PaymentMethod.BANK_TRANSFER)
    transaction_id = models.CharField(max_length=255, blank=True, default="", help_text="UTR, Cheque #, or Ref ID")
    receipt = models.FileField(upload_to="bills/payment_receipts/", blank=True, null=True)
    notes = models.TextField(blank=True, default="")
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-payment_date", "-id")

    def __str__(self):
        return f"Payment of {self.amount} for {self.bill.bill_number}"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        self.recalculate_bill()

    def delete(self, *args, **kwargs):
        bill = self.bill
        super().delete(*args, **kwargs)
        BillPayment.recalculate_bill_totals(bill)

    def recalculate_bill(self):
        BillPayment.recalculate_bill_totals(self.bill)

    @classmethod
    def recalculate_bill_totals(cls, bill):
        from django.db.models import Sum
        from decimal import Decimal
        paid = bill.payments.aggregate(total=Sum('amount'))['total'] or 0
        bill.amount_paid = Decimal(str(paid))
        payable = Decimal(str(bill.net_payable or 0)) or Decimal(str(bill.total_amount or 0))
        bill.amount_due = max(payable - bill.amount_paid, Decimal('0'))
        if payable > 0 and bill.amount_due == 0:
            bill.status = Bill.Status.PAID
        elif bill.amount_paid > 0:
            bill.status = Bill.Status.PARTIAL
        elif bill.status in [Bill.Status.PAID, Bill.Status.PARTIAL]:
            bill.status = Bill.Status.OPEN
        bill.save(update_fields=['amount_paid', 'amount_due', 'status'])


class BillItem(models.Model):
    bill = models.ForeignKey(Bill, on_delete=models.CASCADE, related_name="items")
    description = models.CharField(max_length=500)
    hsn_sac_code = models.CharField(max_length=20, blank=True, default="")
    tax_category = models.CharField(
        max_length=10, blank=True, default="",
        choices=[("standard", "Standard"), ("zero", "Zero-rated"), ("exempt", "Exempt")],
    )
    quantity = models.DecimalField(max_digits=10, decimal_places=2, default=1.00)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)

    def save(self, *args, **kwargs):
        if self.quantity is not None and self.unit_price is not None:
            self.total = self.quantity * self.unit_price
        super().save(*args, **kwargs)


    class Meta:
        ordering = ("id",)

    def __str__(self):
        return f"{self.description} ({self.quantity})"

class WhatsAppMessage(models.Model):
    class Direction(models.TextChoices):
        INBOUND = "inbound", "Inbound"
        OUTBOUND = "outbound", "Outbound"

    class Status(models.TextChoices):
        SENT = "sent", "Sent"
        DELIVERED = "delivered", "Delivered"
        READ = "read", "Read"
        FAILED = "failed", "Failed"
        RECEIVED = "received", "Received"

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="whatsapp_messages")
    lead = models.ForeignKey(Lead, on_delete=models.CASCADE, related_name="whatsapp_messages", null=True, blank=True)
    message_id = models.CharField(max_length=255, unique=True, help_text="WhatsApp Message ID (wamid)")
    direction = models.CharField(max_length=20, choices=Direction.choices)
    content = models.TextField(help_text="Text content of the message")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.SENT)
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Store raw payload just in case (optional)
    raw_payload = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ("created_at",)

    def __str__(self):
        return f"WA {self.direction} - {self.id}"

class DailyRevenue(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="daily_revenues")
    date = models.DateField(db_index=True)
    total_revenue = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)

    class Meta:
        unique_together = ('company', 'date')
        ordering = ("-date",)

    def __str__(self):
        return f"{self.date} - {self.total_revenue}"


class Income(models.Model):
    class Category(models.TextChoices):
        RETAINER = "retainer", "Client Retainer"
        CONSULTING = "consulting", "Consulting / Service"
        COMMISSION = "commission", "Commission / Referral"
        INVESTMENT = "investment", "Investment / Dividends"
        AFFILIATE = "affiliate", "Affiliate / Ad Revenue"
        GRANT = "grant", "Grant / Subsidy"
        INTEREST = "interest", "Bank Interest"
        REFUND = "refund", "Vendor Refund / Reimbursement"
        CAPITAL = "capital", "Owner Capital / Equity"
        OTHER = "other", "Other Miscellaneous Income"

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="incomes",
    )
    title = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    date = models.DateField(default=timezone.localdate, db_index=True)
    category = models.CharField(
        max_length=50,
        choices=Category.choices,
        default=Category.OTHER,
        db_index=True,
    )
    received_from = models.CharField(max_length=255, blank=True, default="")
    payment_method = models.CharField(max_length=50, default="bank_transfer")
    reference = models.CharField(max_length=100, blank=True, default="")
    receipt = models.FileField(upload_to="income_receipts/", blank=True, null=True)
    notes = models.TextField(blank=True, default="")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="recorded_incomes",
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-date", "-created_at")

    def __str__(self):
        return f"{self.title} - {self.amount}"
