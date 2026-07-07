import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.test import Client
from accounts.models import User

client = Client()
user = User.objects.filter(is_superuser=True).first()
if not user:
    print("No superuser found")
else:
    client.force_login(user)
    response = client.get('/api/v1/crm/search/?q=le')
    print("Status:", response.status_code)
    print("Data:", response.content)
