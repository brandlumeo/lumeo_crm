import uuid
from django.db import models
from django.conf import settings
from companies.models import Company


class TimeLog(models.Model):
    class WorkLocation(models.TextChoices):
        OFFICE = "office", "Office"
        WFH = "wfh", "Work From Home"
        ONSITE = "onsite", "On-Site"
        FIELD = "field", "Field / Travel"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="time_logs",
    )
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="time_logs",
    )
    clock_in = models.DateTimeField(db_index=True)
    clock_out = models.DateTimeField(null=True, blank=True, db_index=True)
    work_location = models.CharField(
        max_length=20,
        choices=WorkLocation.choices,
        default=WorkLocation.OFFICE,
        db_index=True,
    )
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    latitude = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True
    )
    longitude = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True
    )
    class ShiftStatus(models.TextChoices):
        ON_TIME = "on_time", "On Time"
        LATE = "late", "Late"
        OVERTIME = "overtime", "Overtime"

    notes = models.TextField(blank=True, null=True)
    is_auto_closed = models.BooleanField(default=False, help_text="True if closed by midnight sweep")
    shift_status = models.CharField(
        max_length=20,
        choices=ShiftStatus.choices,
        default=ShiftStatus.ON_TIME,
        db_index=True,
    )

    class Meta:
        ordering = ("-clock_in",)

    def __str__(self):
        user_id = self.user.email or self.user.username
        status = "Clocked In" if not self.clock_out else "Clocked Out"
        return f"{user_id} - {status} ({self.get_work_location_display()}) at {self.clock_in}"


class BreakLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    time_log = models.ForeignKey(
        TimeLog,
        on_delete=models.CASCADE,
        related_name="breaks",
    )
    start_time = models.DateTimeField(db_index=True)
    end_time = models.DateTimeField(null=True, blank=True, db_index=True)
    reason = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        ordering = ("-start_time",)

    def __str__(self):
        user_id = self.time_log.user.email or self.time_log.user.username
        duration = "Ongoing" if not self.end_time else f"ended at {self.end_time}"
        return f"Break for {user_id}: {self.start_time} - {duration}"


class LeaveRequest(models.Model):
    class LeaveType(models.TextChoices):
        PAID = "paid", "Paid Annual"
        SICK = "sick", "Medical / Sick"
        CASUAL = "casual", "Casual"
        UNPAID = "unpaid", "Unpaid"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending Approval"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="leaves",
    )
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="leaves",
    )
    leave_type = models.CharField(
        max_length=20,
        choices=LeaveType.choices,
        default=LeaveType.PAID,
        db_index=True,
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )
    start_date = models.DateField(db_index=True)
    end_date = models.DateField(db_index=True)
    reason = models.TextField()

    # Manager review
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="approved_leaves",
    )
    manager_notes = models.TextField(blank=True, null=True)
    attachment = models.FileField(upload_to="leave_docs/", null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self):
        user_id = self.user.email or self.user.username
        return f"Leave for {user_id}: {self.start_date} to {self.end_date} ({self.get_status_display()})"


class ExpenseClaim(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending Approval"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="expenses",
    )
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="expenses",
    )
    deal = models.ForeignKey(
        "crm.Deal",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="expenses",
        help_text="Optional CRM Deal associated with this cost.",
    )
    title = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    receipt = models.FileField(upload_to="receipts/", null=True, blank=True)
    description = models.TextField(blank=True, null=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )
    
    # Manager review
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="approved_expenses",
    )
    manager_notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self):
        user_id = self.user.email or self.user.username
        return f"Expense by {user_id}: '{self.title}' for {self.amount} ({self.get_status_display()})"


class OfficeAsset(models.Model):
    class Condition(models.TextChoices):
        NEW = "new", "New"
        GOOD = "good", "Good"
        FAIR = "fair", "Fair"
        DAMAGED = "damaged", "Damaged"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="assets",
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="assets",
        help_text="Employee currently assigned to this asset.",
    )
    name = models.CharField(max_length=255)
    serial_number = models.CharField(max_length=100, blank=True, null=True, db_index=True)
    condition = models.CharField(
        max_length=20,
        choices=Condition.choices,
        default=Condition.GOOD,
        db_index=True,
    )
    purchase_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("name",)

    def __str__(self):
        sn = f" (S/N: {self.serial_number})" if self.serial_number else ""
        return f"{self.name}{sn} - {self.get_condition_display()}"


class Payroll(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        PUBLISHED = "published", "Published"
        PAID = "paid", "Paid"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="payrolls",
    )
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="payrolls",
    )
    month = models.IntegerField()  # 1-12
    year = models.IntegerField()
    basic_salary = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    allowances = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    deductions = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    net_salary = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
        db_index=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-year", "-month")
        unique_together = ("user", "month", "year")

    def __str__(self):
        user_id = self.user.email or self.user.username
        return f"Payroll for {user_id} ({self.month}/{self.year})"

    def save(self, *args, **kwargs):
        self.net_salary = self.basic_salary + self.allowances - self.deductions
        super().save(*args, **kwargs)


class Holiday(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="holidays",
    )
    name = models.CharField(max_length=255)
    date = models.DateField(db_index=True)
    description = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ("date",)

    def __str__(self):
        return f"{self.name} - {self.date}"
