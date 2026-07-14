import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()
from django.test import Client

c = Client()
r = c.post(
    '/api/v1/accounts/token/', 
    data={'username': 'brandlumeollp@gmail.com', 'password': 'wrongpassword'},
    content_type='application/json',
    HTTP_HOST='localhost',
    HTTP_X_FORWARDED_FOR='192.168.1.1, 192.168.1.2'
)
print(r.status_code)
if r.status_code == 500:
    import re
    m = re.search(r'<title>(.*?)</title>', r.content.decode('utf-8'))
    print(m.group(1) if m else r.content.decode('utf-8')[:1000])
else:
    print(r.content.decode('utf-8')[:1000])
