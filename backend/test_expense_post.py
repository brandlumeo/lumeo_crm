import os
import django
from django.test import RequestFactory
import json

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from attendance.views import ExpenseClaimListCreateView
from accounts.models import User

user = User.objects.first()
factory = RequestFactory()
data = {
    "title": "My Expense",
    "amount": "100",
}
request = factory.post("/api/v1/attendance/expenses/", data=data)
request.user = user

view = ExpenseClaimListCreateView.as_view()
response = view(request)
print("Status:", response.status_code)
print("Data:", response.data)
