from django.core.mail import EmailMultiAlternatives
from django.conf import settings

def build_premium_email(subject: str, heading: str, body_text: str, body_html: str, pre_header: str = "NOTIFICATION", action_url: str = None, action_text: str = "View in CRM", to_email: str = None, bcc_list: list = None) -> EmailMultiAlternatives:
    """Build a multi-part premium email matching the invite/reset template."""
    
    button_html = ""
    if action_url:
        button_html = f"""
            <table cellpadding="0" cellspacing="0" style="margin-top: 16px;">
              <tr>
                <td style="background:#1A1714;border-radius:8px;padding:14px 28px;">
                  <a href="{action_url}" style="font-family:Georgia,serif;font-size:15px;color:#F4EFE6;text-decoration:none;font-weight:500;">
                    {action_text} &rarr;
                  </a>
                </td>
              </tr>
            </table>
        """

    html = f"""
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#F4EFE6;font-family:'Georgia',serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:40px 20px;">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#FFFDF8;border:1px solid #E8E0D0;border-radius:12px;overflow:hidden;text-align:left;">
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
              {pre_header}
            </p>
            <h1 style="font-family:Georgia,serif;font-size:32px;color:#1A1714;margin:0 0 20px;line-height:1.1;">
              {heading}
            </h1>
            <div style="font-family:system-ui,-apple-system,sans-serif;font-size:15px;color:#4A4540;line-height:1.6;margin:0 0 24px;">
              {body_html}
            </div>
            {button_html}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#F4EFE6;padding:20px 36px;border-top:1px solid #E8E0D0;">
            <p style="font-size:12px;color:#8B8580;margin:0 0 8px;font-family:system-ui,-apple-system,sans-serif;">
               Need help? Reach out to our human team at 
               <a href="mailto:support@crm.estgrp.in" style="color:#FF5B1F;text-decoration:none;">support@crm.estgrp.in</a>
            </p>
            <p style="font-size:11px;color:#8B8580;margin:0;font-family:system-ui,-apple-system,sans-serif;">&copy; 2026 Lumeo CRM. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
"""

    to_list = [to_email] if to_email else []
    msg = EmailMultiAlternatives(
        subject=subject,
        body=body_text,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=to_list,
        bcc=bcc_list,
    )
    msg.attach_alternative(html, "text/html")
    return msg
