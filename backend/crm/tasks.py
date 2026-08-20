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
