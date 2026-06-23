from django.utils import timezone
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import TimeLog, BreakLog, LeaveRequest, ExpenseClaim, OfficeAsset, Payroll, Holiday
from .serializers import TimeLogSerializer, BreakLogSerializer, LeaveRequestSerializer, ExpenseClaimSerializer, OfficeAssetSerializer


def _get_client_ip(request):
    """Utility to retrieve client IP from request headers."""
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        ip = x_forwarded_for.split(",")[0].strip()
    else:
        ip = request.META.get("REMOTE_ADDR")
    return ip


class CurrentStatusView(APIView):
    """
    GET /api/v1/attendance/status/
    Retrieves the current user's attendance and break status.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        active_log = TimeLog.objects.filter(
            user=request.user, clock_out__isnull=True
        ).first()

        if not active_log:
            return Response(
                {
                    "is_clocked_in": False,
                    "is_on_break": False,
                    "active_log": None,
                    "active_break": None,
                }
            )

        active_break = BreakLog.objects.filter(
            time_log=active_log, end_time__isnull=True
        ).first()

        return Response(
            {
                "is_clocked_in": True,
                "is_on_break": active_break is not None,
                "active_log": TimeLogSerializer(active_log).data,
                "active_break": (
                    BreakLogSerializer(active_break).data if active_break else None
                ),
            }
        )


class PunchInView(APIView):
    """
    POST /api/v1/attendance/punch-in/
    Body: { "work_location": "office"/"wfh"/"onsite"/"field", "latitude": float, "longitude": float, "notes": string }
    Clocks the user in.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        # 1. Enforce active clock-in guard
        existing_log = TimeLog.objects.filter(
            user=request.user, clock_out__isnull=True
        ).exists()
        if existing_log:
            return Response(
                {"detail": "You are already clocked in."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        work_location = request.data.get("work_location", TimeLog.WorkLocation.OFFICE)
        if work_location not in TimeLog.WorkLocation.values:
            return Response(
                {"detail": f"Invalid work location choice: {work_location}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 2. Extract environment audit details
        ip_address = _get_client_ip(request)
        latitude = request.data.get("latitude")
        longitude = request.data.get("longitude")
        notes = request.data.get("notes", "")

        # 3. Create log
        time_log = TimeLog.objects.create(
            user=request.user,
            company=request.user.company,
            clock_in=timezone.now(),
            work_location=work_location,
            ip_address=ip_address,
            latitude=latitude if latitude else None,
            longitude=longitude if longitude else None,
            notes=notes,
        )

        serializer = TimeLogSerializer(time_log)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class PunchOutView(APIView):
    """
    POST /api/v1/attendance/punch-out/
    Body: { "notes": string }
    Clocks the user out and auto-ends any active break.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        # 1. Enforce active log existence
        active_log = TimeLog.objects.filter(
            user=request.user, clock_out__isnull=True
        ).first()
        if not active_log:
            return Response(
                {"detail": "You are not currently clocked in."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        now = timezone.now()

        # 2. Auto-heal: end any active breaks
        active_break = BreakLog.objects.filter(
            time_log=active_log, end_time__isnull=True
        ).first()
        if active_break:
            active_break.end_time = now
            active_break.save()

        # 3. Save punch-out
        active_log.clock_out = now
        notes = request.data.get("notes")
        if notes:
            active_log.notes = notes
        active_log.save()

        serializer = TimeLogSerializer(active_log)
        return Response(serializer.data, status=status.HTTP_200_OK)


class BreakStartView(APIView):
    """
    POST /api/v1/attendance/break-start/
    Body: { "reason": string }
    Puts the clocked-in user on break.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        # 1. Enforce clocked-in guard
        active_log = TimeLog.objects.filter(
            user=request.user, clock_out__isnull=True
        ).first()
        if not active_log:
            return Response(
                {"detail": "You must be clocked in to start a break."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 2. Prevent overlapping breaks
        existing_break = BreakLog.objects.filter(
            time_log=active_log, end_time__isnull=True
        ).exists()
        if existing_break:
            return Response(
                {"detail": "You are already on a break."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        reason = request.data.get("reason", "")

        # 3. Create break
        break_log = BreakLog.objects.create(
            time_log=active_log, start_time=timezone.now(), reason=reason
        )

        serializer = BreakLogSerializer(break_log)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class BreakEndView(APIView):
    """
    POST /api/v1/attendance/break-end/
    Resumes standard active clock-in state.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        # 1. Enforce clocked-in guard
        active_log = TimeLog.objects.filter(
            user=request.user, clock_out__isnull=True
        ).first()
        if not active_log:
            return Response(
                {"detail": "You must be clocked in to end a break."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 2. Enforce active break existence
        active_break = BreakLog.objects.filter(
            time_log=active_log, end_time__isnull=True
        ).first()
        if not active_break:
            return Response(
                {"detail": "You are not currently on a break."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 3. Save break end
        active_break.end_time = timezone.now()
        active_break.save()

        serializer = BreakLogSerializer(active_break)
        return Response(serializer.data, status=status.HTTP_200_OK)


class PersonalHistoryView(APIView):
    """
    GET /api/v1/attendance/history/
    Retrieves the user's historical shifts.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        from accounts.models import User
        is_manager = request.user.has_management_access
        view_all = request.query_params.get("all") == "true"

        if is_manager and view_all:
            logs = TimeLog.objects.filter(company=request.user.company).order_by("-clock_in")[:200]
        else:
            logs = TimeLog.objects.filter(user=request.user).order_by("-clock_in")[:50]
            
        serializer = TimeLogSerializer(logs, many=True)
        return Response(serializer.data)


class LeaveRequestListCreateView(APIView):
    """
    GET/POST /api/v1/attendance/leaves/
    Employees can submit leaves and view their leave history.
    Managers (owners/admins) can view all leave requests in the company by passing ?all=true.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        from accounts.models import User
        # Check manager privilege
        is_manager = request.user.has_management_access
        view_all = request.query_params.get("all") == "true"

        if is_manager and view_all:
            leaves = LeaveRequest.objects.filter(company=request.user.company)
        else:
            leaves = LeaveRequest.objects.filter(user=request.user)

        serializer = LeaveRequestSerializer(leaves, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = LeaveRequestSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(
                user=request.user,
                company=request.user.company,
                status=LeaveRequest.Status.PENDING,
            )
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LeaveApprovalView(APIView):
    """
    PATCH /api/v1/attendance/leaves/<uuid:pk>/approve/
    Body: { "status": "approved"/"rejected", "manager_notes": string }
    Restricted to Owners and Admins to approve/reject leaves.
    """

    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        from accounts.models import User
        # 1. Enforce manager authentication role guard
        if not request.user.has_management_access:
            return Response(
                {"detail": "Permission denied. Only owners/admins can review leaves."},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            leave = LeaveRequest.objects.get(pk=pk, company=request.user.company)
        except LeaveRequest.DoesNotExist:
            return Response(
                {"detail": "Leave request not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        new_status = request.data.get("status")
        if new_status not in [LeaveRequest.Status.APPROVED, LeaveRequest.Status.REJECTED]:
            return Response(
                {"detail": "Invalid status. Must be 'approved' or 'rejected'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        manager_notes = request.data.get("manager_notes", "")

        # 2. Update database values
        leave.status = new_status
        leave.manager_notes = manager_notes
        leave.approved_by = request.user
        leave.save()

        serializer = LeaveRequestSerializer(leave)
        return Response(serializer.data, status=status.HTTP_200_OK)


class ExpenseClaimListCreateView(APIView):
    """
    GET/POST /api/v1/attendance/expenses/
    Employees can submit expenses and view their claims.
    Managers can view all expenses in the company by passing ?all=true.
    Supports file uploads for receipts.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        from accounts.models import User
        is_manager = request.user.has_management_access
        view_all = request.query_params.get("all") == "true"

        if is_manager and view_all:
            expenses = ExpenseClaim.objects.filter(company=request.user.company)
        else:
            expenses = ExpenseClaim.objects.filter(user=request.user)

        serializer = ExpenseClaimSerializer(expenses, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = ExpenseClaimSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(
                user=request.user,
                company=request.user.company,
                status=ExpenseClaim.Status.PENDING,
            )
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ExpenseClaimApprovalView(APIView):
    """
    PATCH /api/v1/attendance/expenses/<uuid:pk>/approve/
    Body: { "status": "approved"/"rejected", "manager_notes": string }
    Restricted to Owners and Admins to approve/reject expense claims.
    """

    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        from accounts.models import User
        if not request.user.has_management_access:
            return Response(
                {"detail": "Permission denied. Only owners/admins can review expenses."},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            expense = ExpenseClaim.objects.get(pk=pk, company=request.user.company)
        except ExpenseClaim.DoesNotExist:
            return Response(
                {"detail": "Expense claim not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        new_status = request.data.get("status")
        if new_status not in [ExpenseClaim.Status.APPROVED, ExpenseClaim.Status.REJECTED]:
            return Response(
                {"detail": "Invalid status. Must be 'approved' or 'rejected'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        manager_notes = request.data.get("manager_notes", "")

        expense.status = new_status
        expense.manager_notes = manager_notes
        expense.approved_by = request.user
        expense.save()

        serializer = ExpenseClaimSerializer(expense)
        return Response(serializer.data, status=status.HTTP_200_OK)


class OfficeAssetListCreateView(APIView):
    """
    GET/POST /api/v1/attendance/assets/
    GET: View company assets (unassigned, assigned to user, etc.)
    POST: Create a new company asset (resticted to owners/admins).
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        from accounts.models import User
        assets = OfficeAsset.objects.filter(company=request.user.company)

        # Optional filters
        assigned_to = request.query_params.get("assigned_to")
        unassigned = request.query_params.get("unassigned") == "true"

        if unassigned:
            assets = assets.filter(assigned_to__isnull=True)
        elif assigned_to:
            assets = assets.filter(assigned_to_id=assigned_to)

        serializer = OfficeAssetSerializer(assets, many=True)
        return Response(serializer.data)

    def post(self, request):
        from accounts.models import User
        # Enforce manager guard
        if not request.user.has_management_access:
            return Response(
                {"detail": "Permission denied. Only owners/admins can create company assets."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = OfficeAssetSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(company=request.user.company)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class OfficeAssetDetailView(APIView):
    """
    GET/PUT/DELETE /api/v1/attendance/assets/<uuid:pk>/
    GET: Detailed look at an asset.
    PUT/PATCH: Update asset details or assign it (resticted to owners/admins).
    DELETE: Remove asset from inventory (resticted to owners/admins).
    """

    permission_classes = [IsAuthenticated]

    def _get_asset(self, pk, company):
        try:
            return OfficeAsset.objects.get(pk=pk, company=company)
        except OfficeAsset.DoesNotExist:
            return None

    def get(self, request, pk):
        asset = self._get_asset(pk, request.user.company)
        if not asset:
            return Response(
                {"detail": "Asset not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = OfficeAssetSerializer(asset)
        return Response(serializer.data)

    def put(self, request, pk):
        from accounts.models import User
        if not request.user.has_management_access:
            return Response(
                {"detail": "Permission denied. Only owners/admins can update assets."},
                status=status.HTTP_403_FORBIDDEN,
            )

        asset = self._get_asset(pk, request.user.company)
        if not asset:
            return Response(
                {"detail": "Asset not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = OfficeAssetSerializer(asset, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        from accounts.models import User
        if not request.user.has_management_access:
            return Response(
                {"detail": "Permission denied. Only owners/admins can delete assets."},
                status=status.HTTP_403_FORBIDDEN,
            )

        asset = self._get_asset(pk, request.user.company)
        if not asset:
            return Response(
                {"detail": "Asset not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        asset.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class PayrollListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from accounts.models import User
        is_manager = request.user.has_management_access
        view_all = request.query_params.get("all") == "true"

        if is_manager and view_all:
            payrolls = Payroll.objects.filter(company=request.user.company)
        else:
            payrolls = Payroll.objects.filter(user=request.user, status__in=[Payroll.Status.PUBLISHED, Payroll.Status.PAID])

        from .serializers import PayrollSerializer
        serializer = PayrollSerializer(payrolls, many=True)
        return Response(serializer.data)

    def post(self, request):
        from accounts.models import User
        if not request.user.has_management_access:
            return Response({"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)
        
        from .serializers import PayrollSerializer
        serializer = PayrollSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(company=request.user.company)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PayrollDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request, pk):
        from accounts.models import User
        if not request.user.has_management_access:
            return Response({"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)
            
        try:
            payroll = Payroll.objects.get(pk=pk, company=request.user.company)
        except Payroll.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        from .serializers import PayrollSerializer
        serializer = PayrollSerializer(payroll, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        from accounts.models import User
        if not request.user.has_management_access:
            return Response({"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)
            
        try:
            payroll = Payroll.objects.get(pk=pk, company=request.user.company)
        except Payroll.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
            
        payroll.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class HolidayListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        holidays = Holiday.objects.filter(company=request.user.company).order_by("date")
        from .serializers import HolidaySerializer
        serializer = HolidaySerializer(holidays, many=True)
        return Response(serializer.data)

    def post(self, request):
        from accounts.models import User
        if not request.user.has_management_access:
            return Response({"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)
        
        from .serializers import HolidaySerializer
        serializer = HolidaySerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(company=request.user.company)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class HolidayDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        from accounts.models import User
        if not request.user.has_management_access:
            return Response({"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)
            
        try:
            holiday = Holiday.objects.get(pk=pk, company=request.user.company)
        except Holiday.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
            
        holiday.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
