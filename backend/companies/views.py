from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import CompanySerializer


class CurrentCompanyView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        company = getattr(request.user, "company", None)
        if company is None and request.user.is_superuser:
            from .models import Company
            company = Company.objects.first()

        if company is None:
            return Response(
                {"detail": "Authenticated user is not assigned to a company."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = CompanySerializer(company)
        return Response(serializer.data)

    def put(self, request):
        company = getattr(request.user, "company", None)
        if company is None and request.user.is_superuser:
            from .models import Company
            company = Company.objects.first()

        if company is None:
            return Response(
                {"detail": "Authenticated user is not assigned to a company."},
                status=status.HTTP_404_NOT_FOUND,
            )

        from accounts.models import User
        has_permission = request.user.role in [User.Role.OWNER, User.Role.ADMIN]
        
        if not has_permission:
            user_role_str = str(request.user.role).lower()
            if company.roles:
                for role_dict in company.roles:
                    if role_dict.get('name', '').lower() == user_role_str:
                        attendance_update = role_dict.get('permissions', {}).get('Attendance', {}).get('Update', 'None')
                        if attendance_update in ['All', 'Owned']:
                            has_permission = True
                        break

        if not has_permission:
            return Response(
                {"detail": "You do not have permission to perform this action."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = CompanySerializer(company, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class InvoiceSettingsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        company = getattr(request.user, "company", None)
        if company is None:
            return Response({"detail": "No company assigned."}, status=status.HTTP_404_NOT_FOUND)
            
        from .models import InvoiceSettings
        from .serializers import InvoiceSettingsSerializer
        settings, _ = InvoiceSettings.objects.get_or_create(company=company)
        return Response(InvoiceSettingsSerializer(settings, context={'request': request}).data)

    def put(self, request):
        company = getattr(request.user, "company", None)
        if company is None:
            return Response({"detail": "No company assigned."}, status=status.HTTP_404_NOT_FOUND)
            
        from accounts.models import User
        if request.user.role not in [User.Role.OWNER, User.Role.ADMIN]:
            return Response({"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)
            
        from .models import InvoiceSettings
        from .serializers import InvoiceSettingsSerializer
        settings, _ = InvoiceSettings.objects.get_or_create(company=company)
        
        serializer = InvoiceSettingsSerializer(settings, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(InvoiceSettingsSerializer(serializer.instance, context={'request': request}).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

from rest_framework import viewsets
from .models import Unit
from .serializers import UnitSerializer

class UnitViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = UnitSerializer

    def get_queryset(self):
        company = getattr(self.request.user, "company", None)
        if not company:
            return Unit.objects.none()
        return Unit.objects.filter(company=company)

    def perform_create(self, serializer):
        from rest_framework import exceptions
        company = getattr(self.request.user, "company", None)
        name = serializer.validated_data.get('name', '').strip()
        if Unit.objects.filter(company=company, name__iexact=name).exists():
            raise exceptions.ValidationError({"name": ["A unit with this name already exists."]})
        serializer.save(company=company, name=name)

    def perform_update(self, serializer):
        from rest_framework import exceptions
        from crm.models import InvoiceLineItem, QuoteLineItem, Product
        company = getattr(self.request.user, "company", None)
        name = serializer.validated_data.get('name', '').strip()
        
        if name:
            if Unit.objects.filter(company=company, name__iexact=name).exclude(pk=self.get_object().pk).exists():
                raise exceptions.ValidationError({"name": ["A unit with this name already exists."]})
                
            old_name = self.get_object().name
            if old_name != name:
                # Update all related models in crm that stored this unit name as string
                InvoiceLineItem.objects.filter(invoice__company=company, unit=old_name).update(unit=name)
                QuoteLineItem.objects.filter(quote__company=company, unit=old_name).update(unit=name)
                Product.objects.filter(company=company, unit=old_name).update(unit=name)
            serializer.save(name=name)
        else:
            serializer.save()

from .models import PaymentMethod
from .serializers import PaymentMethodSerializer

class PaymentMethodViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = PaymentMethodSerializer

    def get_queryset(self):
        company = getattr(self.request.user, "company", None)
        if not company:
            return PaymentMethod.objects.none()
        return PaymentMethod.objects.filter(company=company)

    def perform_create(self, serializer):
        company = getattr(self.request.user, "company", None)
        serializer.save(company=company)
