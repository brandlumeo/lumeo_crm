import os
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from rest_framework.test import APIClient
from crm.models import Deal, Company
from accounts.models import User

company, _ = Company.objects.get_or_create(name="Leskor Metal Industries LLC")
company.deal_pipelines = [{"name": "New Enquiry"}, {"name": "Under Estimation (Detail Workout)"}]
company.save()

user = User.objects.filter(company=company).first()

deal1 = Deal.objects.create(
    company=company,
    title="Test Deal 1",
    amount=1000,
    stage="new enquiry",
    row_order=0
)

print(f"Before Reorder: Deal {deal1.id} is in stage '{deal1.stage}'")

client = APIClient()
client.force_authenticate(user=user)

response = client.post(
    '/api/v1/crm/deals/reorder/',
    data=json.dumps({
        "deals": [
            {"id": deal1.id, "stage": "under estimation (detail workout)", "row_order": 1}
        ]
    }),
    content_type='application/json'
)

print(f"Response Status: {response.status_code}")
print(f"Response Data: {response.data}")

deal1.refresh_from_db()
print(f"After Reorder: Deal {deal1.id} is in stage '{deal1.stage}'")
