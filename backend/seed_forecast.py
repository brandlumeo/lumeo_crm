import os
import django
from datetime import timedelta
from django.utils import timezone
import random

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from companies.models import Company
from crm.models import Deal

def set_expected_close_dates():
    company = Company.objects.first()
    if not company:
        return
        
    now = timezone.now().date()
    
    active_deals = Deal.objects.filter(company=company).exclude(stage__in=["won", "lost"])
    
    for deal in active_deals:
        # future date within next 3 months
        days_ahead = random.randint(5, 90)
        deal.expected_close_date = now + timedelta(days=days_ahead)
        deal.save(update_fields=['expected_close_date'])

    print(f"Updated expected_close_date for {active_deals.count()} deals.")

if __name__ == "__main__":
    set_expected_close_dates()
