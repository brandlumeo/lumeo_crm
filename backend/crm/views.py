from decimal import Decimal, InvalidOperation

from django.shortcuts import get_object_or_404
from django.utils import timezone as dj_timezone
from django.utils.dateparse import parse_date
from rest_framework.filters import OrderingFilter, SearchFilter
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Q

from rest_framework.decorators import action
from .models import Customer, Deal, Lead, Note, Task, Activity, Attachment, Product, Quote, Invoice, CustomFieldDefinition, WorkflowRule, WorkflowSequence, SMTPConfig, EmailTemplate, WebhookSubscription, WebhookDeliveryLog, Campaign, Ticket, TicketComment, Order, Event, Notice
from .permissions import CompanyRBACPermission, AdminOnlyRBACPermission
from .serializers import (
    CustomerSerializer,
    DealSerializer,
    LeadSerializer,
    NoteSerializer,
    TaskSerializer,
    ActivitySerializer,
    AttachmentSerializer,
    ProductSerializer,
    QuoteSerializer,
    InvoiceSerializer,
    CustomFieldDefinitionSerializer,
    WorkflowRuleSerializer,
    WorkflowSequenceSerializer,
    SMTPConfigSerializer,
    EmailTemplateSerializer,
    WebhookSubscriptionSerializer,
    WebhookDeliveryLogSerializer,
    CampaignSerializer,
    TicketSerializer,
    TicketCommentSerializer,
    OrderSerializer,
    EventSerializer,
    NoticeSerializer,
)
from .emailing import send_crm_email


class CompanyScopedModelViewSet(ModelViewSet):
    permission_classes = [CompanyRBACPermission]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]

    def get_queryset(self):
        queryset = self.queryset
        user = self.request.user

        if user.is_superuser:
            return queryset

        if user.company_id is None:
            return queryset.none()

        queryset = queryset.filter(company_id=user.company_id)

        if hasattr(user, 'role') and user.role == "CUSTOMER":
            customer = getattr(user, 'customer_profile', None)
            if not customer:
                return queryset.none()
                
            model_name = self.queryset.model.__name__
            if model_name == "Customer":
                return queryset.filter(id=customer.id)
            elif model_name == "Invoice":
                return queryset.filter(customer=customer)
            elif model_name == "Ticket":
                return queryset.filter(customer=customer)
            elif model_name == "TicketComment":
                return queryset.filter(ticket__customer=customer)
            elif model_name == "Attachment":
                return queryset.filter(customer=customer)
            else:
                return queryset.none()

        return queryset

    def perform_create(self, serializer):
        user = self.request.user
        if not user.is_superuser and user.company_id is None:
            raise PermissionDenied("Authenticated user is not assigned to a company.")
            
        if user.company_id is not None:
            try:
                company = user.company
                subscription = getattr(company, "subscription", None)
                if subscription:
                    limits = subscription.plan_limits
                    model_name = self.queryset.model.__name__
                    if model_name == "Lead":
                        max_leads = limits.get("max_leads", 0)
                        current_leads = self.queryset.model.objects.filter(company=company).count()
                        if current_leads >= max_leads:
                            raise PermissionDenied(f"Lead limit reached. Your plan allows up to {max_leads} leads.")
                    elif model_name == "Deal":
                        max_deals = limits.get("max_deals", 0)
                        current_deals = self.queryset.model.objects.filter(company=company).count()
                        if current_deals >= max_deals:
                            raise PermissionDenied(f"Deal limit reached. Your plan allows up to {max_deals} deals.")
            except PermissionDenied:
                raise
            except Exception:
                pass

        save_kwargs = {}
        if hasattr(user, 'role') and user.role == "CUSTOMER":
            customer = getattr(user, 'customer_profile', None)
            if not customer:
                raise PermissionDenied("No customer profile associated with this account.")
            
            model_name = self.queryset.model.__name__
            if model_name in ["Ticket", "Attachment"]:
                save_kwargs["customer"] = customer
                
        serializer.save(**save_kwargs)

    def filter_queryset(self, queryset):
        queryset = super().filter_queryset(queryset)
        return self.apply_business_filters(queryset)

    def apply_business_filters(self, queryset):
        return queryset

    def _filter_by_assignee(self, queryset):
        assigned_to = self.request.query_params.get("assigned_to")
        if assigned_to:
            queryset = queryset.filter(assigned_to_id=assigned_to)
        return queryset

    def _filter_by_date_range(self, queryset, field_name):
        date_from = self.request.query_params.get(f"{field_name}_from")
        date_to = self.request.query_params.get(f"{field_name}_to")

        if date_from:
            parsed_from = parse_date(date_from)
            if parsed_from:
                queryset = queryset.filter(**{f"{field_name}__gte": parsed_from})

        if date_to:
            parsed_to = parse_date(date_to)
            if parsed_to:
                queryset = queryset.filter(**{f"{field_name}__lte": parsed_to})

        return queryset

    def _filter_by_decimal_range(self, queryset, field_name):
        min_value = self.request.query_params.get(f"min_{field_name}")
        max_value = self.request.query_params.get(f"max_{field_name}")

        if min_value:
            try:
                queryset = queryset.filter(**{f"{field_name}__gte": Decimal(min_value)})
            except (ArithmeticError, InvalidOperation, ValueError):
                pass

        if max_value:
            try:
                queryset = queryset.filter(**{f"{field_name}__lte": Decimal(max_value)})
            except (ArithmeticError, InvalidOperation, ValueError):
                pass

        return queryset


class LeadViewSet(CompanyScopedModelViewSet):
    permission_module = "Leads"
    serializer_class = LeadSerializer
    queryset = Lead.objects.select_related("company", "assigned_to")
    search_fields = ("name", "email", "assigned_to__username")
    ordering_fields = ("created_at", "updated_at", "name", "status")
    ordering = ("-created_at",)

    def apply_business_filters(self, queryset):
        status_value = self.request.query_params.get("status")
        if status_value:
            queryset = queryset.filter(status=status_value)

        return self._filter_by_assignee(queryset)
        
    @action(detail=True, methods=["post"])
    def predictive_score(self, request, pk=None):
        lead = self.get_object()
        
        # Mocking an AI predictive scoring logic
        import random
        import time
        
        # Simulate processing time for realism
        time.sleep(1.5)
        
        # Generate a semi-realistic score based on lead data presence
        base_score = 30
        rationale_points = []
        
        if lead.email:
            base_score += 15
            rationale_points.append("Has valid email address.")
            
        if lead.mobile:
            base_score += 10
            rationale_points.append("Has mobile number provided.")
            
        if lead.custom_data:
            base_score += 15
            rationale_points.append(f"Contains {len(lead.custom_data)} custom data points.")
            
        if lead.assigned_to:
            base_score += 10
            rationale_points.append("Lead is actively assigned to a rep.")
            
        if lead.status in ["contacted", "qualified"]:
            base_score += 15
            rationale_points.append("Lead is in an engaged stage.")
            
        # Add random jitter to seem dynamic
        final_score = min(100, base_score + random.randint(-10, 15))
        
        # Combine rationale
        if final_score >= 80:
            rationale = "High conversion likelihood. " + " ".join(rationale_points)
        elif final_score >= 50:
            rationale = "Moderate potential. " + " ".join(rationale_points)
        else:
            rationale = "Low engagement signals. Missing key profile data."
            
        lead.score = final_score
        lead.score_rationale = rationale
        lead.save(update_fields=["score", "score_rationale"])
        
        return Response(LeadSerializer(lead, context={"request": request}).data)

    @action(detail=False, methods=["post"], url_path="import-csv")
    def import_csv(self, request):
        import csv
        import io
        
        file_obj = request.FILES.get("file")
        if not file_obj:
            return Response({"error": "No file provided"}, status=400)
            
        if not file_obj.name.endswith(".csv"):
            return Response({"error": "File must be a CSV"}, status=400)
            
        try:
            csv_file = io.StringIO(file_obj.read().decode('utf-8'))
            reader = csv.DictReader(csv_file)
            
            created_count = 0
            company = request.user.company
            subscription = getattr(company, "subscription", None)
            max_leads = float("inf")
            if subscription:
                max_leads = subscription.plan_limits.get("max_leads", 0)
                
            current_leads = Lead.objects.filter(company=company).count()

            for row in reader:
                if current_leads + created_count >= max_leads:
                    break
                
                name = row.get("Name", row.get("name", "")).strip()
                email = row.get("Email", row.get("email", "")).strip()
                if not name and not email:
                    continue
                
                Lead.objects.create(
                    company=company,
                    name=name,
                    email=email,
                    status=row.get("Status", row.get("status", "new")).lower() or "new",
                )
                created_count += 1
                
            message = "success" if (current_leads + created_count < max_leads) else "Partial success: Lead limit reached."
            return Response({"status": message, "imported": created_count})
        except Exception as e:
            return Response({"error": f"Failed to parse CSV: {str(e)}"}, status=400)

    @action(detail=False, methods=["get"], url_path="export-csv")
    def export_csv(self, request):
        import csv
        from django.http import HttpResponse
        
        queryset = self.filter_queryset(self.get_queryset())
        
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="leads_export.csv"'
        
        writer = csv.writer(response)
        writer.writerow(["ID", "Name", "Email", "Status", "Score", "Created At"])
        
        for lead in queryset:
            writer.writerow([
                lead.id,
                lead.name,
                lead.email,
                lead.status,
                lead.score,
                lead.created_at.strftime("%Y-%m-%d %H:%M:%S") if lead.created_at else ""
            ])
            
        return response

class CustomerViewSet(CompanyScopedModelViewSet):
    permission_module = "Clients"
    serializer_class = CustomerSerializer
    queryset = Customer.objects.select_related("company")
    search_fields = ("name", "email", "phone")
    ordering_fields = ("created_at", "updated_at", "name", "email")
    ordering = ("name",)

    def apply_business_filters(self, queryset):
        email = self.request.query_params.get("email")
        if email:
            queryset = queryset.filter(email__icontains=email)

        return queryset

    @action(detail=True, methods=["post"], url_path="invite-portal")
    def invite_portal(self, request, pk=None):
        customer = self.get_object()
        
        if customer.user:
            return Response({"error": "Customer already has a portal account."}, status=400)
            
        from django.contrib.auth import get_user_model
        import string
        import random
        
        User = get_user_model()
        
        existing_user = User.objects.filter(email=customer.email).first()
        if existing_user:
            if existing_user.company != customer.company:
                return Response({"error": "This email is already registered in another workspace. Please use a different email."}, status=400)
            
            customer.user = existing_user
            customer.save(update_fields=["user"])
            
            # Send an email notifying them of the new access
            try:
                from django.core.mail import send_mail
                from django.conf import settings
                
                portal_url = "https://lumeo.estgrp.in/login"
                message = (
                    f"Hello {customer.name},\n\n"
                    f"Your existing portal account has been linked to a new customer profile at {customer.company.name}.\n\n"
                    f"You can log in at: {portal_url}\n"
                    f"Email: {existing_user.email}\n"
                    f"Password: (Your existing password)\n\n"
                    f"Best regards,\n"
                    f"{customer.company.name}"
                )
                
                send_mail(
                    subject=f"Portal Access Updated - {customer.company.name}",
                    message=message,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[customer.email],
                    fail_silently=False,
                )
            except Exception as e:
                print(f"Failed to send portal update email: {e}")

            return Response({
                "status": "success",
                "message": "Existing user account linked.",
                "credentials": {
                    "email": existing_user.email,
                    "password": "(Your existing password)"
                }
            })
            
        try:
            password = ''.join(random.choices(string.ascii_letters + string.digits, k=12))
            
            user = User.objects.create_user(
                username=customer.email,
                email=customer.email,
                password=password,
                first_name=customer.name.split(" ")[0],
                last_name=" ".join(customer.name.split(" ")[1:]),
                company=customer.company,
                role=User.Role.CUSTOMER,
            )
            
            customer.user = user
            customer.save(update_fields=["user"])

            # Send email to the customer with their credentials
            try:
                from django.core.mail import send_mail
                from django.conf import settings
                
                portal_url = "https://lumeo.estgrp.in/login"
                message = (
                    f"Hello {customer.name},\n\n"
                    f"A client portal account has been created for you at {customer.company.name}.\n\n"
                    f"You can log in at: {portal_url}\n"
                    f"Email: {user.email}\n"
                    f"Password: {password}\n\n"
                    f"Please change your password after your first login.\n\n"
                    f"Best regards,\n"
                    f"{customer.company.name}"
                )
                
                send_mail(
                    subject=f"Your Client Portal Access - {customer.company.name}",
                    message=message,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[customer.email],
                    fail_silently=False,
                )
            except Exception as e:
                # We don't want to fail the whole process if email sending fails
                print(f"Failed to send portal invite email: {e}")

            return Response({
                "status": "success",
                "message": "Portal account created.",
                "credentials": {
                    "email": user.email,
                    "password": password
                }
            })
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({"error": f"Failed to create user: {str(e)}"}, status=400)

    @action(detail=True, methods=["post"], url_path="reset-portal-password")
    def reset_portal_password(self, request, pk=None):
        customer = self.get_object()
        
        if not customer.user:
            return Response({"error": "Customer does not have a portal account yet."}, status=400)
            
        import string
        import random
        
        password = ''.join(random.choices(string.ascii_letters + string.digits, k=12))
        customer.user.set_password(password)
        customer.user.save(update_fields=["password"])
        
        try:
            from django.core.mail import send_mail
            from django.conf import settings
            
            portal_url = "https://lumeo.estgrp.in/login"
            message = (
                f"Hello {customer.name},\n\n"
                f"Your client portal password at {customer.company.name} has been reset.\n\n"
                f"You can log in at: {portal_url}\n"
                f"Email: {customer.user.email}\n"
                f"New Password: {password}\n\n"
                f"Please change your password after logging in.\n\n"
                f"Best regards,\n"
                f"{customer.company.name}"
            )
            
            send_mail(
                subject=f"Portal Password Reset - {customer.company.name}",
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[customer.user.email],
                fail_silently=False,
            )
        except Exception as e:
            print(f"Failed to send portal reset email: {e}")
        
        return Response({
            "status": "success",
            "message": "Portal password reset successfully.",
            "credentials": {
                "email": customer.user.email,
                "password": password
            }
        })



class DealViewSet(CompanyScopedModelViewSet):
    serializer_class = DealSerializer
    queryset = Deal.objects.select_related("company", "assigned_to")
    search_fields = ("title",)
    ordering_fields = ("created_at", "updated_at", "title", "amount", "stage", "row_order")
    ordering = ("row_order", "-created_at")

    def apply_business_filters(self, queryset):
        stage = self.request.query_params.get("stage")
        if stage:
            queryset = queryset.filter(stage=stage)

        return self._filter_by_decimal_range(queryset, "amount")

    @action(detail=False, methods=["post"], url_path="reorder")
    def reorder(self, request):
        from django.db import transaction
        deals_data = request.data.get("deals", [])
        if not deals_data:
            return Response({"error": "No data provided"}, status=400)

        deal_ids = [item["id"] for item in deals_data if "id" in item]

        # Verify ownership inside multi-tenant company bounds
        company_deals = Deal.objects.filter(id__in=deal_ids, company=request.user.company)
        deal_map = {deal.id: deal for deal in company_deals}

        with transaction.atomic():
            for item in deals_data:
                deal_id = item.get("id")
                new_stage = item.get("stage")
                new_order = item.get("row_order")

                # H6 fix: validate stage value against allowed choices before saving
                if deal_id not in deal_map:
                    continue
                if new_stage not in Deal.Stage.values:
                    continue
                if not isinstance(new_order, int):
                    continue

                deal = deal_map[deal_id]
                deal.stage = new_stage
                deal.row_order = new_order
                deal.save(update_fields=["stage", "row_order"])

        return Response({"status": "reordering applied successfully"})



class TaskViewSet(CompanyScopedModelViewSet):
    permission_module = "Tasks"
    serializer_class = TaskSerializer
    queryset = Task.objects.select_related("company", "assigned_to")
    search_fields = ("title", "assigned_to__username")
    ordering_fields = ("created_at", "updated_at", "title", "due_date", "status")
    ordering = ("-created_at",)

    def apply_business_filters(self, queryset):
        user = self.request.user
        status_value = self.request.query_params.get("status")
        if status_value:
            queryset = queryset.filter(status=status_value)

        queryset = self._filter_by_assignee(queryset)
        
        # For staff (non-management) employees with 'Owned' permission, restrict to their tasks
        if not user.has_management_access and user.role not in ["owner", "admin", "manager"]:
            company = getattr(user, "company", None)
            is_owned_only = True # Default to least privilege
            if company:
                roles = company.roles
                role_id = str(user.role).lower()
                
                # Fallback for legacy staff
                if role_id == "staff":
                    role_id = "employee"
                    
                role_data = next((r for r in roles if r.get("id") == role_id), None)
                if role_data:
                    perms = role_data.get("permissions", {})
                    task_perm = perms.get("Tasks", {})
                    if task_perm.get("View") == "All":
                        is_owned_only = False
                        
            if is_owned_only:
                queryset = queryset.filter(assigned_to=user)

        return self._filter_by_date_range(queryset, "due_date")


class NoteViewSet(CompanyScopedModelViewSet):
    permission_module = "notes"
    serializer_class = NoteSerializer
    queryset = Note.objects.select_related("company")
    search_fields = ("content",)
    ordering_fields = ("created_at", "updated_at")
    ordering = ("-created_at",)


class GlobalSearchView(APIView):
    permission_classes = [CompanyRBACPermission]

    def get(self, request):
        query = request.query_params.get("q", "").strip()
        if not query:
            return Response({"leads": [], "customers": [], "deals": [], "tasks": []})

        user = request.user
        company = getattr(user, "company", None)
        
        if not company:
            return Response({"leads": [], "customers": [], "deals": [], "tasks": []})

        # Search Leads
        leads = Lead.objects.filter(company=company).filter(
            Q(name__icontains=query) | Q(email__icontains=query)
        )[:5]

        # Search Customers
        customers = Customer.objects.filter(company=company).filter(
            Q(name__icontains=query) | Q(email__icontains=query) | Q(phone__icontains=query)
        )[:5]

        # Search Deals
        deals = Deal.objects.filter(company=company).filter(
            Q(title__icontains=query)
        )[:5]

        # Search Tasks
        tasks = Task.objects.filter(company=company).filter(
            Q(title__icontains=query)
        )[:5]

        # Search Quotes
        quotes = Quote.objects.filter(company=company).filter(
            Q(title__icontains=query) | Q(quote_number__icontains=query)
        )[:5]

        # Search Invoices
        invoices = Invoice.objects.filter(company=company).filter(
            Q(invoice_number__icontains=query)
        )[:5]

        # Search Products
        products = Product.objects.filter(company=company).filter(
            Q(name__icontains=query) | Q(sku__icontains=query) | Q(description__icontains=query)
        )[:5]

        # Search Tickets
        tickets = Ticket.objects.filter(company=company).filter(
            Q(subject__icontains=query) | Q(description__icontains=query)
        )[:5]

        # Search Orders
        orders = Order.objects.filter(company=company).filter(
            Q(order_number__icontains=query) | Q(notes__icontains=query)
        )[:5]

        # Search Events
        events = Event.objects.filter(company=company).filter(
            Q(title__icontains=query) | Q(description__icontains=query)
        )[:5]

        context = {"request": request}

        return Response({
            "leads": LeadSerializer(leads, many=True, context=context).data,
            "customers": CustomerSerializer(customers, many=True, context=context).data,
            "deals": DealSerializer(deals, many=True, context=context).data,
            "tasks": TaskSerializer(tasks, many=True, context=context).data,
            "quotes": QuoteSerializer(quotes, many=True, context=context).data,
            "invoices": InvoiceSerializer(invoices, many=True, context=context).data,
            "products": ProductSerializer(products, many=True, context=context).data,
            "tickets": TicketSerializer(tickets, many=True, context=context).data,
            "orders": OrderSerializer(orders, many=True, context=context).data,
            "events": EventSerializer(events, many=True, context=context).data,
        })


class ActivityViewSet(CompanyScopedModelViewSet):
    serializer_class = ActivitySerializer
    queryset = Activity.objects.select_related("company", "created_by")
    search_fields = ("description", "activity_type")
    ordering_fields = ("created_at",)
    ordering = ("-created_at",)

    def apply_business_filters(self, queryset):
        lead_id = self.request.query_params.get("lead")
        deal_id = self.request.query_params.get("deal")
        customer_id = self.request.query_params.get("customer")
        
        if lead_id:
            queryset = queryset.filter(lead_id=lead_id)
        if deal_id:
            queryset = queryset.filter(deal_id=deal_id)
        if customer_id:
            queryset = queryset.filter(customer_id=customer_id)
            
        return queryset

class AttachmentViewSet(CompanyScopedModelViewSet):
    serializer_class = AttachmentSerializer
    queryset = Attachment.objects.select_related("company", "uploaded_by")
    search_fields = ("file_name",)
    ordering_fields = ("created_at", "file_name", "file_size")
    ordering = ("-created_at",)

    # M6 fix: Allowed MIME types whitelist — reject executables and scripts
    ALLOWED_MIME_TYPES = {
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "text/plain",
        "text/csv",
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "image/svg+xml",
        "application/zip",
        "application/x-zip-compressed",
    }
    MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB

    def create(self, request, *args, **kwargs):
        file_obj = request.FILES.get("file")
        if file_obj:
            # Size check
            if file_obj.size > self.MAX_FILE_SIZE_BYTES:
                from rest_framework.response import Response
                return Response(
                    {"file": f"File too large. Maximum allowed size is 10 MB. Your file is {file_obj.size / (1024*1024):.1f} MB."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            # MIME type check
            content_type = getattr(file_obj, "content_type", "")
            if content_type not in self.ALLOWED_MIME_TYPES:
                from rest_framework.response import Response
                return Response(
                    {"file": f"File type '{content_type}' is not allowed. Please upload a document, image, or spreadsheet."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        return super().create(request, *args, **kwargs)

    def apply_business_filters(self, queryset):
        lead_id = self.request.query_params.get("lead")
        deal_id = self.request.query_params.get("deal")
        customer_id = self.request.query_params.get("customer")

        
        if lead_id:
            queryset = queryset.filter(lead_id=lead_id)
        if deal_id:
            queryset = queryset.filter(deal_id=deal_id)
        if customer_id:
            queryset = queryset.filter(customer_id=customer_id)
            
        return queryset

class ProductViewSet(CompanyScopedModelViewSet):
    serializer_class = ProductSerializer
    queryset = Product.objects.select_related("company")
    search_fields = ("name", "sku", "description")
    ordering_fields = ("name", "price", "tax_rate", "created_at", "is_active")
    ordering = ("-created_at",)

    def apply_business_filters(self, queryset):
        params = self.request.query_params

        # Filter by active status
        is_active = params.get("is_active")
        if is_active is not None:
            if is_active.lower() in ("true", "1"):
                queryset = queryset.filter(is_active=True)
            elif is_active.lower() in ("false", "0"):
                queryset = queryset.filter(is_active=False)

        # Filter by price range
        queryset = self._filter_by_decimal_range(queryset, "price")
        queryset = self._filter_by_decimal_range(queryset, "tax_rate")

        return queryset


def generate_pdf_response(instance, doc_type="Invoice"):
    from django.http import HttpResponse
    from reportlab.lib.pagesizes import letter
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image as RLImage
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib import colors
    import io
    import urllib.request

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40)
    story = []
    styles = getSampleStyleSheet()
    
    comp = instance.company
    template = comp.invoice_template if hasattr(comp, 'invoice_template') else "template1"
    
    # Theme colors based on template
    if template == "template1":  # Modern Blue
        primary_color = colors.HexColor("#2563EB")
        table_header_bg = colors.HexColor("#EFF6FF")
        title_align = 0
    elif template == "template2":  # Classic Minimal
        primary_color = colors.HexColor("#1A1714")
        table_header_bg = colors.white
        title_align = 1 # Center
    elif template == "template3":  # Bold Accent
        primary_color = colors.HexColor("#EF4444")
        table_header_bg = colors.HexColor("#FEF2F2")
        title_align = 2 # Right
    elif template == "template4":  # Edge Sidebar (Dark header)
        primary_color = colors.HexColor("#1F2937")
        table_header_bg = colors.HexColor("#F3F4F6")
        title_align = 0
    else:  # Clean Corporate
        primary_color = colors.HexColor("#0F172A")
        table_header_bg = colors.HexColor("#F8FAFC")
        title_align = 0

    title_style = ParagraphStyle(
        'DocTitle', parent=styles['Heading1'], fontSize=16, leading=20, textColor=primary_color, alignment=0
    )
    
    meta_label_style = ParagraphStyle(
        'MetaLabel', parent=styles['Normal'], fontSize=8, leading=12, textColor=colors.HexColor("#9CA3AF")
    )
    meta_value_style = ParagraphStyle(
        'MetaVal', parent=styles['Normal'], fontSize=10, leading=14, textColor=colors.HexColor("#111827")
    )
    bold_style = ParagraphStyle('BoldText', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=10, leading=14)
    
    # Header Section
    doc_number = getattr(instance, 'quote_number', getattr(instance, 'invoice_number', ''))
    
    left_p = Paragraph(f"<b>{comp.name}</b>", title_style)
    
    meta_info = f"<font size=16 color='#111827'><b>{doc_type.upper()}</b></font><br/><font size=10 color='#6B7280'>#{doc_number}</font><br/><br/>"
    
    # Add title for Quote
    if doc_type == "Quote" and getattr(instance, 'title', None):
        meta_info += f"<font size=10 color='#111827'><b>{instance.title}</b></font><br/>"
        
    # Add Dates
    if doc_type == "Invoice":
        issue_date = getattr(instance, 'issue_date', None)
        due_date = getattr(instance, 'due_date', None)
        if issue_date: meta_info += f"<font size=9 color='#6B7280'>Issue Date:</font> <font size=9 color='#111827'>{issue_date}</font><br/>"
        if due_date: meta_info += f"<font size=9 color='#6B7280'>Due Date:</font> <font size=9 color='#111827'>{due_date}</font><br/>"
    else:
        created_at = getattr(instance, 'created_at', None)
        valid_until = getattr(instance, 'valid_until', None)
        if created_at: meta_info += f"<font size=9 color='#6B7280'>Date:</font> <font size=9 color='#111827'>{created_at.strftime('%Y-%m-%d')}</font><br/>"
        if valid_until: meta_info += f"<font size=9 color='#6B7280'>Valid Until:</font> <font size=9 color='#111827'>{valid_until}</font><br/>"
        
    right_p_style = ParagraphStyle('RightHeader', alignment=2)
    right_p = Paragraph(meta_info, right_p_style)
    
    header_table = Table([[left_p, right_p]], colWidths=[250, 250])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'), 
        ('BOTTOMPADDING', (0,0), (-1,-1), 15),
        ('LINEBELOW', (0,0), (-1,-1), 0.5, colors.HexColor("#E5E7EB"))
    ]))
    story.append(header_table)
    story.append(Spacer(1, 20))
    
    # Billing Info
    cust_name = ""
    cust_company = ""
    cust_email = ""
    cust_phone = ""
    cust_address = ""
    
    customer_obj = getattr(instance, 'customer', None)
    if not customer_obj and getattr(instance, 'deal', None):
        customer_obj = getattr(instance.deal, 'customer', getattr(instance.deal, 'lead', None))
    
    if customer_obj:
        if comp.show_client_name: cust_name = f"<b>{getattr(customer_obj, 'name', '')}</b><br/>"
        if comp.show_client_company_name and hasattr(customer_obj, 'company'): cust_company = f"{customer_obj.company.name}<br/>"
        if comp.show_client_email: cust_email = f"{getattr(customer_obj, 'email', '')}<br/>"
        if comp.show_client_phone and hasattr(customer_obj, 'phone'): cust_phone = f"{customer_obj.phone}<br/>"
        if comp.show_client_address and getattr(customer_obj, 'custom_data', {}).get('address'): cust_address = f"{customer_obj.custom_data.get('address')}<br/>"
    else:
        cust_name = "<b>Customer Record</b>"
        
    recipient_text = f"{cust_name}{cust_company}{cust_email}{cust_phone}{cust_address}"
        
    currency_symbols = {'USD': '$', 'EUR': '€', 'GBP': '£', 'INR': 'Rs. '}
    curr = currency_symbols.get(comp.currency, f"{comp.currency} ")
    
    sender_text = f"<b>{comp.name}</b>"
    address_parts = [p for p in [comp.address_line1, comp.address_line2, comp.city, comp.state, comp.postal_code, comp.country] if p]
    if address_parts:
        sender_text += f"<br/>{', '.join(address_parts)}"

    if comp.tax_id and comp.show_tax_number_on_invoice:
        sender_text += f"<br/>{comp.tax_id_label or 'Tax ID'}: {comp.tax_id}"
        
    from_label = "BILLED FROM" if doc_type == "Invoice" else "PREPARED BY"
    to_label = "BILLED TO" if doc_type == "Invoice" else "PREPARED FOR"
    
    billing_data = [
        [Paragraph(f"<b>{from_label}</b>", meta_label_style), Paragraph(f"<b>{to_label}</b>", meta_label_style)],
        [Paragraph(sender_text, meta_value_style), Paragraph(recipient_text, meta_value_style)]
    ]
    
    billing_table = Table(billing_data, colWidths=[250, 250])
    billing_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'), 
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(billing_table)
    story.append(Spacer(1, 30))
    
    # Items Table
    left_normal = ParagraphStyle('LeftNormal', parent=styles['Normal'], alignment=0)
    left_label = ParagraphStyle('LeftLabel', parent=meta_label_style, alignment=0, fontName='Helvetica-Bold')
    
    table_data = [[
        Paragraph("<b>Item & Description</b>", left_label),
        Paragraph("<b>Qty</b>", left_label),
        Paragraph("<b>Rate</b>", left_label),
        Paragraph("<b>Amount</b>", left_label)
    ]]
    for item in instance.items.all():
        table_data.append([
            Paragraph(f"{item.name}<br/><font color='#666666'>{item.description}</font>", styles['Normal']),
            Paragraph(str(item.quantity), left_normal),
            Paragraph(f"{curr}{item.unit_price:,.2f}", left_normal),
            Paragraph(f"{curr}{item.total:,.2f}", left_normal)
        ])
    
    items_table = Table(table_data, colWidths=[240, 50, 100, 110])
    ts = [
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,0), 10),
        ('TOPPADDING', (0,0), (-1,0), 10),
        ('BOTTOMPADDING', (0,1), (-1,-1), 12),
        ('TOPPADDING', (0,1), (-1,-1), 12),
        ('LINEABOVE', (0,0), (-1,0), 0.5, colors.HexColor("#E5E7EB")),
        ('LINEBELOW', (0,0), (-1,0), 0.5, colors.HexColor("#E5E7EB")),
    ]
    items_table.setStyle(TableStyle(ts))
    story.append(items_table)
    story.append(Spacer(1, 20))
    
    # Totals Section
    right_normal = ParagraphStyle('RightNormal', parent=styles['Normal'], alignment=2)
    right_total = ParagraphStyle('RightTotal', parent=bold_style, alignment=2, textColor=primary_color, fontSize=11)
    
    totals_data = [
        [Paragraph("Subtotal:", right_normal), Paragraph(f"{curr}{instance.subtotal:,.2f}", right_normal)],
        [Paragraph("Tax:", right_normal), Paragraph(f"{curr}{instance.tax_amount:,.2f}", right_normal)],
        [Paragraph("<b>Total:</b>", right_total), Paragraph(f"<b>{curr}{instance.total:,.2f}</b>", right_total)]
    ]
    
    if doc_type in ["Invoice", "Receipt"] and hasattr(instance, "amount_paid"):
        paid_style = ParagraphStyle('RightPaid', parent=right_normal, textColor=colors.HexColor("#059669"))
        due_style = ParagraphStyle('RightDue', parent=right_total, textColor=colors.HexColor("#DC2626"))
        
        totals_data.extend([
            [Paragraph("Amount Paid:", right_normal), Paragraph(f"{curr}{instance.amount_paid or 0:,.2f}", paid_style)],
            [Paragraph("<b>Balance Due:</b>", right_total), Paragraph(f"<b>{curr}{instance.amount_due or instance.total:,.2f}</b>", due_style)]
        ])
    totals_table = Table(totals_data, colWidths=[380, 120])
    totals_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('TOPPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(totals_table)
    story.append(Spacer(1, 40))
    
    # Terms & Signature
    terms_p = []
    terms_text = comp.invoice_terms
    
    notes_style = ParagraphStyle('Notes', parent=styles['Normal'], fontSize=10, textColor=colors.HexColor("#6B7280"), fontName='Helvetica-Oblique')
    info_val_style = ParagraphStyle('InfoVal', parent=styles['Normal'], fontSize=9, textColor=colors.HexColor("#4B5563"), leading=13)
    
    if terms_text:
        clean_terms = terms_text.strip().lower()
        if clean_terms in ["thank you for your business.", "thank you for your business", "thanks for your business!", "thank you for your business"]:
            terms_p.append(Paragraph(terms_text, notes_style))
        else:
            terms_label = "Terms & Conditions" if doc_type == "Invoice" else "Quote Terms & Conditions"
            terms_p.append(Paragraph(f"<font color='#111827'><b>{terms_label}</b></font>", bold_style))
            terms_p.append(Spacer(1, 6))
            terms_p.append(Paragraph(terms_text.replace('\n', '<br/>'), info_val_style))
    
    if comp.invoice_other_information:
        if terms_p: terms_p.append(Spacer(1, 15))
        terms_p.append(Paragraph("<font color='#111827'><b>Other Information</b></font>", bold_style))
        terms_p.append(Spacer(1, 6))
        terms_p.append(Paragraph(comp.invoice_other_information.replace('\n', '<br/>'), info_val_style))
        
    sig_p = []
    if comp.show_authorised_signatory:
        sig_p.append(Spacer(1, 20))
        if comp.authorised_signatory_signature:
            sig_p.append(Paragraph("<i>[Signature Image Placeholder]</i>", styles['Normal']))
        sig_p.append(Paragraph("<b>Authorised Signatory</b>", styles['Normal']))
        
    if terms_p or sig_p:
        footer_table = Table([[terms_p, sig_p]], colWidths=[350, 150])
        footer_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP')
        ]))
        story.append(footer_table)
    
    doc.build(story)
    buffer.seek(0)
    response = HttpResponse(buffer, content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="{doc_type}_{doc_number}.pdf"'
    return response


class QuoteViewSet(CompanyScopedModelViewSet):
    serializer_class = QuoteSerializer
    queryset = Quote.objects.select_related("company", "deal").prefetch_related("items")
    search_fields = ("quote_number", "title")
    ordering_fields = ("created_at", "updated_at", "status", "total")
    ordering = ("-created_at",)
    filterset_fields = ("status", "deal")

    def apply_business_filters(self, queryset):
        deal_id = self.request.query_params.get("deal")
        if deal_id:
            queryset = queryset.filter(deal_id=deal_id)
        return queryset

    @action(detail=True, methods=['get'])
    def pdf(self, request, pk=None):
        quote = self.get_object()
        return generate_pdf_response(quote, doc_type="Quote")


class InvoiceViewSet(CompanyScopedModelViewSet):
    serializer_class = InvoiceSerializer
    queryset = Invoice.objects.select_related("company", "deal", "customer").prefetch_related("items")
    search_fields = ("invoice_number",)
    ordering_fields = ("created_at", "updated_at", "status", "issue_date", "due_date", "total")
    ordering = ("-created_at",)
    filterset_fields = ("status", "deal", "customer")

    def apply_business_filters(self, queryset):
        deal_id = self.request.query_params.get("deal")
        customer_id = self.request.query_params.get("customer")
        if deal_id:
            queryset = queryset.filter(deal_id=deal_id)
        if customer_id:
            queryset = queryset.filter(customer_id=customer_id)
        return queryset

    @action(detail=True, methods=['get'])
    def pdf(self, request, pk=None):
        invoice = self.get_object()
        return generate_pdf_response(invoice, doc_type="Invoice")

    @action(detail=True, methods=['post'])
    def add_payment(self, request, pk=None):
        invoice = self.get_object()
        amount = request.data.get('amount')
        payment_method = request.data.get('payment_method')
        transaction_id = request.data.get('transaction_id', '')
        notes = request.data.get('notes', '')
        
        if not amount or not payment_method:
            return Response({"error": "amount and payment_method are required"}, status=400)
            
        import uuid
        receipt_number = f"REC-{uuid.uuid4().hex[:6].upper()}"
        
        from .models import InvoicePayment
        payment = InvoicePayment.objects.create(
            invoice=invoice,
            amount=amount,
            payment_method=payment_method,
            transaction_id=transaction_id,
            receipt_number=receipt_number,
            notes=notes
        )
        
        if invoice.amount_due <= 0:
            invoice.status = Invoice.Status.PAID
        elif invoice.amount_paid > 0:
            invoice.status = Invoice.Status.PARTIALLY_PAID
            
        invoice.save()
        
        from .serializers import InvoiceSerializer
        return Response(InvoiceSerializer(invoice).data)


class CustomFieldDefinitionViewSet(CompanyScopedModelViewSet):
    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [IsAuthenticated()]
        return [IsAuthenticated(), AdminOnlyRBACPermission()]
    serializer_class = CustomFieldDefinitionSerializer
    queryset = CustomFieldDefinition.objects.select_related("company")
    search_fields = ("label", "name")
    ordering_fields = ("label", "created_at")
    ordering = ("label",)

    def apply_business_filters(self, queryset):
        model_name = self.request.query_params.get("model_name")
        if model_name:
            queryset = queryset.filter(model_name=model_name)
        return queryset


class WorkflowRuleViewSet(CompanyScopedModelViewSet):
    permission_classes = [IsAuthenticated, AdminOnlyRBACPermission]
    serializer_class = WorkflowRuleSerializer
    queryset = WorkflowRule.objects.select_related("company")
    search_fields = ("name",)
    ordering_fields = ("name", "created_at")
    ordering = ("-created_at",)

    def apply_business_filters(self, queryset):
        trigger_event = self.request.query_params.get("trigger_event")
        if trigger_event:
            queryset = queryset.filter(trigger_event=trigger_event)
        return queryset


class WorkflowSequenceViewSet(CompanyScopedModelViewSet):
    permission_classes = [IsAuthenticated, AdminOnlyRBACPermission]
    serializer_class = WorkflowSequenceSerializer
    queryset = WorkflowSequence.objects.select_related("company").prefetch_related(
        "steps",
        "steps__email_template",
    )
    search_fields = ("name",)
    ordering_fields = ("name", "created_at")
    ordering = ("-created_at",)

    def apply_business_filters(self, queryset):
        trigger_event = self.request.query_params.get("trigger_event")
        if trigger_event:
            queryset = queryset.filter(trigger_event=trigger_event)
        return queryset


import hmac
import hashlib
import json
import requests

class SMTPConfigViewSet(CompanyScopedModelViewSet):
    permission_classes = [IsAuthenticated, AdminOnlyRBACPermission]
    serializer_class = SMTPConfigSerializer
    queryset = SMTPConfig.objects.select_related("company")


class EmailTemplateViewSet(CompanyScopedModelViewSet):
    permission_classes = [IsAuthenticated, AdminOnlyRBACPermission]
    serializer_class = EmailTemplateSerializer
    queryset = EmailTemplate.objects.select_related("company")
    search_fields = ("name", "subject")
    ordering = ("name",)


class WebhookSubscriptionViewSet(CompanyScopedModelViewSet):
    permission_classes = [IsAuthenticated, AdminOnlyRBACPermission]
    serializer_class = WebhookSubscriptionSerializer
    queryset = WebhookSubscription.objects.select_related("company")
    search_fields = ("target_url",)
    ordering = ("-created_at",)

    @action(detail=True, methods=["post"], url_path="test-event")
    def test_event(self, request, pk=None):
        subscription = self.get_object()
        
        from django.utils import timezone as dj_timezone
        payload = {
            "event": "webhook.test",
            "message": "This is a test event from Lumeo CRM integrations panel.",
            # H3 fix: timestamp must be an ISO datetime string, not the company name
            "timestamp": dj_timezone.now().isoformat(),
            "test": True,
        }
        
        signature = hmac.new(
            subscription.secret_token.encode("utf-8"),
            json.dumps(payload).encode("utf-8"),
            hashlib.sha256
        ).hexdigest()
        
        headers = {
            "Content-Type": "application/json",
            "X-Lumeo-Signature": signature
        }
        
        try:
            res = requests.post(subscription.target_url, json=payload, headers=headers, timeout=5)
            log = WebhookDeliveryLog.objects.create(
                subscription=subscription,
                event_type="webhook.test",
                payload=payload,
                response_status=res.status_code,
                response_body=res.text[:1000]
            )
        except Exception as e:
            log = WebhookDeliveryLog.objects.create(
                subscription=subscription,
                event_type="webhook.test",
                payload=payload,
                response_status=500,
                response_body=str(e)
            )

        serializer = WebhookDeliveryLogSerializer(log)
        return Response(serializer.data)


from rest_framework.viewsets import ReadOnlyModelViewSet

class WebhookDeliveryLogViewSet(ReadOnlyModelViewSet):
    # M9 fix: use ReadOnlyModelViewSet — logs must never be mutated via API
    serializer_class = WebhookDeliveryLogSerializer
    permission_classes = [IsAuthenticated, CompanyRBACPermission]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return WebhookDeliveryLog.objects.all()
        if user.company_id is None:
            return WebhookDeliveryLog.objects.none()
        return WebhookDeliveryLog.objects.filter(subscription__company_id=user.company_id)


class EmailSendView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        subject = request.data.get("subject", "").strip()
        body = request.data.get("body", "").strip()
        lead_id = request.data.get("lead_id")
        customer_id = request.data.get("customer_id")
        deal_id = request.data.get("deal_id")
        to_email = request.data.get("to_email", "").strip()

        if not subject:
            return Response({"error": "Subject is required."}, status=400)
        if not body:
            return Response({"error": "Email body is required."}, status=400)

        lead = None
        customer = None
        deal = None
        if lead_id:
            lead = Lead.objects.filter(company=request.user.company, id=lead_id).first()
        elif customer_id:
            customer = Customer.objects.filter(company=request.user.company, id=customer_id).first()
        elif deal_id:
            deal = Deal.objects.filter(company=request.user.company, id=deal_id).first()

        try:
            send_crm_email(
                company=request.user.company,
                subject_template=subject,
                body_template=body,
                lead=lead,
                customer=customer,
                deal=deal,
                to_email=to_email,
                actor_user=request.user,
            )
        except Exception as e:
            return Response({"error": f"Failed to send email: {str(e)}"}, status=400)

        return Response({"message": "Email sent successfully."}, status=200)

from .models import EmailAccount, EmailMessage as CRMEmailMessage
from .serializers import EmailAccountSerializer, EmailMessageSerializer

class EmailAccountViewSet(CompanyScopedModelViewSet):
    serializer_class = EmailAccountSerializer
    queryset = EmailAccount.objects.select_related("company", "user")
    
    @action(detail=False, methods=["post"], url_path="auth-url")
    def auth_url(self, request):
        provider = request.data.get("provider")
        if provider != "google":
            return Response({"error": "Only Google is supported right now"}, status=400)
            
        from django.conf import settings
        import urllib.parse
        
        client_id = getattr(settings, 'GOOGLE_CLIENT_ID', None)
        if not client_id:
            return Response({"error": "Google Client ID not configured"}, status=500)
            
        redirect_uri = request.data.get("redirect_uri", f"{getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')}/api/auth/callback/google")
        
        params = {
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": "https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly",
            "access_type": "offline",
            "prompt": "consent",
        }
        url = "https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode(params)
        return Response({"url": url})

    @action(detail=False, methods=["post"], url_path="callback")
    def callback(self, request):
        from django.conf import settings
        import requests
        
        code = request.data.get("code")
        redirect_uri = request.data.get("redirect_uri", f"{getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')}/api/auth/callback/google")
        
        if not code:
            return Response({"error": "Authorization code missing"}, status=400)
        
        client_id = getattr(settings, 'GOOGLE_CLIENT_ID', None)
        client_secret = getattr(settings, 'GOOGLE_CLIENT_SECRET', None)
        
        # Exchange code for tokens
        token_res = requests.post("https://oauth2.googleapis.com/token", data={
            "client_id": client_id,
            "client_secret": client_secret,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": redirect_uri
        })
        
        if not token_res.ok:
            return Response({"error": "Failed to exchange code", "details": token_res.json()}, status=400)
            
        token_data = token_res.json()
        access_token = token_data.get("access_token")
        refresh_token = token_data.get("refresh_token")
        
        # Get user info
        user_info_res = requests.get("https://www.googleapis.com/oauth2/v2/userinfo", headers={
            "Authorization": f"Bearer {access_token}"
        })
        if not user_info_res.ok:
            return Response({"error": "Failed to fetch user info"}, status=400)
            
        user_email = user_info_res.json().get("email")
        
        account, created = EmailAccount.objects.update_or_create(
            user=request.user,
            email_address=user_email,
            defaults={
                "company": request.user.company,
                "provider": "google",
                "access_token": access_token,
                "is_active": True
            }
        )
        
        # Only update refresh_token if Google actually sent a new one
        if refresh_token:
            account.refresh_token = refresh_token
            account.save(update_fields=["refresh_token"])
            
        return Response(EmailAccountSerializer(account, context={"request": request}).data)

class EmailMessageViewSet(CompanyScopedModelViewSet):
    serializer_class = EmailMessageSerializer
    queryset = CRMEmailMessage.objects.select_related("company", "account", "lead", "customer")
    search_fields = ("subject", "body_text", "from_address")
    ordering_fields = ("received_at", "created_at")
    ordering = ("-received_at",)

from .models import CalendarAccount, BookingLink
from .serializers import CalendarAccountSerializer, BookingLinkSerializer

class CampaignViewSet(CompanyScopedModelViewSet):
    serializer_class = CampaignSerializer
    queryset = Campaign.objects.select_related("company", "created_by")
    search_fields = ("name", "subject")
    ordering_fields = ("created_at", "name", "status")
    ordering = ("-created_at",)

    @action(detail=True, methods=["post"], url_path="send")
    def send_campaign(self, request, pk=None):
        import time
        from django.utils import timezone as dj_timezone

        campaign = self.get_object()
        if campaign.status != Campaign.Status.DRAFT:
            return Response({"error": "Only draft campaigns can be sent."}, status=400)

        # Basic recipient filtering
        recipients = []
        if campaign.target_audience == "all_leads":
            recipients = Lead.objects.filter(company=request.user.company, email__isnull=False).exclude(email="")
        elif campaign.target_audience == "qualified_leads":
            recipients = Lead.objects.filter(company=request.user.company, status="qualified", email__isnull=False).exclude(email="")
        elif campaign.target_audience == "all_customers":
            recipients = Customer.objects.filter(company=request.user.company, email__isnull=False).exclude(email="")
        else:
            recipients = Lead.objects.filter(company=request.user.company, email__isnull=False).exclude(email="")

        if not recipients:
            return Response({"error": "No valid recipients found for this audience."}, status=400)

        campaign.status = Campaign.Status.SENDING
        campaign.save(update_fields=["status"])

        sent_count = 0
        failed_count = 0
        for rec in recipients:
            try:
                send_crm_email(
                    company=request.user.company,
                    subject_template=campaign.subject,
                    body_template=campaign.body_html,
                    lead=rec if isinstance(rec, Lead) else None,
                    customer=rec if isinstance(rec, Customer) else None,
                    to_email=rec.email,
                    actor_user=request.user,
                )
                sent_count += 1
            except Exception:
                failed_count += 1

            time.sleep(0.1)

        campaign.sent_count = sent_count
        campaign.failed_count = failed_count
        campaign.sent_at = dj_timezone.now()
        campaign.status = Campaign.Status.COMPLETED
        campaign.save(update_fields=["sent_count", "failed_count", "sent_at", "status"])

        return Response({
            "message": "Campaign sent successfully",
            "sent": sent_count,
            "failed": failed_count
        })

class CalendarAccountViewSet(CompanyScopedModelViewSet):
    serializer_class = CalendarAccountSerializer
    queryset = CalendarAccount.objects.select_related("company", "user")
    
    @action(detail=False, methods=["post"], url_path="connect")
    def connect(self, request):
        provider = request.data.get("provider")
        if provider not in ["google", "outlook", "apple"]:
            return Response({"error": "Invalid provider"}, status=400)
            
        import uuid
        account_email = request.data.get("account_email", f"{request.user.username}@{provider}.com")
        
        account, created = CalendarAccount.objects.update_or_create(
            user=request.user,
            account_email=account_email,
            defaults={
                "company": request.user.company,
                "provider": provider,
                "is_active": True
            }
        )
        return Response(CalendarAccountSerializer(account, context={"request": request}).data)

class BookingLinkViewSet(CompanyScopedModelViewSet):
    serializer_class = BookingLinkSerializer
    queryset = BookingLink.objects.select_related("company", "user")
    lookup_field = "slug"

from rest_framework.permissions import AllowAny

class PublicBookingView(APIView):
    permission_classes = [AllowAny]
    
    def get(self, request, slug):
        link = BookingLink.objects.filter(slug=slug, is_active=True).select_related("user", "company").first()
        if not link:
            return Response({"error": "Booking link not found"}, status=404)
            
        return Response({
            "name": link.name,
            "description": link.description,
            "duration_minutes": link.duration_minutes,
            "user_name": link.user.get_full_name() or link.user.username,
            "company_name": link.company.name
        })
        
    def post(self, request, slug):
        link = BookingLink.objects.filter(slug=slug, is_active=True).first()
        if not link:
            return Response({"error": "Booking link not found"}, status=404)
            
        # In a real system, we'd use Calendar API to book the event
        # Here we mock it by creating an Activity/Task
        name = request.data.get("name")
        email = request.data.get("email")
        date_str = request.data.get("date")
        time_str = request.data.get("time")
        
        if not all([name, email, date_str, time_str]):
            return Response({"error": "Missing required fields"}, status=400)
            
        # Create a lead if doesn't exist
        lead, _ = Lead.objects.get_or_create(
            company=link.company,
            email=email,
            defaults={"name": name, "assigned_to": link.user}
        )
        
        description = f"Meeting booked by {name} ({email}) for {date_str} at {time_str} ({link.duration_minutes} mins)."
        
        Activity.objects.create(
            company=link.company,
            lead=lead,
            activity_type=Activity.ActivityType.MEETING,
            description=description,
            created_by=link.user
        )
        
        return Response({"message": "Booking successful", "description": description})

class AIAssistantView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        action = request.data.get("action")
        context = request.data.get("context", "")
        
        import time
        time.sleep(1.5) # Simulate AI processing time
        
        if action == "draft_email":
            prompt = request.data.get("prompt", "")
            draft = f"Hi there,\n\nFollowing up regarding {prompt if prompt else 'our recent discussion'}. "
            draft += "I wanted to see if you had any further thoughts or questions on how we can help you move forward.\n\n"
            draft += "Let me know when you'd have a few minutes to connect.\n\nBest,\n" + request.user.first_name
            return Response({"result": draft})
            
        elif action == "summarize":
            if not context:
                return Response({"error": "No context provided for summarization"}, status=400)
            
            # Simple mock summarization
            sentences = context.split(".")
            summary = " ".join(sentences[:2]) + ("..." if len(sentences) > 2 else ".")
            summary = f"**AI Summary:**\n{summary.strip()}\n\n*Key takeaways:*\n- Customer showed interest\n- Next steps required"
            return Response({"result": summary})
            
        return Response({"error": "Unknown action"}, status=400)

class TicketViewSet(CompanyScopedModelViewSet):
    serializer_class = TicketSerializer
    queryset = Ticket.objects.select_related("company", "customer", "assigned_to").prefetch_related("comments", "comments__author")
    search_fields = ("subject", "description")
    ordering_fields = ("created_at", "updated_at", "status", "priority")
    ordering = ("-created_at",)
    filterset_fields = ("status", "priority", "assigned_to", "customer")

class TicketCommentViewSet(ModelViewSet):
    serializer_class = TicketCommentSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        ticket_id = self.kwargs.get("ticket_pk")
        qs = TicketComment.objects.select_related("ticket", "author")
        if ticket_id:
            qs = qs.filter(ticket_id=ticket_id, ticket__company=self.request.user.company)
        else:
            qs = qs.filter(ticket__company=self.request.user.company)
        return qs

    def perform_create(self, serializer):
        ticket_id = self.kwargs.get("ticket_pk")
        ticket = get_object_or_404(Ticket, pk=ticket_id, company=self.request.user.company)
        if hasattr(self.request.user, "role") and self.request.user.role == "CUSTOMER":
            customer = getattr(self.request.user, "customer_profile", None)
            if ticket.customer != customer:
                raise PermissionDenied("You can only comment on your own tickets.")
        serializer.save(author=self.request.user, ticket=ticket)



class PublicQuoteView(APIView):
    permission_classes = []

    def get(self, request, token):
        quote = get_object_or_404(Quote, public_token=token)
        serializer = QuoteSerializer(quote)
        return Response(serializer.data)

    def post(self, request, token):
        quote = get_object_or_404(Quote, public_token=token)
        
        signature_data = request.data.get("signature_data")
        signed_by_name = request.data.get("signed_by_name")
        
        if not signature_data or not signed_by_name:
            return Response({"error": "Signature and name are required"}, status=400)

        quote.signature_data = signature_data
        quote.signed_by_name = signed_by_name
        quote.signed_at = dj_timezone.now()
        quote.signed_by_ip = request.META.get('REMOTE_ADDR')
        quote.status = Quote.Status.ACCEPTED
        quote.save(update_fields=["signature_data", "signed_by_name", "signed_at", "signed_by_ip", "status"])

        return Response({"message": "Quote signed successfully"})

class PublicInvoiceView(APIView):
    permission_classes = []

    def get(self, request, token):
        invoice = get_object_or_404(Invoice, public_token=token)
        serializer = InvoiceSerializer(invoice)
        return Response(serializer.data)

    def post(self, request, token):
        invoice = get_object_or_404(Invoice, public_token=token)
        
        signature_data = request.data.get("signature_data")
        signed_by_name = request.data.get("signed_by_name")
        
        if not signature_data or not signed_by_name:
            return Response({"error": "Signature and name are required"}, status=400)

        invoice.signature_data = signature_data
        invoice.signed_by_name = signed_by_name
        invoice.signed_at = dj_timezone.now()
        invoice.signed_by_ip = request.META.get('REMOTE_ADDR')
        # We don't automatically set Invoice to PAID, because they still need to pay.
        invoice.save(update_fields=["signature_data", "signed_by_name", "signed_at", "signed_by_ip"])

        return Response({"message": "Invoice signed successfully"})

import razorpay

class PublicInvoicePayView(APIView):
    permission_classes = []

    def post(self, request, token):
        invoice = get_object_or_404(Invoice, public_token=token)
        company = invoice.company
        
        if not company.razorpay_key_id or not company.razorpay_key_secret:
            return Response({"error": "Payment gateway not configured for this company."}, status=503)

        if invoice.amount_due <= 0:
            return Response({"error": "Invoice is already fully paid"}, status=400)
            
        amount_in_cents = int(float(invoice.amount_due) * 100)
        currency_code = company.currency or "USD"
        
        try:
            client = razorpay.Client(auth=(company.razorpay_key_id, company.razorpay_key_secret))
            data = {
                "amount": amount_in_cents,
                "currency": currency_code,
                "receipt": str(invoice.invoice_number),
            }
            payment = client.order.create(data=data)
            return Response({
                "order_id": payment["id"],
                "amount": amount_in_cents,
                "currency": currency_code,
                "key": company.razorpay_key_id
            })
        except Exception as e:
            return Response({"error": f"Payment initialization failed: {str(e)}"}, status=500)

class PublicInvoiceVerifyPaymentView(APIView):
    permission_classes = []

    def post(self, request, token):
        invoice = get_object_or_404(Invoice, public_token=token)
        company = invoice.company
        
        razorpay_payment_id = request.data.get('razorpay_payment_id')
        razorpay_order_id = request.data.get('razorpay_order_id')
        razorpay_signature = request.data.get('razorpay_signature')
        
        if not company.razorpay_key_id or not company.razorpay_key_secret:
            return Response({"error": "Payment gateway not configured."}, status=503)
            
        client = razorpay.Client(auth=(company.razorpay_key_id, company.razorpay_key_secret))
        
        try:
            client.utility.verify_payment_signature({
                'razorpay_order_id': razorpay_order_id,
                'razorpay_payment_id': razorpay_payment_id,
                'razorpay_signature': razorpay_signature
            })
            
            # Fetch the actual payment amount from Razorpay
            payment_info = client.payment.fetch(razorpay_payment_id)
            amount_paid = payment_info['amount'] / 100.0
            
            import uuid
            receipt_number = f"REC-{uuid.uuid4().hex[:6].upper()}"
            
            from .models import InvoicePayment
            InvoicePayment.objects.create(
                invoice=invoice,
                amount=amount_paid,
                payment_method="Razorpay",
                transaction_id=razorpay_payment_id,
                receipt_number=receipt_number,
                notes="Online Payment via Public Link"
            )
            
            if invoice.amount_due <= 0:
                invoice.status = Invoice.Status.PAID
            else:
                invoice.status = Invoice.Status.PARTIALLY_PAID
            invoice.save(update_fields=['status'])
            
            return Response({"message": "Payment successful."})
        except razorpay.errors.SignatureVerificationError:
            return Response({"error": "Invalid payment signature."}, status=400)
        except Exception as e:
            return Response({"error": str(e)}, status=500)


# ── Orders ───────────────────────────────────────────────────────────────────

class OrderViewSet(CompanyScopedModelViewSet):
    serializer_class = OrderSerializer
    queryset = Order.objects.select_related("company", "customer", "created_by").prefetch_related("items")
    search_fields = ("order_number", "customer__name")
    ordering_fields = ("created_at", "total", "status")
    ordering = ("-created_at",)

    def apply_business_filters(self, queryset):
        status_val = self.request.query_params.get("status")
        if status_val:
            queryset = queryset.filter(status=status_val)
        customer_id = self.request.query_params.get("customer")
        if customer_id:
            queryset = queryset.filter(customer_id=customer_id)
        return queryset


# ── Events ───────────────────────────────────────────────────────────────────

class EventViewSet(CompanyScopedModelViewSet):
    serializer_class = EventSerializer
    queryset = Event.objects.select_related("company", "organizer")
    search_fields = ("title", "description", "location")
    ordering_fields = ("start_time", "created_at", "title")
    ordering = ("start_time",)

    def apply_business_filters(self, queryset):
        is_virtual = self.request.query_params.get("is_virtual")
        if is_virtual is not None:
            queryset = queryset.filter(is_virtual=is_virtual.lower() in ("true", "1"))
        upcoming = self.request.query_params.get("upcoming")
        if upcoming:
            from django.utils import timezone as dj_tz
            queryset = queryset.filter(start_time__gte=dj_tz.now())
        return queryset


# ── Notice Board ─────────────────────────────────────────────────────────────

class NoticeViewSet(CompanyScopedModelViewSet):
    serializer_class = NoticeSerializer
    queryset = Notice.objects.select_related("company", "author")
    search_fields = ("title", "content")
    ordering_fields = ("created_at", "is_pinned", "title")
    ordering = ("-is_pinned", "-created_at")

    def apply_business_filters(self, queryset):
        pinned = self.request.query_params.get("pinned")
        if pinned is not None:
            queryset = queryset.filter(is_pinned=pinned.lower() in ("true", "1"))
        return queryset
