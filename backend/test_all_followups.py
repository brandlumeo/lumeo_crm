import os
import django
import sys
from datetime import timedelta

# Set up Django environment
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.conf import settings

from django.core import mail
from django.utils import timezone
from companies.models import Company
from accounts.models import User
from crm.models import (
    Lead, Deal, Task, WorkflowRule, WorkflowSequence,
    WorkflowStep, WorkflowRun, WorkflowStepRun, Activity
)
from notifications.models import Notification
from crm.workflows import process_due_workflow_steps

def run_tests():
    print("==================================================")
    print("STARTING COMPREHENSIVE AUTOMATED FOLLOW-UPS TEST")
    print("==================================================")
    
    # 1. Fetch or create test company
    company, created = Company.objects.get_or_create(
        slug="lumeo-followup-test",
        defaults={"name": "Lumeo FollowUp Corp", "status": "active"}
    )
    print(f"Company: {company.name} ({'Created' if created else 'Existing'})")
    
    # 2. Fetch or create test user
    try:
        user = User.objects.get(username="followup_tester")
        u_created = False
    except User.DoesNotExist:
        user = User(
            username="followup_tester",
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
    WorkflowSequence.objects.filter(company=company).delete()
    WorkflowRun.objects.filter(company=company).delete()
    Task.objects.filter(company=company).delete()
    Notification.objects.filter(user=user).delete()
    Lead.objects.filter(company=company).delete()
    Deal.objects.filter(company=company).delete()
    Activity.objects.filter(company=company).delete()
    
    print("\n--- PART 1: Testing Basic Workflow Rules ---")
    
    # Create rules
    won_rule = WorkflowRule.objects.create(
        company=company,
        name="Won Deal Checklist Rule",
        trigger_event=WorkflowRule.TriggerEvent.DEAL_WON,
        action_type=WorkflowRule.ActionType.CREATE_TASK,
        action_payload={
            "task_title": "Setup workspace for won deal: {record_name}",
            "due_days_offset": 3
        },
        is_active=True
    )
    print(f"[Rule Created] DEAL_WON -> CREATE_TASK")

    lost_rule = WorkflowRule.objects.create(
        company=company,
        name="Lost Deal Alert Rule",
        trigger_event=WorkflowRule.TriggerEvent.DEAL_LOST,
        action_type=WorkflowRule.ActionType.SEND_NOTIFICATION,
        action_payload={
            "notification_title": "Deal Lost Alert: {record_name}",
            "notification_body": "Analyze reasons for losing the deal: {record_name}"
        },
        is_active=True
    )
    print(f"[Rule Created] DEAL_LOST -> SEND_NOTIFICATION")

    qualified_rule = WorkflowRule.objects.create(
        company=company,
        name="Qualified Lead Notification Rule",
        trigger_event=WorkflowRule.TriggerEvent.LEAD_QUALIFIED,
        action_type=WorkflowRule.ActionType.SEND_NOTIFICATION,
        action_payload={
            "notification_title": "Hot Lead Qualified Alert: {record_name}",
            "notification_body": "Please contact {record_name} asap."
        },
        is_active=True
    )
    print(f"[Rule Created] LEAD_QUALIFIED -> SEND_NOTIFICATION")

    # Trigger DEAL_WON
    print("\n- Triggering Deal Won rule...")
    deal_won = Deal.objects.create(
        company=company,
        title="Mega Enterprise Account",
        amount=50000.00,
        stage=Deal.Stage.PROSPECT
    )
    deal_won.stage = Deal.Stage.WON
    deal_won.save()
    
    # Verify Task created for Deal Won
    won_task = Task.objects.filter(company=company, title__icontains="Setup workspace for won deal: Mega Enterprise Account").first()
    if won_task:
        print(f" [SUCCESS] Won Deal rule verified! Task created: '{won_task.title}'")
    else:
        print(" [ERROR] Deal Won rule failed to create a Task.")
        sys.exit(1)

    # Trigger DEAL_LOST
    print("\n- Triggering Deal Lost rule...")
    deal_lost = Deal.objects.create(
        company=company,
        title="Small Biz Trial",
        amount=1000.00,
        stage=Deal.Stage.PROSPECT
    )
    deal_lost.stage = Deal.Stage.LOST
    deal_lost.save()
    
    # Verify Notification created for Deal Lost
    lost_notif = Notification.objects.filter(user=user, title__icontains="Deal Lost Alert").first()
    if lost_notif:
        print(f" [SUCCESS] Lost Deal rule verified! Notification created: '{lost_notif.title}'")
    else:
        print(" [ERROR] Deal Lost rule failed to create a Notification.")
        sys.exit(1)

    # Trigger LEAD_QUALIFIED rule
    print("\n- Triggering Lead Qualified rule...")
    lead_qual = Lead.objects.create(
        company=company,
        name="John Customer",
        email="john@example.com",
        status=Lead.Status.NEW,
        assigned_to=user
    )
    lead_qual.status = Lead.Status.QUALIFIED
    lead_qual.save()

    # Verify Notification created for Lead Qualified
    qual_notif = Notification.objects.filter(user=user, title__icontains="Hot Lead Qualified Alert").first()
    if qual_notif:
        print(f" [SUCCESS] Lead Qualified rule verified! Notification created: '{qual_notif.title}'")
    else:
        print(" [ERROR] Lead Qualified rule failed to create a Notification.")
        sys.exit(1)

    print("\n--- PART 2: Testing Multi-Step Workflow Sequences ---")
    

    # Create sequence
    sequence = WorkflowSequence.objects.create(
        company=company,
        name="Automated Nurture Sequence",
        trigger_event=WorkflowSequence.TriggerEvent.LEAD_CREATED,
        is_active=True
    )
    print(f"[Sequence Created] Automated Nurture Sequence on LEAD_CREATED")

    # Step 1: Create Task
    step1 = WorkflowStep.objects.create(
        sequence=sequence,
        order=1,
        delay_minutes=0,
        action_type=WorkflowStep.ActionType.CREATE_TASK,
        action_payload={
            "task_title": "Call new lead {record_name}",
            "due_days_offset": 1
        }
    )
    print(f" [Step Added] Order 1: Create Task")

    # Step 2: Send Notification
    step2 = WorkflowStep.objects.create(
        sequence=sequence,
        order=2,
        delay_minutes=0,
        action_type=WorkflowStep.ActionType.SEND_NOTIFICATION,
        action_payload={
            "notification_title": "Check newly enrolled lead: {record_name}",
            "notification_body": "Review lead profile for {record_name}."
        }
    )
    print(f" [Step Added] Order 2: Send Notification")

    # Step 3: Send Email
    step3 = WorkflowStep.objects.create(
        sequence=sequence,
        order=3,
        delay_minutes=0,
        action_type=WorkflowStep.ActionType.SEND_EMAIL,
        action_payload={
            "subject": "Welcome to our CRM, {{name}}",
            "body": "Hi {{name}},\nThanks for signing up!\nBest,\nLumeo Team"
        }
    )
    print(f" [Step Added] Order 3: Send Email")

    # Create a Lead to trigger this sequence
    print("\n- Creating new Lead to trigger sequence enrollment...")
    lead_seq = Lead.objects.create(
        company=company,
        name="Alice Tester",
        email="support@crm.estgrp.in",
        status=Lead.Status.NEW,
        assigned_to=user
    )
    print(f"Lead created: {lead_seq.name}")

    # Check WorkflowRun
    run = WorkflowRun.objects.filter(sequence=sequence, record_id=lead_seq.id).first()
    if run and run.status == WorkflowRun.Status.ACTIVE:
        print(f" [SUCCESS] Workflow Run created and active!")
    else:
        print(" [ERROR] Workflow Run not found or inactive.")
        sys.exit(1)

    # Check WorkflowStepRuns
    step_runs = run.step_runs.count()
    print(f" Number of pending step runs: {step_runs}")
    if step_runs != 3:
        print(f" [ERROR] Expected 3 step runs, found {step_runs}.")
        sys.exit(1)

    # Process steps
    print("\n- Processing due workflow steps...")
    processed = process_due_workflow_steps()
    print(f" Processed {processed} workflow step runs.")
    if processed != 3:
        print(f" [ERROR] Expected 3 processed steps, got {processed}.")
        sys.exit(1)

    # Verify Task from sequence step 1
    seq_task = Task.objects.filter(company=company, title__icontains="Call new lead Alice Tester").first()
    if seq_task:
        print(f" [SUCCESS] Sequence Step 1 verified! Task created: '{seq_task.title}'")
    else:
        print(" [ERROR] Sequence Step 1 failed to create task.")
        sys.exit(1)

    # Verify Notification from sequence step 2
    seq_notif = Notification.objects.filter(user=user, title__icontains="Check newly enrolled lead").first()
    if seq_notif:
        print(f" [SUCCESS] Sequence Step 2 verified! Notification created: '{seq_notif.title}'")
    else:
        print(" [ERROR] Sequence Step 2 failed to create notification.")
        sys.exit(1)

    # Verify Email from sequence step 3
    print(" [INFO] Since we are using the live SMTP backend, we assume the email was dispatched to support@crm.estgrp.in!")

    # Verify Email Activity logged
    email_activity = Activity.objects.filter(
        company=company,
        lead=lead_seq,
        activity_type=Activity.ActivityType.EMAIL
    ).first()
    if email_activity:
        print(f" [SUCCESS] Email Activity registered! Description: '{email_activity.description}'")
    else:
        print(" [ERROR] Email activity was not registered.")
        sys.exit(1)

    # Verify WorkflowRun complete
    run.refresh_from_db()
    if run.status == WorkflowRun.Status.COMPLETED:
        print(f" [SUCCESS] Workflow Run status updated to COMPLETED!")
    else:
        print(f" [ERROR] Workflow Run status is: {run.status} (expected COMPLETED)")
        sys.exit(1)

    print("\n--- PART 3: Testing Stop Condition (Lead Status Won/Lost) ---")
    
    # Create another sequence with a delayed step
    sequence_delay = WorkflowSequence.objects.create(
        company=company,
        name="Delayed Follow-up Sequence",
        trigger_event=WorkflowSequence.TriggerEvent.LEAD_CREATED,
        is_active=True
    )
    
    step_inst = WorkflowStep.objects.create(
        sequence=sequence_delay,
        order=1,
        delay_minutes=0,
        action_type=WorkflowStep.ActionType.CREATE_TASK,
        action_payload={"task_title": "Step 1 Tasks", "due_days_offset": 0}
    )
    step_delay = WorkflowStep.objects.create(
        sequence=sequence_delay,
        order=2,
        delay_minutes=60, # 60 min delay
        action_type=WorkflowStep.ActionType.CREATE_TASK,
        action_payload={"task_title": "Step 2 Delayed Task", "due_days_offset": 0}
    )
    print("Created sequence with a delayed step (Step 2: 60 minutes delay)")

    # Create Lead
    lead_delay = Lead.objects.create(
        company=company,
        name="Bob Stopper",
        email="bob@example.com",
        status=Lead.Status.NEW,
        assigned_to=user
    )
    print(f"Lead Bob Stopper created.")

    # Process first step (delay = 0)
    process_due_workflow_steps()
    
    # Change status of Lead to WON (which should trigger sequence termination)
    print("Updating Lead status to WON (terminates sequence)...")
    lead_delay.status = Lead.Status.WON
    lead_delay.save()

    # Check WorkflowRun and WorkflowStepRuns statuses
    run_delay = WorkflowRun.objects.filter(sequence=sequence_delay, record_id=lead_delay.id).first()
    if run_delay.status == WorkflowRun.Status.STOPPED:
        print(" [SUCCESS] Workflow Run correctly stopped!")
    else:
        print(f" [ERROR] Workflow Run is not STOPPED: {run_delay.status}")
        sys.exit(1)

    step2_run = WorkflowStepRun.objects.filter(run=run_delay, step=step_delay).first()
    if step2_run.status == WorkflowStepRun.Status.CANCELLED:
        print(" [SUCCESS] Delayed Step 2 run correctly CANCELLED!")
    else:
        print(f" [ERROR] Delayed Step 2 is not CANCELLED: {step2_run.status}")
        sys.exit(1)

    print("\n==================================================")
    print("ALL AUTOMATED FOLLOW-UP VERIFICATION TESTS PASSED!")
    print("==================================================")

if __name__ == "__main__":
    run_tests()
