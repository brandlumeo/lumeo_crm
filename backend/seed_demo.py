import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from companies.models import Company
from accounts.models import User
from crm.models import Product, Lead, Attachment, Customer, Deal, Quote, QuoteLineItem, Invoice, InvoiceLineItem, CustomFieldDefinition
from django.core.files.base import ContentFile

def seed():
    company = Company.objects.first()
    user = User.objects.first()
    
    if not company or not user:
        print("No company or user found. Cannot seed data.")
        return

    # 1. Custom Field Definitions (Step T)
    cf_lead, _ = CustomFieldDefinition.objects.get_or_create(
        company=company,
        model_name="lead",
        name="industry_segment",
        defaults={
            "label": "Industry Segment",
            "field_type": "text",
            "required": False
        }
    )
    print(f"Lead custom field seeded: {cf_lead.label}")

    cf_deal_po, _ = CustomFieldDefinition.objects.get_or_create(
        company=company,
        model_name="deal",
        name="external_po_number",
        defaults={
            "label": "External PO Number",
            "field_type": "text",
            "required": False
        }
    )
    print(f"Deal custom field PO seeded: {cf_deal_po.label}")

    cf_deal_mig, _ = CustomFieldDefinition.objects.get_or_create(
        company=company,
        model_name="deal",
        name="custom_migration_required",
        defaults={
            "label": "Custom Migration Required",
            "field_type": "boolean",
            "required": False
        }
    )
    print(f"Deal custom field Migration seeded: {cf_deal_mig.label}")

    # 2. Product (Step R)
    prod, created = Product.objects.get_or_create(
        company=company,
        name="Enterprise CRM Setup",
        defaults={
            "sku": "SVC-ENT-001",
            "description": "Full enterprise deployment and data migration services.",
            "price": 250000.00,
            "tax_rate": 18.00,
            "is_active": True
        }
    )
    print(f"Product {'created' if created else 'found'}: {prod.name} - {prod.price} INR")

    # 3. Document Library (Step Q)
    lead = Lead.objects.filter(company=company).first()
    if not lead:
        lead = Lead.objects.create(
            company=company,
            name="Acme Corp Lead",
            email="contact@acme.inc",
            status="new",
            assigned_to=user,
            custom_data={"industry_segment": "Logistics & Supply Chain"}
        )
    else:
        lead.custom_data = {"industry_segment": "Logistics & Supply Chain"}
        lead.save()
    
    dummy_content = b"Lumeo CRM Integration Requirements"
    att = Attachment(
        company=company,
        lead=lead,
        uploaded_by=user,
        file_name="requirements.txt",
        file_size=len(dummy_content),
        content_type="text/plain"
    )
    att.file.save("requirements.txt", ContentFile(dummy_content))
    print(f"Attachment uploaded to Lead '{lead.name}': {att.file.name}")

    # 4. Quotes & Invoices (Step S)
    customer, _ = Customer.objects.get_or_create(
        company=company,
        email="billing@acme.inc",
        defaults={
            "name": "Acme Corporation",
            "phone": "+91 9876543210"
        }
    )
    print(f"Customer ready: {customer.name}")

    deal = Deal.objects.filter(company=company, title="Acme Enterprise Upgrade Package").first()
    if not deal:
        deal = Deal.objects.create(
            company=company,
            title="Acme Enterprise Upgrade Package",
            amount=250000.00,
            stage="won",
            custom_data={
                "external_po_number": "PO-987-ACME",
                "custom_migration_required": True
            }
        )
    else:
        deal.custom_data = {
            "external_po_number": "PO-987-ACME",
            "custom_migration_required": True
        }
        deal.save()
    print(f"Deal ready: {deal.title}")

    quote, q_created = Quote.objects.get_or_create(
        company=company,
        deal=deal,
        quote_number="QT-DEMO-ACME01",
        defaults={
            "title": "Acme CRM Enterprise Quote",
            "status": "accepted"
        }
    )
    if q_created:
        QuoteLineItem.objects.create(
            quote=quote,
            product=prod,
            name=prod.name,
            description="Acme deployment bundle",
            quantity=1,
            unit_price=prod.price,
            tax_rate=prod.tax_rate
        )
        quote.calculate_totals()
    print(f"Quote ready: {quote.quote_number} (Total: {quote.total})")

    invoice, i_created = Invoice.objects.get_or_create(
        company=company,
        deal=deal,
        customer=customer,
        invoice_number="INV-DEMO-ACME01",
        defaults={
            "status": "paid"
        }
    )
    if i_created:
        InvoiceLineItem.objects.create(
            invoice=invoice,
            product=prod,
            name=prod.name,
            description="CRM onboarding services",
            quantity=1,
            unit_price=prod.price,
            tax_rate=prod.tax_rate
        )
        invoice.calculate_totals()
    print(f"Invoice ready: {invoice.invoice_number} (Total: {invoice.total})")

if __name__ == "__main__":
    seed()
