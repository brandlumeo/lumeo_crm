import os
import django
from datetime import timedelta
from django.utils import timezone
import random

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from companies.models import Company
from accounts.models import User
from crm.models import Deal, Lead, Customer

def seed_analytics():
    company = Company.objects.first()
    users = list(User.objects.filter(company=company))
    if not company or not users:
        print("No company or users found.")
        return

    now = timezone.now()
    
    # Create multiple historical Deals for Revenue & Velocity
    stages = ["prospect", "qualified", "proposal", "negotiation", "won", "lost"]
    
    print("Creating historical deals...")
    for i in range(50):
        stage = random.choices(stages, weights=[10, 10, 10, 10, 30, 20], k=1)[0]
        user = random.choice(users)
        
        deal = Deal.objects.create(
            company=company,
            title=f"Analytics Seed Deal {i}",
            amount=random.randint(1000, 500000),
            stage=stage,
            assigned_to=user,
        )
        
        # Override dates
        days_ago = random.randint(10, 150)
        created_at = now - timedelta(days=days_ago)
        
        # If won or lost, it closed later
        updated_at = created_at + timedelta(days=random.randint(5, 40))
        
        Deal.objects.filter(id=deal.id).update(created_at=created_at, updated_at=updated_at)
        
    print("Creating historical leads...")
    lead_statuses = ["new", "contacted", "qualified", "lost", "won"]
    for i in range(80):
        status = random.choices(lead_statuses, weights=[20, 20, 20, 15, 25], k=1)[0]
        user = random.choice(users)
        
        lead = Lead.objects.create(
            company=company,
            name=f"Analytics Seed Lead {i}",
            email=f"lead_{random.randint(1000,9999)}@example.com",
            status=status,
            assigned_to=user,
        )
        
        days_ago = random.randint(10, 150)
        created_at = now - timedelta(days=days_ago)
        Lead.objects.filter(id=lead.id).update(created_at=created_at, updated_at=created_at)

    print("Analytics data seeding complete.")

if __name__ == "__main__":
    seed_analytics()
