import logging

from celery import shared_task

from .workflows import process_due_workflow_steps

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def process_due_workflow_steps_task(self, limit=100):
    try:
        processed = process_due_workflow_steps(limit=limit)
        logger.info("process_due_workflow_steps_task processed %d step run(s)", processed)
        return {"processed": processed}
    except Exception as exc:
        logger.exception("process_due_workflow_steps_task failed: %s", exc)
        raise self.retry(exc=exc)
