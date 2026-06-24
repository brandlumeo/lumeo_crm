import logging
from datetime import timedelta
from django.utils import timezone

logger = logging.getLogger(__name__)

def record_type_for_instance(record):
    from .models import Lead, Deal, Customer
    if isinstance(record, Lead):
        return "lead"
    elif isinstance(record, Deal):
        return "deal"
    elif isinstance(record, Customer):
        return "customer"
    raise ValueError("Unsupported record type.")


def get_record_link_kwargs(record):
    from .models import Lead, Deal, Customer
    if isinstance(record, Lead):
        return {"lead": record}
    elif isinstance(record, Deal):
        return {"deal": record}
    elif isinstance(record, Customer):
        return {"customer": record}
    return {}


def get_sequence_actor_user(record, company):
    assigned_to = getattr(record, 'assigned_to', None)
    if assigned_to:
        return assigned_to
    from accounts.models import User
    owners = User.objects.filter(company=company, role=User.Role.OWNER, is_active=True)
    if owners.exists():
        return owners.first()
    return User.objects.filter(company=company, is_active=True).first()


def resolve_workflow_record(run):
    from .models import Lead, Deal, Customer
    if run.record_type == "lead":
        model = Lead
    elif run.record_type == "deal":
        model = Deal
    elif run.record_type == "customer":
        model = Customer
    else:
        return None
    return model.objects.filter(id=run.record_id).first()


def should_stop_sequence_for_record(sequence, record):
    from .models import Lead
    if isinstance(record, Lead):
        stop_statuses = sequence.stop_on_statuses or []
        if record.status in stop_statuses:
            return True
    return False


def execute_basic_workflow_action(rule, record):
    from .models import Task
    from notifications.models import Notification
    from .emailing import build_template_context, render_template_content

    payload = rule.action_payload or {}
    actor_user = get_sequence_actor_user(record, rule.company)
    context = build_template_context(company=rule.company, actor_user=actor_user, **get_record_link_kwargs(record))

    if rule.action_type == "create_task":
        task_title_template = payload.get("task_title", "Follow up with {record_name}")
        task_title = render_template_content(task_title_template, context)
        due_offset = int(payload.get("due_days_offset", 0))
        due_date = timezone.localdate() + timedelta(days=due_offset)
        Task.objects.create(
            company=rule.company,
            title=task_title,
            due_date=due_date,
            status=Task.Status.TODO,
            assigned_to=getattr(record, 'assigned_to', None),
            **get_record_link_kwargs(record)
        )
    elif rule.action_type == "send_notification":
        recipient = get_sequence_actor_user(record, rule.company)
        if not recipient:
            raise ValueError("No active recipient is available for this notification step.")
        notification_title = render_template_content(payload.get("notification_title", "Workflow Automation Alert"), context)
        notification_body = render_template_content(payload.get("notification_body", "{record_name} status updated."), context)
        Notification.objects.create(
            user=recipient,
            notification_type=Notification.Type.GENERAL,
            title=notification_title,
            body=notification_body
        )
    else:
        raise ValueError(f"Unsupported workflow action type: {rule.action_type}")


def enroll_workflow_sequences(record, trigger_event):
    from .models import WorkflowSequence, WorkflowRun

    record_type = record_type_for_instance(record)
    sequences = WorkflowSequence.objects.filter(company=record.company, trigger_event=trigger_event, is_active=True)
    created_runs = []
    started_at = timezone.now()

    for sequence in sequences:
        if should_stop_sequence_for_record(sequence, record):
            continue
        run, created = WorkflowRun.objects.get_or_create(
            company=record.company,
            sequence=sequence,
            record_type=record_type,
            record_id=record.id,
            status=WorkflowRun.Status.ACTIVE,
            defaults={"started_at": started_at}
        )
        if created:
            created_runs.append(run)
            schedule_workflow_steps(run, started_at)

    return created_runs


def schedule_workflow_steps(run, started_at):
    from .models import WorkflowStepRun

    steps = run.sequence.steps.all().order_by('order')
    cumulative_due_at = started_at

    for step in steps:
        cumulative_due_at += timedelta(minutes=step.delay_minutes)
        WorkflowStepRun.objects.create(
            company=run.company,
            run=run,
            step=step,
            due_at=cumulative_due_at,
            status=WorkflowStepRun.Status.PENDING
        )


def stop_active_workflow_runs(record, reason="Goal achieved or record closed"):
    from .models import WorkflowRun

    record_type = record_type_for_instance(record)
    active_runs = WorkflowRun.objects.filter(
        company=record.company,
        record_type=record_type,
        record_id=record.id,
        status=WorkflowRun.Status.ACTIVE
    )
    stopped = 0
    for run in active_runs:
        stop_workflow_run(run, reason)
        stopped += 1
    return stopped


def stop_workflow_run(run, reason):
    from .models import WorkflowRun, WorkflowStepRun
    now = timezone.now()
    run.status = WorkflowRun.Status.STOPPED
    run.stop_reason = reason
    run.stopped_at = now
    run.save(update_fields=['status', 'stop_reason', 'stopped_at'])
    run.step_runs.filter(status=WorkflowStepRun.Status.PENDING).update(status=WorkflowStepRun.Status.CANCELLED)


def fail_workflow_run(run, error_message):
    from .models import WorkflowRun, WorkflowStepRun
    now = timezone.now()
    run.status = WorkflowRun.Status.FAILED
    run.last_error = error_message
    run.completed_at = now
    run.save(update_fields=['status', 'last_error', 'completed_at'])
    run.step_runs.filter(status=WorkflowStepRun.Status.PENDING).update(status=WorkflowStepRun.Status.CANCELLED)


def maybe_complete_workflow_run(run):
    from .models import WorkflowRun, WorkflowStepRun
    remaining = run.step_runs.filter(status__in=[WorkflowStepRun.Status.PENDING, WorkflowStepRun.Status.IN_PROGRESS]).exists()
    if not remaining and run.status == WorkflowRun.Status.ACTIVE:
        run.status = WorkflowRun.Status.COMPLETED
        run.completed_at = timezone.now()
        run.save(update_fields=['status', 'completed_at'])


def process_due_workflow_steps(limit=50):
    from .models import WorkflowStepRun
    due_ids = list(WorkflowStepRun.objects.filter(
        status=WorkflowStepRun.Status.PENDING,
        due_at__lte=timezone.now()
    ).order_by('due_at').values_list('id', flat=True)[:limit])
    
    processed = 0
    for step_run_id in due_ids:
        execute_workflow_step_run(step_run_id)
        processed += 1
    return processed


def execute_workflow_step_run(step_run_id):
    from .models import WorkflowStepRun

    step_run = WorkflowStepRun.objects.filter(id=step_run_id).first()
    if not step_run or step_run.status != WorkflowStepRun.Status.PENDING:
        return

    step_run.status = WorkflowStepRun.Status.IN_PROGRESS
    step_run.attempts += 1
    step_run.save(update_fields=['status', 'attempts'])

    record = resolve_workflow_record(step_run.run)
    if not record:
        fail_workflow_run(step_run.run, f"Target record {step_run.run.record_type}:{step_run.run.record_id} not found.")
        step_run.status = WorkflowStepRun.Status.CANCELLED
        step_run.last_error = "Target record not found."
        step_run.save(update_fields=['status', 'last_error'])
        return

    if should_stop_sequence_for_record(step_run.run.sequence, record):
        stop_workflow_run(step_run.run, f"Record status matches sequence stop_on_statuses.")
        step_run.status = WorkflowStepRun.Status.CANCELLED
        step_run.save(update_fields=['status'])
        return

    try:
        _execute_sequence_step(step_run, record)
        step_run.status = WorkflowStepRun.Status.COMPLETED
        step_run.executed_at = timezone.now()
        step_run.save(update_fields=['status', 'executed_at'])
        maybe_complete_workflow_run(step_run.run)
    except Exception as exc:
        step_run.status = WorkflowStepRun.Status.FAILED
        step_run.last_error = str(exc)
        step_run.executed_at = timezone.now()
        step_run.save(update_fields=['status', 'last_error', 'executed_at'])
        fail_workflow_run(step_run.run, f"Step {step_run.step.order} failed: {exc}")


def _execute_sequence_step(step_run, record):
    from .models import Task, WorkflowStep
    from notifications.models import Notification
    from .emailing import build_template_context, render_template_content, send_crm_email

    payload = step_run.step.action_payload or {}
    actor_user = get_sequence_actor_user(record, step_run.company)
    context = build_template_context(company=step_run.company, actor_user=actor_user, **get_record_link_kwargs(record))

    if step_run.step.action_type == WorkflowStep.ActionType.CREATE_TASK:
        title_template = payload.get("task_title", "Follow up with {record_name}")
        task_title = render_template_content(title_template, context)
        due_days_offset = int(payload.get("due_days_offset", 0))
        due_date = timezone.localdate() + timedelta(days=due_days_offset)
        Task.objects.create(
            company=step_run.company,
            title=task_title,
            due_date=due_date,
            status=Task.Status.TODO,
            assigned_to=getattr(record, 'assigned_to', None),
            workflow_step_run=step_run,
            **get_record_link_kwargs(record)
        )
    elif step_run.step.action_type == WorkflowStep.ActionType.SEND_NOTIFICATION:
        recipient = get_sequence_actor_user(record, step_run.company)
        if not recipient:
            raise ValueError("No active recipient is available for this notification step.")
        notification_title = render_template_content(payload.get("notification_title", "Workflow Automation Alert"), context)
        notification_body = render_template_content(payload.get("notification_body", "{record_name} status updated."), context)
        Notification.objects.create(
            user=recipient,
            notification_type=Notification.Type.GENERAL,
            title=notification_title,
            body=notification_body
        )
    elif step_run.step.action_type == WorkflowStep.ActionType.SEND_EMAIL:
        send_crm_email(
            company=step_run.company,
            subject_template=payload.get("subject", ""),
            body_template=payload.get("body", ""),
            email_template=step_run.step.email_template,
            to_email=payload.get("to_email", ""),
            actor_user=actor_user,
            **get_record_link_kwargs(record)
        )
    else:
        raise ValueError(f"Unsupported workflow action type: {step_run.step.action_type}")
