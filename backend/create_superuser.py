import os
from django.contrib.auth import get_user_model

User = get_user_model()

email = os.environ.get('SUPERUSER_EMAIL', 'admin@lumeo.com')
password = os.environ.get('SUPERUSER_PASSWORD', 'AdminPassword123!')
username = email

if not User.objects.filter(email=email).exists():
    print(f"Creating superuser: {email}")
    User.objects.create_superuser(username=username, email=email, password=password)
    print("Superuser created successfully!")
else:
    print(f"Superuser {email} already exists.")
