"""Platform automation: email verification, AI kill switch, impersonation trail, lifecycle, revenue snapshots."""
from datetime import timedelta

import pytest
from django.core import mail
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import User
from companies.models import Company, LifecycleEvent, PlatformAuditLog, PlatformSettings, RevenueSnapshot
from subscriptions.models import Subscription


@pytest.fixture(autouse=True)
def _no_throttling(monkeypatch):
    """These tests hit login/sign-up many times; rate limits are covered elsewhere."""
    from rest_framework import throttling
    monkeypatch.setattr(throttling.SimpleRateThrottle, "allow_request", lambda self, request, view: True)


@pytest.fixture
def root(db):
    user = User.objects.create_user(email="root@lumeo.test", username="root", password="Passw0rd!x", is_staff=True, is_superuser=True)
    c = APIClient()
    c.force_authenticate(user)
    return user, c


def _settings(**kw):
    ps = PlatformSettings.get_settings()
    for k, v in kw.items():
        setattr(ps, k, v)
    ps.save()
    return ps


def test_email_verification_flow(db):
    _settings(require_email_verification=True)
    c = APIClient()
    res = c.post("/api/v1/accounts/register/", {
        "email": "new@shop.test", "password": "Str0ng!Passw0rd", "first_name": "Nia", "last_name": "Shop", "company_name": "Nia Shop",
    }, format="json")
    assert res.status_code == 200
    user = User.objects.get(email="new@shop.test")
    assert user.email_verified is False
    assert any("Confirm your email" in m.subject for m in mail.outbox)

    blocked = c.post("/api/v1/accounts/token/", {"username": "new@shop.test", "password": "Str0ng!Passw0rd"}, format="json")
    assert blocked.status_code == 403 and blocked.data["code"] == "email_unverified"

    link = next(m for m in mail.outbox if "Confirm your email" in m.subject).body
    token = link.split("verify-email?token=")[1].split()[0]
    assert c.post("/api/v1/accounts/verify-email/", {"token": "nope"}, format="json").status_code == 400
    ok = c.post("/api/v1/accounts/verify-email/", {"token": token}, format="json")
    assert ok.status_code == 200 and ok.data["access"]
    user.refresh_from_db()
    assert user.email_verified
    assert c.post("/api/v1/accounts/token/", {"username": "new@shop.test", "password": "Str0ng!Passw0rd"}, format="json").status_code == 200

    # Resend never reveals whether the account exists
    a = c.post("/api/v1/accounts/verify-email/resend/", {"email": "nobody@x.test"}, format="json")
    b = c.post("/api/v1/accounts/verify-email/resend/", {"email": "new@shop.test"}, format="json")
    assert a.status_code == b.status_code == 200 and a.data == b.data


def test_unverified_user_can_sign_in_when_verification_is_turned_off(db):
    company = Company.objects.create(name="Old Co")
    User.objects.create_user(email="u@old.test", username="uold", password="Passw0rd!x", company=company, role="owner", email_verified=False)
    _settings(require_email_verification=False)
    assert APIClient().post("/api/v1/accounts/token/", {"username": "uold", "password": "Passw0rd!x"}, format="json").status_code == 200


def test_signups_closed(db):
    _settings(allow_new_registrations=False)
    res = APIClient().post("/api/v1/accounts/register/", {"email": "x@y.test", "password": "Str0ng!Passw0rd", "first_name": "a", "last_name": "b", "company_name": "c"}, format="json")
    assert res.status_code == 403


def test_ai_kill_switch_and_flags(db):
    company = Company.objects.create(name="AI Co")
    user = User.objects.create_user(email="ai@co.test", username="ai", password="Passw0rd!x", company=company, role="owner")
    c = APIClient()
    c.force_authenticate(user)
    _settings(enable_ai_features=False)
    assert APIClient().get("/api/v1/accounts/platform-flags/").data["ai_enabled"] is False
    for path in ("/api/v1/crm/ai-chat/", "/api/v1/crm/ai/assistant/", "/api/v1/crm/ai-email-draft/"):
        res = c.post(path, {"message": "hi"}, format="json")
        assert res.status_code == 403 and res.json()["code"] == "ai_disabled", path
    _settings(enable_ai_features=True)
    assert c.post("/api/v1/crm/ai-chat/", {"message": "hi"}, format="json").status_code != 403


def test_impersonation_writes_are_logged(root):
    admin, a = root
    company = Company.objects.create(name="Imp Co")
    owner = User.objects.create_user(email="o@imp.test", username="oimp", password="Passw0rd!x", company=company, role="owner")
    tokens = a.post(f"/api/v1/saas/users/{owner.id}/impersonate/").data
    as_owner = APIClient()
    as_owner.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
    res = as_owner.post("/api/v1/crm/leads/", {"name": "Lead from support", "email": "l@x.test"}, format="json")
    entry = PlatformAuditLog.objects.filter(action="impersonation.action", target_user=owner).latest("id")
    assert entry.actor_id == admin.id and "/api/v1/crm/leads/" in entry.summary and str(res.status_code) in entry.summary
    # Normal (non-impersonated) writes are not logged
    normal = APIClient()
    normal.force_authenticate(owner)
    before = PlatformAuditLog.objects.count()
    normal.post("/api/v1/crm/leads/", {"name": "Own lead", "email": "o@x.test"}, format="json")
    assert PlatformAuditLog.objects.count() == before


def test_lifecycle_reminders_dedupe_and_auto_suspend(root):
    admin, a = root
    now = timezone.now()
    soon = Company.objects.create(name="Soon Co", status="trial", trial_ends_at=now + timedelta(days=3))
    ended = Company.objects.create(name="Ended Co", status="trial", trial_ends_at=now - timedelta(days=10))
    ancient = Company.objects.create(name="Ancient Co", status="trial", trial_ends_at=now - timedelta(days=120))
    paid = Company.objects.create(name="Paid Co", status="active")
    for co, email in ((soon, "s@soon.test"), (ended, "e@ended.test"), (ancient, "a@anc.test"), (paid, "p@paid.test")):
        User.objects.create_user(email=email, username=email, password="Passw0rd!x", company=co, role="owner")
    Subscription.objects.update_or_create(company=paid, defaults={"plan": "starter", "is_active": True, "expires_at": now + timedelta(days=7)})

    # Emails off by default: nothing is sent
    res = a.post("/api/v1/saas/lifecycle/run/")
    assert res.status_code == 200 and res.data["emails"] == 0

    _settings(lifecycle_emails_enabled=True, auto_suspend_enabled=True, suspend_grace_days=7)
    mail.outbox.clear()
    res = a.post("/api/v1/saas/lifecycle/run/").data
    subjects = [m.subject for m in mail.outbox]
    assert any("trial ends in 3 days" in s for s in subjects)
    assert any("trial has ended" in s for s in subjects)
    assert any("renews in 7 days" in s for s in subjects)
    assert not any("a@anc.test" in m.to for m in mail.outbox)  # ended long ago: no email
    ended.refresh_from_db()
    ancient.refresh_from_db()
    soon.refresh_from_db()
    assert ended.status == "suspended" and ancient.status == "suspended" and soon.status == "trial"
    assert PlatformAuditLog.objects.filter(action="tenant.auto-suspend", company=ended, actor_email="system").exists()

    # Running again sends nothing new
    mail.outbox.clear()
    a.post("/api/v1/saas/lifecycle/run/")
    assert len(mail.outbox) == 0
    assert LifecycleEvent.objects.filter(company=soon, kind="trial_3d").count() == 1


def test_revenue_snapshots_and_movements(root):
    admin, a = root
    from subscriptions.lifecycle import revenue_movements, take_snapshot
    grow = Company.objects.create(name="Grow Co", status="active")
    churn = Company.objects.create(name="Churn Co", status="active")
    trial = Company.objects.create(name="Trial Co", status="trial")
    Subscription.objects.update_or_create(company=grow, defaults={"plan": "starter", "is_active": True})
    Subscription.objects.update_or_create(company=churn, defaults={"plan": "starter", "is_active": True})
    Subscription.objects.update_or_create(company=trial, defaults={"plan": "free", "is_active": True})
    past = timezone.localdate() - timedelta(days=30)
    take_snapshot(past)

    Subscription.objects.filter(company=grow).update(plan="pro")
    Subscription.objects.filter(company=churn).update(is_active=False)
    Subscription.objects.filter(company=trial).update(plan="starter")
    take_snapshot()
    m = revenue_movements(30)
    assert m["expansion"] == 1199 - 599 and m["expansion_count"] == 1
    assert m["churned"] == 599 and m["churned_tenants"][0]["name"] == "Churn Co"
    assert m["new"] == 599 and m["trials_converted"] == 1 and m["trial_conversion"] == 100.0
    assert m["net"] == m["new"] + m["expansion"] - m["churned"]
    assert RevenueSnapshot.objects.count() == 2

    stats = a.get("/api/v1/saas/stats/").data
    assert stats["movements"]["churned"] == 599 and len(stats["mrr_history"]) == 2
    assert "lifecycle" in stats and isinstance(stats["win_back"], list)


def test_refresh_slides_the_session_and_rejects_inactive_users(root):
    from rest_framework_simplejwt.tokens import RefreshToken
    admin, a = root
    company = Company.objects.create(name="Stay Co")
    user = User.objects.create_user(email="stay@co.test", username="stay", password="Passw0rd!x", company=company, role="owner")
    c = APIClient()
    first = c.post("/api/v1/accounts/token/", {"username": "stay", "password": "Passw0rd!x"}, format="json").data["refresh"]
    old = RefreshToken(first)
    res = c.post("/api/v1/accounts/token/refresh/", {"refresh": first}, format="json")
    assert res.status_code == 200
    new = RefreshToken(res.data["refresh"])
    assert new["jti"] != old["jti"] and new["exp"] >= old["exp"]
    assert new["username"] == "stay"  # custom claims kept

    # Impersonation tokens keep their fixed expiry
    imp = a.post(f"/api/v1/saas/users/{user.id}/impersonate/").data["refresh"]
    imp_res = c.post("/api/v1/accounts/token/refresh/", {"refresh": imp}, format="json")
    assert RefreshToken(imp_res.data["refresh"])["exp"] == RefreshToken(imp)["exp"]

    User.objects.filter(pk=user.pk).update(is_active=False)
    assert c.post("/api/v1/accounts/token/refresh/", {"refresh": res.data["refresh"]}, format="json").status_code == 401
