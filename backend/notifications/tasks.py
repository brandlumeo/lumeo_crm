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
            fail_silently=True,
        )
        logger.info(f"Notification email sent to {to_email}")
    except Exception as exc:
        logger.exception("send_notification_email failed: %s", exc)
        try:
            from django.conf import settings
            if not getattr(settings, 'CELERY_TASK_ALWAYS_EAGER', False):
                raise self.retry(exc=exc)
        except Exception:
            pass
@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def check_task_deadlines(self):
    try:
        from crm.models import Task
        from notifications.models import Notification
        from django.utils import timezone

        today = timezone.now().date()
        tasks = Task.objects.filter(
            status__in=['todo', 'in_progress'],
            due_date__lte=today,
            assigned_to__isnull=False,
            assigned_to__is_active=True,
        ).select_related('assigned_to', 'company')

        count = 0
        for task in tasks:
            user = task.assigned_to
            if not getattr(user, 'notify_task_deadline', True):
                continue

            is_overdue = task.due_date < today
            time_str = 'OVERDUE' if is_overdue else 'due today'
            title = f'Task {time_str}: {task.title}'
            body = f'Your task {task.title} is {time_str} ({task.due_date}). Please complete it or update the deadline.'

            Notification.objects.create(
                user=user,
                notification_type=Notification.Type.TASK_DUE,
                title=title,
                body=body,
            )

            send_notification_email.delay(
                to_email=user.email,
                title=title,
                body=body,
            )
            count += 1

        logger.info('check_task_deadlines: notified %d tasks', count)
        return {'notified': count}
    except Exception as exc:
        logger.exception('check_task_deadlines failed: %s', exc)
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def auto_close_shifts(self):
    """
    Runs at midnight to close any open shifts from the previous day.
    """
    try:
        from attendance.models import TimeLog, BreakLog
        from notifications.models import Notification
        from django.utils import timezone
        import datetime

        now = timezone.now()
        
        # Find logs where clock_out is null and clock_in was before today's date
        # (Assuming midnight run, so anything from yesterday is auto-closed)
        open_logs = TimeLog.objects.filter(clock_out__isnull=True)
        count = 0

        for log in open_logs:
            # End active breaks
            active_break = BreakLog.objects.filter(time_log=log, end_time__isnull=True).first()
            if active_break:
                active_break.end_time = now
                active_break.save()
            
            # Close shift
            log.clock_out = now
            log.is_auto_closed = True
            log.save()
            
            Notification.objects.create(
                user=log.user,
                notification_type=Notification.Type.GENERAL,
                title="Shift Auto-Closed",
                body=f"You forgot to clock out on {log.clock_in.strftime('%Y-%m-%d')}. Your shift has been auto-closed. Please request a time correction.",
            )
            count += 1

        logger.info('auto_close_shifts: closed %d shifts', count)
        return {'closed': count}
    except Exception as exc:
        logger.exception('auto_close_shifts failed: %s', exc)
        raise self.retry(exc=exc)
