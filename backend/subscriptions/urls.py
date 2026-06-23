from django.urls import path

from .views import (
    CurrentSubscriptionView,
    PlanCatalogueView,
    CreateSubscriptionView,
    VerifySubscriptionView,
    RazorpayWebhookView,
)

app_name = "subscriptions"

urlpatterns = [
    path("current/", CurrentSubscriptionView.as_view(), name="current"),
    path("plans/", PlanCatalogueView.as_view(), name="plans"),
    path("checkout/", CreateSubscriptionView.as_view(), name="checkout"),
    path("verify/", VerifySubscriptionView.as_view(), name="verify"),
    path("webhook/", RazorpayWebhookView.as_view(), name="webhook"),
]
