import os
import django
import sys

# Set up Django environment
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from accounts.models import User
from crm.models import WorkflowRule, WorkflowSequence, WorkflowStep

user = User.objects.filter(username='shamil').first()
if not user or not user.company:
    print("User 'shamil' or company not found.")
    sys.exit(1)

company = user.company
print(f"Seeding workflows for company: {company.name}...")

# 1. Create Rules
won_rule, created = WorkflowRule.objects.get_or_create(
    company=company,
    name="Won Deal Checklist Rule",
    defaults={
        "trigger_event": WorkflowRule.TriggerEvent.DEAL_WON,
        "action_type": WorkflowRule.ActionType.CREATE_TASK,
        "action_payload": {
            "task_title": "Setup workspace for won deal: {record_name}",
            "due_days_offset": 3
        },
        "is_active": True
    }
)
print(f" - Won Deal Rule: {'Created' if created else 'Already exists'}")

lost_rule, created = WorkflowRule.objects.get_or_create(
    company=company,
    name="Lost Deal Alert Rule",
    defaults={
        "trigger_event": WorkflowRule.TriggerEvent.DEAL_LOST,
        "action_type": WorkflowRule.ActionType.SEND_NOTIFICATION,
        "action_payload": {
            "notification_title": "Deal Lost Alert: {record_name}",
            "notification_body": "Analyze reasons for losing the deal: {record_name}"
        },
        "is_active": True
    }
)
print(f" - Lost Deal Rule: {'Created' if created else 'Already exists'}")

qual_rule, created = WorkflowRule.objects.get_or_create(
    company=company,
    name="Qualified Lead Notification Rule",
    defaults={
        "trigger_event": WorkflowRule.TriggerEvent.LEAD_QUALIFIED,
        "action_type": WorkflowRule.ActionType.SEND_NOTIFICATION,
        "action_payload": {
            "notification_title": "Hot Lead Qualified Alert: {record_name}",
            "notification_body": "Please contact {record_name} asap."
        },
        "is_active": True
    }
)
print(f" - Qualified Lead Rule: {'Created' if created else 'Already exists'}")

# 2. Create Sequence
sequence, seq_created = WorkflowSequence.objects.get_or_create(
    company=company,
    name="Automated Nurture Sequence",
    defaults={
        "trigger_event": WorkflowSequence.TriggerEvent.LEAD_CREATED,
        "is_active": True
    }
)
print(f" - Automated Nurture Sequence: {'Created' if seq_created else 'Already exists'}")

if seq_created:
    # Step 1: Create Task
    WorkflowStep.objects.create(
        sequence=sequence,
        order=1,
        delay_minutes=0,
        action_type=WorkflowStep.ActionType.CREATE_TASK,
        action_payload={
            "task_title": "Initial outreach call for {record_name}",
            "due_days_offset": 1
        }
    )
    # Step 2: Send Email
    WorkflowStep.objects.create(
        sequence=sequence,
        order=2,
        delay_minutes=60, # 1 hour later
        action_type=WorkflowStep.ActionType.SEND_EMAIL,
        action_payload={
            "subject": "Welcome to our CRM, {{name}}",
            "body": "Hi {{name}},\n\nThanks for expressing interest. Let me know if you have any questions.\n\nBest,\nThe Team"
        }
    )
    print("   -> Added steps to Nurture Sequence (Task, Email).")

print("\nDone! Workflows successfully seeded.")
