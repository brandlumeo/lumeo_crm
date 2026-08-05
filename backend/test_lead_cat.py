import os
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from crm.models import Company, ServiceCategory
from accounts.models import User
from crm.serializers import LeadSerializer
from django.test import RequestFactory

user = User.objects.filter(is_superuser=False).first()
if not user:
    company = Company.objects.create(name="Test Company")
    user = User.objects.create(email="testuser@example.com", company=company, role="ADMIN")

cat = ServiceCategory.objects.create(name="Test Category", company=user.company)

factory = RequestFactory()
request = factory.post('/api/v1/crm/leads/')
request.user = user

data = {
    "name": "Test Lead",
    "email": "test@lead.com",
    "status": "new",
    "category_ids": [cat.id]
}

print(f"User company_id: {user.company_id}")
print(f"Cat company_id: {cat.company_id}")
qs = ServiceCategory.objects.filter(company_id=user.company_id)
print(f"QS categories for user company: {list(qs.values_list('id', flat=True))}")

serializer = LeadSerializer(data=data, context={'request': request})
qs = serializer.fields['category_ids'].child_relation.queryset
print(f"Serializer category_ids queryset: {list(qs.values_list('id', flat=True))}")
try:
    obj = qs.get(pk=cat.id)
    print(f"Found object via get(): {obj}")
except Exception as e:
    print(f"Error calling get(): {e}")

is_valid = serializer.is_valid()
print(f"Is Valid: {is_valid}")
if not is_valid:
    print(f"Errors: {serializer.errors}")

