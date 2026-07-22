from django.db import migrations
import re

def clean_last_names(apps, schema_editor):
    User = apps.get_model('accounts', 'User')
    email_regex = re.compile(r'[^@]+@[^@]+\.[^@]+')
    users_to_update = []
    for user in User.objects.all():
        if user.last_name and email_regex.match(user.last_name):
            user.last_name = ''
            users_to_update.append(user)
    if users_to_update:
        User.objects.bulk_update(users_to_update, ['last_name'])

class Migration(migrations.Migration):
    dependencies = [
        ('accounts', '0016_alter_teaminvitation_role_alter_user_role'),
    ]
    operations = [
        migrations.RunPython(clean_last_names),
    ]
