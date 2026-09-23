from django.contrib import admin
from .models import (
    TimeLog,
    BreakLog,
    LeaveRequest,
    ExpenseClaim,
    OfficeAsset,
    Payroll,
    Holiday,
    DailyReport,
)

@admin.register(TimeLog)
class TimeLogAdmin(admin.ModelAdmin):
    list_display = ("user", "company", "clock_in", "clock_out", "shift_status", "work_location")
    list_filter = ("shift_status", "work_location", "company")
    search_fields = ("user__email", "user__first_name", "user__last_name", "company__name")
    date_hierarchy = "clock_in"

@admin.register(BreakLog)
class BreakLogAdmin(admin.ModelAdmin):
    list_display = ("time_log", "start_time", "end_time", "reason")
    search_fields = ("time_log__user__email",)

@admin.register(LeaveRequest)
class LeaveRequestAdmin(admin.ModelAdmin):
    list_display = ("user", "company", "leave_type", "start_date", "end_date", "status")
    list_filter = ("status", "leave_type", "company")
    search_fields = ("user__email", "user__first_name", "user__last_name", "company__name")
    date_hierarchy = "start_date"
    readonly_fields = ("created_at",)

@admin.register(DailyReport)
class DailyReportAdmin(admin.ModelAdmin):
    list_display = ("user", "company", "date")
    list_filter = ("company",)
    search_fields = ("user__email", "user__first_name", "user__last_name", "company__name")
    date_hierarchy = "date"
    readonly_fields = ("created_at", "updated_at")

@admin.register(Holiday)
class HolidayAdmin(admin.ModelAdmin):
    list_display = ("name", "company", "date")
    list_filter = ("company",)
    search_fields = ("name", "company__name")
    date_hierarchy = "date"

@admin.register(ExpenseClaim)
class ExpenseClaimAdmin(admin.ModelAdmin):
    list_display = ("user", "company", "title", "amount", "status", "created_at")
    list_filter = ("status", "company")
    search_fields = ("title", "user__email", "company__name")
    date_hierarchy = "created_at"

@admin.register(OfficeAsset)
class OfficeAssetAdmin(admin.ModelAdmin):
    list_display = ("name", "serial_number", "company", "assigned_to", "condition")
    list_filter = ("condition", "company")
    search_fields = ("name", "serial_number", "assigned_to__email", "company__name")

@admin.register(Payroll)
class PayrollAdmin(admin.ModelAdmin):
    list_display = ("user", "company", "month", "year", "net_salary", "status")
    list_filter = ("status", "month", "year", "company")
    search_fields = ("user__email", "company__name")
