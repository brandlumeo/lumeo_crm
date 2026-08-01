import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from crm.models import Lead

lead = Lead.objects.filter(source='WhatsApp').last()
if lead:
    print(f"Lead Found: {lead.name} | Phone: {lead.mobile} | Status: {lead.status} | Email: {lead.email}")
else:
    print("No WhatsApp lead found.")
