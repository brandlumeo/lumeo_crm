#!/usr/bin/env python
"""
Lumeo CRM — Celery Worker & Beat Startup Guide
================================================

This file documents how to start Celery for local development.
In production, these are managed by Docker / Supervisor (Step J).

Prerequisites
-------------
- Redis must be running: redis-server  (or via Docker: docker run -p 6379:6379 redis)
- Virtualenv activated with all requirements installed
- Working directory: backend/

Commands
--------

1. Start the Celery worker (processes background tasks):
   celery -A config worker --loglevel=info --concurrency=2

2. Start Celery beat (fires scheduled / periodic tasks):
   celery -A config beat --loglevel=info --scheduler django_celery_beat.schedulers:DatabaseScheduler

   NOTE: For simple local dev without a DB scheduler, use:
   celery -A config beat --loglevel=info

3. Start Flower monitoring dashboard (optional):
   pip install flower
   celery -A config flower --port=5555

Configured Beat Schedule
------------------------
- check-expiring-subscriptions  → daily 08:00 UTC
  Task: subscriptions.tasks.check_expiring_subscriptions

- send-daily-digest             → weekdays 09:00 UTC
  Task: notifications.tasks.send_daily_digest

Available Tasks
---------------
subscriptions.tasks:
  - check_expiring_subscriptions()   [scheduled]
  - send_subscription_upgraded_notification(company_id, new_plan)  [event-driven]

notifications.tasks:
  - send_daily_digest()              [scheduled]
  - notify_lead_assigned(lead_id, assigned_to_id)  [event-driven]
  - notify_deal_won(deal_id)         [event-driven]

Testing a Task Manually
-----------------------
In a Django shell (python manage.py shell):

  from notifications.tasks import notify_deal_won
  result = notify_deal_won.delay(deal_id=1)
  print(result.status)

  # Or call synchronously (no worker needed):
  notify_deal_won.apply(args=[1])

Redis Connection
----------------
Default: redis://127.0.0.1:6379/1
Override in backend/.env:
  REDIS_URL=redis://127.0.0.1:6379/1
  CELERY_BROKER_URL=redis://127.0.0.1:6379/1
  CELERY_RESULT_BACKEND=redis://127.0.0.1:6379/1
"""
