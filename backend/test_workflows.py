import os
import django
import sys
from datetime import timedelta

# Set up Django environment
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.conf import settings
settings.EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"

from django.utils import timezone
from companies.models import Company
from accounts.models import User
from crm.models import Lead, Deal, Task, WorkflowRule
from notifications.models import Notification

def run_tests():
    print("==================================================")
    print("STARTING WORKFLOW AUTOMATION VERIFICATION TEST")
    print("==================================================")
    
    # 1. Fetch or create test company
    company, created = Company.objects.get_or_create(
        slug="lumeo-test-company",
        defaults={"name": "Lumeo Test Corp", "status": "active"}
    )
    print(f"Company: {company.name} ({'Created' if created else 'Existing'})")
    
    # 2. Fetch or create test user
    try:
        user = User.objects.get(username="workflow_tester")
        u_created = False
    except User.DoesNotExist:
        user = User(
            username="workflow_tester",
            email="tester@lumeo.com",
            company=company,
            role="admin",
            is_active=True
        )
        user.set_password("testpass123")
        user.save()
        u_created = True
    print(f"User: {user.username} ({'Created' if u_created else 'Existing'})")

    # Clear old test data to ensure clean run
    WorkflowRule.objects.filter(company=company).delete()
    Task.objects.filter(company=company).delete()
    Notification.objects.filter(user=user, title__icontains="Hot Lead").delete()
    Lead.objects.filter(company=company, name="Jane Doe").delete()
    Deal.objects.filter(company=company, title="Big Enterprise Agreement").delete()

    # 3. Create DEAL_WON trigger rule to CREATE_TASK
    won_rule = WorkflowRule.objects.create(
        company=company,
        name="Spawn Won Deal Checklist",
        trigger_event=WorkflowRule.TriggerEvent.DEAL_WON,
        action_type=WorkflowRule.ActionType.CREATE_TASK,
        action_payload={
            "task_title": "Setup onboarding workspace for {record_name}",
            "due_days_offset": 5
        },
        is_active=True
    )
    print(f"Created Won Deal Rule: {won_rule.name}")

    # 4. Create LEAD_QUALIFIED trigger rule to SEND_NOTIFICATION
    lead_rule = WorkflowRule.objects.create(
        company=company,
        name="Alert on Qualified Lead",
        trigger_event=WorkflowRule.TriggerEvent.LEAD_QUALIFIED,
        action_type=WorkflowRule.ActionType.SEND_NOTIFICATION,
        action_payload={
            "notification_title": "Hot Lead Qualified: {record_name}",
            "notification_body": "Please contact {record_name} within 2 hours."
        },
        is_active=True
    )
    print(f"Created Lead Qualified Rule: {lead_rule.name}")

    # 5. Create a Lead and transition to Qualified
    print("\n--- Testing Lead Trigger ---")
    lead = Lead.objects.create(
        company=company,
        name="Jane Doe",
        email="jane@example.com",
        status=Lead.Status.NEW,
        assigned_to=user
    )
    print(f"Created Lead: {lead.name} (Status: {lead.status})")
    
    # Update status to Qualified
    lead.status = Lead.Status.QUALIFIED
    lead.save()
    print(f"Updated Lead status to: {lead.status}")
    
    # Verify Notification
    notifications = Notification.objects.filter(user=user, title__icontains="Hot Lead")
    if notifications.exists():
        notif = notifications.first()
        print(f"[SUCCESS] Notification Verified! Title: '{notif.title}', Body: '{notif.body}'")
    else:
        print("[ERROR] No notification was created.")
        sys.exit(1)

    # 6. Create a Deal and transition to Won
    print("\n--- Testing Deal Trigger ---")
    deal = Deal.objects.create(
        company=company,
        title="Big Enterprise Agreement",
        amount=15000.00,
        stage=Deal.Stage.PROSPECT
    )
    print(f"Created Deal: '{deal.title}' (Stage: {deal.stage})")
    
    # Update stage to Won
    deal.stage = Deal.Stage.WON
    deal.save()
    print(f"Updated Deal stage to: {deal.stage}")
    
    # Verify Task
    tasks = Task.objects.filter(company=company, title__icontains="Setup onboarding")
    if tasks.exists():
        task = tasks.first()
        expected_due = timezone.localdate() + timedelta(days=5)
        print(f"[SUCCESS] Task Verified! Title: '{task.title}', Due: {task.due_date} (Expected: {expected_due})")
        if task.due_date != expected_due:
            print(f"[ERROR] Task due date is incorrect: {task.due_date}")
            sys.exit(1)
    else:
        print("[ERROR] No task was created.")
        sys.exit(1)

    print("\n==================================================")
    print("ALL WORKFLOW TESTS COMPLETED SUCCESSFULLY!")
    print("==================================================")

if __name__ == "__main__":
    run_tests()
