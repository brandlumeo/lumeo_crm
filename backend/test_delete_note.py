import os
import django
import re

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from accounts.models import User
from crm.models import Note
from rest_framework.test import APIClient

admin_user = User.objects.filter(role="admin").first()
note = Note.objects.filter(company=admin_user.company).first()
if not note:
    note = Note.objects.create(company=admin_user.company, content="Test note to delete")

client = APIClient(SERVER_NAME="testserver")
client.force_authenticate(user=admin_user)
response = client.delete(f"/api/v1/crm/notes/{note.id}/", HTTP_HOST="testserver")
if response.status_code != 204:
    content = response.content.decode()
    match = re.search(r'<title>(.*?)</title>', content)
    if match:
        print("EXCEPTION:", match.group(1))
    else:
        print("RESPONSE:", content[:500])
else:
    print("SUCCESS 204")
