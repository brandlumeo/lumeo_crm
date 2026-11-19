"""SaaS (platform) admin: permissions, analytics, tenant actions, plans, impersonation, login hardening."""
from datetime import timedelta

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import User
from companies.models import Company, PlatformAuditLog, PlatformSettings
from subscriptions.models import Subscription


@pytest.fixture
def platform(db):
    acme = Company.objects.create(
        name="Acme Retail", status="active", currency="INR",
        stripe_secret_key="sk_live_SECRET", razorpay_key_secret="rzp_SECRET", whatsapp_access_token="wa_SECRET",
    )
    trial = Company.objects.create(name="Trial Co", status="trial", trial_ends_at=timezone.now() + timedelta(days=5))
    Subscription.objects.update_or_create(company=acme, defaults={"plan": "pro", "billing_period": "yearly", "is_active": True})
    Subscription.objects.update_or_create(company=trial, defaults={"plan": "free", "is_active": True})
    root = User.objects.create_user(email="root@lumeo.test", username="root", password="Passw0rd!x", is_staff=True, is_superuser=True)
    staff_only = User.objects.create_user(email="staff@lumeo.test", username="staffonly", password="Passw0rd!x", is_staff=True, company=trial)
    owner = User.objects.create_user(email="owner@acme.test", username="owner", password="Passw0rd!x", company=acme, role="owner")
    member = User.objects.create_user(email="sam@acme.test", username="sam", password="Passw0rd!x", company=acme, role="staff")
    User.objects.filter(pk=owner.pk).update(last_login=timezone.now() - timedelta(days=1))
    admin = APIClient()
    admin.force_authenticate(root)
    return {"acme": acme, "trial": trial, "root": root, "staff_only": staff_only, "owner": owner, "member": member, "admin": admin}


def test_only_superusers_reach_saas_api(platform):
    for user in (platform["staff_only"], platform["owner"]):
        c = APIClient()
        c.force_authenticate(user)
        assert c.get("/api/v1/saas/stats/").status_code == 403
        assert c.get("/api/v1/saas/tenants/").status_code == 403
    assert APIClient().get("/api/v1/saas/tenants/").status_code in (401, 403)


def test_stats_mrr_and_no_secret_leak(platform):
    res = platform["admin"].get("/api/v1/saas/stats/")
    assert res.status_code == 200
    k = res.data["kpis"]
    # Pro yearly 13999 counts as 1166.58/month, not the monthly list price.
    assert k["mrr"] == round(13999 / 12, 2)
    assert k["paying_tenants"] == 1 and k["total_tenants"] == 2 and k["trial_tenants"] == 1
    assert len(res.data["series"]) == 12
    assert any(t["name"] == "Trial Co" for t in res.data["expiring_trials"])
    body = (
        str(res.data)
        + str(platform["admin"].get("/api/v1/saas/tenants/").data)
        + str(platform["admin"].get(f"/api/v1/saas/tenants/{platform['acme'].id}/").data)
    )
    assert "SECRET" not in body


def test_tenant_list_filters_detail_and_export(platform):
    a = platform["admin"]
    data = a.get("/api/v1/saas/tenants/", {"search": "acme"}).data
    assert data["count"] == 1
    row = data["results"][0]
    assert row["plan"] == "pro" and row["users"] == 2 and row["owner"]["email"] == "owner@acme.test"
    assert 0 <= row["health"]["score"] <= 100
    assert a.get("/api/v1/saas/tenants/", {"status": "trial"}).data["count"] == 1
    detail = a.get(f"/api/v1/saas/tenants/{platform['acme'].id}/").data
    assert detail["limits"]["users"]["max"] == 20 and len(detail["team"]) == 2 and len(detail["activity"]) == 6
    csv = a.get("/api/v1/saas/tenants/export/")
    assert csv.status_code == 200 and b"Acme Retail" in csv.content


def test_tenant_actions_are_audited(platform):
    a, trial = platform["admin"], platform["trial"]
    assert a.post(f"/api/v1/saas/tenants/{trial.id}/extend-trial/", {"days": 10}, format="json").status_code == 200
    trial.refresh_from_db()
    assert trial.trial_ends_at > timezone.now() + timedelta(days=14)
    assert a.post(f"/api/v1/saas/tenants/{trial.id}/extend-trial/", {"days": 0}, format="json").status_code == 400
    res = a.post(f"/api/v1/saas/tenants/{trial.id}/change-plan/", {"plan": "starter", "billing_period": "monthly"}, format="json")
    assert res.data["plan"] == "starter"
    trial.refresh_from_db()
    assert trial.status == "active"
    assert a.post(f"/api/v1/saas/tenants/{trial.id}/suspend/", {"reason": "non-payment"}, format="json").data["status"] == "suspended"
    assert a.post("/api/v1/saas/tenants/bulk/", {"action": "reactivate", "ids": [str(trial.id)]}, format="json").data["updated"] == 1
    actions = set(PlatformAuditLog.objects.filter(company=trial).values_list("action", flat=True))
    assert {"tenant.extend-trial", "tenant.change-plan", "tenant.suspend", "tenant.reactivate"} <= actions
    assert a.get("/api/v1/saas/audit/", {"search": "non-payment"}).data["count"] == 1


def test_plan_overrides_change_prices_and_limits(platform):
    a = platform["admin"]
    assert a.patch("/api/v1/saas/billing/plans/", {"pro": {"price_yearly": 12000, "max_users": 25}}, format="json").status_code == 200
    billing = a.get("/api/v1/saas/billing/").data
    pro = next(p for p in billing["plans"] if p["key"] == "pro")
    assert pro["price_yearly"] == 12000 and pro["max_users"] == 25 and pro["customised"]
    assert pro["defaults"]["max_users"] == 20
    assert billing["summary"]["mrr"] == 1000.0
    assert Subscription.objects.get(company=platform["acme"]).plan_limits["max_users"] == 25
    assert a.patch("/api/v1/saas/billing/plans/", {"pro": {"max_users": -1}}, format="json").status_code == 400
    assert a.patch("/api/v1/saas/billing/plans/", {"pro": None}, format="json").status_code == 200
    assert PlatformSettings.get_settings().plan_overrides == {}


def test_user_admin_cannot_escalate(platform):
    a, member, root = platform["admin"], platform["member"], platform["root"]
    assert a.patch(f"/api/v1/saas/users/{member.id}/", {"is_superuser": True}, format="json").status_code == 400
    member.refresh_from_db()
    assert not member.is_superuser
    assert a.patch(f"/api/v1/saas/users/{root.id}/", {"is_active": False}, format="json").status_code == 400
    assert a.patch(f"/api/v1/saas/users/{member.id}/", {"is_active": False}, format="json").data["is_active"] is False
    assert a.get("/api/v1/saas/users/", {"search": "acme"}).data["count"] == 2


def test_impersonation_tokens_and_guards(platform):
    a, owner = platform["admin"], platform["owner"]
    res = a.post(f"/api/v1/saas/users/{owner.id}/impersonate/")
    assert res.status_code == 200 and res.data["company"]["name"] == "Acme Retail"
    as_owner = APIClient()
    as_owner.credentials(HTTP_AUTHORIZATION=f"Bearer {res.data['access']}")
    me = as_owner.get("/api/v1/accounts/me/")
    assert me.status_code == 200 and me.data["email"] == "owner@acme.test"
    # Refresh keeps the impersonated identity even with the admin's cookie present, and never resets that cookie.
    anon = APIClient()
    anon.cookies["lumeo_refresh"] = "admin-cookie-token"
    ref = anon.post("/api/v1/accounts/token/refresh/", {"refresh": res.data["refresh"]}, format="json")
    assert ref.status_code == 200 and "lumeo_refresh" not in ref.cookies
    assert a.post(f"/api/v1/saas/users/{platform['staff_only'].id}/impersonate/").status_code == 403
    assert a.post(f"/api/v1/saas/users/{platform['root'].id}/impersonate/").status_code == 400
    assert PlatformAuditLog.objects.filter(action="impersonation.start", target_user=owner).exists()
    assert a.post("/api/v1/saas/impersonation/end/", {"user_id": owner.id}, format="json").status_code == 200


def test_login_hides_account_details_and_records_last_login(platform):
    c = APIClient()
    bad = c.post("/api/v1/accounts/token/", {"username": "owner@acme.test", "password": "wrong"}, format="json")
    missing = c.post("/api/v1/accounts/token/", {"username": "nobody@x.test", "password": "wrong"}, format="json")
    assert bad.status_code == missing.status_code == 401
    assert bad.data["detail"] == missing.data["detail"] and "DEBUG" not in bad.data["detail"]
    ok = c.post("/api/v1/accounts/token/", {"username": "sam", "password": "Passw0rd!x"}, format="json")
    assert ok.status_code == 200
    platform["member"].refresh_from_db()
    assert platform["member"].last_login is not None


def test_owner_preferred_and_expired_plans_not_counted(platform):
    from crm.saas_metrics import tenant_rows
    acme = platform["acme"]
    User.objects.create_user(email="early-admin@acme.test", username="earlyadmin", password="Passw0rd!x", company=acme, role="admin")
    User.objects.filter(email="early-admin@acme.test").update(date_joined=timezone.now() - timedelta(days=400))
    assert tenant_rows([acme])[0]["owner"]["email"] == "owner@acme.test"
    Subscription.objects.filter(company=acme).update(expires_at=timezone.now() - timedelta(days=1))
    stats = platform["admin"].get("/api/v1/saas/stats/").data
    assert next(p for p in stats["plan_mix"] if p["plan"] == "pro")["tenants"] == 0
    assert stats["kpis"]["mrr"] == 0
    assert tenant_rows([acme])[0]["subscription_expired"] is True
