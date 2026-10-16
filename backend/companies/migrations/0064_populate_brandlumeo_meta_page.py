from django.db import migrations, models

def populate_brandlumeo_page(apps, schema_editor):
    Company = apps.get_model('companies', 'Company')
    companies = Company.objects.filter(
        models.Q(name__icontains='MARKETING LLP') | models.Q(name__icontains='Brandlumeo')
    )
    for c in companies:
        c.meta_page_id = '948966634966746'
        c.meta_page_name = 'Brandlumeo'
        c.meta_leadgen_subscribed = True
        c.save(update_fields=['meta_page_id', 'meta_page_name', 'meta_leadgen_subscribed'])

def reverse_func(apps, schema_editor):
    pass

class Migration(migrations.Migration):
    dependencies = [
        ('companies', '0063_company_meta_leadgen_subscribed_and_more'),
    ]
    operations = [
        migrations.RunPython(populate_brandlumeo_page, reverse_func),
    ]
