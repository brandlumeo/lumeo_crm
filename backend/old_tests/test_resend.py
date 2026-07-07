import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.core.mail import send_mail
from django.core.mail.backends.smtp import EmailBackend
import traceback

backend = EmailBackend(
    host='smtp.resend.com',
    port=587,
    username='resend',
    password='re_Qr99RNRN_ARsAYJTphK7DnjRFDHcoD4QL',
    use_tls=True,
    use_ssl=False
)

try:
    print("Testing Resend SMTP...")
    send_mail(
        subject="Test Email Resend",
        message="This is a test email.",
        from_email="notifications@lumeo.estgrp.in",
        recipient_list=["dev.shamils@gmail.com"], 
        fail_silently=False,
        connection=backend
    )
    print("Email sent successfully with Resend!")
except Exception as e:
    traceback.print_exc()
