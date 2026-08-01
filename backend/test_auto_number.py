import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from companies.models import Company
from crm.models import Lead, CustomFieldDefinition

# 1. Get or create Company
company, _ = Company.objects.get_or_create(name="Leskor Metal Industries LLC")

# 2. Setup the custom field
CustomFieldDefinition.objects.get_or_create(
    company=company,
    model_name="lead",
    name="ENQ Number",
    defaults={
        "label": "ENQ Number",
        "field_type": "text"
    }
)

# 3. Create the first Lead
lead1 = Lead.objects.create(
    company=company,
    name="Test Lead 1",
    email="test1@example.com",
    mobile="111111111"
)
print(f"Lead 1 ID: {lead1.id}, ENQ Number: {lead1.custom_data.get('ENQ Number')}")

# 4. Create the second Lead
lead2 = Lead.objects.create(
    company=company,
    name="Test Lead 2",
    email="test2@example.com",
    mobile="222222222"
)
print(f"Lead 2 ID: {lead2.id}, ENQ Number: {lead2.custom_data.get('ENQ Number')}")
