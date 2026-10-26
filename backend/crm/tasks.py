import logging

from celery import shared_task

from .workflows import process_due_workflow_steps

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def process_due_workflow_steps_task(self, limit=100):
    try:
        processed = process_due_workflow_steps(limit=limit)
        logger.info("process_due_workflow_steps_task processed %d step run(s)", processed)
        return {"processed": processed}
    except Exception as exc:
        logger.exception("process_due_workflow_steps_task failed: %s", exc)
        raise self.retry(exc=exc)

@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def process_scheduled_campaigns_task(self):
    from django.utils import timezone
    from crm.models import Campaign
    from crm.views import CampaignViewSet
    from django.contrib.auth import get_user_model
    User = get_user_model()
    
    # Get campaigns that are scheduled and due to be sent
    due_campaigns = Campaign.objects.filter(
        status=Campaign.Status.SCHEDULED,
        scheduled_at__lte=timezone.now()
    )
    
    processed = 0
    for campaign in due_campaigns:
        # Switch status to draft temporarily so send_campaign logic allows it,
        # or just call the logic directly. It's better to just reuse the logic from the view.
        # But wait, views require a request. We can just reimplement the send logic here
        # or abstract it. Let's just do it directly.
        from crm.models import Lead, Customer
        from crm.emailing import send_crm_email
        
        campaign.status = Campaign.Status.SENDING
        campaign.save(update_fields=["status"])
        
        recipients = []
        if campaign.target_audience == "all_leads":
            recipients = Lead.objects.filter(company=campaign.company, email__isnull=False).exclude(email="")
        elif campaign.target_audience == "qualified_leads":
            recipients = Lead.objects.filter(company=campaign.company, status="qualified", email__isnull=False).exclude(email="")
        elif campaign.target_audience == "all_customers":
            recipients = Customer.objects.filter(company=campaign.company, email__isnull=False).exclude(email="")
        else:
            recipients = Lead.objects.filter(company=campaign.company, email__isnull=False).exclude(email="")
        
        sent_count = 0
        failed_count = 0
        user = campaign.created_by or User.objects.filter(company=campaign.company, is_company_admin=True).first()
        
        for rec in recipients:
            try:
                send_crm_email(
                    company=campaign.company,
                    subject_template=campaign.subject,
                    body_template=campaign.body_html,
                    lead=rec if isinstance(rec, Lead) else None,
                    customer=rec if isinstance(rec, Customer) else None,
                    to_email=rec.email,
                    actor_user=user,
                )
                sent_count += 1
            except Exception as e:
                logger.error(f"Campaign {campaign.id} failed to send to {rec.email}: {e}")
                failed_count += 1
                
        campaign.sent_count = sent_count
        campaign.failed_count = failed_count
        campaign.status = Campaign.Status.COMPLETED
        campaign.sent_at = timezone.now()
        campaign.save(update_fields=["sent_count", "failed_count", "status", "sent_at"])
        processed += 1
        
    return {"processed": processed}


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def sync_gmail_account_task(self, email_address, new_history_id=None):
    from django.conf import settings
    from django.utils import timezone
    from crm.models import EmailAccount, EmailMessage, Lead, Customer
    import googleapiclient.discovery
    from google.oauth2.credentials import Credentials
    import re
    
    account = EmailAccount.objects.filter(email_address=email_address, is_active=True).first()
    if not account:
        logger.warning(f"No active account found for {email_address}")
        return {"processed": 0}

    try:
        credentials = Credentials(
            token=account.access_token,
            refresh_token=account.refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=settings.GOOGLE_CLIENT_ID,
            client_secret=settings.GOOGLE_CLIENT_SECRET,
        )
        service = googleapiclient.discovery.build('gmail', 'v1', credentials=credentials)
        
        # Simple MVP logic: Just fetch the 10 most recent messages from Inbox/Sent
        # and sync those that don't exist yet and match a Lead/Customer.
        messages_response = service.users().messages().list(userId='me', maxResults=10).execute()
        messages = messages_response.get('messages', [])
        
        processed = 0
        def extract_email(s):
            match = re.search(r'[\w\.-]+@[\w\.-]+', str(s))
            return match.group(0) if match else str(s)
            
        for msg in messages:
            msg_id = msg['id']
            if EmailMessage.objects.filter(message_id=msg_id).exists():
                continue
                
            msg_detail = service.users().messages().get(userId='me', id=msg_id, format='full').execute()
            headers = {h['name'].lower(): h['value'] for h in msg_detail['payload']['headers']}
            from_address = headers.get('from', '')
            to_address = headers.get('to', '')
            subject = headers.get('subject', '')
            
            clean_from = extract_email(from_address)
            clean_to = extract_email(to_address)
            
            # Match with CRM records
            lead = Lead.objects.filter(email=clean_from).first() or Lead.objects.filter(email=clean_to).first()
            customer = Customer.objects.filter(email=clean_from).first() or Customer.objects.filter(email=clean_to).first()
            
            if lead or customer:
                EmailMessage.objects.create(
                    account=account,
                    company=account.company,
                    message_id=msg_id,
                    thread_id=msg_detail.get('threadId', ''),
                    direction=EmailMessage.Direction.INBOUND if clean_to == email_address else EmailMessage.Direction.OUTBOUND,
                    from_address=from_address,
                    to_addresses=[to_address],
                    subject=subject,
                    body_text="Synced via Gmail integration.", # Extract body logic omitted for MVP
                    body_html="",
                    is_read=True, 
                    received_at=timezone.now(),
                    lead=lead,
                    customer=customer
                )
                processed += 1

        if new_history_id:
            account.sync_state_id = str(new_history_id)
            account.save(update_fields=["sync_state_id"])
            
        return {"processed": processed}
    except Exception as exc:
        logger.exception(f"sync_gmail_account_task failed: {exc}")
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_daily_morning_schedule_email(self, company_id=None, days_ahead=1):
    """
    Sends an advance schedule email to all active team members in the company
    (from Primary Admins to local staff) the day before, summarising tomorrow's
    client deliverables, meetings, posters, reels, and milestones.
    """
    from accounts.models import User
    from companies.models import Company
    from crm.models import Event
    from accounts.emails import build_premium_email
    from django.utils import timezone
    import datetime

    companies = Company.objects.all()
    if company_id:
        companies = companies.filter(id=company_id)

    total_sent = 0
    total_events = 0

    for company in companies:
        # Determine local timezone
        company_tz = timezone.get_fixed_timezone(330)  # Default IST (+05:30)
        if getattr(company, "timezone", None):
            try:
                import zoneinfo
                company_tz = zoneinfo.ZoneInfo(company.timezone)
            except Exception:
                pass

        now_local = timezone.now().astimezone(company_tz)
        # Target date is tomorrow (or days_ahead) sent the day before
        target_date = now_local.date() + datetime.timedelta(days=days_ahead)
        target_start = timezone.make_aware(
            datetime.datetime.combine(target_date, datetime.time.min), company_tz
        )
        target_end = timezone.make_aware(
            datetime.datetime.combine(target_date, datetime.time.max), company_tz
        )

        # Query events for the target day (tomorrow)
        events = Event.objects.filter(
            company=company,
            start_time__gte=target_start,
            start_time__lte=target_end,
        ).order_by("start_time")

        event_count = events.count()
        total_events += event_count

        # Get all team members: primary admins, managers, and all staff
        team_members = User.objects.filter(
            company=company,
            is_active=True,
        ).exclude(role="customer")

        if not team_members.exists():
            continue

        target_formatted = target_date.strftime("%A, %d %B %Y")
        label_when = "Tomorrow" if days_ahead == 1 else target_date.strftime("%a, %d %b")

        # Build events HTML section
        if events.exists():
            event_rows = []
            for ev in events:
                ev_local_start = ev.start_time.astimezone(company_tz)
                time_str = ev_local_start.strftime("%I:%M %p")

                # Color bar
                palette = {
                    "orange": "#ea580c",
                    "coral": "#ea580c",
                    "purple": "#7c3aed",
                    "blue": "#2563eb",
                    "green": "#059669",
                    "emerald": "#059669",
                    "indigo": "#4f46e5",
                    "rose": "#e11d48",
                }
                color_bg = palette.get((ev.color or "").lower(), "#ea580c")
                loc_badge = f"<span style='color:#78716c;'> &bull; {ev.location}</span>" if ev.location else ""
                desc_line = (
                    f"<p style='margin:6px 0 0;font-size:13px;color:#78716c;line-height:1.4;'>{ev.description}</p>"
                    if ev.description
                    else ""
                )

                event_rows.append(f"""
                <div style="background:#ffffff;border:1px solid #e7e5e4;border-left:5px solid {color_bg};border-radius:8px;padding:14px 18px;margin-bottom:12px;box-shadow:0 1px 2px rgba(0,0,0,0.03);">
                  <div style="display:flex;justify-content:space-between;align-items:flex-start;">
                    <div>
                      <div style="font-family:Georgia,serif;font-weight:600;font-size:16px;color:#1c1917;">
                        {ev.title}
                      </div>
                      <div style="font-size:12px;color:#78716c;margin-top:2px;">
                        <span style="font-family:monospace;font-weight:600;color:#292524;">{time_str}</span>{loc_badge}
                      </div>
                    </div>
                  </div>
                  {desc_line}
                </div>
                """)

            events_html = "".join(event_rows)
            summary_banner = f"""
            <div style="background:#f5f5f4;border-radius:8px;padding:12px 16px;margin-bottom:20px;border-left:3px solid #1c1917;">
              <span style="font-size:13.5px;color:#292524;font-weight:500;">
                {label_when}'s Schedule: <strong>{event_count}</strong> deliverable(s) and scheduled event(s) for your team.
              </span>
            </div>
            """
        else:
            summary_banner = ""
            events_html = f"""
            <div style="background:#fafaf9;border:1px dashed #d6d3d1;border-radius:10px;padding:28px 20px;text-align:center;color:#78716c;">
              <p style="margin:0;font-family:Georgia,serif;font-size:16px;color:#292524;">No specific deliverables or meetings scheduled for {target_formatted}.</p>
              <p style="margin:6px 0 0;font-size:13px;color:#a8a29e;">Your team schedule is clear — a great opportunity for deep focus work, pipeline building, and ongoing projects!</p>
            </div>
            """

        body_html = f"""
        <p style="margin:0 0 14px;color:#44403c;font-size:15px;line-height:1.5;">
          Good evening, team! Here is your advance calendar schedule and deliverable briefing for <strong>{label_when.lower()}, {target_formatted}</strong> at <strong>{company.name}</strong>:
        </p>
        {summary_banner}
        <div style="margin:16px 0 24px;">
          {events_html}
        </div>
        <p style="margin:20px 0 0;color:#78716c;font-size:13px;line-height:1.5;">
          Please review tomorrow's client deliverables, posters, reels, and meetings in advance so you are fully prepared for the day ahead. Check the live calendar for real-time updates and meeting links.
        </p>
        """

        # Dispatch emails to all active team members
        for member in team_members:
            if not member.email:
                continue
            try:
                msg = build_premium_email(
                    subject=f"📅 Tomorrow's Schedule & Deliverables — {company.name} ({target_date.strftime('%a, %d %b')})",
                    heading=f"Tomorrow's Schedule Briefing",
                    body_text=f"Tomorrow's schedule for {company.name} ({target_formatted}): {event_count} event(s) scheduled. Visit https://lumeo.estgrp.in/calendar",
                    body_html=body_html,
                    pre_header=f"ADVANCE BRIEFING — TOMORROW'S SCHEDULE ({target_formatted.upper()})",
                    action_url="https://lumeo.estgrp.in/calendar",
                    action_text="Open Live Calendar",
                    to_email=member.email,
                )
                msg.send(fail_silently=True)
                total_sent += 1
            except Exception as e:
                logger.error(f"Failed to send advance schedule email to {member.email}: {e}")

    logger.info(
        "send_daily_morning_schedule_email complete (day before): sent %d email(s) across %d event(s)",
        total_sent,
        total_events,
    )
    return {"status": "success", "emails_sent": total_sent, "events_count": total_events}

