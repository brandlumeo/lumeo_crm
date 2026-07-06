from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Notification
from .serializers import NotificationSerializer


from rest_framework.pagination import LimitOffsetPagination
from django.utils.dateparse import parse_date

class NotificationListView(APIView):
    """
    GET   /api/v1/notifications/
    Query params:
      ?unread=true   → only unread
      ?date=YYYY-MM-DD → filter by date
      ?limit=20&offset=0 → pagination
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Notification.objects.filter(user=request.user)

        if request.query_params.get("unread") == "true":
            qs = qs.filter(is_read=False)

        date_param = request.query_params.get("date")
        if date_param:
            parsed = parse_date(date_param)
            if parsed:
                qs = qs.filter(created_at__date=parsed)

        paginator = LimitOffsetPagination()
        paginator.default_limit = 20
        paginated_qs = paginator.paginate_queryset(qs, request, view=self)
        
        serializer = NotificationSerializer(paginated_qs, many=True)
        return paginator.get_paginated_response(serializer.data)


class NotificationUnreadCountView(APIView):
    """
    GET  /api/v1/notifications/unread-count/
    Returns {"count": <int>} — used by the topbar bell badge.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        count = Notification.objects.filter(
            user=request.user,
            is_read=False,
        ).count()
        return Response({"count": count})


class NotificationMarkReadView(APIView):
    """
    POST  /api/v1/notifications/mark-read/
    Body: {"ids": [1, 2, 3]}  → marks those IDs read.
    Body: {}                  → marks ALL unread as read.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        ids = request.data.get("ids")
        qs = Notification.objects.filter(user=request.user, is_read=False)

        if ids:
            qs = qs.filter(pk__in=ids)

        updated = qs.update(is_read=True)
        return Response({"marked_read": updated}, status=status.HTTP_200_OK)

class TriggerCronTasksView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        token = request.query_params.get('token')
        from django.conf import settings
        if not token or token != getattr(settings, 'CRON_SECRET_KEY', ''):
            return Response({'error': 'Unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)

        from notifications.tasks import send_daily_digest, check_task_deadlines
        from subscriptions.tasks import check_expiring_subscriptions

        send_daily_digest.delay()
        check_task_deadlines.delay()
        check_expiring_subscriptions.delay()

        return Response({'status': 'Background tasks triggered successfully'})
