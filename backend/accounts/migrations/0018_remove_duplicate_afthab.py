from django.db import migrations

def delete_duplicate_afthab(apps, schema_editor):
    User = apps.get_model('accounts', 'User')
    try:
        duplicate = User.objects.get(email='afthabnetnnet@gmail.com')
        duplicate.delete()
    except User.DoesNotExist:
        pass

class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0017_clean_up_last_names'),
    ]

    operations = [
        migrations.RunPython(delete_duplicate_afthab),
    ]
