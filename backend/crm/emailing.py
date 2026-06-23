import uuid

from django.conf import settings
from django.core.mail import EmailMessage as DjangoEmailMessage
from django.core.mail import get_connection
from django.utils import timezone

from .models import Activity, EmailAccount, EmailMessage, SMTPConfig


def build_template_context(*, company, actor_user=None, lead=None, customer=None, deal=None):
    context = {
        "company_name": company.name,
        "record_name": "",
        "name": "",
    }

    if actor_user is not None:
        context["user_name"] = actor_user.get_full_name() or actor_user.username

    if lead is not None:
        context.update(
            {
                "record_name": lead.name,
                "name": lead.name,
                "lead_name": lead.name,
                "lead_email": lead.email,
            }
        )
    elif customer is not None:
        context.update(
            {
                "record_name": customer.name,
                "name": customer.name,
                "customer_name": customer.name,
                "customer_email": customer.email,
            }
        )
    elif deal is not None:
        context.update(
            {
                "record_name": deal.title,
                "name": deal.title,
                "deal_title": deal.title,
                "deal_amount": str(deal.amount),
            }
        )

    return context


def render_template_content(template, context):
    rendered = template or ""
    for key, value in context.items():
        replacement = "" if value is None else str(value)
        rendered = rendered.replace(f"{{{{{key}}}}}", replacement)
        rendered = rendered.replace(f"{{{key}}}", replacement)
    return rendered


def get_company_email_connection(company):
    try:
        smtp_config = SMTPConfig.objects.get(company=company)
        connection = get_connection(
            host=smtp_config.host,
            port=smtp_config.port,
            username=smtp_config.username,
            password=smtp_config.password,
            use_tls=smtp_config.use_tls,
            use_ssl=not smtp_config.use_tls,
            fail_silently=False,
        )
        from_email = smtp_config.from_email
    except SMTPConfig.DoesNotExist:
        connection = get_connection(fail_silently=False)
        from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@lumeocrm.com")
    return connection, from_email


def send_crm_email(
    *,
    company,
    subject_template="",
    body_template="",
    email_template=None,
    lead=None,
    customer=None,
    deal=None,
    to_email="",
    actor_user=None,
):
    if not to_email:
        if lead is not None:
            to_email = lead.email
        elif customer is not None:
            to_email = customer.email

    if not to_email:
        raise ValueError("Recipient email is required.")

    subject_source = subject_template or getattr(email_template, "subject", "")
    body_source = body_template or getattr(email_template, "body_content", "")

    if not subject_source:
        raise ValueError("Subject is required.")
    if not body_source:
        raise ValueError("Email body is required.")

    context = build_template_context(
        company=company,
        actor_user=actor_user,
        lead=lead,
        customer=customer,
        deal=deal,
    )
    parsed_subject = render_template_content(subject_source, context)
    parsed_body = render_template_content(body_source, context)

    connection, from_email = get_company_email_connection(company)
    email = DjangoEmailMessage(
        subject=parsed_subject,
        body=parsed_body,
        from_email=from_email,
        to=[to_email],
        connection=connection,
    )
    email.content_subtype = "html"
    email.send(fail_silently=False)

    current_time = timezone.now()
    account = None
    if actor_user is not None:
        account = EmailAccount.objects.filter(user=actor_user, is_active=True).first()

    if account:
        EmailMessage.objects.create(
            company=company,
            account=account,
            lead=lead,
            customer=customer,
            message_id=str(uuid.uuid4()),
            thread_id=str(uuid.uuid4()),
            direction=EmailMessage.Direction.OUTBOUND,
            from_address=from_email,
            to_addresses=[to_email],
            subject=parsed_subject,
            body_html=parsed_body,
            body_text=parsed_body,
            is_read=True,
            received_at=current_time,
        )
    elif lead or customer or deal:
        Activity.objects.create(
            company=company,
            lead=lead,
            customer=customer,
            deal=deal,
            activity_type=Activity.ActivityType.EMAIL,
            description=f"Subject: {parsed_subject}\n\n{parsed_body}",
            created_by=actor_user,
        )

    return {
        "subject": parsed_subject,
        "body": parsed_body,
        "to_email": to_email,
        "from_email": from_email,
    }
