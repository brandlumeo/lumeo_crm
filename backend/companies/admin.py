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


from django.contrib import messages
from django.utils import timezone
from django.utils.html import format_html

from .models import TrashedItem
from .trash import RestoreError, purge_expired, restore


@admin.register(TrashedItem)
class TrashedItemAdmin(admin.ModelAdmin):
    list_display = ("object_repr", "model_label", "contents", "deleted_by", "deleted_at", "status")
    list_filter = ("model_label", ("restored_at", admin.EmptyFieldListFilter))
    search_fields = ("object_repr", "model_label", "deleted_by__email")
    actions = ["restore_selected"]
    readonly_fields = ("model_label", "object_repr", "object_count", "item_count", "deleted_by", "deleted_at", "restored_at", "expires", "preview")
    exclude = ("payload", "relinks")

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False if obj else super().has_change_permission(request, obj)

    def changelist_view(self, request, extra_context=None):
        purge_expired()
        return super().changelist_view(request, extra_context)

    @admin.display(description="Contents")
    def contents(self, obj):
        extra = obj.item_count - obj.object_count
        return f"{obj.object_count} item(s)" + (f" + {extra} linked record(s)" if extra > 0 else "")

    @admin.display(description="Status")
    def status(self, obj):
        if obj.restored_at:
            return format_html('<span style="color:#2e7d32">Restored</span>')
        days = max(0, TrashedItem.TRASH_DAYS - (timezone.now() - obj.deleted_at).days)
        return f"In trash · {days} day(s) left"

    @admin.display(description="Permanently deleted on")
    def expires(self, obj):
        return obj.deleted_at + timezone.timedelta(days=TrashedItem.TRASH_DAYS)

    @admin.display(description="What will be restored")
    def preview(self, obj):
        counts = {}
        for row in obj.payload:
            counts[row["model"]] = counts.get(row["model"], 0) + 1
        return ", ".join(f"{n} × {m}" for m, n in counts.items())

    @admin.action(description="Restore selected items")
    def restore_selected(self, request, queryset):
        ok = 0
        for item in queryset.filter(restored_at__isnull=True):
            try:
                restore(item)
                ok += 1
            except RestoreError as exc:
                self.message_user(request, f"{item.object_repr}: {exc}", messages.ERROR)
        if ok:
            self.message_user(request, f"Restored {ok} item(s).", messages.SUCCESS)
