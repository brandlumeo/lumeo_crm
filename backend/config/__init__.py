# This makes the Celery app available as `from config import celery_app`
# and ensures it's loaded whenever Django starts (required for @shared_task).
from .celery import app as celery_app

__all__ = ("celery_app",)
