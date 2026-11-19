from django.urls import path

from . import saas_views as v

urlpatterns = [
    path("stats/", v.SaasStatsView.as_view(), name="saas-stats"),
    path("tenants/", v.SaasTenantListView.as_view(), name="saas-tenants"),
    path("tenants/export/", v.SaasTenantExportView.as_view(), name="saas-tenants-export"),
    path("tenants/bulk/", v.SaasTenantBulkView.as_view(), name="saas-tenants-bulk"),
    path("tenants/<uuid:pk>/", v.SaasTenantDetailView.as_view(), name="saas-tenant-detail"),
    path("tenants/<uuid:pk>/<slug:action>/", v.SaasTenantActionView.as_view(), name="saas-tenant-action"),
    path("users/", v.SaasUserListView.as_view(), name="saas-users"),
    path("users/export/", v.SaasUserExportView.as_view(), name="saas-users-export"),
    path("users/bulk/", v.SaasUserBulkView.as_view(), name="saas-users-bulk"),
    path("users/<int:pk>/", v.SaasUserDetailView.as_view(), name="saas-user-detail"),
    path("users/<int:pk>/impersonate/", v.SaasImpersonateView.as_view(), name="saas-user-impersonate"),
    path("impersonation/end/", v.SaasImpersonationEndView.as_view(), name="saas-impersonation-end"),
    path("billing/", v.SaasBillingView.as_view(), name="saas-billing"),
    path("billing/plans/", v.SaasPlanUpdateView.as_view(), name="saas-billing-plans"),
    path("audit/", v.SaasAuditView.as_view(), name="saas-audit"),
    path("lifecycle/run/", v.SaasLifecycleRunView.as_view(), name="saas-lifecycle-run"),
    path("lifecycle/events/", v.SaasLifecycleEventsView.as_view(), name="saas-lifecycle-events"),
    path("settings/", v.SaasSettingsView.as_view(), name="saas-settings"),
]
