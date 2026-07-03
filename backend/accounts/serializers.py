from rest_framework import serializers

from .models import User, TeamInvitation


def verify_totp(secret, code, window=1):
    import base64
    import hmac
    import hashlib
    import time
    import struct

    try:
        secret = secret.replace(" ", "").upper()
        missing_padding = len(secret) % 8
        if missing_padding:
            secret += "=" * (8 - missing_padding)
        key = base64.b32decode(secret)
    except Exception:
        return False

    try:
        code = int(code)
    except Exception:
        return False

    now = int(time.time())
    current_step = now // 30

    for i in range(-window, window + 1):
        step = current_step + i
        msg = struct.pack(">Q", step)
        h = hmac.new(key, msg, hashlib.sha1).digest()
        offset = h[-1] & 0x0f
        truncated = struct.unpack(">I", h[offset:offset+4])[0] & 0x7fffffff
        otp = truncated % 1000000
        if otp == code:
            return True
    return False


class UserSerializer(serializers.ModelSerializer):
    company = serializers.SerializerMethodField()
    two_factor_code = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "role",
            "designation",
            "department",
            "company",
            "avatar",
            "timezone",
            "prefix",
            "mobile",
            "country",
            "language",
            "gender",
            "receive_email_notifications",
            "enable_google_calendar",
            "notify_new_lead",
            "notify_deal_stage",
            "notify_task_deadline",
            "notify_workspace_updates",
            "email_notifications",
            "slack_notifications",
            "push_notifications",
            "emergency_contacts",
            "can_manage_team",
            "has_management_access",
            "is_superuser",
            "is_staff",
            "two_factor_enabled",
            "two_factor_method",
            "two_factor_secret",
            "two_factor_code",
        )
        read_only_fields = (
            "id",
            "username",
            "email",
            "role",
            "company",
            "can_manage_team",
            "has_management_access",
            "is_superuser",
            "is_staff",
            "two_factor_secret",
        )

    def get_company(self, obj):
        if obj.company_id is None:
            return None

        return {
            "id": str(obj.company_id),
            "name": obj.company.name,
            "slug": obj.company.slug,
            "status": obj.company.status,
        }

    def validate(self, attrs):
        two_factor_enabled = attrs.get("two_factor_enabled")
        
        is_enabling = False
        if two_factor_enabled is True:
            if not self.instance or not self.instance.two_factor_enabled:
                is_enabling = True
        
        if is_enabling:
            two_factor_method = attrs.get("two_factor_method", self.instance.two_factor_method if self.instance else "disabled")
            code = attrs.get("two_factor_code")
            
            if two_factor_method == "google_authenticator":
                secret = self.instance.two_factor_secret if self.instance else None
                if not secret:
                    raise serializers.ValidationError({"two_factor_code": ["No 2FA secret found for this account."]})
                if not code or not verify_totp(secret, code):
                    raise serializers.ValidationError({"two_factor_code": ["Invalid authenticator code. Please try again."]})
            elif two_factor_method == "email":
                if not code or code != "123456":
                    raise serializers.ValidationError({"two_factor_code": ["Invalid code. For email simulation, use 123456."]})

        return attrs

    def update(self, instance, validated_data):
        validated_data.pop("two_factor_code", None)
        return super().update(instance, validated_data)


class TeamInvitationSerializer(serializers.ModelSerializer):
    class Meta:
        model = TeamInvitation
        fields = (
            "id",
            "email",
            "first_name",
            "last_name",
            "designation",
            "department",
            "personal_message",
            "role",
            "is_accepted",
            "created_at",
            "expires_at",
            "is_expired",
        )
        read_only_fields = (
            "id",
            "is_accepted",
            "created_at",
            "expires_at",
            "is_expired",
        )

class PasswordUpdateSerializer(serializers.Serializer):
    current_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True)
