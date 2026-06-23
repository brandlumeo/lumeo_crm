from django.conf import settings
from django.db import models


class Notification(models.Model):
    class Type(models.TextChoices):
        LEAD_ASSIGNED = "lead_assigned", "Lead Assigned"
        DEAL_WON = "deal_won", "Deal Won"
        TASK_DUE = "task_due", "Task Due"
        SUBSCRIPTION_EXPIRING = "subscription_expiring", "Subscription Expiring"
        SUBSCRIPTION_UPGRADED = "subscription_upgraded", "Subscription Upgraded"
        GENERAL = "general", "General"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    notification_type = models.CharField(
        max_length=40,
        choices=Type.choices,
        default=Type.GENERAL,
        db_index=True,
    )
    title = models.CharField(max_length=255)
    body = models.TextField()
    is_read = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=("user", "is_read")),
            models.Index(fields=("user", "created_at")),
        ]

    def __str__(self):
        return f"[{self.get_notification_type_display()}] {self.title} → {self.user}"

from django.db.models.signals import post_save
from django.dispatch import receiver

@receiver(post_save, sender=Notification)
def trigger_notification_email(sender, instance, created, **kwargs):
    if created and instance.user.email:
        from .tasks import send_notification_email
        send_notification_email.delay(
            to_email=instance.user.email,
            title=instance.title,
            body=instance.body
        )
