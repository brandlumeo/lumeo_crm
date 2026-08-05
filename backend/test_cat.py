import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from crm.models import ServiceCategory
from accounts.models import User
import json

cat = ServiceCategory.objects.filter(id=4).first()
if cat:
    print(f"Service Category 4: name={cat.name}, company={cat.company_id}")
else:
    print("Service Category 4 does not exist.")

user = User.objects.filter(email='test@gmail.com').first()
if user:
    print(f"User: email={user.email}, company={user.company_id}, superuser={user.is_superuser}")
else:
    user = User.objects.first()
    print(f"User: email={user.email}, company={user.company_id}, superuser={user.is_superuser}")
