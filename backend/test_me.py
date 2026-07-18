import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()
from django.test import Client
from accounts.models import User

u = User.objects.first()
u.set_password('password123')
u.save()

c = Client()
r = c.post(
    '/api/v1/accounts/token/', 
    data={'username': u.username, 'password': 'password123'},
    content_type='application/json',
    HTTP_HOST='localhost',
    REMOTE_ADDR='127.0.0.1'
)
import json
access = json.loads(r.content)['access']

r2 = c.get(
    '/api/v1/accounts/me/',
    HTTP_AUTHORIZATION=f'Bearer {access}',
    HTTP_HOST='localhost',
    REMOTE_ADDR='127.0.0.1'
)
print(r2.status_code)
if r2.status_code >= 500:
    import re
    m = re.search(r'<title>(.*?)</title>', r2.content.decode('utf-8'))
    print(m.group(1) if m else r2.content.decode('utf-8'))
else:
    print(r2.content.decode('utf-8')[:1000])
