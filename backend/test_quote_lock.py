import os
import django
from django.test import RequestFactory

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from crm.models import Quote, Company, Lead
from accounts.models import User
from crm.serializers import QuoteSerializer

# Setup data
company = Company.objects.first()
user = User.objects.filter(company=company).first()

quote = Quote.objects.create(
    company=company,
    quote_number="QT-TEST-123",
    title="Test Quote",
    subtotal=100
)

factory = RequestFactory()
request = factory.put('/api/v1/crm/quotes/')
request.user = user

# Test 1: Update unlocked quote
serializer = QuoteSerializer(quote, data={"title": "Updated Title", "company_id": str(company.id)}, partial=True, context={'request': request})
if serializer.is_valid():
    serializer.save()
    print("Test 1: Unlocked Quote updated successfully.")
else:
    print("Test 1 Failed:", serializer.errors)

# Test 2: Lock quote
quote.is_locked = True
quote.save()
print("Quote is now locked.")

# Test 3: Attempt to update locked quote
request = factory.put('/api/v1/crm/quotes/')
request.user = user
serializer = QuoteSerializer(quote, data={"title": "Hacked Title", "company_id": str(company.id)}, partial=True, context={'request': request})
if serializer.is_valid():
    try:
        serializer.save()
        print("Test 3 Failed: Locked Quote was updated!")
    except Exception as e:
        print("Test 3: Locked Quote prevented update ->", str(e))
else:
    print("Test 3: Locked Quote prevented update via validation ->", serializer.errors)
