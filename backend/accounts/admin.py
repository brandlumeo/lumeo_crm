from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import User, TeamInvitation


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = (
        "username",
        "email",
        "first_name",
        "last_name",
        "company",
        "role",
        "is_staff",
        "is_active",
    )
    list_filter = ("role", "company", "is_staff", "is_superuser", "is_active")
    search_fields = (
        "username",
        "first_name",
        "last_name",
        "email",
        "company__name",
        "company__slug",
    )
    ordering = ("username",)
    fieldsets = BaseUserAdmin.fieldsets + (
        (
            "Tenant Access",
            {
                "fields": ("company", "role"),
            },
        ),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        (
            "Tenant Access",
            {
                "classes": ("wide",),
                "fields": ("company", "role"),
            },
        ),
    )


@admin.register(TeamInvitation)
class TeamInvitationAdmin(admin.ModelAdmin):
    list_display = ("email", "company", "role", "token", "is_accepted", "created_at")
    list_filter = ("company", "role", "is_accepted")
    search_fields = ("email", "company__name")
    readonly_fields = ("token", "created_at")
