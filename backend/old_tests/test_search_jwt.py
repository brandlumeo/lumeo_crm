import os
import django
import urllib.request
import json

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from accounts.models import User
from rest_framework_simplejwt.tokens import RefreshToken

user = User.objects.filter(is_superuser=False).first()
if not user:
    print("No normal user found")
    exit()

refresh = RefreshToken.for_user(user)
access_token = str(refresh.access_token)

req = urllib.request.Request('http://localhost:8000/api/v1/crm/search/?q=le')
req.add_header('Cookie', f'lumeo_access={access_token}')

try:
    response = urllib.request.urlopen(req)
    print("Status:", response.getcode())
    print("Data:", response.read().decode())
except urllib.error.HTTPError as e:
    print("HTTPError:", e.code)
    print("Content:", e.read().decode())
except Exception as e:
    print("Error:", e)
