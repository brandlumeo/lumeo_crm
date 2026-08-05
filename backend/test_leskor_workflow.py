import os
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from companies.models import Company

leskor = Company.objects.filter(name__icontains="Leskor").first()
if not leskor:
    print("Leskor company not found")
else:
    print(f"Company: {leskor.name}")
    print(f"Pipelines: {json.dumps(leskor.deal_pipelines, indent=2)}")
    pass
    
    from accounts.models import User
    users = User.objects.filter(company=leskor)
    print("\nUsers:")
    for u in users:
        print(f"- {u.email} (Role: {u.role})")
