from django.contrib import admin
from .models import (
    Customer, Deal, Lead, Note, Task, Project, Product, Quote, Invoice,
    InvoicePayment, Ticket, TicketComment, Order, Event, Notice, Timesheet,
    Vendor, PurchaseOrder, Bill, Campaign, EmailTemplate, SMTPConfig,
    WorkflowRule, WorkflowSequence, CustomFieldDefinition, WhatsAppMessage, DailyRevenue
)

@admin.register(Lead)
class LeadAdmin(admin.ModelAdmin):
    list_display = ("name", "company", "email", "status", "assigned_to", "created_at")
    list_filter = ("company", "status", "created_at")
    search_fields = ("name", "email", "company__name", "assigned_to__username")
    autocomplete_fields = ("company", "assigned_to")
    ordering = ("-created_at",)

@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ("name", "company", "email", "phone", "created_at")
    list_filter = ("company", "created_at")
    search_fields = ("name", "email", "phone", "company__name")
    autocomplete_fields = ("company",)
    ordering = ("name",)

@admin.register(Deal)
class DealAdmin(admin.ModelAdmin):
    list_display = ("title", "company", "amount", "stage", "created_at")
    list_filter = ("company", "stage", "created_at")
    search_fields = ("title", "company__name")
    autocomplete_fields = ("company",)
    ordering = ("-created_at",)

@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ("title", "company", "status", "due_date", "assigned_to")
    list_filter = ("company", "status", "due_date")
    search_fields = ("title", "company__name", "assigned_to__username")
    autocomplete_fields = ("company", "assigned_to")
    ordering = ("due_date", "title")

@admin.register(Note)
class NoteAdmin(admin.ModelAdmin):
    list_display = ("short_content", "company", "created_at")
    list_filter = ("company", "created_at")
    search_fields = ("content", "company__name")
    autocomplete_fields = ("company",)
    ordering = ("-created_at",)

    @admin.display(description="Content")
    def short_content(self, obj):
        return obj.content[:60]

@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ("name", "company", "status", "progress", "created_at")
    list_filter = ("status", "company")
    search_fields = ("name", "company__name")

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("name", "sku", "price", "company", "is_active")
    list_filter = ("is_active", "company")
    search_fields = ("name", "sku", "company__name")

@admin.register(Quote)
class QuoteAdmin(admin.ModelAdmin):
    list_display = ("quote_number", "title", "company", "total", "status")
    list_filter = ("status", "company")
    search_fields = ("quote_number", "title", "company__name")

@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ("invoice_number", "company", "total", "status", "issue_date", "due_date")
    list_filter = ("status", "company")
    search_fields = ("invoice_number", "company__name")

@admin.register(InvoicePayment)
class InvoicePaymentAdmin(admin.ModelAdmin):
    list_display = ("invoice", "amount", "payment_date", "payment_method")
    list_filter = ("payment_method",)
    search_fields = ("invoice__invoice_number", "transaction_id")

@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    list_display = ("subject", "company", "status", "priority", "assigned_to")
    list_filter = ("status", "priority", "company")
    search_fields = ("subject", "company__name")

@admin.register(TicketComment)
class TicketCommentAdmin(admin.ModelAdmin):
    list_display = ("ticket", "author", "is_internal", "created_at")
    list_filter = ("is_internal",)

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("order_number", "company", "status", "total", "created_at")
    list_filter = ("status", "company")
    search_fields = ("order_number", "company__name")

@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ("title", "company", "start_time", "end_time", "is_virtual")
    list_filter = ("is_virtual", "company")
    search_fields = ("title", "company__name")

@admin.register(Notice)
class NoticeAdmin(admin.ModelAdmin):
    list_display = ("title", "company", "author", "is_pinned", "created_at")
    list_filter = ("is_pinned", "company")
    search_fields = ("title", "company__name")

@admin.register(Timesheet)
class TimesheetAdmin(admin.ModelAdmin):
    list_display = ("user", "company", "project", "date", "hours", "status")
    list_filter = ("status", "company")
    search_fields = ("user__email", "project__name", "company__name")

@admin.register(Vendor)
class VendorAdmin(admin.ModelAdmin):
    list_display = ("name", "company", "email", "phone")
    list_filter = ("company",)
    search_fields = ("name", "email", "company__name")

@admin.register(PurchaseOrder)
class PurchaseOrderAdmin(admin.ModelAdmin):
    list_display = ("po_number", "company", "vendor", "status", "total_amount")
    list_filter = ("status", "company")
    search_fields = ("po_number", "vendor__name", "company__name")

@admin.register(Bill)
class BillAdmin(admin.ModelAdmin):
    list_display = ("bill_number", "company", "vendor", "status", "total_amount")
    list_filter = ("status", "company")
    search_fields = ("bill_number", "vendor__name", "company__name")

@admin.register(Campaign)
class CampaignAdmin(admin.ModelAdmin):
    list_display = ("name", "company", "status", "target_audience", "sent_count")
    list_filter = ("status", "company")
    search_fields = ("name", "company__name")

@admin.register(EmailTemplate)
class EmailTemplateAdmin(admin.ModelAdmin):
    list_display = ("name", "company", "subject")
    list_filter = ("company",)
    search_fields = ("name", "company__name")

@admin.register(SMTPConfig)
class SMTPConfigAdmin(admin.ModelAdmin):
    list_display = ("host", "port", "company", "from_email")
    list_filter = ("company",)

@admin.register(WorkflowRule)
class WorkflowRuleAdmin(admin.ModelAdmin):
    list_display = ("name", "company", "trigger_event", "is_active")
    list_filter = ("is_active", "trigger_event", "company")
    search_fields = ("name", "company__name")

@admin.register(WorkflowSequence)
class WorkflowSequenceAdmin(admin.ModelAdmin):
    list_display = ("name", "company", "trigger_event", "is_active")
    list_filter = ("is_active", "trigger_event", "company")

@admin.register(CustomFieldDefinition)
class CustomFieldDefinitionAdmin(admin.ModelAdmin):
    list_display = ("name", "company", "model_name", "field_type", "required")
    list_filter = ("model_name", "field_type", "company")

@admin.register(WhatsAppMessage)
class WhatsAppMessageAdmin(admin.ModelAdmin):
    list_display = ("message_id", "company", "direction", "status", "created_at")
    list_filter = ("direction", "status", "company")

@admin.register(DailyRevenue)
class DailyRevenueAdmin(admin.ModelAdmin):
    list_display = ("date", "company", "total_revenue")
    list_filter = ("company",)
