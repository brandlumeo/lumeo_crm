import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from rest_framework.test import APIRequestFactory, force_authenticate
import json
from attendance.views import ExpenseClaimListCreateView
from accounts.models import User

user = User.objects.first()
factory = APIRequestFactory()
data = {
    "title": "My Expense",
    "amount": "100",
}
request = factory.post("/api/v1/attendance/expenses/", data=data, format='multipart')
force_authenticate(request, user=user)

view = ExpenseClaimListCreateView.as_view()
response = view(request)
print("Status:", response.status_code)
print("Data:", response.data)
