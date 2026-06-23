from django.contrib import admin

from .models import Customer, Deal, Lead, Note, Task


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
