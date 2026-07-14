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
print(r.status_code)
if r.status_code == 500:
    import re
    print(re.search(r'<title>(.*?)</title>', r.content.decode('utf-8')).group(1) if re.search(r'<title>(.*?)</title>', r.content.decode('utf-8')) else r.content)
else:
    print(r.content.decode('utf-8'))
