"""
Celery email tasks for Lumeo CRM.

All email sending is done via Celery tasks so that API responses are
non-blocking even when the SMTP server is slow.
"""

from celery import shared_task
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
import logging

logger = logging.getLogger(__name__)


def _make_email(subject: str, plain: str, html: str, to: str) -> EmailMultiAlternatives:
    """Build a multi-part email with plain-text fallback."""
    msg = EmailMultiAlternatives(
        subject=subject,
        body=plain,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[to],
    )
    msg.attach_alternative(html, "text/html")
    return msg


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_invite_email(self, to_email: str, inviter_name: str, company_name: str, invite_url: str):
    """Send a team invitation email to the new member."""
    subject = f"You're invited to join {company_name} on Lumeo CRM"

    plain = f"""Hi,

{inviter_name} has invited you to join {company_name} on Lumeo CRM.

Accept your invitation here:
{invite_url}

This link expires in 7 days. If you didn't expect this invitation, you can safely ignore this email.

— The Lumeo Team
"""

    html = f"""
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#F4EFE6;font-family:'Georgia',serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:40px 20px;">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#FFFDF8;border:1px solid #E8E0D0;border-radius:12px;overflow:hidden;">

        <!-- Header -->
        <tr>
          <td style="background:#1A1714;padding:28px 36px;">
            <span style="font-family:Georgia,serif;font-size:24px;color:#F4EFE6;letter-spacing:-0.5px;">
              Lume<em style="color:#FF5B1F;font-style:normal;">o</em>
            </span>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px;">
            <p style="font-size:13px;color:#8B8580;text-transform:uppercase;letter-spacing:0.12em;margin:0 0 12px;">
              Team Invitation
            </p>
            <h1 style="font-family:Georgia,serif;font-size:32px;color:#1A1714;margin:0 0 20px;line-height:1.1;">
              You've been invited.
            </h1>
            <p style="font-size:15px;color:#4A4540;line-height:1.6;margin:0 0 24px;">
              <strong>{inviter_name}</strong> has invited you to join
              <strong>{company_name}</strong> on Lumeo CRM.
            </p>
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#1A1714;border-radius:8px;padding:14px 28px;">
                  <a href="{invite_url}" style="font-family:Georgia,serif;font-size:15px;color:#F4EFE6;text-decoration:none;font-weight:500;">
                    Accept Invitation →
                  </a>
                </td>
              </tr>
            </table>
            <p style="font-size:12px;color:#8B8580;margin:20px 0 0;">
              This link expires in 7 days. If you didn't expect this email, you can safely ignore it.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#F4EFE6;padding:20px 36px;border-top:1px solid #E8E0D0;">
            <p style="font-size:12px;color:#8B8580;margin:0 0 8px;">
               Need help? Reach out to our human team at 
               <a href="mailto:support.lumeo-crm@gmail.com" style="color:#FF5B1F;text-decoration:none;">support.lumeo-crm@gmail.com</a>
            </p>
            <p style="font-size:11px;color:#8B8580;margin:0;">© 2026 Lumeo CRM. All rights reserved.</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
"""

    try:
        msg = _make_email(subject, plain, html, to_email)
        msg.send()
        logger.info(f"Invite email sent to {to_email}")
    except Exception as exc:
        logger.error(f"Failed to send invite email to {to_email}: {exc}")
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_password_reset_email(self, to_email: str, name: str, reset_url: str):
    """Send a password reset email."""
    subject = "Reset your Lumeo CRM password"

    plain = f"""Hi {name},

We received a request to reset your Lumeo CRM password.

Click the link below to set a new password:
{reset_url}

This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.

— The Lumeo Team
"""

    html = f"""
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#F4EFE6;font-family:'Georgia',serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:40px 20px;">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#FFFDF8;border:1px solid #E8E0D0;border-radius:12px;overflow:hidden;">

        <!-- Header -->
        <tr>
          <td style="background:#1A1714;padding:28px 36px;">
            <span style="font-family:Georgia,serif;font-size:24px;color:#F4EFE6;letter-spacing:-0.5px;">
              Lume<em style="color:#FF5B1F;font-style:normal;">o</em>
            </span>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px;">
            <p style="font-size:13px;color:#8B8580;text-transform:uppercase;letter-spacing:0.12em;margin:0 0 12px;">
              Password Reset
            </p>
            <h1 style="font-family:Georgia,serif;font-size:32px;color:#1A1714;margin:0 0 20px;line-height:1.1;">
              Reset your password.
            </h1>
            <p style="font-size:15px;color:#4A4540;line-height:1.6;margin:0 0 24px;">
              Hi <strong>{name}</strong>, we received a request to reset your Lumeo CRM password.
              Click the button below to choose a new password.
            </p>
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#FF5B1F;border-radius:8px;padding:14px 28px;">
                  <a href="{reset_url}" style="font-family:Georgia,serif;font-size:15px;color:#fff;text-decoration:none;font-weight:500;">
                    Reset Password →
                  </a>
                </td>
              </tr>
            </table>
            <p style="font-size:12px;color:#8B8580;margin:20px 0 8px;">
              Or paste this link in your browser:
            </p>
            <p style="font-size:11px;color:#8B8580;word-break:break-all;background:#F4EFE6;padding:10px;border-radius:6px;margin:0;">
              {reset_url}
            </p>
            <p style="font-size:12px;color:#8B8580;margin:16px 0 0;">
              This link expires in <strong>1 hour</strong>.
              If you didn't request this, you can safely ignore this email.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#F4EFE6;padding:20px 36px;border-top:1px solid #E8E0D0;">
            <p style="font-size:12px;color:#8B8580;margin:0 0 8px;">
               Need help? Reach out to our human team at 
               <a href="mailto:support.lumeo-crm@gmail.com" style="color:#FF5B1F;text-decoration:none;">support.lumeo-crm@gmail.com</a>
            </p>
            <p style="font-size:11px;color:#8B8580;margin:0;">© 2026 Lumeo CRM. All rights reserved.</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
"""

    try:
        msg = _make_email(subject, plain, html, to_email)
        msg.send()
        logger.info(f"Password reset email sent to {to_email}")
    except Exception as exc:
        logger.error(f"Failed to send password reset email to {to_email}: {exc}")
        raise self.retry(exc=exc)
