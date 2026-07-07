import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from rest_framework.test import APIClient
from accounts.models import User
from crm.models import Customer
from django.contrib.auth import get_user_model

# Clean up any existing customer users for testing
User = get_user_model()
User.objects.filter(role=User.Role.CUSTOMER).delete()

client = APIClient()
user = User.objects.filter(is_superuser=True).first()
client.force_authenticate(user=user)

# Pick a customer
customer = Customer.objects.first()
if customer:
    response = client.post(f'/api/v1/crm/customers/{customer.id}/invite-portal/')
    print("STATUS:", response.status_code)
    try:
        print("JSON:", response.json())
    except:
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(response.content, 'html.parser')
        print("ERROR:", soup.title.text if soup.title else "No Title")
        print("TRACE:", getattr(soup.find("div", {"id": "traceback_area"}), "text", "No traceback found"))
else:
    print("NO CUSTOMER")
