from django.contrib import admin
from .models import Company, PlatformSettings, Unit, PaymentMethod, InvoiceSettings

@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "status", "trial_ends_at", "created_at")
    list_filter = ("status", "created_at", "trial_ends_at")
    search_fields = ("name", "slug", "company_email")
    ordering = ("name",)
    readonly_fields = ("id", "created_at", "updated_at")

@admin.register(PlatformSettings)
class PlatformSettingsAdmin(admin.ModelAdmin):
    list_display = ("id", "maintenance_mode", "allow_new_registrations", "updated_at")

@admin.register(Unit)
class UnitAdmin(admin.ModelAdmin):
    list_display = ("name", "company", "is_default")
    list_filter = ("company", "is_default")
    search_fields = ("name", "company__name")

@admin.register(PaymentMethod)
class PaymentMethodAdmin(admin.ModelAdmin):
    list_display = ("title", "company")
    list_filter = ("company",)
    search_fields = ("title", "company__name")

@admin.register(InvoiceSettings)
class InvoiceSettingsAdmin(admin.ModelAdmin):
    list_display = ("company", "default_tax_rate", "currency", "invoice_prefix")
    search_fields = ("company__name", "currency")
