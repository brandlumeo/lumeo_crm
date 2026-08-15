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

