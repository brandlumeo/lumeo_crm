from django.contrib.auth import get_user_model
from rest_framework import serializers

from companies.models import Company
from .models import Customer, Deal, Lead, Note, Task, Activity, Attachment, Product, Quote, QuoteLineItem, Invoice, InvoiceLineItem, CustomFieldDefinition, WorkflowRule, WorkflowSequence, WorkflowStep, WorkflowRun, SMTPConfig, EmailTemplate, WebhookSubscription, WebhookDeliveryLog, EmailAccount, EmailMessage, CalendarAccount, BookingLink, Campaign, Ticket, TicketComment, Ticket, TicketComment


User = get_user_model()


class CompanySummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = ("id", "name", "slug", "status")


class UserSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "username", "first_name", "last_name", "role")





class CompanyScopedSerializer(serializers.ModelSerializer):
    company = CompanySummarySerializer(read_only=True)
    company_id = serializers.PrimaryKeyRelatedField(
        source="company",
        queryset=Company.objects.all(),
        write_only=True,
        required=False,
    )

    def validate(self, attrs):
        attrs = super().validate(attrs)
        request = self.context.get("request")
        user = getattr(request, "user", None)

        if user is None or not user.is_authenticated:
            return attrs

        requested_company = attrs.get("company")
        current_company = getattr(self.instance, "company", None)

        if self.instance is not None and requested_company and requested_company != current_company:
            raise serializers.ValidationError(
                {"company_id": "Changing company on an existing record is not allowed."}
            )

        if user.is_superuser:
            resolved_company = requested_company or current_company or user.company
            if resolved_company is None:
                raise serializers.ValidationError(
                    {"company_id": "Company is required for this operation."}
                )
        else:
            if user.company_id is None:
                raise serializers.ValidationError(
                    {"company_id": "Authenticated user is not assigned to a company."}
                )
            if requested_company and requested_company != user.company:
                raise serializers.ValidationError(
                    {"company_id": "You can only create or update records in your own company."}
                )
            resolved_company = user.company

        attrs["company"] = resolved_company
        self.validate_company_relations(attrs, resolved_company)

        # Validate custom fields if the model has custom_data
        model_class = self.Meta.model
        has_custom_data = any(f.name == "custom_data" for f in model_class._meta.get_fields())
        if has_custom_data:
            model_name = model_class.__name__.lower()
            custom_fields = CustomFieldDefinition.objects.filter(company=resolved_company, model_name=model_name)
            
            custom_data = attrs.get("custom_data", {})
            if self.instance:
                existing = self.instance.custom_data or {}
                custom_data = {**existing, **custom_data}
            
            for cf in custom_fields:
                val = custom_data.get(cf.name)
                if cf.required and (val is None or val == ""):
                    raise serializers.ValidationError(
                        {"custom_data": f"Custom field '{cf.label}' is required."}
                    )
                if val is not None and val != "":
                    if cf.field_type == CustomFieldDefinition.FieldType.NUMBER:
                        try:
                            float(val)
                        except ValueError:
                            raise serializers.ValidationError(
                                {"custom_data": f"Custom field '{cf.label}' must be a number."}
                            )
                    elif cf.field_type == CustomFieldDefinition.FieldType.BOOLEAN:
                        if not isinstance(val, bool) and str(val).lower() not in ("true", "false", "1", "0"):
                            raise serializers.ValidationError(
                                {"custom_data": f"Custom field '{cf.label}' must be a boolean."}
                            )
            
            attrs["custom_data"] = custom_data

        return attrs

    def validate_company_relations(self, attrs, company):
        return attrs


class LeadSerializer(CompanyScopedSerializer):
    assigned_to = UserSummarySerializer(read_only=True)
    assigned_to_id = serializers.PrimaryKeyRelatedField(
        source="assigned_to",
        queryset=User.objects.none(),
        write_only=True,
        required=False,
        allow_null=True,
    )

    class Meta:
        model = Lead
        fields = (
            "id",
            "company",
            "company_id",
            "name",
            "email",
            "status",
            "assigned_to",
            "assigned_to_id",
            "custom_data",
            "score",
            "score_rationale",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at", "score", "score_rationale")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        user = getattr(request, "user", None)

        if user and user.is_authenticated:
            if user.is_superuser:
                self.fields["assigned_to_id"].queryset = User.objects.all()
            elif user.company_id is not None:
                self.fields["assigned_to_id"].queryset = User.objects.filter(
                    company_id=user.company_id
                )

    def validate_company_relations(self, attrs, company):
        assigned_to = attrs.get("assigned_to", getattr(self.instance, "assigned_to", None))
        if assigned_to and assigned_to.company_id != company.id:
            raise serializers.ValidationError(
                {"assigned_to_id": "Assigned user must belong to the same company."}
            )
        return attrs


class CustomerSerializer(CompanyScopedSerializer):
    has_portal_access = serializers.SerializerMethodField()

    class Meta:
        model = Customer
        fields = (
            "id",
            "company",
            "company_id",
            "name",
            "email",
            "phone",
            "custom_data",
            "has_portal_access",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at", "has_portal_access")

    def get_has_portal_access(self, obj):
        return obj.user_id is not None


class DealSerializer(CompanyScopedSerializer):
    assigned_to = UserSummarySerializer(read_only=True)
    assigned_to_id = serializers.PrimaryKeyRelatedField(
        source="assigned_to",
        queryset=User.objects.none(),
        write_only=True,
        required=False,
        allow_null=True,
    )

    class Meta:
        model = Deal
        fields = (
            "id",
            "company",
            "company_id",
            "title",
            "amount",
            "stage",
            "expected_close_date",
            "assigned_to",
            "assigned_to_id",
            "custom_data",
            "row_order",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        user = getattr(request, "user", None)

        if user and user.is_authenticated:
            if user.is_superuser:
                self.fields["assigned_to_id"].queryset = User.objects.all()
            elif user.company_id is not None:
                self.fields["assigned_to_id"].queryset = User.objects.filter(
                    company_id=user.company_id
                )

    def validate_company_relations(self, attrs, company):
        assigned_to = attrs.get("assigned_to", getattr(self.instance, "assigned_to", None))
        if assigned_to and assigned_to.company_id != company.id:
            raise serializers.ValidationError(
                {"assigned_to_id": "Assigned user must belong to the same company."}
            )
        return attrs


class TaskSerializer(CompanyScopedSerializer):
    assigned_to = UserSummarySerializer(read_only=True)
    assigned_to_id = serializers.PrimaryKeyRelatedField(
        source="assigned_to",
        queryset=User.objects.none(),
        write_only=True,
        required=False,
        allow_null=True,
    )
    lead_id = serializers.PrimaryKeyRelatedField(
        source="lead",
        queryset=Lead.objects.none(),
        required=False,
        allow_null=True,
    )
    deal_id = serializers.PrimaryKeyRelatedField(
        source="deal",
        queryset=Deal.objects.none(),
        required=False,
        allow_null=True,
    )
    customer_id = serializers.PrimaryKeyRelatedField(
        source="customer",
        queryset=Customer.objects.none(),
        required=False,
        allow_null=True,
    )
    workflow_step_run_id = serializers.IntegerField(read_only=True)

    class Meta:
        model = Task
        fields = (
            "id",
            "company",
            "company_id",
            "title",
            "due_date",
            "status",
            "assigned_to",
            "assigned_to_id",
            "lead_id",
            "deal_id",
            "customer_id",
            "workflow_step_run_id",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        user = getattr(request, "user", None)

        if user and user.is_authenticated:
            if user.is_superuser:
                self.fields["assigned_to_id"].queryset = User.objects.all()
                self.fields["lead_id"].queryset = Lead.objects.all()
                self.fields["deal_id"].queryset = Deal.objects.all()
                self.fields["customer_id"].queryset = Customer.objects.all()
            elif user.company_id is not None:
                self.fields["assigned_to_id"].queryset = User.objects.filter(
                    company_id=user.company_id
                )
                self.fields["lead_id"].queryset = Lead.objects.filter(company_id=user.company_id)
                self.fields["deal_id"].queryset = Deal.objects.filter(company_id=user.company_id)
                self.fields["customer_id"].queryset = Customer.objects.filter(company_id=user.company_id)

    def validate_company_relations(self, attrs, company):
        assigned_to = attrs.get("assigned_to", getattr(self.instance, "assigned_to", None))
        if assigned_to and assigned_to.company_id != company.id:
            raise serializers.ValidationError(
                {"assigned_to_id": "Assigned user must belong to the same company."}
            )
        linked_records = {
            "lead_id": attrs.get("lead", getattr(self.instance, "lead", None)),
            "deal_id": attrs.get("deal", getattr(self.instance, "deal", None)),
            "customer_id": attrs.get("customer", getattr(self.instance, "customer", None)),
        }
        if sum(record is not None for record in linked_records.values()) > 1:
            raise serializers.ValidationError(
                {"non_field_errors": ["A task can be linked to at most one CRM record."]}
            )
        for field_name, record in linked_records.items():
            if record and record.company_id != company.id:
                raise serializers.ValidationError(
                    {field_name: "Linked record must belong to the same company."}
                )
        return attrs


class NoteSerializer(CompanyScopedSerializer):
    class Meta:
        model = Note
        fields = (
            "id",
            "company",
            "company_id",
            "content",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

class ActivitySerializer(CompanyScopedSerializer):
    created_by = UserSummarySerializer(read_only=True)
    
    class Meta:
        model = Activity
        fields = (
            "id",
            "company",
            "company_id",
            "lead",
            "deal",
            "customer",
            "activity_type",
            "description",
            "created_by",
            "created_at",
        )
        read_only_fields = ("id", "created_at", "created_by")

    def create(self, validated_data):
        request = self.context.get("request")
        if request and hasattr(request, "user"):
            validated_data["created_by"] = request.user
        return super().create(validated_data)

class AttachmentSerializer(CompanyScopedSerializer):
    uploaded_by = UserSummarySerializer(read_only=True)
    file = serializers.FileField(write_only=True)
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = Attachment
        fields = (
            "id",
            "company",
            "company_id",
            "lead",
            "deal",
            "customer",
            "file",
            "file_url",
            "file_name",
            "file_size",
            "content_type",
            "uploaded_by",
            "created_at",
        )
        read_only_fields = ("id", "created_at", "uploaded_by", "file_name", "file_size", "content_type", "file_url")

    def get_file_url(self, obj):
        request = self.context.get("request")
        if obj.file and hasattr(obj.file, 'url'):
            if request is not None:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None

    def create(self, validated_data):
        request = self.context.get("request")
        if request and hasattr(request, "user"):
            validated_data["uploaded_by"] = request.user
        
        file_obj = validated_data.get('file')
        if file_obj:
            validated_data['file_name'] = file_obj.name
            validated_data['file_size'] = file_obj.size
            validated_data['content_type'] = file_obj.content_type

        return super().create(validated_data)

class ProductSerializer(CompanyScopedSerializer):
    class Meta:
        model = Product
        fields = (
            "id",
            "company",
            "company_id",
            "name",
            "sku",
            "description",
            "price",
            "tax_rate",
            "is_active",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")


class QuoteLineItemSerializer(serializers.ModelSerializer):
    subtotal = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    tax_amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    total = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = QuoteLineItem
        fields = (
            "id",
            "product",
            "name",
            "description",
            "quantity",
            "unit_price",
            "tax_rate",
            "subtotal",
            "tax_amount",
            "total",
        )


class QuoteSerializer(CompanyScopedSerializer):
    items = QuoteLineItemSerializer(many=True, required=False)

    class Meta:
        model = Quote
        fields = (
            "id",
            "company",
            "company_id",
            "deal",
            "deal_id",
            "quote_number",
            "title",
            "status",
            "valid_until",
            "subtotal",
            "tax_amount",
            "total",
            "items",
            "public_token",
            "signature_data",
            "signed_at",
            "signed_by_name",
            "signed_by_ip",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "quote_number", "subtotal", "tax_amount", "total", "created_at", "updated_at", "public_token")

    def create(self, validated_data):
        items_data = validated_data.pop("items", [])
        
        # Auto generate quote number
        import uuid
        validated_data["quote_number"] = f"QT-{uuid.uuid4().hex[:8].upper()}"
        
        quote = super().create(validated_data)
        
        for item_data in items_data:
            QuoteLineItem.objects.create(quote=quote, **item_data)
            
        quote.calculate_totals()
        return quote

    def update(self, instance, validated_data):
        items_data = validated_data.pop("items", None)
        quote = super().update(instance, validated_data)
        
        if items_data is not None:
            # Simple replace strategy for line items
            instance.items.all().delete()
            for item_data in items_data:
                QuoteLineItem.objects.create(quote=instance, **item_data)
                
        quote.calculate_totals()
        return quote


class InvoiceLineItemSerializer(serializers.ModelSerializer):
    subtotal = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    tax_amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    total = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = InvoiceLineItem
        fields = (
            "id",
            "product",
            "name",
            "description",
            "quantity",
            "unit_price",
            "tax_rate",
            "subtotal",
            "tax_amount",
            "total",
        )


class InvoiceSerializer(CompanyScopedSerializer):
    items = InvoiceLineItemSerializer(many=True, required=False)

    class Meta:
        model = Invoice
        fields = (
            "id",
            "company",
            "company_id",
            "deal",
            "deal_id",
            "customer",
            "customer_id",
            "invoice_number",
            "status",
            "issue_date",
            "due_date",
            "subtotal",
            "tax_amount",
            "total",
            "items",
            "public_token",
            "signature_data",
            "signed_at",
            "signed_by_name",
            "signed_by_ip",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "invoice_number", "issue_date", "subtotal", "tax_amount", "total", "created_at", "updated_at", "public_token")

    def create(self, validated_data):
        items_data = validated_data.pop("items", [])
        
        # Auto generate invoice number
        import uuid
        validated_data["invoice_number"] = f"INV-{uuid.uuid4().hex[:8].upper()}"
        
        invoice = super().create(validated_data)
        
        for item_data in items_data:
            InvoiceLineItem.objects.create(invoice=invoice, **item_data)
            
        invoice.calculate_totals()
        return invoice

    def update(self, instance, validated_data):
        items_data = validated_data.pop("items", None)
        invoice = super().update(instance, validated_data)
        
        if items_data is not None:
            # Simple replace strategy for line items
            instance.items.all().delete()
            for item_data in items_data:
                InvoiceLineItem.objects.create(invoice=instance, **item_data)
                
        invoice.calculate_totals()
        return invoice


class CustomFieldDefinitionSerializer(CompanyScopedSerializer):
    class Meta:
        model = CustomFieldDefinition
        fields = (
            "id",
            "company",
            "company_id",
            "model_name",
            "name",
            "label",
            "field_type",
            "required",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")


class WorkflowRuleSerializer(CompanyScopedSerializer):
    class Meta:
        model = WorkflowRule
        fields = (
            "id",
            "company",
            "company_id",
            "name",
            "trigger_event",
            "action_type",
            "action_payload",
            "is_active",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def validate(self, attrs):
        attrs = super().validate(attrs)
        
        action_type = attrs.get("action_type") or (self.instance.action_type if self.instance else None)
        action_payload = attrs.get("action_payload") or (self.instance.action_payload if self.instance else None)

        if not action_type:
            raise serializers.ValidationError({"action_type": "This field is required."})

        if action_payload is None:
            action_payload = {}

        if action_type == WorkflowRule.ActionType.CREATE_TASK:
            if "task_title" not in action_payload or not str(action_payload["task_title"]).strip():
                raise serializers.ValidationError(
                    {"action_payload": "task_title is required for 'create_task' action."}
                )
            try:
                action_payload["due_days_offset"] = int(action_payload.get("due_days_offset", 1))
            except (ValueError, TypeError):
                raise serializers.ValidationError(
                    {"action_payload": "due_days_offset must be an integer."}
                )

        elif action_type == WorkflowRule.ActionType.SEND_NOTIFICATION:
            if "notification_title" not in action_payload or not str(action_payload["notification_title"]).strip():
                raise serializers.ValidationError(
                    {"action_payload": "notification_title is required for 'send_notification' action."}
                )
            if "notification_body" not in action_payload or not str(action_payload["notification_body"]).strip():
                raise serializers.ValidationError(
                    {"action_payload": "notification_body is required for 'send_notification' action."}
                )

        attrs["action_payload"] = action_payload
        return attrs


class WorkflowStepSerializer(serializers.ModelSerializer):
    email_template_id = serializers.PrimaryKeyRelatedField(
        source="email_template",
        queryset=EmailTemplate.objects.none(),
        required=False,
        allow_null=True,
    )
    email_template_name = serializers.CharField(source="email_template.name", read_only=True)

    class Meta:
        model = WorkflowStep
        fields = (
            "id",
            "order",
            "delay_minutes",
            "action_type",
            "action_payload",
            "email_template_id",
            "email_template_name",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at", "email_template_name")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        user = getattr(request, "user", None)

        if user and user.is_authenticated:
            if user.is_superuser:
                self.fields["email_template_id"].queryset = EmailTemplate.objects.all()
            elif user.company_id is not None:
                self.fields["email_template_id"].queryset = EmailTemplate.objects.filter(
                    company_id=user.company_id
                )

    def validate(self, attrs):
        attrs = super().validate(attrs)
        action_type = attrs.get("action_type") or getattr(self.instance, "action_type", None)
        action_payload = attrs.get("action_payload")
        if action_payload is None:
            action_payload = getattr(self.instance, "action_payload", {}) if self.instance else {}

        if action_type == WorkflowStep.ActionType.CREATE_TASK:
            if not str(action_payload.get("task_title", "")).strip():
                raise serializers.ValidationError(
                    {"action_payload": "task_title is required for 'create_task' action."}
                )
            try:
                action_payload["due_days_offset"] = int(action_payload.get("due_days_offset", 0))
            except (ValueError, TypeError):
                raise serializers.ValidationError(
                    {"action_payload": "due_days_offset must be an integer."}
                )
        elif action_type == WorkflowStep.ActionType.SEND_NOTIFICATION:
            if not str(action_payload.get("notification_title", "")).strip():
                raise serializers.ValidationError(
                    {"action_payload": "notification_title is required for 'send_notification' action."}
                )
            if not str(action_payload.get("notification_body", "")).strip():
                raise serializers.ValidationError(
                    {"action_payload": "notification_body is required for 'send_notification' action."}
                )
        elif action_type == WorkflowStep.ActionType.SEND_EMAIL:
            email_template = attrs.get("email_template", getattr(self.instance, "email_template", None))
            if not email_template and not str(action_payload.get("subject", "")).strip():
                raise serializers.ValidationError(
                    {"action_payload": "subject is required for 'send_email' when no email template is selected."}
                )
            if not email_template and not str(action_payload.get("body", "")).strip():
                raise serializers.ValidationError(
                    {"action_payload": "body is required for 'send_email' when no email template is selected."}
                )

        attrs["action_payload"] = action_payload
        return attrs


class WorkflowSequenceSerializer(CompanyScopedSerializer):
    steps = WorkflowStepSerializer(many=True)

    class Meta:
        model = WorkflowSequence
        fields = (
            "id",
            "company",
            "company_id",
            "name",
            "trigger_event",
            "stop_on_statuses",
            "steps",
            "is_active",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def validate(self, attrs):
        attrs = super().validate(attrs)
        stop_on_statuses = attrs.get(
            "stop_on_statuses",
            getattr(self.instance, "stop_on_statuses", ["won", "lost"]),
        )
        valid_lead_statuses = {choice for choice, _label in Lead.Status.choices}
        invalid_statuses = sorted(set(stop_on_statuses or []) - valid_lead_statuses)
        if invalid_statuses:
            raise serializers.ValidationError(
                {"stop_on_statuses": f"Invalid lead status values: {', '.join(invalid_statuses)}"}
            )

        steps = attrs.get("steps")
        if steps is None and self.instance is None:
            raise serializers.ValidationError({"steps": "At least one step is required."})
        if steps is not None and len(steps) == 0:
            raise serializers.ValidationError({"steps": "At least one step is required."})

        company = attrs["company"]
        for step in steps or []:
            email_template = step.get("email_template")
            if email_template and email_template.company_id != company.id:
                raise serializers.ValidationError(
                    {"steps": "Each selected email template must belong to the same company as the sequence."}
                )
        return attrs

    def create(self, validated_data):
        steps_data = validated_data.pop("steps", [])
        sequence = WorkflowSequence.objects.create(**validated_data)
        self._replace_steps(sequence, steps_data)
        return sequence

    def update(self, instance, validated_data):
        steps_data = validated_data.pop("steps", None)
        if steps_data is not None and instance.runs.filter(status=WorkflowRun.Status.ACTIVE).exists():
            raise serializers.ValidationError(
                {"steps": "Cannot modify steps while the sequence has active runs."}
            )
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if steps_data is not None:
            self._replace_steps(instance, steps_data)
        return instance

    def _replace_steps(self, sequence, steps_data):
        sequence.steps.all().delete()
        for step_data in steps_data:
            WorkflowStep.objects.create(sequence=sequence, **step_data)


class SMTPConfigSerializer(CompanyScopedSerializer):
    class Meta:
        model = SMTPConfig
        fields = (
            "id",
            "company",
            "company_id",
            "host",
            "port",
            "username",
            "password",
            "use_tls",
            "from_email",
        )
        read_only_fields = ("id",)

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        if "password" in ret:
            ret["password"] = "********"
        return ret


class EmailTemplateSerializer(CompanyScopedSerializer):
    class Meta:
        model = EmailTemplate
        fields = (
            "id",
            "company",
            "company_id",
            "name",
            "subject",
            "body_content",
        )
        read_only_fields = ("id",)


class WebhookSubscriptionSerializer(CompanyScopedSerializer):
    class Meta:
        model = WebhookSubscription
        fields = (
            "id",
            "company",
            "company_id",
            "target_url",
            "secret_token",
            "event_triggers",
            "is_active",
            "created_at",
        )
        read_only_fields = ("id", "created_at")

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        # H10 fix: Never expose the raw HMAC secret after creation.
        # The full token is only available in the database; API always returns a masked value.
        if ret.get("secret_token"):
            ret["secret_token"] = "••••••••"
        return ret


class WebhookDeliveryLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = WebhookDeliveryLog
        fields = (
            "id",
            "subscription",
            "event_type",
            "payload",
            "response_status",
            "response_body",
            "timestamp",
        )
        read_only_fields = fields

class EmailAccountSerializer(CompanyScopedSerializer):
    user = UserSummarySerializer(read_only=True)
    
    class Meta:
        model = EmailAccount
        fields = (
            "id",
            "company",
            "company_id",
            "user",
            "provider",
            "email_address",
            "is_active",
            "created_at",
        )
        read_only_fields = ("id", "created_at")

class EmailMessageSerializer(CompanyScopedSerializer):
    class Meta:
        model = EmailMessage
        fields = (
            "id",
            "company",
            "company_id",
            "account",
            "lead",
            "customer",
            "message_id",
            "thread_id",
            "direction",
            "from_address",
            "to_addresses",
            "cc_addresses",
            "bcc_addresses",
            "subject",
            "body_text",
            "body_html",
            "is_read",
            "received_at",
            "created_at",
        )
        read_only_fields = ("id", "created_at")

class CalendarAccountSerializer(CompanyScopedSerializer):
    user = UserSummarySerializer(read_only=True)

    class Meta:
        model = CalendarAccount
        fields = (
            "id",
            "user",
            "provider",
            "account_email",
            "is_active",
            "sync_conflicts",
            "write_events",
            "location_type",
            "buffer_minutes",
            "minimum_notice_hours",
            "working_hours_start",
            "working_hours_end",
            "created_at",
        )
        read_only_fields = ("id", "user", "created_at")

class TicketCommentSerializer(serializers.ModelSerializer):
    author = UserSummarySerializer(read_only=True)
    class Meta:
        model = TicketComment
        fields = "__all__"
        read_only_fields = ("author", "created_at")

class TicketSerializer(CompanyScopedSerializer):
    assigned_to = UserSummarySerializer(read_only=True)
    assigned_to_id = serializers.PrimaryKeyRelatedField(
        source="assigned_to",
        queryset=User.objects.none(),
        write_only=True,
        required=False,
        allow_null=True,
    )
    comments = TicketCommentSerializer(many=True, read_only=True)

    class Meta:
        model = Ticket
        fields = (
            "id",
            "company",
            "company_id",
            "customer",
            "subject",
            "description",
            "status",
            "priority",
            "assigned_to",
            "assigned_to_id",
            "comments",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        user = getattr(request, "user", None)

        if user and user.is_authenticated:
            if user.is_superuser:
                self.fields["assigned_to_id"].queryset = User.objects.all()
            elif user.company_id is not None:
                self.fields["assigned_to_id"].queryset = User.objects.filter(
                    company_id=user.company_id
                )

class CampaignSerializer(CompanyScopedSerializer):
    class Meta:
        model = Campaign
        fields = (
            "id",
            "company",
            "company_id",
            "name",
            "subject",
            "body_html",
            "status",
            "target_audience",
            "sent_count",
            "failed_count",
            "created_by",
            "created_at",
            "sent_at",
        )
        read_only_fields = ("id", "created_at", "created_by", "sent_at", "sent_count", "failed_count")

    def create(self, validated_data):
        request = self.context.get("request")
        if request and hasattr(request, "user"):
            validated_data["created_by"] = request.user
        return super().create(validated_data)

class BookingLinkSerializer(CompanyScopedSerializer):
    user = UserSummarySerializer(read_only=True)

    class Meta:
        model = BookingLink
        fields = (
            "id",
            "user",
            "slug",
            "name",
            "description",
            "duration_minutes",
            "is_active",
            "created_at",
        )
        read_only_fields = ("id", "user", "created_at")


# ── Orders ───────────────────────────────────────────────────────────────────

from .models import Order, OrderItem, Event, Notice


class OrderItemSerializer(serializers.ModelSerializer):
    subtotal = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    tax_amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    total = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = OrderItem
        fields = (
            "id",
            "product",
            "name",
            "description",
            "quantity",
            "unit_price",
            "tax_rate",
            "subtotal",
            "tax_amount",
            "total",
        )


class OrderSerializer(CompanyScopedSerializer):
    items = OrderItemSerializer(many=True, required=False)
    customer_name = serializers.SerializerMethodField()
    created_by = UserSummarySerializer(read_only=True)

    class Meta:
        model = Order
        fields = (
            "id",
            "company",
            "company_id",
            "customer",
            "customer_name",
            "order_number",
            "status",
            "notes",
            "subtotal",
            "tax_amount",
            "total",
            "items",
            "created_by",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "order_number", "subtotal", "tax_amount", "total", "created_at", "updated_at", "created_by")

    def get_customer_name(self, obj):
        return obj.customer.name if obj.customer else None

    def create(self, validated_data):
        import uuid
        items_data = validated_data.pop("items", [])
        validated_data["order_number"] = f"ORD-{uuid.uuid4().hex[:8].upper()}"
        request = self.context.get("request")
        if request and hasattr(request, "user"):
            validated_data["created_by"] = request.user
        order = super().create(validated_data)
        for item_data in items_data:
            OrderItem.objects.create(order=order, **item_data)
        order.calculate_totals()
        return order

    def update(self, instance, validated_data):
        items_data = validated_data.pop("items", None)
        order = super().update(instance, validated_data)
        if items_data is not None:
            instance.items.all().delete()
            for item_data in items_data:
                OrderItem.objects.create(order=instance, **item_data)
        order.calculate_totals()
        return order


# ── Events ───────────────────────────────────────────────────────────────────

class EventSerializer(CompanyScopedSerializer):
    organizer = UserSummarySerializer(read_only=True)
    organizer_id = serializers.PrimaryKeyRelatedField(
        source="organizer",
        queryset=User.objects.none(),
        write_only=True,
        required=False,
        allow_null=True,
    )

    class Meta:
        model = Event
        fields = (
            "id",
            "company",
            "company_id",
            "title",
            "description",
            "location",
            "is_virtual",
            "virtual_link",
            "start_time",
            "end_time",
            "organizer",
            "organizer_id",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if user and user.is_authenticated:
            if user.is_superuser:
                self.fields["organizer_id"].queryset = User.objects.all()
            elif user.company_id is not None:
                self.fields["organizer_id"].queryset = User.objects.filter(company_id=user.company_id)


# ── Notice Board ─────────────────────────────────────────────────────────────

class NoticeSerializer(CompanyScopedSerializer):
    author = UserSummarySerializer(read_only=True)

    class Meta:
        model = Notice
        fields = (
            "id",
            "company",
            "company_id",
            "title",
            "content",
            "author",
            "is_pinned",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "author", "created_at", "updated_at")

    def create(self, validated_data):
        request = self.context.get("request")
        if request and hasattr(request, "user"):
            validated_data["author"] = request.user
        return super().create(validated_data)

