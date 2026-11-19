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


PLAN_LIMIT_KEYS = (
    "max_users", "max_leads_monthly", "max_deals_monthly", "max_leads_yearly", "max_deals_yearly",
    "price_monthly", "price_yearly",
)


def get_plan_catalog():
    """PLAN_LIMITS with the SaaS admin's price/limit overrides applied."""
    catalog = {plan: dict(limits) for plan, limits in PLAN_LIMITS.items()}
    try:
        from companies.models import PlatformSettings
        overrides = PlatformSettings.get_settings().plan_overrides or {}
    except Exception:  # table missing during early migrations
        overrides = {}
    for plan, values in overrides.items():
        if plan in catalog and isinstance(values, dict):
            for key in PLAN_LIMIT_KEYS:
                if key in values and values[key] is not None:
                    catalog[plan][key] = values[key]
    return catalog


def plan_limits_for(plan):
    catalog = get_plan_catalog()
    return catalog.get(plan, catalog[Plan.FREE])


def monthly_value(plan, billing_period, catalog=None):
    """Recurring revenue per month for a plan: yearly prices are spread over 12 months."""
    limits = (catalog or get_plan_catalog()).get(plan) or {}
    if billing_period == "yearly":
        return float(limits.get("price_yearly", 0) or 0) / 12
    return float(limits.get("price_monthly", 0) or 0)


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
        limits = plan_limits_for(self.plan)
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
