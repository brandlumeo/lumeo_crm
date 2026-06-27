"""
Notification background tasks.

- send_daily_digest: Weekdays 09:00 UTC via Celery beat.
  Creates a digest notification for each active user.
"""

import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_daily_digest(self):
    """
    Scheduled weekdays at 09:00 UTC.
    Creates a digest notification for every active user summarising
    their open tasks and unread leads.
    """
    try:
        from accounts.models import User
        from crm.models import Task, Lead
        from notifications.models import Notification
        from django.utils import timezone

        users = User.objects.filter(
            is_active=True,
            company__isnull=False,
        ).select_related("company")

        count = 0
        for user in users:
            open_tasks = Task.objects.filter(
                company=user.company,
                assigned_to=user,
                status__in=["todo", "in_progress"],
            ).count()

            new_leads = Lead.objects.filter(
                company=user.company,
                status="new",
            ).count()

            if open_tasks == 0 and new_leads == 0:
                continue

            parts = []
            if open_tasks:
                parts.append(f"{open_tasks} open task(s)")
            if new_leads:
                parts.append(f"{new_leads} new lead(s)")

            Notification.objects.create(
                user=user,
                notification_type=Notification.Type.GENERAL,
                title="Your daily Lumeo digest",
                body=f"Good morning, {user.first_name or user.username}! You have {' and '.join(parts)} waiting.",
            )
            count += 1

        logger.info("send_daily_digest: created %d digest notifications", count)
        return {"created": count}

    except Exception as exc:
        logger.exception("send_daily_digest failed: %s", exc)
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def notify_lead_assigned(self, lead_id: int, assigned_to_id: int):
    """
    Fires immediately when a lead is assigned to a user.
    """
    try:
        from crm.models import Lead
        from accounts.models import User
        from notifications.models import Notification

        lead = Lead.objects.select_related("company").get(pk=lead_id)
        user = User.objects.get(pk=assigned_to_id)

        Notification.objects.create(
            user=user,
            notification_type=Notification.Type.LEAD_ASSIGNED,
            title="Lead assigned to you",
            body=f"You've been assigned lead: {lead.name} ({lead.email}).",
        )
        logger.info("notify_lead_assigned: lead=%d user=%d", lead_id, assigned_to_id)

    except Exception as exc:
        logger.exception("notify_lead_assigned failed: %s", exc)
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def notify_deal_won(self, deal_id: int):
    """
    Fires immediately when a deal stage changes to 'won'.
    Notifies all company members.
    """
    try:
        from crm.models import Deal
        from accounts.models import User
        from notifications.models import Notification

        deal = Deal.objects.select_related("company").get(pk=deal_id)
        users = User.objects.filter(company=deal.company)

        for user in users:
            Notification.objects.create(
                user=user,
                notification_type=Notification.Type.DEAL_WON,
                title="Deal won! 🎉",
                body=f"{deal.title} closed at ₹{deal.amount}. Great work!",
            )

        logger.info("notify_deal_won: deal=%d company=%s", deal_id, deal.company.name)

    except Exception as exc:
        logger.exception("notify_deal_won failed: %s", exc)
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def send_notification_email(self, to_email: str, title: str, body: str):
    """
    Sends an email to the user containing the notification details.
    """
    try:
        from django.core.mail import send_mail
        from django.conf import settings
        
        send_mail(
            subject=title,
            message=body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[to_email],
            fail_silently=False,
        )
        logger.info(f"Notification email sent to {to_email}")
    except Exception as exc:
        logger.exception("send_notification_email failed: %s", exc)
        try:
            raise self.retry(exc=exc)
        except Exception:
            pass
