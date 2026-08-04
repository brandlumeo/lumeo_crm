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
        ).exclude(role="customer").select_related("company")

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
        
        from accounts.emails import build_premium_email
        subject = f"New Lead Assigned: {lead.name}"
        text_content = f"Hello {user.first_name or user.username},\n\nYou have been assigned a new lead: {lead.name}.\nEmail: {lead.email}\nPhone: {lead.phone}\nCompany: {lead.company_name}\n\nPlease login to Lumeo CRM to follow up.\n\nBest,\nLumeo CRM"
        
        html_msg = f"""
            <p>Hello <strong>{user.first_name or user.username}</strong>,</p>
            <p>A new lead has been assigned to you. Here are the details:</p>
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 24px 0;">
                <p style="margin: 0 0 8px; color: #1f2937;"><strong>Name:</strong> {lead.name}</p>
                <p style="margin: 0 0 8px; color: #1f2937;"><strong>Email:</strong> {lead.email}</p>
                <p style="margin: 0 0 8px; color: #1f2937;"><strong>Phone:</strong> {lead.phone or 'N/A'}</p>
                <p style="margin: 0; color: #1f2937;"><strong>Company:</strong> {lead.company_name or 'N/A'}</p>
            </div>
        """
        msg = build_premium_email(
            subject=subject,
            heading="New Lead Assignment",
            body_text=text_content,
            body_html=html_msg,
            pre_header="LEAD ASSIGNED",
            action_url=f"{settings.FRONTEND_URL}/dashboard/leads",
            action_text="View Lead in CRM",
            to_email=user.email
        )
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
        users = User.objects.filter(company=deal.company).exclude(role="customer")
        
        recipient_list = [u.email for u in users if u.email]
        
        subject = f"🎉 Deal Won: {deal.title}"
        text_content = f"Great news!\n\nThe deal '{deal.title}' has been successfully closed and won by {deal.assigned_to.first_name if deal.assigned_to else 'the team'}.\nValue: ₹{deal.amount}\n\nLogin to Lumeo CRM to view details."
        
        from accounts.emails import build_premium_email
        html_msg = f"""
            <p style="text-align: center;">Fantastic news! A deal has just been marked as <strong>WON</strong>.</p>
            <div style="background-color: #f3f4f6; padding: 24px; border-radius: 12px; margin: 32px 0; text-align: center;">
                <h3 style="margin: 0 0 8px; color: #1A1714; font-size: 20px;">{deal.title}</h3>
                <div style="color: #FF5B1F; font-size: 32px; font-weight: 800; margin: 16px 0;">₹{deal.amount:,.2f}</div>
                <p style="margin: 0; color: #4A4540;">Closed by: <strong>{deal.assigned_to.first_name if deal.assigned_to else 'The Team'}</strong></p>
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
            msg = build_premium_email(
                subject=subject,
                heading="Deal Won! 🎉",
                body_text=text_content,
                body_html=html_msg,
                pre_header="DEAL WON",
                action_url=f"{settings.FRONTEND_URL}/dashboard/pipeline",
                action_text="View in Pipeline",
                bcc_list=recipient_list
            )
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
        from accounts.emails import build_premium_email
        from django.conf import settings
        
        action_url = settings.FRONTEND_URL
        if "OVERDUE" in title or "Task" in title:
            action_url = f"{settings.FRONTEND_URL}/dashboard/tasks"
            action_text = "View Tasks"
        elif "digest" in title.lower():
            action_url = f"{settings.FRONTEND_URL}/dashboard"
            action_text = "Go to Dashboard"
        else:
            action_text = "View in CRM"

        msg = build_premium_email(
            subject=title,
            heading=title,
            body_text=body,
            body_html=f"<p>{body}</p>",
            pre_header="LUMEO NOTIFICATION",
            action_url=action_url,
            action_text=action_text,
            to_email=to_email
        )
        msg.send(fail_silently=True)
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
            
            from accounts.emails import build_premium_email
            
            html_msg = f"""
                <p><strong>{comment.author.get_full_name()}</strong> added a new comment:</p>
                <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; font-style: italic; color: #374151;">
                    "{comment.comment}"
                </div>
            """
            msg = build_premium_email(
                subject=subject,
                heading=f"New Reply on Ticket #{ticket.id}",
                body_text=text_content,
                body_html=html_msg,
                pre_header="TICKET UPDATE",
                action_url=f"{settings.FRONTEND_URL}/dashboard/tickets",
                action_text="View Ticket",
                to_email=ticket.assigned_to.email
            )
            msg.send(fail_silently=True)
            
    except Exception as exc:
        logger.exception("notify_ticket_reply failed: %s", exc)
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def send_quote_email(self, quote_id: int):
    """
    Sends the quote URL to the customer.
    """
    try:
        from crm.models import Quote
        from django.core.mail import EmailMultiAlternatives
        from django.conf import settings

        quote = Quote.objects.select_related("customer", "company").get(pk=quote_id)
        if not quote.customer.email:
            return
            
        subject = f"Quote {quote.quote_number} from {quote.company.name}"
        text_content = f"Hello {quote.customer.name},\n\nYour quote {quote.quote_number} for ₹{quote.total} is ready.\n\nView and download your quote here: {settings.FRONTEND_URL}/public/quote/{quote.public_token}"
        
        from accounts.emails import build_premium_email
        html_msg = f"""
            <p style="text-align: center;">Hello {quote.customer.name},</p>
            <div style="background-color: #f3f4f6; padding: 24px; border-radius: 12px; text-align: center; margin: 24px 0;">
                <p style="margin: 0; color: #1A1714; font-weight: 600;">Quote {quote.quote_number}</p>
                <h1 style="color: #FF5B1F; margin: 8px 0; font-size: 36px;">₹{quote.total:,.2f}</h1>
                <p style="margin: 0; color: #4A4540; font-size: 14px;">Valid Until: {quote.valid_until or 'N/A'}</p>
            </div>
            <p style="text-align: center; color: #8B8580; font-size: 14px; margin-top: 24px;">Sent by {quote.company.name}</p>
        """
        msg = build_premium_email(
            subject=subject,
            heading="New Quote",
            body_text=text_content,
            body_html=html_msg,
            pre_header="QUOTE",
            action_url=f"{settings.FRONTEND_URL}/public/quote/{quote.public_token}",
            action_text="View Quote",
            to_email=quote.customer.email
        )
        msg.send(fail_silently=True)
            
    except Exception as exc:
        logger.exception("send_quote_email failed: %s", exc)
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
        text_content = f"Hello {invoice.customer.name},\n\nYour invoice {invoice.invoice_number} for ₹{invoice.total} is ready.\n\nView and download your invoice here: {settings.FRONTEND_URL}/public/invoice/{invoice.public_token}"
        
        from accounts.emails import build_premium_email
        html_msg = f"""
            <p style="text-align: center;">Hello {invoice.customer.name},</p>
            <div style="background-color: #f3f4f6; padding: 24px; border-radius: 12px; text-align: center; margin: 24px 0;">
                <p style="margin: 0; color: #1A1714; font-weight: 600;">Invoice {invoice.invoice_number}</p>
                <h1 style="color: #FF5B1F; margin: 8px 0; font-size: 36px;">₹{invoice.total:,.2f}</h1>
                <p style="margin: 0; color: #4A4540; font-size: 14px;">Due: {invoice.due_date}</p>
            </div>
            <p style="text-align: center; color: #8B8580; font-size: 14px; margin-top: 24px;">Sent by {invoice.company.name}</p>
        """
        msg = build_premium_email(
            subject=subject,
            heading="New Invoice",
            body_text=text_content,
            body_html=html_msg,
            pre_header="INVOICE",
            action_url=f"{settings.FRONTEND_URL}/public/invoice/{invoice.public_token}",
            action_text="View Invoice PDF",
            to_email=invoice.customer.email
        )
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
            
            from accounts.emails import build_premium_email
            
            html_msg = f"""
                <p>Hello <strong>{user.first_name or user.username}</strong>,</p>
                <p>Your Lumeo CRM subscription for <strong>{sub.company.name}</strong> is expiring in exactly <strong>3 days</strong> (on {target_date}).</p>
            """
            msg = build_premium_email(
                subject=subject,
                heading="Subscription Expiring",
                body_text=text_content,
                body_html=html_msg,
                pre_header="ACTION REQUIRED",
                action_url=f"{settings.FRONTEND_URL}/dashboard/billing",
                action_text="Renew Subscription",
                to_email=user.email
            )
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


        
        today = date.today()
        reminders_sent = 0
        
        # We need to find invoices that are in 'sent' or 'viewed' or 'partial' status (not paid, void, draft)
        active_invoices = Invoice.objects.filter(status__in=['sent', 'viewed', 'partial']).select_related('company', 'customer')
        
        for invoice in active_invoices:
            settings = getattr(invoice.company, 'invoice_settings', None)
            if not settings:
                continue
                
            due_date = invoice.due_date
            if not due_date:
                continue
                
            # Send reminder before
            if settings.send_reminder_before_days and settings.send_reminder_before_days > 0:
                target_date = due_date - timedelta(days=settings.send_reminder_before_days)
                if target_date == today:
                    # Send before reminder
                    send_invoice_email.delay(invoice.id)
                    reminders_sent += 1
                    
            # Send reminder after
            if settings.send_reminder_after_days and settings.send_reminder_after_days > 0:
                target_date = due_date + timedelta(days=settings.send_reminder_after_days)
                if target_date == today:
                    # Send after reminder
                    send_invoice_email.delay(invoice.id)
                    reminders_sent += 1
                    
        return {'reminders_sent': reminders_sent}
    except Exception as exc:
        logger.exception('process_invoice_reminders failed: %s', exc)
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def notify_leave_applied(self, leave_id: int):
    try:
        from attendance.models import LeaveRequest
        from accounts.emails import build_premium_email
        from django.conf import settings
        from accounts.models import User
        
        leave = LeaveRequest.objects.select_related('user', 'company').get(pk=leave_id)
        
        subject = f"Leave application applied - {leave.company.name}"
        text_content = f"Hello {leave.user.get_full_name()}!\n\nLeave application applied.:-\nDate: {leave.start_date}\nStatus: {leave.status}\nReason for absence: {leave.reason}\n"
        
        html_msg = f"""
            <p>Hello <strong>{leave.user.get_full_name()}</strong>!</p>
            <p>Leave application applied.:-</p>
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 24px 0;">
                <p style="margin: 0 0 8px; color: #1f2937;"><strong>Date:</strong> {leave.start_date}</p>
                <p style="margin: 0 0 8px; color: #1f2937;"><strong>Status:</strong> {leave.status}</p>
                <p style="margin: 0; color: #1f2937;"><strong>Reason for absence:</strong> {leave.reason}</p>
            </div>
        """
        msg = build_premium_email(
            subject=subject,
            heading="Leave Application Applied",
            body_text=text_content,
            body_html=html_msg,
            pre_header="LEAVE REQUEST",
            action_url=f"{settings.FRONTEND_URL}/dashboard/leaves",
            action_text="View Leave",
            to_email=leave.user.email
        )
        msg.send(fail_silently=True)
        
        # Also notify HR/Admins
        admins = User.objects.filter(company=leave.company, role__in=[User.Role.ADMIN, User.Role.OWNER, User.Role.HR])
        recipient_emails = [admin.email for admin in admins if admin.email]
        if recipient_emails:
            admin_html = f"""
                <p>Hello Team,</p>
                <p><strong>{leave.user.get_full_name()}</strong> has applied for leave.</p>
                <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 24px 0;">
                    <p style="margin: 0 0 8px; color: #1f2937;"><strong>Date:</strong> {leave.start_date}</p>
                    <p style="margin: 0; color: #1f2937;"><strong>Reason:</strong> {leave.reason}</p>
                </div>
            """
            admin_msg = build_premium_email(
                subject=f"New Leave Request: {leave.user.get_full_name()}",
                heading="Leave Request Submitted",
                body_text=f"{leave.user.get_full_name()} has applied for leave.\nDate: {leave.start_date}\nReason: {leave.reason}",
                body_html=admin_html,
                pre_header="HR NOTIFICATION",
                action_url=f"{settings.FRONTEND_URL}/dashboard/leaves",
                action_text="Review Leave",
                bcc_list=recipient_emails
            )
            admin_msg.send(fail_silently=True)
                
    except Exception as exc:
        logger.exception('notify_leave_applied failed: %s', exc)
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def notify_leave_updated(self, leave_id: int):
    try:
        from attendance.models import LeaveRequest
        from accounts.emails import build_premium_email
        from django.conf import settings
        
        leave = LeaveRequest.objects.select_related('user', 'company', 'approved_by').get(pk=leave_id)
        
        subject = f"Leave application status updated - {leave.company.name}"
        text_content = f"Hello {leave.user.get_full_name()}!\n\nLeave application {leave.status}.\nDate: {leave.start_date}\nStatus: {leave.status}\n"
        
        html_msg = f"""
            <p>Hello <strong>{leave.user.get_full_name()}</strong>!</p>
            <p>Leave application <strong>{leave.status}</strong>.</p>
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 24px 0;">
                <p style="margin: 0 0 8px; color: #1f2937;"><strong>Date:</strong> {leave.start_date}</p>
                <p style="margin: 0; color: #1f2937;"><strong>Status:</strong> {leave.status}</p>
        """
        if leave.manager_notes:
            html_msg += f"""<p style="margin: 8px 0 0; color: #1f2937;"><strong>Manager notes:</strong> {leave.manager_notes}</p>"""
        html_msg += "</div>"
            
        msg = build_premium_email(
            subject=subject,
            heading=f"Leave {leave.status.title()}",
            body_text=text_content,
            body_html=html_msg,
            pre_header="LEAVE STATUS",
            action_url=f"{settings.FRONTEND_URL}/dashboard/leaves",
            action_text="View Leave",
            to_email=leave.user.email
        )
        msg.send(fail_silently=True)
        
    except Exception as exc:
        logger.exception('notify_leave_updated failed: %s', exc)
        raise self.retry(exc=exc)
