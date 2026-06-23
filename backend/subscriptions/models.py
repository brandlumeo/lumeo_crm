from django.db import models
from django.utils import timezone

from companies.models import Company


class Plan(models.TextChoices):
    FREE = "free", "Free Trial"
    STARTER = "starter", "Starter"
    PRO = "pro", "Pro"
    ENTERPRISE = "enterprise", "Enterprise"


PLAN_LIMITS = {
    Plan.FREE: {
        "max_users": 2,
        "max_leads": 50,
        "max_deals": 20,
        "price_monthly": 0,
        "price_yearly": 0,
    },
    Plan.STARTER: {
        "max_users": 5,
        "max_leads": 500,
        "max_deals": 200,
        "price_monthly": 999,
        "price_yearly": 9990,
    },
    Plan.PRO: {
        "max_users": 20,
        "max_leads": 5000,
        "max_deals": 2000,
        "price_monthly": 2999,
        "price_yearly": 29990,
    },
    Plan.ENTERPRISE: {
        "max_users": 100,
        "max_leads": 999999,
        "max_deals": 999999,
        "price_monthly": 7999,
        "price_yearly": 79990,
    },
}


class Subscription(models.Model):
    company = models.OneToOneField(
        Company,
        on_delete=models.CASCADE,
        related_name="subscription",
    )
    plan = models.CharField(
        max_length=20,
        choices=Plan.choices,
        default=Plan.FREE,
        db_index=True,
    )
    is_active = models.BooleanField(default=True, db_index=True)
    expires_at = models.DateTimeField(null=True, blank=True, db_index=True)
    
    # Razorpay payment tracking fields
    razorpay_subscription_id = models.CharField(max_length=255, blank=True, null=True, db_index=True)
    razorpay_payment_id = models.CharField(max_length=255, blank=True, null=True)
    razorpay_signature = models.CharField(max_length=255, blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self):
        return f"{self.company.name} — {self.get_plan_display()}"

    @property
    def is_expired(self):
        if self.expires_at is None:
            return False
        return self.expires_at < timezone.now()

    @property
    def days_remaining(self):
        if self.expires_at is None:
            return None
        delta = self.expires_at - timezone.now()
        return max(0, delta.days)

    @property
    def plan_limits(self):
        return PLAN_LIMITS.get(self.plan, PLAN_LIMITS[Plan.FREE])

    @property
    def is_trial(self):
        return self.plan == Plan.FREE
