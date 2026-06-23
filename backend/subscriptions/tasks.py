"""
Subscription background tasks.

- check_expiring_subscriptions: Runs daily via Celery beat.
  Finds subscriptions expiring within 7 days and fires an in-app notification.
"""

import logging

from celery import shared_task
from django.utils import timezone
from datetime import timedelta

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def check_expiring_subscriptions(self):
    """
    Scheduled daily at 08:00 UTC.
    Creates an in-app notification for companies whose subscription
    expires within the next 7 days.
    """
    try:
        from subscriptions.models import Subscription
        from notifications.models import Notification

        warning_threshold = timezone.now() + timedelta(days=7)
        expiring = Subscription.objects.filter(
            is_active=True,
            expires_at__isnull=False,
            expires_at__lte=warning_threshold,
            expires_at__gte=timezone.now(),
        ).select_related("company")

        count = 0
        for sub in expiring:
            # Notify all owners/admins in the company
            from accounts.models import User
            recipients = User.objects.filter(
                company=sub.company,
                role__in=["owner", "admin"],
            )
            for user in recipients:
                Notification.objects.get_or_create(
                    user=user,
                    notification_type=Notification.Type.SUBSCRIPTION_EXPIRING,
                    defaults={
                        "title": "Subscription expiring soon",
                        "body": (
                            f"Your {sub.get_plan_display()} plan expires in "
                            f"{sub.days_remaining} day(s). Upgrade to avoid interruption."
                        ),
                    },
                )
                count += 1

        logger.info("check_expiring_subscriptions: notified %d recipients", count)
        return {"notified": count}

    except Exception as exc:
        logger.exception("check_expiring_subscriptions failed: %s", exc)
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def send_subscription_upgraded_notification(self, company_id: str, new_plan: str):
    """
    Called immediately when a subscription is upgraded.
    Sends an in-app notification to all company members.
    """
    try:
        from companies.models import Company
        from notifications.models import Notification
        from accounts.models import User

        company = Company.objects.get(pk=company_id)
        users = User.objects.filter(company=company)

        for user in users:
            Notification.objects.create(
                user=user,
                notification_type=Notification.Type.SUBSCRIPTION_UPGRADED,
                title="Plan upgraded",
                body=f"Your workspace has been upgraded to the {new_plan.title()} plan.",
            )

        logger.info(
            "send_subscription_upgraded_notification: company=%s plan=%s users=%d",
            company_id, new_plan, users.count(),
        )

    except Exception as exc:
        logger.exception("send_subscription_upgraded_notification failed: %s", exc)
        raise self.retry(exc=exc)
