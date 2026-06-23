from django.contrib.auth import get_user_model
from rest_framework.test import APIRequestFactory, force_authenticate
from crm.analytics_views import PremiumAnalyticsView

User = get_user_model()
user = User.objects.exclude(company__isnull=True).first()

if not user:
    print("No user found with a company")
else:
    factory = APIRequestFactory()
    request = factory.get('/api/v1/crm/analytics/')
    force_authenticate(request, user=user)
    view = PremiumAnalyticsView.as_view()
    response = view(request)
    print("STATUS:", response.status_code)
    print("DATA_KEYS:", list(response.data.keys()))
    print("VELOCITY:", response.data.get('sales_velocity_days'))
    print("REVENUE:", response.data.get('revenue_by_month'))
    print("CONVERSION:", response.data.get('lead_conversion'))
