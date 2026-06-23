import os
import django
import random
from django.utils import timezone
from datetime import timedelta

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from companies.models import Company
from accounts.models import User
from crm.models import Campaign, Ticket
from attendance.models import ExpenseClaim, OfficeAsset

def seed():
    print("Seeding full tenant data for Tickets, Campaigns, Expenses, and Assets...")
    companies = Company.objects.all()

    for c in companies:
        users = list(User.objects.filter(company=c))
        if not users:
            continue

        owner = users[0]

        # 1. Tickets
        if not Ticket.objects.filter(company=c).exists():
            Ticket.objects.create(company=c, assigned_to=owner, subject="Cannot login to portal", description="Getting 403 error", priority="high", status="open")
            Ticket.objects.create(company=c, assigned_to=owner, subject="Need new feature", description="Can we add custom fields?", priority="low", status="in_progress")
            print(f"Created tickets for {c.name}")

        # 2. Campaigns
        if not Campaign.objects.filter(company=c).exists():
            Campaign.objects.create(company=c, name="Summer Sale", subject="Huge Discounts!", body_html="<p>Get 50% off today.</p>", target_audience="all_leads", status="draft")
            Campaign.objects.create(company=c, name="Welcome Series", subject="Welcome aboard", body_html="<p>Thanks for joining.</p>", target_audience="all_customers", status="completed", sent_count=150, failed_count=2)
            print(f"Created campaigns for {c.name}")

        # 3. Expenses
        if not ExpenseClaim.objects.filter(user__company=c).exists():
            ExpenseClaim.objects.create(user=owner, company=c, title="Client Dinner", amount=150.00, status="approved", approved_by=owner)
            ExpenseClaim.objects.create(user=owner, company=c, title="Office Supplies", amount=45.50, status="pending")
            print(f"Created expenses for {c.name}")

        # 4. Assets
        if not OfficeAsset.objects.filter(company=c).exists():
            OfficeAsset.objects.create(company=c, name="MacBook Pro M3", serial_number="MBP-123", condition="new", assigned_to=owner)
            OfficeAsset.objects.create(company=c, name="Dell UltraSharp 27", serial_number="DEL-456", condition="good")
            print(f"Created assets for {c.name}")

    print("Done seeding tenant data.")

if __name__ == "__main__":
    seed()
