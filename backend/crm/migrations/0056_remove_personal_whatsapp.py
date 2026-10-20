from django.db import migrations

def remove_personal_whatsapp(apps, schema_editor):
    Company = apps.get_model('companies', 'Company')
    Lead = apps.get_model('crm', 'Lead')
    WhatsAppMessage = apps.get_model('crm', 'WhatsAppMessage')

    # 1. Clear WhatsApp Cloud API credentials so personal numbers are decoupled
    for company in Company.objects.all():
        updated = False
        if getattr(company, 'whatsapp_phone_number_id', None):
            company.whatsapp_phone_number_id = ''
            updated = True
        if getattr(company, 'whatsapp_access_token', None):
            company.whatsapp_access_token = ''
            updated = True
        if getattr(company, 'whatsapp_business_account_id', None):
            company.whatsapp_business_account_id = ''
            updated = True
        if updated:
            company.save(update_fields=['whatsapp_phone_number_id', 'whatsapp_access_token', 'whatsapp_business_account_id'])

    # 2. Delete the personal test lead (918137025202 / Test Lead Shamil)
    Lead.objects.filter(mobile__icontains='8137025202').delete()
    Lead.objects.filter(name__icontains='Test Lead Shamil').delete()

    # 3. Wipe all existing test WhatsApp messages from the database
    WhatsAppMessage.objects.all().delete()

def backwards(apps, schema_editor):
    pass

class Migration(migrations.Migration):

    dependencies = [
        ('crm', '0055_lead_quality'),
        ('companies', '0064_populate_brandlumeo_meta_page'),
    ]

    operations = [
        migrations.RunPython(remove_personal_whatsapp, backwards),
    ]
