import os
import django
import sys
from django.conf import settings

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from rest_framework.test import APIClient
from accounts.models import User, Company
from crm.models import Note

def run_test():
    company, _ = Company.objects.get_or_create(name="Test Company")
    
    # Ensure secondary admin role exists in company roles
    company.roles = [
        {"id": "secondary_admin", "name": "Secondary Admin", "isAdmin": False, "permissions": {"notes": {"Delete": "All"}}}
    ]
    company.save()

    # Create secondary admin user
    user, _ = User.objects.get_or_create(
        email="secadmin@example.com",
        defaults={
            "username": "secadmin",
            "role": "secondary_admin",
            "company": company,
        }
    )
    user.set_password("password123")
    user.save()

    # Create Note
    note = Note.objects.create(company=company, content="Test note to delete")
    
    print(f"Created note {note.id}")
    
    client = APIClient()
    client.force_authenticate(user=user)
    
    response = client.delete(f'/api/v1/crm/notes/{note.id}/')
    
    print(f"DELETE status code: {response.status_code}")
    print(f"Note exists in DB? {Note.objects.filter(id=note.id).exists()}")

if __name__ == "__main__":
    run_test()
