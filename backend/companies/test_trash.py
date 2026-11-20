"""Admin Trash: deletes from the Django admin are snapshotted and restorable."""
import pytest
from django.test import Client

from accounts.models import User
from companies.models import Company, TrashedItem
from companies.trash import RestoreError, restore
from crm.models import Lead


@pytest.fixture
def admin_client(db, settings):
    settings.STORAGES = {**settings.STORAGES, "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"}}
    root = User.objects.create_superuser(email="root@trash.test", username="root", password="Passw0rd!x")
    c = Client()
    c.force_login(root)
    return root, c


def test_bulk_delete_goes_to_trash_and_restores(admin_client):
    root, c = admin_client
    company = Company.objects.create(name="Trash Co")
    owner = User.objects.create_user(email="o@trash.test", username="otrash", password="Passw0rd!x", company=company, role="owner")
    leads = [Lead.objects.create(company=company, name=f"Lead {i}", email=f"l{i}@x.test") for i in range(3)]
    ids = [l.pk for l in leads]

    res = c.post("/admin/crm/lead/", {"action": "delete_selected", "_selected_action": ids, "post": "yes"})
    assert res.status_code == 302
    assert not Lead.objects.filter(pk__in=ids).exists()
    item = TrashedItem.objects.get()
    assert item.object_count == 3 and item.deleted_by == root and item.model_label == "crm.Lead"

    restore(item)
    assert Lead.objects.filter(pk__in=ids, company=company).count() == 3
    item.refresh_from_db()
    assert item.restored_at
    with pytest.raises(RestoreError):
        restore(item)


def test_cascade_delete_restores_children_and_admin_action(admin_client):
    root, c = admin_client
    company = Company.objects.create(name="Cascade Co")
    owner = User.objects.create_user(email="o@cas.test", username="ocas", password="Passw0rd!x", company=company, role="owner")
    lead = Lead.objects.create(company=company, name="Kept lead", email="k@x.test")

    res = c.post(f"/admin/companies/company/{company.pk}/delete/", {"post": "yes"})
    assert res.status_code == 302
    assert not Company.objects.filter(pk=company.pk).exists()
    item = TrashedItem.objects.get(model_label="companies.Company")
    assert item.item_count > 1

    res = c.post("/admin/companies/trasheditem/", {"action": "restore_selected", "_selected_action": [item.pk]})
    assert res.status_code == 302
    assert Company.objects.filter(pk=company.pk).exists()
    assert Lead.objects.filter(pk=lead.pk, company_id=company.pk).exists()
    assert User.objects.get(pk=owner.pk).company_id == company.pk

    # Trash list and detail pages render
    assert c.get("/admin/companies/trasheditem/").status_code == 200
    assert c.get(f"/admin/companies/trasheditem/{item.pk}/change/").status_code == 200


def test_restore_refuses_when_record_exists_again(admin_client):
    root, c = admin_client
    company = Company.objects.create(name="Dup Co")
    lead = Lead.objects.create(company=company, name="Dup", email="d@x.test")
    c.post(f"/admin/crm/lead/{lead.pk}/delete/", {"post": "yes"})
    item = TrashedItem.objects.get()
    Lead.objects.create(pk=lead.pk, company=company, name="Recreated", email="r@x.test")
    with pytest.raises(RestoreError):
        restore(item)
