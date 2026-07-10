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
        from django.core.mail import EmailMultiAlternatives
        from django.conf import settings

        lead = Lead.objects.select_related("company").get(pk=lead_id)
        user = User.objects.get(pk=assigned_to_id)

        Notification.objects.create(
            user=user,
            notification_type=Notification.Type.LEAD_ASSIGNED,
            title="Lead assigned to you",
            body=f"You've been assigned lead: {lead.name} ({lead.email}).",
        )
        
        # Premium HTML Email
        subject = f"New Lead Assigned: {lead.name}"
        text_content = f"Hello {user.first_name or user.username},\n\nYou have been assigned a new lead: {lead.name}.\nEmail: {lead.email}\nPhone: {lead.phone}\nCompany: {lead.company_name}\n\nPlease login to Lumeo CRM to follow up.\n\nBest,\nLumeo CRM"
        html_content = f"""
        <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 40px; border-radius: 16px;">
            <div style="background-color: #ffffff; padding: 32px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                <div style="text-align: center; margin-bottom: 24px;">
                    <h2 style="color: #111827; margin: 0; font-size: 24px; font-weight: 700;">New Lead Assignment</h2>
                </div>
                <p style="color: #4b5563; font-size: 16px; line-height: 1.5;">Hello <strong>{user.first_name or user.username}</strong>,</p>
                <p style="color: #4b5563; font-size: 16px; line-height: 1.5;">A new lead has been assigned to you. Here are the details:</p>
                <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 24px 0;">
                    <p style="margin: 0 0 8px; color: #1f2937;"><strong>Name:</strong> {lead.name}</p>
                    <p style="margin: 0 0 8px; color: #1f2937;"><strong>Email:</strong> {lead.email}</p>
                    <p style="margin: 0 0 8px; color: #1f2937;"><strong>Phone:</strong> {lead.phone or 'N/A'}</p>
                    <p style="margin: 0; color: #1f2937;"><strong>Company:</strong> {lead.company_name or 'N/A'}</p>
                </div>
                <div style="text-align: center; margin-top: 32px;">
                    <a href="{settings.FRONTEND_URL}/dashboard/leads" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">View in CRM</a>
                </div>
            </div>
            <p style="text-align: center; color: #9ca3af; font-size: 14px; margin-top: 24px;">© {lead.company.name} powered by Lumeo CRM</p>
        </div>
        """
        
        msg = EmailMultiAlternatives(subject, text_content, settings.DEFAULT_FROM_EMAIL, [user.email])
        msg.attach_alternative(html_content, "text/html")
        msg.send(fail_silently=True)

        logger.info("notify_lead_assigned: lead=%d user=%d", lead_id, assigned_to_id)

    except Exception as exc:
        logger.exception("notify_lead_assigned failed: %s", exc)
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def notify_deal_won(self, deal_id: int):
    """
    Fires immediately when a deal stage changes to 'won'.
    Notifies all company members via email.
    """
    try:
        from crm.models import Deal
        from accounts.models import User
        from notifications.models import Notification
        from django.core.mail import EmailMultiAlternatives
        from django.conf import settings

        deal = Deal.objects.select_related("company", "assigned_to").get(pk=deal_id)
        users = User.objects.filter(company=deal.company)
        
        recipient_list = [u.email for u in users if u.email]
        
        subject = f"🎉 Deal Won: {deal.title}"
        text_content = f"Great news!\n\nThe deal '{deal.title}' has been successfully closed and won by {deal.assigned_to.first_name if deal.assigned_to else 'the team'}.\nValue: ₹{deal.amount}\n\nLogin to Lumeo CRM to view details."
        
        html_content = f"""
        <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; background-color: #fdfbf7; padding: 40px; border-radius: 16px;">
            <div style="background-color: #ffffff; padding: 32px; border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); border-top: 4px solid #10b981;">
                <div style="text-align: center; margin-bottom: 24px;">
                    <div style="font-size: 48px; margin-bottom: 16px;">🎊</div>
                    <h2 style="color: #111827; margin: 0; font-size: 28px; font-weight: 800;">Deal Won!</h2>
                </div>
                <p style="color: #4b5563; font-size: 16px; line-height: 1.5; text-align: center;">Fantastic news! A deal has just been marked as <strong>WON</strong>.</p>
                
                <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; padding: 24px; border-radius: 12px; margin: 32px 0; text-align: center;">
                    <h3 style="margin: 0 0 8px; color: #065f46; font-size: 20px;">{deal.title}</h3>
                    <div style="color: #059669; font-size: 32px; font-weight: 800; margin: 16px 0;">₹{deal.amount:,.2f}</div>
                    <p style="margin: 0; color: #065f46;">Closed by: <strong>{deal.assigned_to.first_name if deal.assigned_to else 'The Team'}</strong></p>
                </div>
                
                <div style="text-align: center; margin-top: 32px;">
                    <a href="{settings.FRONTEND_URL}/dashboard/pipeline" style="background-color: #10b981; color: #ffffff; padding: 12px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.4);">View in Pipeline</a>
                </div>
            </div>
            <p style="text-align: center; color: #9ca3af; font-size: 14px; margin-top: 24px;">© {deal.company.name} powered by Lumeo CRM</p>
        </div>
        """

        for user in users:
            Notification.objects.create(
                user=user,
                notification_type=Notification.Type.DEAL_WON,
                title="Deal won! 🎉",
                body=f"{deal.title} closed at ₹{deal.amount}. Great work!",
            )

        if recipient_list:
            msg = EmailMultiAlternatives(subject, text_content, settings.DEFAULT_FROM_EMAIL, bcc=recipient_list)
            msg.attach_alternative(html_content, "text/html")
            msg.send(fail_silently=True)

        logger.info("notify_deal_won: deal=%d company=%s emails=%d", deal_id, deal.company.name, len(recipient_list))

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
def process_attendance_reminders(self):
    """
    Runs periodically (e.g. every 15-30 mins) to send clock-in and clock-out reminders.
    Checks `attendance_reminder_status` on the Company model.
    """
    try:
        from attendance.models import TimeLog
        from companies.models import Company
        from notifications.models import Notification
        from django.contrib.auth import get_user_model
        from django.utils import timezone
        
        User = get_user_model()
        now = timezone.now()
        local_time = timezone.localtime(now)
        today = local_time.date()
        current_time = local_time.time()
        
        count = 0
        
        companies = Company.objects.filter(attendance_reminder_status=True)
        for company in companies:
            if company.is_day_off(today):
                continue
                
            start_time = company.office_start_time
            end_time = company.office_end_time
            
            # Find all active employees in this company
            employees = User.objects.filter(company=company, is_active=True, role__in=["employee", "admin", "owner", "manager"])
            
            for emp in employees:
                # Clock-In Reminder
                if current_time >= start_time:
                    has_clocked_in = TimeLog.objects.filter(user=emp, clock_in__date=today).exists()
                    if not has_clocked_in:
                        title = f"Clock-In Reminder: {today.strftime('%b %d')}"
                        already_sent = Notification.objects.filter(user=emp, title=title).exists()
                        if not already_sent:
                            Notification.objects.create(
                                user=emp,
                                notification_type=Notification.Type.GENERAL,
                                title=title,
                                body="Your shift has started. Please remember to clock in for today."
                            )
                            count += 1
                
                # Clock-Out Reminder
                if current_time >= end_time:
                    # Find open shift for today
                    open_log = TimeLog.objects.filter(user=emp, clock_in__date=today, clock_out__isnull=True).first()
                    if open_log:
                        title = f"Clock-Out Reminder: {today.strftime('%b %d')}"
                        already_sent = Notification.objects.filter(user=emp, title=title).exists()
                        if not already_sent:
                            Notification.objects.create(
                                user=emp,
                                notification_type=Notification.Type.GENERAL,
                                title=title,
                                body="Your shift has ended. Please remember to clock out for today."
                            )
                            count += 1
                            
        logger.info('process_attendance_reminders: sent %d reminders', count)
        return {'sent': count}
    except Exception as exc:
        logger.exception('process_attendance_reminders failed: %s', exc)
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


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def notify_ticket_reply(self, comment_id: int):
    """
    Emails the assigned agent (or the customer) when a ticket gets a new comment.
    """
    try:
        from crm.models import TicketComment
        from django.core.mail import EmailMultiAlternatives
        from django.conf import settings

        comment = TicketComment.objects.select_related("ticket", "author").get(pk=comment_id)
        ticket = comment.ticket
        
        # If the person who commented is NOT the assigned agent, notify the agent
        if ticket.assigned_to and comment.author != ticket.assigned_to:
            subject = f"New Reply on Ticket #{ticket.id}: {ticket.title}"
            text_content = f"Hello {ticket.assigned_to.first_name},\n\nThere is a new reply on your ticket.\n\n{comment.author.get_full_name()} wrote:\n{comment.comment}\n\nView Ticket: {settings.FRONTEND_URL}/dashboard/tickets"
            
            html_content = f"""
            <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 40px; border-radius: 16px;">
                <div style="background-color: #ffffff; padding: 32px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                    <h2 style="color: #111827; margin-top: 0;">New Reply on Ticket #{ticket.id}</h2>
                    <p style="color: #4b5563;"><strong>{comment.author.get_full_name()}</strong> added a new comment:</p>
                    <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; font-style: italic; color: #374151;">
                        "{comment.comment}"
                    </div>
                    <div style="margin-top: 24px;">
                        <a href="{settings.FRONTEND_URL}/dashboard/tickets" style="background-color: #2563eb; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 8px; font-weight: 600;">View Ticket</a>
                    </div>
                </div>
            </div>
            """
            msg = EmailMultiAlternatives(subject, text_content, settings.DEFAULT_FROM_EMAIL, [ticket.assigned_to.email])
            msg.attach_alternative(html_content, "text/html")
            msg.send(fail_silently=True)
            
    except Exception as exc:
        logger.exception("notify_ticket_reply failed: %s", exc)
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def send_invoice_email(self, invoice_id: int):
    """
    Sends the invoice URL to the customer.
    """
    try:
        from crm.models import Invoice
        from django.core.mail import EmailMultiAlternatives
        from django.conf import settings

        invoice = Invoice.objects.select_related("customer", "company").get(pk=invoice_id)
        if not invoice.customer.email:
            return
            
        subject = f"Invoice {invoice.invoice_number} from {invoice.company.name}"
        text_content = f"Hello {invoice.customer.name},\n\nYour invoice {invoice.invoice_number} for ₹{invoice.total} is ready.\n\nView and download your invoice here: {settings.FRONTEND_URL}/portal/invoices/{invoice.id}"
        
        html_content = f"""
        <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 40px; border-radius: 16px;">
            <div style="background-color: #ffffff; padding: 32px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border-top: 4px solid #4f46e5;">
                <h2 style="color: #111827; margin-top: 0; text-align: center;">New Invoice</h2>
                <p style="color: #4b5563; text-align: center;">Hello {invoice.customer.name},</p>
                <div style="background-color: #eef2ff; padding: 24px; border-radius: 12px; text-align: center; margin: 24px 0;">
                    <p style="margin: 0; color: #4338ca; font-weight: 600;">Invoice {invoice.invoice_number}</p>
                    <h1 style="color: #3730a3; margin: 8px 0; font-size: 36px;">₹{invoice.total:,.2f}</h1>
                    <p style="margin: 0; color: #4338ca; font-size: 14px;">Due: {invoice.due_date}</p>
                </div>
                <div style="text-align: center;">
                    <a href="{settings.FRONTEND_URL}/portal/invoices/{invoice.id}" style="background-color: #4f46e5; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">View Invoice PDF</a>
                </div>
            </div>
            <p style="text-align: center; color: #9ca3af; font-size: 14px; margin-top: 24px;">Sent by {invoice.company.name}</p>
        </div>
        """
        msg = EmailMultiAlternatives(subject, text_content, settings.DEFAULT_FROM_EMAIL, [invoice.customer.email])
        msg.attach_alternative(html_content, "text/html")
        msg.send(fail_silently=True)
            
    except Exception as exc:
        logger.exception("send_invoice_email failed: %s", exc)
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def check_subscription_expiry(self):
    """
    Runs daily to warn users whose subscription is expiring in 3 days.
    """
    try:
        from subscriptions.models import Subscription
        from notifications.models import Notification
        from django.core.mail import EmailMultiAlternatives
        from django.conf import settings
        from django.utils import timezone
        import datetime

        today = timezone.now().date()
        target_date = today + datetime.timedelta(days=3)

        # Find subscriptions expiring exactly 3 days from now
        expiring_subs = Subscription.objects.select_related("company", "user").filter(
            current_period_end__date=target_date,
            status=Subscription.Status.ACTIVE
        )
        
        count = 0
        for sub in expiring_subs:
            user = sub.user
            if not user or not user.email:
                continue
                
            subject = "Action Required: Subscription Expiring Soon"
            text_content = f"Hello {user.first_name},\n\nYour Lumeo CRM subscription for {sub.company.name} is expiring on {target_date}.\n\nPlease update your payment method to avoid any service interruption.\n\nBest,\nLumeo CRM Team"
            
            html_content = f"""
            <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 40px; border-radius: 16px;">
                <div style="background-color: #ffffff; padding: 32px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border-top: 4px solid #ef4444;">
                    <div style="text-align: center; margin-bottom: 24px;">
                        <h2 style="color: #111827; margin: 0; font-size: 24px; font-weight: 700;">Subscription Expiring</h2>
                    </div>
                    <p style="color: #4b5563; font-size: 16px; line-height: 1.5;">Hello <strong>{user.first_name or user.username}</strong>,</p>
                    <p style="color: #4b5563; font-size: 16px; line-height: 1.5;">Your Lumeo CRM subscription for <strong>{sub.company.name}</strong> is expiring in exactly <strong>3 days</strong> (on {target_date}).</p>
                    <div style="text-align: center; margin-top: 32px;">
                        <a href="{settings.FRONTEND_URL}/dashboard/billing" style="background-color: #ef4444; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">Renew Subscription</a>
                    </div>
                </div>
            </div>
            """
            msg = EmailMultiAlternatives(subject, text_content, settings.DEFAULT_FROM_EMAIL, [user.email])
            msg.attach_alternative(html_content, "text/html")
            msg.send(fail_silently=True)

            Notification.objects.create(
                user=user,
                notification_type=Notification.Type.GENERAL,
                title="Subscription Expiring",
                body=f"Your subscription expires on {target_date}. Please renew to avoid interruption.",
            )
            count += 1
            
        logger.info("check_subscription_expiry: warned %d users", count)
        return {'warned': count}

    except Exception as exc:
        logger.exception("check_subscription_expiry failed: %s", exc)
        raise self.retry(exc=exc)
