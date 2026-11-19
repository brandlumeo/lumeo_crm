from rest_framework import serializers

from companies.models import PlatformSettings


class SaasSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlatformSettings
        exclude = ("id", "plan_overrides")  # plans are edited through /saas/billing/plans/
        read_only_fields = ("updated_at",)
