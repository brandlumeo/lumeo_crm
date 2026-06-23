from django.contrib import admin

from .models import Company


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "status", "trial_ends_at", "created_at")
    list_filter = ("status", "created_at", "trial_ends_at")
    search_fields = ("name", "slug")
    ordering = ("name",)
    readonly_fields = ("id", "created_at", "updated_at")
    fieldsets = (
        (
            "Workspace",
            {
                "fields": ("id", "name", "slug", "status"),
            },
        ),
        (
            "Lifecycle",
            {
                "fields": ("trial_ends_at",),
            },
        ),
        (
            "Timestamps",
            {
                "fields": ("created_at", "updated_at"),
            },
        ),
    )
