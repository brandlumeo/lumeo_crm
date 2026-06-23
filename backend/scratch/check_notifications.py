import os
import django
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from accounts.models import User
from notifications.models import Notification
from crm.models import WorkflowRule, WorkflowSequence

user = User.objects.filter(username='shamil').first()
if not user:
    print("User 'shamil' not found.")
    sys.exit(1)

print(f"Found User: {user.username}, Company: {user.company.name if user.company else 'None'}")

# Check Notifications
notifications = Notification.objects.filter(user=user)
print(f"Total Notifications for '{user.username}': {notifications.count()}")
for notif in notifications[:5]:
    print(f" - {notif.title}: {notif.body}")

# Generate a test notification
if notifications.count() == 0:
    print("\nGenerating a test notification for 'shamil'...")
    Notification.objects.create(
        user=user,
        notification_type="general",
        title="Welcome to Lumeo CRM!",
        body="This is a test notification to ensure your alert system is working perfectly.",
    )
    print("Test notification created.")

# Check Workflow Rules for their company
if user.company:
    rules = WorkflowRule.objects.filter(company=user.company)
    print(f"\nWorkflow Rules for company '{user.company.name}': {rules.count()}")
    for rule in rules:
        print(f" - {rule.name} (Trigger: {rule.trigger_event}) (Active: {rule.is_active})")
    
    seqs = WorkflowSequence.objects.filter(company=user.company)
    print(f"\nWorkflow Sequences for company '{user.company.name}': {seqs.count()}")
    for seq in seqs:
        print(f" - {seq.name} (Trigger: {seq.trigger_event}) (Active: {seq.is_active})")
else:
    print("User 'shamil' has no associated company.")
