from rest_framework.routers import DefaultRouter
from django.urls import path
from .saas_views import SaasCompanyViewSet, SaasUserViewSet, SaasStatsView, SaasSubscriptionViewSet, SaasSettingsView

router = DefaultRouter()
router.register('companies', SaasCompanyViewSet, basename='saas-company')
router.register('users', SaasUserViewSet, basename='saas-user')
router.register('subscriptions', SaasSubscriptionViewSet, basename='saas-subscription')

urlpatterns = [
    path('stats/', SaasStatsView.as_view(), name='saas-stats'),
    path('settings/', SaasSettingsView.as_view(), name='saas-settings'),
] + router.urls
