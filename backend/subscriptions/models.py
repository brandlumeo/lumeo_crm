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
        "max_leads_monthly": 50,
        "max_deals_monthly": 20,
        "max_leads_yearly": 50,
        "max_deals_yearly": 20,
        "price_monthly": 0,
        "price_yearly": 0,
    },
    Plan.STARTER: {
        "max_users": 5,
        "max_leads_monthly": 500,
        "max_deals_monthly": 200,
        "max_leads_yearly": 6000,
        "max_deals_yearly": 1200,
        "price_monthly": 599,
        "price_yearly": 5999,
    },
    Plan.PRO: {
        "max_users": 20,
        "max_leads_monthly": 5000,
        "max_deals_monthly": 2000,
        "max_leads_yearly": 60000,
        "max_deals_yearly": 24000,
        "price_monthly": 1199,
        "price_yearly": 13999,
    },
    Plan.ENTERPRISE: {
        "max_users": 100,
        "max_leads_monthly": 999999,
        "max_deals_monthly": 999999,
        "max_leads_yearly": 999999,
        "max_deals_yearly": 999999,
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
    billing_period = models.CharField(
        max_length=20,
        default="monthly",
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
        limits = PLAN_LIMITS.get(self.plan, PLAN_LIMITS[Plan.FREE])
        return {
            "max_users": limits["max_users"],
            "max_leads": limits["max_leads_yearly"] if self.billing_period == "yearly" else limits["max_leads_monthly"],
            "max_deals": limits["max_deals_yearly"] if self.billing_period == "yearly" else limits["max_deals_monthly"],
            "price_monthly": limits["price_monthly"],
            "price_yearly": limits["price_yearly"],
            "max_leads_monthly": limits["max_leads_monthly"],
            "max_deals_monthly": limits["max_deals_monthly"],
            "max_leads_yearly": limits["max_leads_yearly"],
            "max_deals_yearly": limits["max_deals_yearly"],
        }

    @property
    def is_trial(self):
        return self.plan == Plan.FREE
