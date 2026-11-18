from django.db import migrations, models


def set_regime_from_company(apps, schema_editor):
    """India -> GST, UAE -> VAT, others -> generic (mirrors Bill.default_tax_regime)."""
    Bill = apps.get_model("crm", "Bill")
    for bill in Bill.objects.select_related("company").iterator():
        company = bill.company
        country = (company.country or "").strip().lower()
        currency = (company.currency or "").strip().upper()
        if ("india" in country or country in {"in", "ind", "bharat"}) or (not country and currency == "INR"):
            regime = "in_gst"
        elif ("emirates" in country or "uae" in country.replace(".", "") or country in {"ae", "are", "dubai", "abu dhabi", "sharjah"}) or (not country and currency == "AED"):
            regime = "ae_vat"
        else:
            regime = "generic"
        if regime != "in_gst":
            # Non-Indian bills never carry a CGST/SGST split.
            bill.cgst_amount = 0
            bill.sgst_amount = 0
            bill.igst_amount = 0
        bill.tax_regime = regime
        bill.save(update_fields=["tax_regime", "cgst_amount", "sgst_amount", "igst_amount"])


class Migration(migrations.Migration):

    dependencies = [
        ("crm", "0062_bill_gst_tds"),
    ]

    operations = [
        migrations.RenameField(model_name="bill", old_name="vendor_gstin", new_name="vendor_tax_id"),
        migrations.AlterField(
            model_name="bill",
            name="vendor_tax_id",
            field=models.CharField(blank=True, default="", help_text="GSTIN (India), TRN (UAE) or other tax number", max_length=30),
        ),
        migrations.AddField(
            model_name="bill",
            name="tax_regime",
            field=models.CharField(choices=[("in_gst", "India GST"), ("ae_vat", "UAE VAT"), ("generic", "Generic tax")], default="in_gst", max_length=10),
        ),
        migrations.AddField(
            model_name="bill",
            name="reverse_charge",
            field=models.BooleanField(default=False, help_text="Recipient self-accounts the tax; vendor is paid the pre-tax amount"),
        ),
        migrations.AddField(
            model_name="bill",
            name="reverse_charge_amount",
            field=models.DecimalField(decimal_places=2, default=0.0, max_digits=12),
        ),
        migrations.AddField(
            model_name="billitem",
            name="tax_category",
            field=models.CharField(blank=True, choices=[("standard", "Standard"), ("zero", "Zero-rated"), ("exempt", "Exempt")], default="", max_length=10),
        ),
        migrations.RunPython(set_regime_from_company, migrations.RunPython.noop),
    ]
