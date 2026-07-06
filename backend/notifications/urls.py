from django.urls import path
from .views import NotificationListView, NotificationMarkReadView, NotificationUnreadCountView, TriggerCronTasksView

app_name = "notifications"

urlpatterns = [
    path("", NotificationListView.as_view(), name="list"),
    path("unread-count/", NotificationUnreadCountView.as_view(), name="unread_count"),
    path("mark-read/", NotificationMarkReadView.as_view(), name="mark_read"),
    path("trigger-cron-tasks/", TriggerCronTasksView.as_view(), name="trigger_cron_tasks"),
]
