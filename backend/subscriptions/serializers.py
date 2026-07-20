from rest_framework import serializers

from .models import PLAN_LIMITS, Subscription


class SubscriptionSerializer(serializers.ModelSerializer):
    plan_display = serializers.CharField(source="get_plan_display", read_only=True)
    is_expired = serializers.BooleanField(read_only=True)
    days_remaining = serializers.IntegerField(read_only=True)
    is_trial = serializers.BooleanField(read_only=True)
    plan_limits = serializers.SerializerMethodField()

    class Meta:
        model = Subscription
        fields = (
            "id",
            "plan",
            "plan_display",
            "is_active",
            "is_expired",
            "is_trial",
            "days_remaining",
            "expires_at",
            "plan_limits",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields

    def get_plan_limits(self, obj):
        return obj.plan_limits


class PlanDetailSerializer(serializers.Serializer):
    """Static plan catalogue — no model backing."""
    key = serializers.CharField()
    name = serializers.CharField()
    price_monthly = serializers.IntegerField()
    price_yearly = serializers.IntegerField()
    max_users = serializers.IntegerField()
    max_leads = serializers.IntegerField()
    max_deals = serializers.IntegerField()
    max_leads_monthly = serializers.IntegerField()
    max_leads_yearly = serializers.IntegerField()
    max_deals_monthly = serializers.IntegerField()
    max_deals_yearly = serializers.IntegerField()
    is_current = serializers.BooleanField()


def build_plan_catalogue(current_plan: str):
    from .models import Plan
    result = []
    for choice_key, choice_label in Plan.choices:
        limits = PLAN_LIMITS[choice_key]
        result.append({
            "key": choice_key,
            "name": choice_label,
            "price_monthly": limits["price_monthly"],
            "price_yearly": limits["price_yearly"],
            "max_users": limits["max_users"],
            "max_leads": limits["max_leads_monthly"],
            "max_deals": limits["max_deals_monthly"],
            "max_leads_monthly": limits["max_leads_monthly"],
            "max_leads_yearly": limits["max_leads_yearly"],
            "max_deals_monthly": limits["max_deals_monthly"],
            "max_deals_yearly": limits["max_deals_yearly"],
            "is_current": choice_key == current_plan,
        })
    return result
