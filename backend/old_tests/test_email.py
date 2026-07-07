import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.core.mail import send_mail
from django.conf import settings

try:
    print("Testing with DEFAULT_FROM_EMAIL", settings.DEFAULT_FROM_EMAIL)
    send_mail(
        subject="Test Email Default From",
        message="This is a test email.",
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=["dev.shamils@gmail.com"], # A valid gmail just to test if it sends out
        fail_silently=False,
    )
    print("Email sent successfully with DEFAULT_FROM_EMAIL!")
except Exception as e:
    import traceback
    traceback.print_exc()

try:
    print("\nTesting with EMAIL_HOST_USER", settings.EMAIL_HOST_USER)
    send_mail(
        subject="Test Email Host User",
        message="This is a test email.",
        from_email=settings.EMAIL_HOST_USER,
        recipient_list=["dev.shamils@gmail.com"], 
        fail_silently=False,
    )
    print("Email sent successfully with EMAIL_HOST_USER!")
except Exception as e:
    import traceback
    traceback.print_exc()
