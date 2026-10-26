from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('companies', '0064_populate_brandlumeo_meta_page'),
    ]

    operations = [
        migrations.AddField(
            model_name='company',
            name='half_day_start_time',
            field=models.TimeField(default='14:00:00', help_text='Start time of the half-day / afternoon shift.'),
        ),
        migrations.AddField(
            model_name='company',
            name='half_day_late_mark_after_minutes',
            field=models.IntegerField(default=15, help_text='Grace period in minutes after half_day_start_time before marking late.'),
        ),
    ]
