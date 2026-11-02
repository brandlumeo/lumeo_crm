import datetime
from django.utils import timezone
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import TimeLog, BreakLog, LeaveRequest, ExpenseClaim, OfficeAsset, Payroll, Holiday, DailyReport, MonthlyPerformanceReport
from .serializers import TimeLogSerializer, BreakLogSerializer, LeaveRequestSerializer, ExpenseClaimSerializer, OfficeAssetSerializer, DailyReportSerializer


def _get_client_ip(request):
    """Utility to retrieve client IP from request headers."""
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        ip = x_forwarded_for.split(",")[0].strip()
    else:
        ip = request.META.get("REMOTE_ADDR")
    return ip



def _auto_close_stale_shifts():
    """Fallback self-healing utility to close shifts from previous days."""
    try:
        now = timezone.now()
        today_local = timezone.localtime(now).date()
        today_start_utc = timezone.make_aware(datetime.datetime.combine(today_local, datetime.time.min))
        
        open_logs = TimeLog.objects.filter(clock_out__isnull=True, clock_in__lt=today_start_utc)
        for log in open_logs:
            active_break = BreakLog.objects.filter(time_log=log, end_time__isnull=True).first()
            if active_break:
                active_break.end_time = now
                active_break.save()
            log.clock_out = now
            log.is_auto_closed = True
            log.save()
    except Exception:
        pass


def _parse_time(t):
    if not t:
        return None
    if isinstance(t, datetime.time):
        return t
    if isinstance(t, str):
        try:
            return datetime.time.fromisoformat(t)
        except Exception:
            try:
                return datetime.datetime.strptime(t, "%H:%M:%S").time()
            except Exception:
                return None
    return None


class CurrentStatusView(APIView):
    """
    GET /api/v1/attendance/status/
    Retrieves the current user's attendance and break status.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        _auto_close_stale_shifts()
        active_log = TimeLog.objects.filter(
            user=request.user, clock_out__isnull=True
        ).first()

        company = request.user.company
        is_before_shift = False
        office_start_str = None
        office_end_str = None

        if company:
            import zoneinfo
            company_tz = zoneinfo.ZoneInfo(company.timezone or "UTC")
            local_time = timezone.now().astimezone(company_tz)
            start_t = _parse_time(company.office_start_time)
            end_t = _parse_time(company.office_end_time)

            if start_t:
                office_start_str = start_t.strftime("%H:%M:%S")
                shift_start = datetime.datetime.combine(local_time.date(), start_t)
                shift_start = timezone.make_aware(shift_start, company_tz)
                if not company.allow_clock_in_outside_shift and local_time < shift_start:
                    is_before_shift = True
            if end_t:
                office_end_str = end_t.strftime("%H:%M:%S")

        if not active_log:
            return Response(
                {
                    "is_clocked_in": False,
                    "is_on_break": False,
                    "active_log": None,
                    "active_break": None,
                    "is_before_shift": is_before_shift,
                    "office_start_time": office_start_str,
                    "office_end_time": office_end_str,
                    "allow_clock_in_outside_shift": company.allow_clock_in_outside_shift if company else False,
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
                "is_before_shift": is_before_shift,
                "office_start_time": office_start_str,
                "office_end_time": office_end_str,
                "allow_clock_in_outside_shift": company.allow_clock_in_outside_shift if company else False,
            }
        )


from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from attendance.models import TimeLog
from accounts.models import User

@api_view(['GET'])
@permission_classes([AllowAny])
def debug_athira_logs(request):
    users = User.objects.filter(email__icontains='athira').values('id', 'email', 'first_name', 'last_name', 'company_id')
    logs = []
    for u in users:
        user_logs = TimeLog.objects.filter(user_id=u['id']).values('id', 'clock_in', 'clock_out', 'company_id')
        logs.append({
            'user': u,
            'logs': list(user_logs)
        })
    return Response({'debug_data': logs})


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
        company = request.user.company

        # 3. Geofence check for Office clock-in (100m radius)
        if work_location == TimeLog.WorkLocation.OFFICE and company and company.clock_in_location_radius_check:
            if company.office_latitude is not None and company.office_longitude is not None:
                if latitude is None or longitude is None:
                    return Response(
                        {"detail": "Location coordinates are required to clock in from the office. Please allow location access in your browser."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                try:
                    user_lat = float(latitude)
                    user_lon = float(longitude)
                    office_lat = float(company.office_latitude)
                    office_lon = float(company.office_longitude)

                    import math
                    R = 6371000  # Radius of Earth in meters
                    phi1 = math.radians(office_lat)
                    phi2 = math.radians(user_lat)
                    delta_phi = math.radians(user_lat - office_lat)
                    delta_lambda = math.radians(user_lon - office_lon)

                    a = (math.sin(delta_phi / 2) ** 2 +
                         math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2)
                    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
                    distance_meters = R * c

                    allowed_radius = company.office_radius_meters or 100
                    if distance_meters > allowed_radius:
                        dist_int = int(round(distance_meters))
                        return Response(
                            {
                                "detail": (
                                    f"Clock-in rejected: You are {dist_int}m away from the office. "
                                    f"Office clock-in is only permitted within {allowed_radius}m of the office."
                                )
                            },
                            status=status.HTTP_400_BAD_REQUEST,
                        )
                except (ValueError, TypeError):
                    return Response(
                        {"detail": "Invalid location coordinates received for office clock-in verification."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

        # 4. Determine Shift Status dynamically based on Company settings
        import zoneinfo
        company_tz = zoneinfo.ZoneInfo(company.timezone or "UTC")
        local_time = timezone.now().astimezone(company_tz)
        
        # Combine today's date in company timezone with the shift start time
        start_t = _parse_time(company.office_start_time) if company else None
        if start_t:
            shift_start = datetime.datetime.combine(local_time.date(), start_t)
            shift_start = timezone.make_aware(shift_start, company_tz)
            
            # Enforce shift start time restriction: block clock-in before shift start
            if not company.allow_clock_in_outside_shift and local_time < shift_start:
                start_formatted = start_t.strftime("%I:%M %p").lstrip("0")
                return Response(
                    {"detail": f"Clock-in is not permitted before {start_formatted}. Shift starts at {start_formatted}."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            
            # Add grace period (inclusive of the entire grace minute, e.g. up to 09:20:59)
            cutoff_time = shift_start + datetime.timedelta(
                minutes=company.late_mark_after_minutes or 0,
                seconds=59,
                microseconds=999999
            )
            
            shift_status = TimeLog.ShiftStatus.ON_TIME
            if local_time > cutoff_time:
                shift_status = TimeLog.ShiftStatus.LATE
        else:
            shift_status = TimeLog.ShiftStatus.ON_TIME

        # 4. Create log
        time_log = TimeLog.objects.create(
            user=request.user,
            company=request.user.company,
            clock_in=timezone.now(),
            work_location=work_location,
            ip_address=ip_address,
            latitude=latitude if latitude else None,
            longitude=longitude if longitude else None,
            notes=notes,
            shift_status=shift_status,
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
        _auto_close_stale_shifts()
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
    Supports filtering by status, leave_type, and search.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        _auto_close_stale_shifts()
        from django.db.models import Q
        # Check manager privilege
        is_manager = request.user.has_management_access
        view_all = request.query_params.get("all") == "true"

        if is_manager and view_all:
            leaves = LeaveRequest.objects.filter(company=request.user.company).select_related("user", "approved_by")
        else:
            leaves = LeaveRequest.objects.filter(user=request.user).select_related("user", "approved_by")

        # Filters
        status_filter = request.query_params.get("status")
        if status_filter and status_filter.lower() != "all":
            leaves = leaves.filter(status=status_filter.lower())

        leave_type_filter = request.query_params.get("leave_type")
        if leave_type_filter and leave_type_filter.lower() != "all":
            leaves = leaves.filter(leave_type=leave_type_filter.lower())

        search = request.query_params.get("search")
        if search:
            search = search.strip()
            leaves = leaves.filter(
                Q(user__first_name__icontains=search)
                | Q(user__last_name__icontains=search)
                | Q(user__email__icontains=search)
                | Q(reason__icontains=search)
            )

        leaves = leaves.order_by("-created_at")

        serializer = LeaveRequestSerializer(leaves, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = LeaveRequestSerializer(data=request.data)
        if serializer.is_valid():
            leave_type = serializer.validated_data.get("leave_type")
            initial_pay_status = (
                LeaveRequest.PayStatus.UNPAID
                if leave_type == LeaveRequest.LeaveType.UNPAID
                else LeaveRequest.PayStatus.PAID
            )
            leave = serializer.save(
                user=request.user,
                company=request.user.company,
                status=LeaveRequest.Status.PENDING,
                pay_status=initial_pay_status,
            )
            
            # Trigger celery task
            try:
                from notifications.tasks import notify_leave_applied
                notify_leave_applied.delay(leave.id)
            except Exception as e:
                import logging
                logging.getLogger(__name__).error(f"Failed to queue notify_leave_applied: {e}")
                
            return Response(LeaveRequestSerializer(leave).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LeaveApprovalView(APIView):
    """
    PATCH /api/v1/attendance/leaves/<uuid:pk>/approve/
    Body: { "status": "approved"/"rejected", "manager_notes": string, "pay_status": "paid"/"unpaid" }
    Restricted to Owners and Admins to approve/reject leaves and decide paid vs unpaid.
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

        if new_status == LeaveRequest.Status.APPROVED:
            requested_pay_status = request.data.get("pay_status")
            if requested_pay_status in [LeaveRequest.PayStatus.PAID, LeaveRequest.PayStatus.UNPAID]:
                leave.pay_status = requested_pay_status

        leave.save()

        # Trigger celery task
        try:
            from notifications.tasks import notify_leave_updated
            notify_leave_updated.delay(leave.id)
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Failed to queue notify_leave_updated: {e}")

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
        _auto_close_stale_shifts()
        from accounts.models import User
        is_manager = request.user.has_management_access
        view_all = request.query_params.get("all") == "true"

        if is_manager and view_all:
            expenses = ExpenseClaim.objects.filter(company=request.user.company)
        else:
            expenses = ExpenseClaim.objects.filter(user=request.user)

        serializer = ExpenseClaimSerializer(expenses, many=True, context={'request': request})
        return Response(serializer.data)

    def post(self, request):
        serializer = ExpenseClaimSerializer(data=request.data, context={'request': request})
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

        serializer = ExpenseClaimSerializer(expense, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class OfficeAssetListCreateView(APIView):
    """
    GET/POST /api/v1/attendance/assets/
    GET: View company assets (unassigned, assigned to user, etc.)
    POST: Create a new company asset (resticted to owners/admins).
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        _auto_close_stale_shifts()
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


from crm.permissions import CompanyRBACPermission

class PayrollListCreateView(APIView):
    permission_classes = [CompanyRBACPermission]
    permission_module = "Payroll"

    def get(self, request):
        _auto_close_stale_shifts()
        from accounts.models import User
        
        rbac = CompanyRBACPermission()
        role_data = rbac._get_role_data(request.user)
        
        view_perm = "None"
        if request.user.is_superuser or request.user.role in ['owner', 'admin', 'manager'] or request.user.can_manage_team:
            view_perm = "All"
        elif role_data and role_data.get("isAdmin"):
            view_perm = "All"
        elif role_data:
            view_perm = role_data.get("permissions", {}).get("Payroll", {}).get("View", "None")
            
        view_all = request.query_params.get("all") == "true"

        if view_perm == "All" and view_all:
            payrolls = Payroll.objects.filter(company=request.user.company)
        elif view_perm in ["All", "Owned"]:
            payrolls = Payroll.objects.filter(user=request.user, status__in=[Payroll.Status.PUBLISHED, Payroll.Status.PAID])
        else:
            payrolls = Payroll.objects.none()

        from .serializers import PayrollSerializer
        serializer = PayrollSerializer(payrolls, many=True)
        return Response(serializer.data)

    def post(self, request):
        from .serializers import PayrollSerializer
        serializer = PayrollSerializer(data=request.data)
        if serializer.is_valid():
            payroll = serializer.save(company=request.user.company)
            
            # Optionally update employee ID if provided
            emp_id_str = request.data.get('employee_id')
            if emp_id_str is not None:
                payroll.user.employee_id = emp_id_str
                payroll.user.save()
                
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PayrollDetailView(APIView):
    permission_classes = [CompanyRBACPermission]
    permission_module = "Payroll"

    def get(self, request, pk):
        try:
            payroll = Payroll.objects.get(pk=pk, company=request.user.company)
        except Payroll.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
            
        rbac = CompanyRBACPermission()
        role_data = rbac._get_role_data(request.user)
        
        view_perm = "None"
        if request.user.is_superuser or request.user.role in ['owner', 'admin', 'manager'] or request.user.can_manage_team:
            view_perm = "All"
        elif role_data and role_data.get("isAdmin"):
            view_perm = "All"
        elif role_data:
            view_perm = role_data.get("permissions", {}).get("Payroll", {}).get("View", "None")
            
        if view_perm != "All":
            if payroll.user != request.user:
                return Response({"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)
            if payroll.status not in [Payroll.Status.PUBLISHED, Payroll.Status.PAID]:
                return Response({"detail": "Payroll not available."}, status=status.HTTP_403_FORBIDDEN)
                
        from .serializers import PayrollSerializer
        serializer = PayrollSerializer(payroll)
        return Response(serializer.data)

    def put(self, request, pk):
        try:
            payroll = Payroll.objects.get(pk=pk, company=request.user.company)
        except Payroll.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
            
        from .serializers import PayrollSerializer
        serializer = PayrollSerializer(payroll, data=request.data, partial=True)
        if serializer.is_valid():
            payroll = serializer.save()
            
            # Optionally update employee ID if provided
            emp_id_str = request.data.get('employee_id')
            if emp_id_str is not None:
                payroll.user.employee_id = emp_id_str
                payroll.user.save()
                
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
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

from rest_framework.viewsets import ModelViewSet
from crm.permissions import CompanyRBACPermission
class TimeLogAdminViewSet(ModelViewSet):
    permission_classes = [CompanyRBACPermission]
    serializer_class = TimeLogSerializer
    def get_queryset(self):
        return TimeLog.objects.filter(company=self.request.user.company).order_by('-clock_in')


from calendar import monthrange
from datetime import date, timedelta
from accounts.models import User

class AttendanceMatrixView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        month = int(request.GET.get('month', timezone.now().month))
        year = int(request.GET.get('year', timezone.now().year))
        
        company = request.user.company
        from calendar import monthrange
        from datetime import date, timedelta
        import zoneinfo
        
        company_tz = zoneinfo.ZoneInfo(company.timezone)
        today_local_date = timezone.now().astimezone(company_tz).date()
        
        _, num_days = monthrange(year, month)
        
        from django.db.models import Prefetch
        # Get all active employees in the company with prefetched timelogs and leaves
        start_date = date(year, month, 1)
        end_date = date(year, month, num_days)

        users = User.objects.filter(company=company, is_active=True).exclude(role=User.Role.CUSTOMER).prefetch_related(
            Prefetch(
                'time_logs',
                queryset=TimeLog.objects.filter(
                    clock_in__date__gte=start_date,
                    clock_in__date__lte=end_date
                ).order_by('-clock_in'),
                to_attr='month_logs'
            ),
            Prefetch(
                'leaves',
                queryset=LeaveRequest.objects.filter(
                    status=LeaveRequest.Status.APPROVED,
                    start_date__lte=end_date,
                    end_date__gte=start_date
                ),
                to_attr='month_leaves'
            )
        )
        
        holidays = Holiday.objects.filter(
            company=company,
            date__gte=start_date,
            date__lte=end_date
        )
        
        holiday_dates = {h.date for h in holidays}

            

                
        matrix = []
        
        for user in users:
            user_days = {}
            counts = {
                "present": 0,
                "absent": 0,
                "half_day": 0,
                "late": 0,
                "leave": 0,
                "holiday": 0,
                "day_off": 0,
            }
            
            for day in range(1, num_days + 1):
                current_date = date(year, month, day)
                is_weekend = company.is_day_off(current_date)
                
                status = "absent"
                
                # 1. Check Holiday / Weekend
                if current_date in holiday_dates:
                    status = "holiday"
                elif is_weekend:
                    status = "day_off"
                    
                # 2. Check Leave
                # Check leaves for this user
                for l in user.month_leaves:
                    if l.start_date <= current_date <= l.end_date:
                        status = "leave"
                        break
                
                # Check timelogs for this user
                # We iterate to find the first log matching the date (which is the newest due to order_by)
                tl = None
                for log in user.month_logs:
                    log_date = log.clock_in.astimezone(company_tz).date() if timezone.is_aware(log.clock_in) else log.clock_in.date()
                    if log_date == current_date:
                        tl = log
                        break
                if tl:
                    # Dynamically calculate attendance status based on current company settings
                    tl_local = tl.clock_in.astimezone(company_tz) if timezone.is_aware(tl.clock_in) else tl.clock_in
                    
                    if company.office_start_time:
                        shift_start = datetime.datetime.combine(tl_local.date(), company.office_start_time)
                        if timezone.is_naive(shift_start):
                            shift_start = timezone.make_aware(shift_start, company_tz)
                        cutoff_time = shift_start + timedelta(
                            minutes=company.late_mark_after_minutes or 0,
                            seconds=59,
                            microseconds=999999
                        )
                        
                        # Half-day afternoon shift start (default 14:00 / 2:00 PM) and grace period (default 15 minutes)
                        hd_time = getattr(company, 'half_day_start_time', None) or datetime.time(14, 0, 0)
                        hd_grace = getattr(company, 'half_day_late_mark_after_minutes', None)
                        if hd_grace is None:
                            hd_grace = 15
                            
                        half_day_start = datetime.datetime.combine(tl_local.date(), hd_time)
                        if timezone.is_naive(half_day_start):
                            half_day_start = timezone.make_aware(half_day_start, company_tz)
                        half_day_cutoff = half_day_start + timedelta(
                            minutes=hd_grace,
                            seconds=59,
                            microseconds=999999
                        )
                        
                        # Check if clocked out
                        if tl.clock_out:
                            duration = (tl.clock_out - tl.clock_in).total_seconds() / 3600
                            if duration < 4:
                                status = "half_day"
                            elif tl_local >= half_day_start:
                                if tl_local <= half_day_cutoff:
                                    status = "half_day"
                                else:
                                    status = "late"
                            elif tl_local > cutoff_time:
                                status = "late"
                            else:
                                status = "present"
                        else:
                            # Active / LIVE shift (clock_out is None)
                            if tl_local >= half_day_start:
                                if tl_local <= half_day_cutoff:
                                    # Clocked in within half-day grace (e.g. 2:00 PM - 2:15 PM) -> Half Day!
                                    status = "half_day"
                                else:
                                    # Clocked in after half-day grace (after 2:15 PM) -> Late, do not show half day
                                    status = "late"
                            elif tl_local > cutoff_time:
                                status = "late"
                            else:
                                status = "present"
                    else:
                        # Fallback if no office_start_time is set
                        if tl.clock_out:
                            duration = (tl.clock_out - tl.clock_in).total_seconds() / 3600
                            if duration < 4:
                                status = "half_day"
                            elif tl.shift_status == "late":
                                status = "late"
                            else:
                                status = "present"
                        else:
                            if tl_local.hour == 14 and tl_local.minute <= 15:
                                status = "half_day"
                            elif tl.shift_status == "late":
                                status = "late"
                            else:
                                status = "present"
                            
                # 4. If date is in the future, don't mark as absent
                if current_date > today_local_date and status == "absent":
                    status = "future"
                    
                user_days[str(day)] = status
                if status in counts:
                    counts[status] += 1
                
            matrix.append({
                "id": user.id,
                "name": user.get_full_name() or user.username,
                "role": user.role,
                "designation": user.designation,
                "days": user_days,
                "counts": counts
            })
            
        is_export = request.GET.get("export") == "csv"
        
        if is_export:
            import csv
            from django.http import HttpResponse
            
            response = HttpResponse(content_type='text/csv')
            import calendar
            month_name = calendar.month_name[month]
            response['Content-Disposition'] = f'attachment; filename="Team_Attendance_Matrix_{month_name}_{year}.csv"'
            
            writer = csv.writer(response)
            
            # Header
            header = ["Employee", "Role"] + [str(d) for d in range(1, num_days + 1)] + ["Total Present", "Total Absent", "Total Half Day", "Total Late", "Total Leave"]
            writer.writerow(header)
            
            # Rows
            for row in matrix:
                csv_row = [row["name"], row["role"]]
                for d in range(1, num_days + 1):
                    csv_row.append(row["days"][str(d)])
                csv_row.extend([
                    row["counts"]["present"],
                    row["counts"]["absent"],
                    row["counts"]["half_day"],
                    row["counts"]["late"],
                    row["counts"]["leave"],
                ])
                writer.writerow(csv_row)
                
            return response
            
        return Response({
            "month": month,
            "year": year,
            "days_in_month": num_days,
            "matrix": matrix
        })


class DailyReportListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        company = request.user.company
        if not company:
            return Response({"detail": "User has no company"}, status=status.HTTP_400_BAD_REQUEST)
        
        reports = DailyReport.objects.filter(company=company).select_related("user").order_by("-date", "-created_at")
        
        # If not admin/owner/manager, only show own reports
        if not request.user.is_superuser and request.user.role not in ["admin", "owner", "manager"] and not request.user.has_management_access:
            reports = reports.filter(user=request.user)
            
        serializer = DailyReportSerializer(reports, many=True)
        return Response(serializer.data)
        
    def post(self, request):
        company = request.user.company
        if not company:
            return Response({"detail": "User has no company"}, status=status.HTTP_400_BAD_REQUEST)
            
        import datetime, zoneinfo
        tz = zoneinfo.ZoneInfo(company.timezone or "UTC")
        local_date = timezone.now().astimezone(tz).date()
        yesterday_date = local_date - datetime.timedelta(days=1)
        
        date_str = request.data.get("date")
        if date_str:
            try:
                target_date = datetime.date.fromisoformat(date_str)
                # Strictly enforce that only today or yesterday can be submitted
                if target_date not in [local_date, yesterday_date]:
                    return Response(
                        {"detail": "Daily reports can only be submitted for today or yesterday."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            except (ValueError, TypeError):
                target_date = local_date
        else:
            target_date = local_date
        
        # Optional: Auto-calculate stats here based on tasks/deals modified today by user
        automated_stats = request.data.get("automated_stats", {})
        
        data = request.data.copy()
        data["date"] = target_date.isoformat()
        
        serializer = DailyReportSerializer(data=data)
        if serializer.is_valid():
            serializer.save(user=request.user, company=company, automated_stats=automated_stats)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class DailyReportTodayView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        company = request.user.company
        if not company:
            return Response({"detail": "User has no company"}, status=status.HTTP_400_BAD_REQUEST)
            
        import zoneinfo
        tz = zoneinfo.ZoneInfo(company.timezone or "UTC")
        local_date = timezone.now().astimezone(tz).date()
        
        reports = DailyReport.objects.filter(user=request.user, date=local_date)
        report = reports.first()
        if report:
            serializer = DailyReportSerializer(report)
            data = serializer.data
            data["today_count"] = reports.count()
            return Response(data)
        return Response({"detail": "No report submitted today", "date": local_date.isoformat(), "today_count": 0}, status=status.HTTP_404_NOT_FOUND)


class DailyReportDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, request, pk):
        company = request.user.company
        if not company:
            return None
        try:
            return DailyReport.objects.get(id=pk, company=company)
        except DailyReport.DoesNotExist:
            return None

    def get(self, request, pk):
        report = self.get_object(request, pk)
        if not report:
            return Response({"detail": "Daily report not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = DailyReportSerializer(report)
        return Response(serializer.data)

    def patch(self, request, pk):
        report = self.get_object(request, pk)
        if not report:
            return Response({"detail": "Daily report not found."}, status=status.HTTP_404_NOT_FOUND)

        # Enforce that only the author who submitted the report can edit it
        if report.user != request.user:
            return Response({"detail": "You can only edit your own daily reports."}, status=status.HTTP_403_FORBIDDEN)

        serializer = DailyReportSerializer(report, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def put(self, request, pk):
        return self.patch(request, pk)

    def delete(self, request, pk):
        report = self.get_object(request, pk)
        if not report:
            return Response({"detail": "Daily report not found."}, status=status.HTTP_404_NOT_FOUND)

        # Enforce that only the author who submitted the report can delete it
        if report.user != request.user:
            return Response({"detail": "You can only delete your own daily reports."}, status=status.HTTP_403_FORBIDDEN)

        report.delete()
        return Response({"detail": "Daily report deleted successfully."}, status=status.HTTP_200_OK)




def _detect_covered_dates(content, report_date, year, month):
    """
    Extracts dates mentioned in report content where employees caught up on missed daily reports.
    Strictly limited to yesterday relative to report_date (report_date - 1 day) to prevent
    unintended matches from project milestones or past reference dates in report text.
    """
    if not content or not report_date:
        return set()
    import re
    from datetime import timedelta
    yesterday = report_date - timedelta(days=1)
    if yesterday.year != year or yesterday.month != month:
        return set()

    month_names = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
    full_month_names = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']
    m_short = month_names[yesterday.month - 1]
    m_full = full_month_names[yesterday.month - 1]
    d_num = yesterday.day

    patterns = [
        rf'\byesterday\b',
        rf'(?:{m_full}|{m_short})\s*{d_num}(?:st|nd|rd|th)?\b',
        rf'\b{d_num}(?:st|nd|rd|th)?\s*(?:{m_full}|{m_short})\b',
        rf'\b{d_num}[/-]{yesterday.month:02d}[/-](?:{yesterday.year}|\d{{2}})?\b',
        rf'\b{d_num}[/-]{yesterday.month}[/-](?:{yesterday.year}|\d{{2}})?\b',
    ]

    for pat in patterns:
        if re.search(pat, content, re.IGNORECASE):
            return {d_num}

    return set()

class DailyReportMatrixView(APIView):
    """
    GET /api/v1/attendance/reports/monthly-matrix/?month=10&year=2026
    Returns a day-by-day submission matrix of daily reports for all team members in the company.
    Approved leave days exempt the employee from submitting and do not penalize compliance.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        company = request.user.company
        if not company:
            return Response({"detail": "User has no company"}, status=status.HTTP_400_BAD_REQUEST)

        from calendar import monthrange
        from datetime import date, timedelta
        import zoneinfo
        from accounts.models import User

        try:
            month = int(request.GET.get('month', timezone.now().month))
            year = int(request.GET.get('year', timezone.now().year))
        except (ValueError, TypeError):
            month = timezone.now().month
            year = timezone.now().year

        company_tz = zoneinfo.ZoneInfo(company.timezone or "UTC")
        today_local_date = timezone.now().astimezone(company_tz).date()

        _, num_days = monthrange(year, month)
        start_date = date(year, month, 1)
        end_date = date(year, month, num_days)

        from django.db.models import Prefetch
        users = User.objects.filter(
            company=company, 
            is_active=True
        ).exclude(role=User.Role.CUSTOMER).prefetch_related(
            Prefetch(
                'daily_reports',
                queryset=DailyReport.objects.filter(
                    company=company,
                    date__gte=start_date,
                    date__lte=end_date
                ).order_by('created_at'),
                to_attr='month_daily_reports'
            ),
            Prefetch(
                'leaves',
                queryset=LeaveRequest.objects.filter(
                    company=company,
                    status=LeaveRequest.Status.APPROVED,
                    start_date__lte=end_date,
                    end_date__gte=start_date
                ),
                to_attr='month_leaves'
            ),
            Prefetch(
                'time_logs',
                queryset=TimeLog.objects.filter(
                    company=company,
                    clock_in__date__gte=start_date,
                    clock_in__date__lte=end_date
                ),
                to_attr='month_timelogs'
            )
        ).order_by('first_name', 'username')

        holidays = Holiday.objects.filter(
            company=company,
            date__gte=start_date,
            date__lte=end_date
        )
        holiday_dates = {h.date for h in holidays}

        matrix = []
        for user in users:
            reports_by_date = {r.date: r for r in getattr(user, 'month_daily_reports', [])}
            worked_dates = {tl.clock_in.astimezone(company_tz).date() for tl in getattr(user, 'month_timelogs', []) if tl.clock_in}
            
            # Detect retroactive/consolidated covered dates (strictly yesterday relative to each report)
            consolidated_coverage = {}
            for r in getattr(user, 'month_daily_reports', []):
                r_content = r.content or ""
                covered_day_nums = _detect_covered_dates(r_content, r.date, year, month)
                for d_num in covered_day_nums:
                    d_date = date(year, month, d_num)
                    if d_date != r.date and d_date not in consolidated_coverage:
                        consolidated_coverage[d_date] = (r, f"Covered in {r.date.strftime('%b %d')} wrap-up (Yesterday)")

            # Map leave dates
            leave_dates = set()
            for l in getattr(user, 'month_leaves', []):
                curr = max(l.start_date, start_date)
                l_end = min(l.end_date, end_date)
                while curr <= l_end:
                    leave_dates.add(curr)
                    curr += timedelta(days=1)

            user_days = {}
            counts = {
                "submitted": 0,
                "missed": 0,
                "leave": 0,
                "day_off": 0,
                "holiday": 0,
                "expected_working_days": 0,
            }

            for day in range(1, num_days + 1):
                current_date = date(year, month, day)
                day_str = str(day)
                
                # 1. Future date
                if current_date > today_local_date:
                    user_days[day_str] = {
                        "status": "future",
                        "date": current_date.isoformat(),
                    }
                    continue

                # 2. Check if employee was on approved leave (EXEMPT from daily report)
                if current_date in leave_dates:
                    counts["leave"] += 1
                    user_days[day_str] = {
                        "status": "leave",
                        "date": current_date.isoformat(),
                        "label": "On Leave",
                    }
                    continue

                # 3. Check if company holiday
                is_holiday = current_date in holiday_dates
                # 4. Check if company day off / weekend
                is_day_off = company.is_day_off(current_date)

                report = reports_by_date.get(current_date)
                worked = current_date in worked_dates

                # If report was submitted
                if report:
                    counts["submitted"] += 1
                    if not is_holiday and not is_day_off:
                        counts["expected_working_days"] += 1
                    user_days[day_str] = {
                        "status": "submitted",
                        "report_id": str(report.id),
                        "date": current_date.isoformat(),
                        "sentiment": report.sentiment or "Great",
                        "snippet": (report.content or "")[:140],
                    }
                elif is_holiday:
                    counts["holiday"] += 1
                    user_days[day_str] = {
                        "status": "holiday",
                        "date": current_date.isoformat(),
                        "label": "Holiday",
                    }
                elif is_day_off and not worked:
                    counts["day_off"] += 1
                    user_days[day_str] = {
                        "status": "day_off",
                        "date": current_date.isoformat(),
                        "label": "Day Off",
                    }
                elif current_date in consolidated_coverage:
                    # Retroactively covered in a subsequent daily report!
                    cov_report, cov_label = consolidated_coverage[current_date]
                    counts["submitted"] += 1
                    if not is_holiday and not is_day_off:
                        counts["expected_working_days"] += 1
                    user_days[day_str] = {
                        "status": "covered",
                        "report_id": str(cov_report.id),
                        "date": current_date.isoformat(),
                        "sentiment": cov_report.sentiment or "Great",
                        "label": cov_label,
                        "covered_in_date": cov_report.date.isoformat(),
                        "snippet": f"[{cov_label}] {(cov_report.content or '')[:140]}",
                    }
                else:
                    # Regular working day (or clocked in on weekend) and missed daily report
                    counts["expected_working_days"] += 1
                    counts["missed"] += 1
                    user_days[day_str] = {
                        "status": "missed",
                        "date": current_date.isoformat(),
                        "worked": worked,
                        "label": "Missed Wrap-Up",
                    }

            expected = counts["expected_working_days"]
            compliance_rate = round((counts["submitted"] / expected * 100), 1) if expected > 0 else (100.0 if counts["submitted"] > 0 else 0.0)

            matrix.append({
                "id": str(user.id),
                "name": user.get_full_name() or user.username,
                "email": user.email,
                "role": user.role,
                "designation": user.designation or "",
                "avatar": user.avatar or "",
                "days": user_days,
                "counts": counts,
                "compliance_rate": compliance_rate,
            })

        return Response({
            "month": month,
            "year": year,
            "days_in_month": num_days,
            "today": today_local_date.isoformat(),
            "matrix": matrix,
        })


class AIMonthlyPerformanceView(APIView):
    """
    GET/POST /api/v1/attendance/reports/ai-monthly-analysis/
    Analyzes all daily reports and performance metrics for the month to select and rank best performers.
    Restricted to Primary Admin (owner/admin) and Manager / Secondary Admin (manager).
    """
    permission_classes = [IsAuthenticated]

    def _check_permission(self, user):
        from accounts.models import User
        # Primary admin (owner, admin) or Secondary admin (manager)
        return (
            user.is_superuser
            or user.role in [User.Role.OWNER, User.Role.ADMIN, User.Role.MANAGER]
            or getattr(user, 'has_management_access', False)
        )

    def get(self, request):
        if not self._check_permission(request.user):
            return Response(
                {"detail": "Permission denied. Only primary admin, manager, and secondary admin can access the AI monthly leaderboard."},
                status=status.HTTP_403_FORBIDDEN
            )

        company = request.user.company
        if not company:
            return Response({"detail": "User has no company"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            month = int(request.GET.get('month', timezone.now().month))
            year = int(request.GET.get('year', timezone.now().year))
        except (ValueError, TypeError):
            month = timezone.now().month
            year = timezone.now().year

        report = MonthlyPerformanceReport.objects.filter(
            company=company,
            month=month,
            year=year
        ).first()

        if not report:
            return Response({"has_analysis": False, "month": month, "year": year})

        return Response({
            "has_analysis": True,
            "id": str(report.id),
            "month": report.month,
            "year": report.year,
            "executive_summary": report.executive_summary,
            "rankings": report.rankings,
            "generated_at": report.updated_at.isoformat(),
            "generated_by": report.generated_by.get_full_name() if report.generated_by else "Lumeo AI",
        })

    def post(self, request):
        if not self._check_permission(request.user):
            return Response(
                {"detail": "Permission denied. Only primary admin, manager, and secondary admin can access the AI monthly leaderboard."},
                status=status.HTTP_403_FORBIDDEN
            )

        company = request.user.company
        if not company:
            return Response({"detail": "User has no company"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            month = int(request.data.get('month', timezone.now().month))
            year = int(request.data.get('year', timezone.now().year))
        except (ValueError, TypeError):
            month = timezone.now().month
            year = timezone.now().year

        import os, requests, json, logging, time, re
        logger = logging.getLogger(__name__)

        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            return Response({
                "detail": "GEMINI_API_KEY is not configured in the backend environment."
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        from calendar import monthrange
        from datetime import date
        _, num_days = monthrange(year, month)
        start_date = date(year, month, 1)
        end_date = date(year, month, num_days)

        from accounts.models import User
        from crm.models import Task
        employees = User.objects.filter(company=company, is_active=True).exclude(role=User.Role.CUSTOMER)
        
        employee_data_list = []
        for emp in employees:
            reports = DailyReport.objects.filter(
                user=emp,
                date__gte=start_date,
                date__lte=end_date
            ).order_by('date')

            completed_tasks = Task.objects.filter(
                company=company,
                assigned_to=emp,
                status=Task.Status.DONE,
                updated_at__date__gte=start_date,
                updated_at__date__lte=end_date
            )

            approved_leaves = LeaveRequest.objects.filter(
                user=emp,
                status=LeaveRequest.Status.APPROVED,
                start_date__lte=end_date,
                end_date__gte=start_date
            )

            # Build comprehensive monthly work logs and detect distinct client/internal projects
            report_entries = []
            total_content_length = 0
            distinct_projects_set = set()

            for r in reports:
                content_str = (r.content or "").strip()
                total_content_length += len(content_str)
                # Scan for project headings or client names
                for line in content_str.split("\n"):
                    line_clean = line.strip()
                    if re.match(r"^(?:\d+\.\s*)?project:\s*", line_clean, re.IGNORECASE):
                        p_name = re.sub(r"^(?:\d+\.\s*)?project:\s*", "", line_clean, flags=re.IGNORECASE).strip()
                        if p_name:
                            distinct_projects_set.add(p_name)
                    for kw in ["bestflowers", "eyetrack", "edufix", "infinity", "brandlumeo", "saffron", "helio", "sbs", "nova grid"]:
                        if kw in line_clean.lower():
                            distinct_projects_set.add(kw.title())

                # Include comprehensive clean work snippet up to 1000 characters per report
                cleaned_text = re.sub(r"\s+", " ", content_str)[:1000]
                if cleaned_text:
                    report_entries.append(f"[{r.date}] {cleaned_text}")

            # Calculate unique days covered (direct reports + strictly yesterday catch-up reports)
            covered_days_set = {r.date for r in reports}
            for r in reports:
                r_content = r.content or ""
                extra_days = _detect_covered_dates(r_content, r.date, year, month)
                for ed in extra_days:
                    covered_days_set.add(date(year, month, ed))

            effective_days_covered = len(covered_days_set)
            catch_up_days_credited = max(0, effective_days_covered - reports.count())
            completed_task_titles = [t.title for t in completed_tasks[:8]]

            employee_data_list.append({
                "user_id": str(emp.id),
                "name": emp.get_full_name() or emp.username,
                "role": emp.role,
                "designation": emp.designation or emp.role,
                "reports_submitted": reports.count(),
                "effective_days_covered": effective_days_covered,
                "catch_up_days_credited": catch_up_days_credited,
                "completed_tasks_count": completed_tasks.count(),
                "completed_tasks_sample": completed_task_titles,
                "approved_leaves_count": approved_leaves.count(),
                "distinct_projects_detected": list(distinct_projects_set)[:8],
                "total_work_log_chars": total_content_length,
                "monthly_work_logs": report_entries if report_entries else ["No reports submitted."]
            })

        if not employee_data_list:
            return Response({"detail": "No active employees found to analyze."}, status=status.HTTP_400_BAD_REQUEST)

        system_instructions = (
            "You are an elite, objective Chief Operating Officer & Senior HR Performance Evaluation AI. "
            f"Perform a rigorous, deep qualitative assessment of work output for each team member at {company.name} for the period {month}/{year}.\n\n"
            "EVALUATION CRITERIA & WEIGHTING:\n"
            "1. QUALITATIVE WORK COMPLEXITY & TECHNICAL/CREATIVE IMPACT (45% Weight):\n"
            "   - Read each employee's submitted work logs thoroughly.\n"
            "   - Evaluate the depth, difficulty, and business impact of what was delivered (e.g., full-stack software development, Next.js migrations, system architecture, designing high-converting marketing campaigns, producing and editing video reels, influencer outreach and client handling vs simple routine updates).\n"
            "   - Value high-difficulty, impactful problem solving much higher than simple repetitive tasks.\n\n"
            "2. PROJECT BREADTH & TANGIBLE DELIVERABLES (25% Weight):\n"
            "   - Evaluate actual client and internal projects advanced (e.g., Bestflowers.ae, EyeTrack Solutions, Edufix, Infinity International, BrandLumeo, etc.).\n"
            "   - Track volume and completion rate of tangible milestones delivered across the entire month.\n\n"
            "3. REPORTING INTEGRITY, DISCIPLINE & CATCH-UP RESPONSIBILITY (20% Weight):\n"
            "   - Value consistent daily reporting.\n"
            "   - Multi-day catch-up rule: If an employee forgot to report on a given day and responsibly documented that day's work in their next day's report (e.g., 'October 28: ... October 29: ...'), give them FULL credit for their output, responsibility, and catch-up effort.\n"
            "   - Approved leave rule: Approved leaves are official and excused. DO NOT penalize employees for approved leaves; evaluate their score based on their active working days.\n\n"
            "4. INITIATIVE & AUTONOMY (10% Weight):\n"
            "   - Proactive troubleshooting, leadership, mentoring, and cross-functional coordination.\n\n"
            "SCORING & DIFFERENTIATION RULES:\n"
            "- CRITICAL: Do NOT assign identical generic scores (e.g. 85 to everyone). Distribute scores accurately between 60 and 98 reflecting real, measurable differences in their qualitative accomplishments, technical/creative complexity, and output velocity.\n"
            "- In the highlights array, cite 3 specific achievements naming the real projects, tools, or client deliverables they worked on.\n"
            "- Provide personalized, constructive professional feedback tailored to each individual's role and month's output.\n\n"
            "OUTPUT FORMAT:\n"
            "Return a strictly valid JSON object matching this schema:\n"
            "{\n"
            '  "executive_summary": "3-4 sentence high-level executive brief summarizing the team accomplishments, standout performers, and key projects delivered.",\n'
            '  "rankings": [\n'
            '    {\n'
            '      "rank": 1,\n'
            '      "user_id": "string",\n'
            '      "name": "string",\n'
            '      "role": "string",\n'
            '      "score": 95,\n'
            '      "badge": "Strategic Impact Leader",\n'
            '      "highlights": ["3-4 concrete bullets citing real projects and achievements"],\n'
            '      "strengths": ["Key professional strengths demonstrated"],\n'
            '      "feedback": "Actionable, role-specific growth recommendation",\n'
            '      "reports_submitted": 20\n'
            '    }\n'
            '  ]\n'
            "}\n"
            "Order the rankings array strictly by rank in descending order of performance (rank 1 = best performer). Do not include markdown or backticks in the response, only pure JSON."
        )

        prompt_payload = {
            "month": month,
            "year": year,
            "company": company.name,
            "employees": employee_data_list,
        }

        body = {
            "contents": [
                {
                    "parts": [
                        {
                            "text": f"{system_instructions}\n\nDATA TO EVALUATE:\n{json.dumps(prompt_payload, ensure_ascii=False)}"
                        }
                    ]
                }
            ],
            "generationConfig": {
                "responseMimeType": "application/json",
                "temperature": 0.2
            }
        }

        parsed_result = None
        gemini_models = ["gemini-2.5-flash", "gemini-flash-latest"]

        try:
            for model_name in gemini_models:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
                for attempt in range(3):
                    try:
                        resp = requests.post(url, json=body, timeout=45)
                        if resp.status_code == 200:
                            resp_json = resp.json()
                            candidates = resp_json.get("candidates", [])
                            if candidates:
                                parts = candidates[0].get("content", {}).get("parts", [])
                                if parts:
                                    raw_text = parts[0].get("text", "").strip()
                                    if raw_text.startswith("```json"):
                                        raw_text = raw_text[7:]
                                    if raw_text.startswith("```"):
                                        raw_text = raw_text[3:]
                                    if raw_text.endswith("```"):
                                        raw_text = raw_text[:-3]
                                    parsed_result = json.loads(raw_text.strip())
                                    break
                        elif resp.status_code in [503, 429, 500]:
                            logger.warning(f"Gemini {model_name} returned {resp.status_code} on attempt {attempt+1}, retrying...")
                            time.sleep(1.5 * (attempt + 1))
                            continue
                        else:
                            logger.error(f"Gemini {model_name} error: {resp.status_code} - {resp.text}")
                            break
                    except Exception as req_ex:
                        logger.warning(f"Gemini exception {model_name} attempt {attempt+1}: {req_ex}")
                        time.sleep(1.5)
                if parsed_result and parsed_result.get("rankings"):
                    break

            if parsed_result and parsed_result.get("rankings"):
                rankings = parsed_result.get("rankings", [])
                exec_summary = parsed_result.get("executive_summary", "")
            else:
                logger.info("Using intelligent qualitative performance analysis engine fallback")
                scored_employees = []
                for emp_data in employee_data_list:
                    rep_count = emp_data["reports_submitted"]
                    task_count = emp_data["completed_tasks_count"]
                    leave_count = emp_data["approved_leaves_count"]
                    content_length = emp_data["total_work_log_chars"]
                    distinct_projects = len(emp_data["distinct_projects_detected"])

                    # 1. Qualitative Depth Score (up to 40 pts)
                    avg_chars_per_report = (content_length / rep_count) if rep_count > 0 else 0
                    depth_score = min(25, int(avg_chars_per_report / 15))
                    project_breadth_score = min(15, distinct_projects * 4)
                    qualitative_score = depth_score + project_breadth_score

                    # 2. Output & Deliverables Score (up to 25 pts)
                    task_score = min(25, task_count * 5 + min(15, rep_count))

                    # 3. Consistency & Discipline (up to 25 pts, excusing leaves)
                    expected_days = max(1, num_days - leave_count)
                    effective_days = emp_data["effective_days_covered"]
                    consistency_score = min(25, int((effective_days / expected_days) * 25))

                    # Base (10 pts) -> Total score between 65 and 98
                    base_score = 10 + qualitative_score + task_score + consistency_score
                    score = min(98, max(65, base_score))

                    # Extract real project highlights from daily reports
                    highlights = []
                    for line in emp_data["monthly_work_logs"]:
                        clean_line = re.sub(r"^\[\d{4}-\d{2}-\d{2}\]\s*", "", line).strip()
                        if len(clean_line) > 20 and not clean_line.startswith("No reports"):
                            highlights.append(clean_line[:130])
                            if len(highlights) >= 3:
                                break

                    if not highlights:
                        if task_count > 0:
                            highlights.append(f"Completed {task_count} project task(s) on schedule")
                        if rep_count > 0:
                            highlights.append(f"Submitted {rep_count} daily wrap-up report(s)")
                        if not highlights:
                            highlights.append("Active contributor across assigned workspace deliverables")

                    strengths = ["Execution Depth", "Team Discipline"]
                    if distinct_projects >= 2:
                        strengths.append("Cross-Project Versatility")
                    if rep_count >= 15:
                        strengths.append("Disciplined Documentation")
                    if task_count >= 2:
                        strengths.append("High Output Velocity")

                    feedback = (
                        "Continue maintaining deep qualitative documentation and proactive ownership. Expand cross-functional velocity and key deliverable impact."
                    )

                    scored_employees.append({
                        "user_id": emp_data["user_id"],
                        "name": emp_data["name"],
                        "role": emp_data["designation"] or emp_data["role"],
                        "score": score,
                        "rep_count": rep_count,
                        "task_count": task_count,
                        "content_length": content_length,
                        "highlights": highlights,
                        "strengths": strengths,
                        "feedback": feedback,
                    })

                # Sort by score, then content depth, then tasks, then reports
                scored_employees.sort(key=lambda x: (x["score"], x["content_length"], x["task_count"], x["rep_count"]), reverse=True)

                badges_pool = [
                    "🏆 Strategic Impact Leader",
                    "⚡ High Velocity Champion",
                    "🎯 Technical & Focus Excellence",
                    "🚀 Sprint Accelerator",
                    "🌟 Reliable Contributor",
                    "💼 Operational Excellence",
                ]

                rankings = []
                for rank_idx, emp in enumerate(scored_employees, start=1):
                    badge = badges_pool[rank_idx - 1] if rank_idx - 1 < len(badges_pool) else "⭐ Valued Team Member"
                    rankings.append({
                        "rank": rank_idx,
                        "user_id": emp["user_id"],
                        "name": emp["name"],
                        "role": emp["role"],
                        "score": emp["score"],
                        "badge": badge,
                        "highlights": emp["highlights"],
                        "strengths": emp["strengths"],
                        "feedback": emp["feedback"],
                        "reports_submitted": emp["rep_count"],
                    })

                top_emp = rankings[0]["name"] if rankings else "Team"
                exec_summary = (
                    f"During {month}/{year}, the team demonstrated commendable dedication across project deliveries and daily operational goals. "
                    f"Special recognition goes to {top_emp} for leading performance benchmarks. Team members maintained disciplined reporting and task execution throughout the month."
                )
        except Exception as e:
            logger.exception("AI monthly analysis failed")
            return Response({"detail": f"Failed to generate AI analysis: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        perf_report, _ = MonthlyPerformanceReport.objects.update_or_create(
            company=company,
            month=month,
            year=year,
            defaults={
                "executive_summary": exec_summary,
                "rankings": rankings,
                "generated_by": request.user,
            }
        )

        return Response({
            "has_analysis": True,
            "id": str(perf_report.id),
            "month": perf_report.month,
            "year": perf_report.year,
            "executive_summary": perf_report.executive_summary,
            "rankings": perf_report.rankings,
            "generated_at": perf_report.updated_at.isoformat(),
            "generated_by": request.user.get_full_name() or request.user.username,
        })
