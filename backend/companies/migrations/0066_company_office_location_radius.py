from django.db import migrations, models


def seed_brandlumeo_office_coords(apps, schema_editor):
    Company = apps.get_model('companies', 'Company')
    # Seed Brandlumeo with current office coordinates and 100m radius
    Company.objects.filter(name__icontains="Brandlumeo").update(
        office_latitude=11.522912,
        office_longitude=75.636243,
        office_radius_meters=100,
        clock_in_location_radius_check=True,
    )


class Migration(migrations.Migration):

    dependencies = [
        ('companies', '0065_company_half_day_settings'),
    ]

    operations = [
        migrations.AddField(
            model_name='company',
            name='office_latitude',
            field=models.DecimalField(
                blank=True,
                decimal_places=6,
                help_text='Latitude coordinates of the office location.',
                max_digits=9,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name='company',
            name='office_longitude',
            field=models.DecimalField(
                blank=True,
                decimal_places=6,
                help_text='Longitude coordinates of the office location.',
                max_digits=9,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name='company',
            name='office_radius_meters',
            field=models.IntegerField(
                default=100,
                help_text='Allowed radius in meters for office clock-in.',
            ),
        ),
        migrations.RunPython(seed_brandlumeo_office_coords, migrations.RunPython.noop),
    ]

