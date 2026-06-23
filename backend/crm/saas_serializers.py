from rest_framework import serializers
from companies.models import Company
from accounts.models import User
from subscriptions.models import Subscription

class SaasCompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = '__all__'

class SaasUserSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source='company.name', read_only=True)
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role', 'is_active', 'is_staff', 'is_superuser', 'company', 'company_name', 'date_joined']

class SaasSubscriptionSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source='company.name', read_only=True)
    plan_display = serializers.CharField(source='get_plan_display', read_only=True)
    class Meta:
        model = Subscription
        fields = '__all__'

from companies.models import PlatformSettings

class SaasSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlatformSettings
        fields = '__all__'
