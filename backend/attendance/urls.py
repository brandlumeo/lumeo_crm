from django.urls import path
from . import views

app_name = "attendance"

urlpatterns = [
    path("status/", views.CurrentStatusView.as_view(), name="status"),
    path("punch-in/", views.PunchInView.as_view(), name="punch_in"),
    path("punch-out/", views.PunchOutView.as_view(), name="punch_out"),
    path("break-start/", views.BreakStartView.as_view(), name="break_start"),
    path("break-end/", views.BreakEndView.as_view(), name="break_end"),
    path("history/", views.PersonalHistoryView.as_view(), name="history"),
    path("matrix/", views.AttendanceMatrixView.as_view(), name="matrix"),
    path("leaves/", views.LeaveRequestListCreateView.as_view(), name="leave_list_create"),
    path("leaves/<uuid:pk>/approve/", views.LeaveApprovalView.as_view(), name="leave_approve"),
    path("expenses/", views.ExpenseClaimListCreateView.as_view(), name="expense_list_create"),
    path("expenses/<uuid:pk>/approve/", views.ExpenseClaimApprovalView.as_view(), name="expense_approve"),
    path("assets/", views.OfficeAssetListCreateView.as_view(), name="asset_list_create"),
    path("assets/<uuid:pk>/", views.OfficeAssetDetailView.as_view(), name="asset_detail"),
    path("payrolls/", views.PayrollListCreateView.as_view(), name="payroll_list_create"),
    path("payrolls/<uuid:pk>/", views.PayrollDetailView.as_view(), name="payroll_detail"),
    path("holidays/", views.HolidayListCreateView.as_view(), name="holiday_list_create"),
    path("holidays/<uuid:pk>/", views.HolidayDetailView.as_view(), name="holiday_detail"),
]

from rest_framework.routers import DefaultRouter
router = DefaultRouter()
router.register(r"admin/timelogs", views.TimeLogAdminViewSet, basename="admin_timelogs")
urlpatterns += router.urls
