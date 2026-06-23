import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from accounts.models import User
from crm.models import Lead

user = User.objects.filter(is_superuser=False).first()
company = user.company

print(f"Company: {company.name if company else 'None'}")

leads = Lead.objects.filter(company=company)
print(f"Total leads: {leads.count()}")
for lead in leads[:10]:
    print(f"- {lead.name} ({lead.email})")

