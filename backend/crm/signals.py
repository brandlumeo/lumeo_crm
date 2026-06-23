import logging
import hmac
import hashlib
import json
import requests
import threading
from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver
from django.utils import timezone
from .models import Lead, Deal, Task, WorkflowRule, WebhookSubscription, WebhookDeliveryLog
from notifications.models import Notification
from accounts.models import User
from .workflows import (
    enroll_workflow_sequences,
    execute_basic_workflow_action,
    stop_active_workflow_runs,
)

logger = logging.getLogger(__name__)

def get_users_to_notify(instance):
    if getattr(instance, 'assigned_to', None):
        return [instance.assigned_to]
    owners = User.objects.filter(company=instance.company, role=User.Role.OWNER)
    if owners.exists():
        return list(owners)
    return list(User.objects.filter(company=instance.company))


def dispatch_webhook_async(company, event_type, payload):
    def run():
        subscriptions = WebhookSubscription.objects.filter(
            company=company, is_active=True
        )
        for sub in subscriptions:
            if event_type in sub.event_triggers or "*" in sub.event_triggers:
                signature = hmac.new(
                    sub.secret_token.encode("utf-8"),
                    json.dumps(payload).encode("utf-8"),
                    hashlib.sha256
                ).hexdigest()
                
                headers = {
                    "Content-Type": "application/json",
                    "X-Lumeo-Signature": signature
                }
                
                try:
                    res = requests.post(sub.target_url, json=payload, headers=headers, timeout=5)
                    WebhookDeliveryLog.objects.create(
                        subscription=sub,
                        event_type=event_type,
                        payload=payload,
                        response_status=res.status_code,
                        response_body=res.text[:1000]
                    )
                except Exception as e:
                    WebhookDeliveryLog.objects.create(
                        subscription=sub,
                        event_type=event_type,
                        payload=payload,
                        response_status=500,
                        response_body=str(e)
                    )
    threading.Thread(target=run).start()

@receiver(pre_save, sender=Deal)
def deal_pre_save(sender, instance, **kwargs):
    if instance.pk:
        try:
            instance._old_stage = sender.objects.only('stage').get(pk=instance.pk).stage
        except sender.DoesNotExist:
            instance._old_stage = None
    else:
        instance._old_stage = None

@receiver(post_save, sender=Deal)
def deal_post_save(sender, instance, created, **kwargs):
    old_stage = getattr(instance, '_old_stage', None)
    new_stage = instance.stage

    users_to_notify = get_users_to_notify(instance)
    
    if created:
        for u in users_to_notify:
            Notification.objects.create(
                user=u,
                notification_type=Notification.Type.GENERAL,
                title="New Deal Created",
                body=f"Deal '{instance.title}' was added to {instance.get_stage_display()}."
            )
    elif old_stage != new_stage:
        for u in users_to_notify:
            if u.notify_deal_stage:
                Notification.objects.create(
                    user=u,
                    notification_type=Notification.Type.GENERAL,
                    title="Deal Stage Changed",
                    body=f"Deal '{instance.title}' moved to {instance.get_stage_display()} stage."
                )

    if (created and new_stage == Deal.Stage.WON) or (not created and old_stage != new_stage and new_stage == Deal.Stage.WON):
        trigger_workflows(instance, WorkflowRule.TriggerEvent.DEAL_WON)
        payload = {
            "event": "deal.won",
            "deal_id": instance.id,
            "title": instance.title,
            "amount": float(instance.amount),
            "timestamp": timezone.now().isoformat()
        }
        dispatch_webhook_async(instance.company, "deal.won", payload)
    elif (created and new_stage == Deal.Stage.LOST) or (not created and old_stage != new_stage and new_stage == Deal.Stage.LOST):
        trigger_workflows(instance, WorkflowRule.TriggerEvent.DEAL_LOST)
        payload = {
            "event": "deal.lost",
            "deal_id": instance.id,
            "title": instance.title,
            "amount": float(instance.amount),
            "timestamp": timezone.now().isoformat()
        }
        dispatch_webhook_async(instance.company, "deal.lost", payload)

@receiver(pre_save, sender=Lead)
def lead_pre_save(sender, instance, **kwargs):
    if instance.pk:
        try:
            instance._old_status = sender.objects.only('status').get(pk=instance.pk).status
        except sender.DoesNotExist:
            instance._old_status = None
    else:
        instance._old_status = None

@receiver(post_save, sender=Lead)
def lead_post_save(sender, instance, created, **kwargs):
    old_status = getattr(instance, '_old_status', None)
    new_status = instance.status

    if created:
        enroll_workflow_sequences(instance, "lead_created")
        for u in get_users_to_notify(instance):
            if getattr(u, 'notify_new_lead', True):
                Notification.objects.create(
                    user=u,
                    notification_type=Notification.Type.LEAD_ASSIGNED,
                    title="New Lead Captured",
                    body=f"A new lead '{instance.name}' has entered the system."
                )

    if (created and new_status == Lead.Status.QUALIFIED) or (not created and old_status != new_status and new_status == Lead.Status.QUALIFIED):
        trigger_workflows(instance, WorkflowRule.TriggerEvent.LEAD_QUALIFIED)
        enroll_workflow_sequences(instance, "lead_qualified")

    if new_status in {Lead.Status.WON, Lead.Status.LOST} and (created or old_status != new_status):
        stop_active_workflow_runs(instance)

    if created:
        payload = {
            "event": "lead.created",
            "lead_id": instance.id,
            "name": instance.name,
            "email": instance.email,
            "timestamp": timezone.now().isoformat()
        }
        dispatch_webhook_async(instance.company, "lead.created", payload)

def trigger_workflows(instance, trigger_event):
    """
    Executes all active workflow rules matching the company and trigger event.
    """
    rules = WorkflowRule.objects.filter(
        company=instance.company,
        trigger_event=trigger_event,
        is_active=True
    )
    
    for rule in rules:
        try:
            execute_basic_workflow_action(rule, instance)
        except Exception as e:
            logger.exception(f"Failed to execute workflow rule {rule.id}: {e}")

@receiver(post_save, sender=Task)
def task_post_save(sender, instance, created, **kwargs):
    if created:
        for u in get_users_to_notify(instance):
            if getattr(u, 'notify_task_deadline', True):
                Notification.objects.create(
                    user=u,
                    notification_type=Notification.Type.TASK_DUE,
                    title="New Task Assigned",
                    body=f"Task '{instance.title}' is due by {instance.due_date}."
                )
