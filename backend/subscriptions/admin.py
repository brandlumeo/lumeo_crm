from django.contrib import admin

from .models import Plan, Subscription


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = (
        "company",
        "plan",
        "is_active",
        "is_expired",
        "days_remaining",
        "expires_at",
        "created_at",
    )
    list_filter = ("plan", "is_active")
    search_fields = ("company__name", "company__slug")
    readonly_fields = ("created_at", "updated_at", "is_expired", "days_remaining", "is_trial")
    ordering = ("-created_at",)

    fieldsets = (
        (None, {
            "fields": ("company", "plan", "is_active", "expires_at"),
        }),
        ("Computed", {
            "fields": ("is_expired", "days_remaining", "is_trial"),
            "classes": ("collapse",),
        }),
        ("Timestamps", {
            "fields": ("created_at", "updated_at"),
            "classes": ("collapse",),
        }),
    )
