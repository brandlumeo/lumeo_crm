import os
import django
import random

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from companies.models import Company, PlatformSettings
from subscriptions.models import Subscription, Plan

def seed():
    print("Seeding SaaS Data...")

    # 1. Platform Settings
    settings = PlatformSettings.get_settings()
    settings.stripe_public_key = "pk_test_51MockStripeKey12345"
    settings.support_email = "help@lumeocrm.com"
    settings.enable_ai_features = True
    settings.enable_custom_domains = True
    settings.save()
    print("Platform Settings updated.")

    # 2. Subscriptions for all companies
    companies = Company.objects.all()
    plans = [Plan.FREE, Plan.STARTER, Plan.PRO, Plan.ENTERPRISE]
    
    for c in companies:
        sub, created = Subscription.objects.get_or_create(company=c)
        if created or sub.plan == Plan.FREE:
            # Assign a random plan for demo purposes
            sub.plan = random.choice(plans)
            sub.is_active = random.choice([True, True, True, False]) # Mostly active
            sub.save()
            print(f"Updated subscription for {c.name}: {sub.plan} (Active: {sub.is_active})")
            
    print("Done seeding SaaS data.")

if __name__ == "__main__":
    seed()
