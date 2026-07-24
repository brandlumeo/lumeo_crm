from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CurrentCompanyView, InvoiceSettingsView, UnitViewSet

app_name = "companies"

router = DefaultRouter()
router.register("units", UnitViewSet, basename="unit")

urlpatterns = [
    path("current/", CurrentCompanyView.as_view(), name="current"),
    path("invoice-settings/", InvoiceSettingsView.as_view(), name="invoice-settings"),
    path("", include(router.urls)),
]
