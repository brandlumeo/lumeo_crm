import os
import django
from decimal import Decimal

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from crm.models import Deal, Quote, CustomFieldDefinition
from companies.models import Company

print("=== STARTING LESKOR END-TO-END UAT ===")

company, _ = Company.objects.get_or_create(name="Leskor Metal Industries LLC")

# Setup Custom Fields
rev_field, _ = CustomFieldDefinition.objects.get_or_create(
    company=company,
    model_name="deal",
    name="Current Revision Level",
    defaults={"label": "Current Revision Level", "field_type": "text"}
)

# Step 1: New Enquiry (PROSPECT)
print("\n[Step 1] Creating Deal (New Enquiry)")
deal = Deal.objects.create(
    company=company,
    title="Façade Installation - Tower B",
    amount=Decimal("150000.00"),
    stage=Deal.Stage.PROSPECT,
    custom_data={"Current Revision Level": "Rev-00"}
)
print(f"Deal created: {deal.title} | Stage: {deal.stage} | Value: {deal.amount}")
print(f"Initial Revision: {deal.custom_data.get('Current Revision Level')}")

# Step 2: Under Estimation
print("\n[Step 2] Moving to Under Estimation (QUALIFIED) and drafting Quote")
deal.stage = Deal.Stage.QUALIFIED
deal.save()

quote = Quote.objects.create(
    company=company,
    deal=deal,
    title="Initial Estimate",
    quote_number="QT-LES-1786086791",
    subtotal=Decimal("150000.00")
)
print(f"Deal moved to {deal.stage}. Quote '{quote.title}' drafted.")

# Step 3: Submitted / Tender (PROPOSAL) and Revision Bump
print("\n[Step 3] Submitting Quote and Updating Revision Level")
deal.stage = Deal.Stage.PROPOSAL
deal.custom_data["Current Revision Level"] = "Rev-01"
deal.save()

quote.status = Quote.Status.SENT
quote.save()
print(f"Deal stage: {deal.stage}")
print(f"Current Revision updated to: {deal.custom_data.get('Current Revision Level')}")

# Step 4: Approval / Closed Won
print("\n[Step 4] Client Approves -> Closed Won")
deal.stage = Deal.Stage.WON
deal.save()

quote.is_locked = True
quote.status = Quote.Status.ACCEPTED
quote.save()

# Validate Pipeline Value Forecast
total_won = Deal.objects.filter(company=company, stage=Deal.Stage.WON).count()
total_value = sum(d.amount for d in Deal.objects.filter(company=company, stage=Deal.Stage.WON))
print(f"\n[Validation] Closed Won Deals: {total_won} | Total Booked Value: {total_value}")

if total_value >= Decimal("150000.00") and quote.is_locked:
    print("\n✅ END-TO-END UAT PASSED SUCESSFULLY.")
else:
    print("\n❌ UAT FAILED.")
