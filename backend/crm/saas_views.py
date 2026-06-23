from rest_framework import viewsets, views, permissions
from rest_framework.response import Response
from companies.models import Company
from accounts.models import User
from subscriptions.models import Subscription
from .saas_serializers import SaasCompanySerializer, SaasUserSerializer, SaasSubscriptionSerializer, SaasSettingsSerializer

class SaasCompanyViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAdminUser]
    queryset = Company.objects.all().order_by('-created_at')
    serializer_class = SaasCompanySerializer

class SaasUserViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAdminUser]
    queryset = User.objects.all().select_related('company').order_by('-date_joined')
    serializer_class = SaasUserSerializer

class SaasSubscriptionViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAdminUser]
    queryset = Subscription.objects.all().select_related('company').order_by('-created_at')
    serializer_class = SaasSubscriptionSerializer

class SaasStatsView(views.APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        total_companies = Company.objects.count()
        active_companies = Company.objects.filter(status='active').count()
        trial_companies = Company.objects.filter(status='trial').count()
        total_users = User.objects.count()
        active_users = User.objects.filter(is_active=True).count()
        
        # simple mock for MRR based on active companies (e.g. $49/mo)
        mrr = active_companies * 49.00

        recent_companies = Company.objects.order_by('-created_at')[:5]
        recent_companies_data = SaasCompanySerializer(recent_companies, many=True).data

        return Response({
            'total_companies': total_companies,
            'active_companies': active_companies,
            'trial_companies': trial_companies,
            'total_users': total_users,
            'active_users': active_users,
            'mrr': mrr,
            'recent_companies': recent_companies_data
        })

from companies.models import PlatformSettings

class SaasSettingsView(views.APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        settings = PlatformSettings.get_settings()
        serializer = SaasSettingsSerializer(settings)
        return Response(serializer.data)

    def patch(self, request):
        settings = PlatformSettings.get_settings()
        serializer = SaasSettingsSerializer(settings, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)
