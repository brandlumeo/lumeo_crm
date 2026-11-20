"""Admin Trash: anything deleted from the Django admin is snapshotted first and can be restored.

Deletes made through the admin (the delete button and the "Delete selected" action) are
intercepted for every registered model. Before Django deletes, we collect exactly what it
would remove (the objects plus every cascaded row) and store it as a TrashedItem. Restoring
re-inserts those rows with their original IDs, parents first, and re-links rows whose
foreign key the delete had set to NULL.
"""
import json
import logging
from datetime import timedelta

from django.apps import apps
from django.contrib import admin, messages
from django.core import serializers
from django.db import router, transaction
from django.db.models.deletion import Collector
from django.utils import timezone

logger = logging.getLogger(__name__)


def _collect(objs):
    using = router.db_for_write(objs[0].__class__, instance=objs[0])
    collector = Collector(using=using, origin=objs)
    collector.collect(objs)
    collector.sort()
    rows = []
    # collector.data is in delete order (dependents first); reverse it so parents come first.
    for model, instances in reversed(list(collector.data.items())):
        rows.extend(sorted(instances, key=lambda o: str(o.pk)))
    # Fast deletes are leaf rows (no further cascades): restore them last.
    for qs in collector.fast_deletes:
        rows.extend(list(qs))
    relinks = []
    for (field, _value), instance_lists in collector.field_updates.items():
        for instances in instance_lists:
            for obj in instances:
                relinks.append({
                    "model": obj._meta.label_lower,
                    "pk": obj.pk,
                    "field": field.attname,
                    "value": getattr(obj, field.attname),
                })
    return rows, relinks


def snapshot(objs, user=None):
    """Store what deleting `objs` would remove. Never blocks the delete if snapshotting fails."""
    from companies.models import TrashedItem

    objs = [o for o in objs if o.pk is not None]
    if not objs:
        return None
    try:
        rows, relinks = _collect(objs)
        payload = json.loads(serializers.serialize("json", rows))
        first = objs[0]
        label = str(first) if len(objs) == 1 else f"{len(objs)} {first._meta.verbose_name_plural}"
        return TrashedItem.objects.create(
            model_label=first._meta.label,
            object_repr=label[:300],
            object_count=len(objs),
            item_count=len(payload),
            payload=payload,
            relinks=relinks,
            deleted_by=user if getattr(user, "is_authenticated", False) else None,
        )
    except Exception:
        logger.exception("Couldn't snapshot %s for the trash", objs[0]._meta.label)
        return None


class RestoreError(Exception):
    pass


def restore(item):
    """Re-insert a trash item's rows. All-or-nothing; raises RestoreError with a readable reason."""
    if item.restored_at:
        raise RestoreError("Already restored.")
    taken = []
    for row in item.payload:
        try:
            model = apps.get_model(row["model"])
        except LookupError:
            raise RestoreError(f"{row['model']} no longer exists.")
        if model._default_manager.filter(pk=row["pk"]).exists():
            taken.append(f"{model._meta.verbose_name} #{row['pk']}")
    if taken:
        raise RestoreError("These records already exist again: " + ", ".join(taken[:5]))
    try:
        with transaction.atomic():
            for obj in serializers.deserialize("json", json.dumps(item.payload)):
                obj.save(save_m2m=False)
            for link in item.relinks:
                try:
                    model = apps.get_model(link["model"])
                except LookupError:
                    continue
                model._default_manager.filter(pk=link["pk"], **{f"{link['field']}__isnull": True}).update(
                    **{link["field"]: link["value"]}
                )
            item.restored_at = timezone.now()
            item.save(update_fields=["restored_at"])
    except RestoreError:
        raise
    except Exception as exc:
        raise RestoreError(f"Couldn't restore: {exc}")


def purge_expired():
    from companies.models import TrashedItem

    cutoff = timezone.now() - timedelta(days=TrashedItem.TRASH_DAYS)
    deleted, _ = TrashedItem.objects.filter(deleted_at__lt=cutoff).delete()
    return deleted


# ── Admin integration ────────────────────────────────────────────────────────

_original_delete_model = admin.ModelAdmin.delete_model
_original_delete_queryset = admin.ModelAdmin.delete_queryset


def _skip(modeladmin):
    from companies.models import TrashedItem
    return modeladmin.model is TrashedItem


def _delete_model(self, request, obj):
    if not _skip(self) and snapshot([obj], request.user):
        messages.info(request, "Moved to Trash: you can restore it from Companies › Trash for 30 days.")
    return _original_delete_model(self, request, obj)


def _delete_queryset(self, request, queryset):
    if not _skip(self):
        objs = list(queryset)
        if objs and snapshot(objs, request.user):
            messages.info(request, "Moved to Trash: you can restore them from Companies › Trash for 30 days.")
    return _original_delete_queryset(self, request, queryset)


def install():
    """Route every admin delete through the trash. Called from CompaniesConfig.ready()."""
    if getattr(admin.ModelAdmin, "_lumeo_trash_installed", False):
        return
    admin.ModelAdmin.delete_model = _delete_model
    admin.ModelAdmin.delete_queryset = _delete_queryset
    admin.ModelAdmin._lumeo_trash_installed = True
