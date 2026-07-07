import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()
from django.test import Client
from accounts.models import User
client = Client()
client.force_login(User.objects.filter(is_superuser=True).first())

response = client.get('/api/v1/crm/search/?q=pro')
if response.status_code != 200:
    import json
    try:
        print(response.json())
    except:
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(response.content, 'html.parser')
        print("ERROR:", soup.title.text if soup.title else "No Title")
        print("TRACE:", getattr(soup.find("div", {"id": "traceback_area"}), "text", "No traceback found"))
