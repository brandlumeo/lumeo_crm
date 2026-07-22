from django.conf import settings
from django.core.exceptions import ValidationError
import uuid
from django.db import models

from companies.models import Company


def default_workflow_sequence_stop_statuses():
    return ["won", "lost"]


class Lead(models.Model):
    class Status(models.TextChoices):
        NEW = "new", "New"
        CONTACTED = "contacted", "Contacted"
        QUALIFIED = "qualified", "Qualified"
        LOST = "lost", "Lost"
        WON = "won", "Won"

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
        choices=Status.choices,
        default=Status.NEW,
        db_index=True,
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="assigned_leads",
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    custom_data = models.JSONField(default=dict, blank=True)
    
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
        choices=Stage.choices,
        default=Stage.PROSPECT,
        db_index=True,
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    expected_close_date = models.DateField(null=True, blank=True, db_index=True)
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
    workflow_step_run = models.ForeignKey(
        "WorkflowStepRun",
        on_delete=models.SET_NULL,
        related_name="tasks",
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("due_date", "title")
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

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="activities",
    )
    lead = models.ForeignKey(Lead, on_delete=models.CASCADE, related_name="activities", null=True, blank=True)
    deal = models.ForeignKey(Deal, on_delete=models.CASCADE, related_name="activities", null=True, blank=True)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name="activities", null=True, blank=True)
    
    activity_type = models.CharField(
        max_length=50,
        choices=ActivityType.choices,
        db_index=True,
    )
    description = models.TextField()
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_activities",
    )
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
        if sum(x is not None for x in linked_objects) != 1:
            raise ValidationError("An attachment must be linked to exactly one of Lead, Deal, or Customer.")

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


class Quote(models.Model):
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
    quote_number = models.CharField(max_length=50, unique=True, db_index=True)
    title = models.CharField(max_length=255)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
    )
    valid_until = models.DateField(null=True, blank=True)
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
        items = self.items.all()
        self.subtotal = sum(item.subtotal for item in items)
        self.tax_amount = sum(item.tax_amount for item in items)
        self.total = self.subtotal + self.tax_amount
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
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
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


class Invoice(models.Model):
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
        return f"{self.invoice_number} ({self.total})"

    def calculate_totals(self):
        items = self.items.all()
        self.subtotal = sum(item.subtotal for item in items)
        self.tax_amount = sum(item.tax_amount for item in items)
        self.total = self.subtotal + self.tax_amount
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
        SENDING = "sending", "Sending"
        COMPLETED = "completed", "Completed"

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="campaigns")
    name = models.CharField(max_length=255)
    subject = models.CharField(max_length=255)
    body_html = models.TextField()
    status = models.CharField(max_length=50, choices=Status.choices, default=Status.DRAFT)
    
    target_audience = models.CharField(max_length=50, default="all_leads")
    
    sent_count = models.PositiveIntegerField(default=0)
    failed_count = models.PositiveIntegerField(default=0)
    
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
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
    start_time = models.DateTimeField(db_index=True)
    end_time = models.DateTimeField()
    organizer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="organized_events",
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

