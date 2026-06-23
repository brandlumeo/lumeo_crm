from rest_framework import serializers
from .models import TimeLog, BreakLog, LeaveRequest, ExpenseClaim, OfficeAsset, Payroll, Holiday


class BreakLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = BreakLog
        fields = ("id", "time_log", "start_time", "end_time", "reason")
        read_only_fields = ("id", "time_log")


class TimeLogSerializer(serializers.ModelSerializer):
    breaks = BreakLogSerializer(many=True, read_only=True)
    user_email = serializers.EmailField(source="user.email", read_only=True)
    user_full_name = serializers.CharField(source="user.get_full_name", read_only=True)

    class Meta:
        model = TimeLog
        fields = (
            "id",
            "user",
            "user_email",
            "user_full_name",
            "company",
            "clock_in",
            "clock_out",
            "work_location",
            "ip_address",
            "latitude",
            "longitude",
            "notes",
            "breaks",
        )
        read_only_fields = ("id", "user", "company", "clock_in", "clock_out")

    def validate(self, attrs):
        clock_in = attrs.get("clock_in")
        clock_out = attrs.get("clock_out")

        if clock_in and clock_out and clock_out < clock_in:
            raise serializers.ValidationError(
                {"clock_out": "Clock-out timestamp cannot be earlier than clock-in."}
            )

        return attrs


class LeaveRequestSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source="user.email", read_only=True)
    user_full_name = serializers.CharField(source="user.get_full_name", read_only=True)
    approved_by_name = serializers.CharField(source="approved_by.get_full_name", read_only=True)

    class Meta:
        model = LeaveRequest
        fields = (
            "id",
            "user",
            "user_email",
            "user_full_name",
            "company",
            "leave_type",
            "status",
            "start_date",
            "end_date",
            "reason",
            "attachment",
            "approved_by",
            "approved_by_name",
            "manager_notes",
            "created_at",
        )
        read_only_fields = ("id", "user", "company", "status", "approved_by", "created_at")

    def validate(self, attrs):
        start_date = attrs.get("start_date")
        end_date = attrs.get("end_date")

        if start_date and end_date and end_date < start_date:
            raise serializers.ValidationError(
                {"end_date": "End date cannot be earlier than start date."}
            )

        return attrs


class ExpenseClaimSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source="user.email", read_only=True)
    user_full_name = serializers.CharField(source="user.get_full_name", read_only=True)
    approved_by_name = serializers.CharField(source="approved_by.get_full_name", read_only=True)
    deal_name = serializers.CharField(source="deal.title", read_only=True)

    class Meta:
        model = ExpenseClaim
        fields = (
            "id",
            "user",
            "user_email",
            "user_full_name",
            "company",
            "deal",
            "deal_name",
            "title",
            "amount",
            "receipt",
            "description",
            "status",
            "approved_by",
            "approved_by_name",
            "manager_notes",
            "created_at",
        )
        read_only_fields = ("id", "user", "company", "status", "approved_by", "created_at")

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Expense amount must be greater than zero.")
        return value


class OfficeAssetSerializer(serializers.ModelSerializer):
    assigned_to_email = serializers.EmailField(source="assigned_to.email", read_only=True)
    assigned_to_name = serializers.CharField(source="assigned_to.get_full_name", read_only=True)

    class Meta:
        model = OfficeAsset
        fields = (
            "id",
            "company",
            "assigned_to",
            "assigned_to_email",
            "assigned_to_name",
            "name",
            "serial_number",
            "condition",
            "purchase_date",
            "created_at",
        )
        read_only_fields = ("id", "company", "created_at")

class PayrollSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source="user.email", read_only=True)
    user_full_name = serializers.CharField(source="user.get_full_name", read_only=True)

    class Meta:
        model = Payroll
        fields = (
            "id",
            "user",
            "user_email",
            "user_full_name",
            "company",
            "month",
            "year",
            "basic_salary",
            "allowances",
            "deductions",
            "net_salary",
            "status",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "company", "net_salary", "created_at", "updated_at")

    def validate(self, attrs):
        month = attrs.get("month", self.instance.month if self.instance else None)
        if month and not (1 <= month <= 12):
            raise serializers.ValidationError({"month": "Month must be between 1 and 12."})
        return attrs


class HolidaySerializer(serializers.ModelSerializer):
    class Meta:
        model = Holiday
        fields = ("id", "company", "name", "date", "description")
        read_only_fields = ("id", "company")
