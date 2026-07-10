"""
Celery application for Lumeo CRM.

Loaded by config/__init__.py so that tasks are available
in all Django apps as soon as Django starts.
"""

import os

from celery import Celery
from celery.schedules import crontab

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

app = Celery("lumeo")

# Pull Celery config from Django settings (CELERY_* namespace)
app.config_from_object("django.conf:settings", namespace="CELERY")

# Auto-discover tasks.py in every INSTALLED_APP
app.autodiscover_tasks()

# ─── Periodic tasks (beat schedule) ─────────────────────────────────────────
app.conf.beat_schedule = {
    # Check for expiring subscriptions daily at 08:00 UTC
    "check-expiring-subscriptions": {
        "task": "subscriptions.tasks.check_expiring_subscriptions",
        "schedule": crontab(hour=8, minute=0),
    },
    # Send daily digest to active users every weekday at 09:00 UTC
    "send-daily-digest": {
        "task": "notifications.tasks.send_daily_digest",
        "schedule": crontab(hour=9, minute=0, day_of_week="1-5"),
    },
    # Check for tasks due today or overdue daily at 07:00 UTC
    "check-task-deadlines": {
        "task": "notifications.tasks.check_task_deadlines",
        "schedule": crontab(hour=7, minute=0),
    },
    # Auto-close open shifts at midnight (23:59)
    "auto-close-shifts": {
        "task": "notifications.tasks.auto_close_shifts",
        "schedule": crontab(hour=23, minute=59),
    },
    # Check and send clock-in/out attendance reminders every 15 minutes
    "process-attendance-reminders": {
        "task": "notifications.tasks.process_attendance_reminders",
        "schedule": crontab(minute="*/15"),
    },
    # Check for expiring subscriptions daily at 08:00 UTC
    "check-subscription-expiry": {
        "task": "notifications.tasks.check_subscription_expiry",
        "schedule": crontab(hour=8, minute=0),
    },
    # Process delayed workflow sequence steps every minute
    "process-workflow-sequences": {
        "task": "crm.tasks.process_due_workflow_steps_task",
        "schedule": crontab(),
    },
}

app.conf.timezone = "UTC"


@app.task(bind=True, ignore_result=True)
def debug_task(self):
    print(f"Request: {self.request!r}")
