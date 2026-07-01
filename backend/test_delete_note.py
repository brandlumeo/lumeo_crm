import os
import django
import sys
import re
from django.conf import settings

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from rest_framework.test import APIClient
from accounts.models import User, Company
from crm.models import Note

def run_test():
    company, _ = Company.objects.get_or_create(name="Test Company")
    
    # Manager is Secondary Admin
    user, _ = User.objects.get_or_create(
        email="test_manager@example.com",
        defaults={
            "username": "test_manager",
            "role": "manager",
            "company": company,
            "password": "password123",
        }
    )
    user.set_password("password123")
    user.save()

    client = APIClient(SERVER_NAME="localhost")
    client.force_authenticate(user=user)
    
    response = client.post('/api/v1/crm/notes/', data={"content": "Hello World!"})
    
    print(f"POST status code: {response.status_code}")
    if response.status_code != 201:
        content = response.content.decode()
        match = re.search(r'<title>(.*?)</title>', content)
        if match:
            print("EXCEPTION:", match.group(1))
        else:
            print("RESPONSE:", content[:500])

if __name__ == "__main__":
    run_test()
