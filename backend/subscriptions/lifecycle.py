"""Customer lifecycle automation and revenue history for the SaaS platform.

run_daily() is idempotent and safe to call many times a day. It is triggered by the
cron URL (notifications TriggerCronTasksView) and, as a fallback, the first time the
SaaS admin dashboard loads each day.

- Revenue snapshot: one RevenueSnapshot per day (platform MRR + every tenant's MRR/plan).
- Lifecycle emails (when enabled): trial ending in 7/3/1 days, trial ended,
  paid plan renewing in 7/1 days, paid plan expired. Each is sent once (LifecycleEvent).
- Auto-suspend (when enabled): workspaces whose trial or paid plan ended more than
  `suspend_grace_days` ago are suspended and the action is written to the audit log.
"""
import logging
from datetime import timedelta
from decimal import Decimal

from django.conf import settings as dj_settings
from django.db import IntegrityError, transaction
from django.utils import timezone

logger = logging.getLogger(__name__)

TRIAL_REMINDER_DAYS = (7, 3, 1)
RENEWAL_REMINDER_DAYS = (7, 1)
RECENT_END_DAYS = 14  # "ended/expired" emails only for endings within this window


# ── Revenue snapshots ─────────────────────────────────────────────────────────

def take_snapshot(day=None):
    """Create or refresh today's snapshot."""
    from accounts.models import User
    from companies.models import Company, RevenueSnapshot
    from crm.saas_metrics import ensure_subscriptions, subscription_mrr
    from subscriptions.models import Subscription, get_plan_catalog

    day = day or timezone.localdate()
    ensure_subscriptions()
    catalog = get_plan_catalog()
    status_by_company = dict(Company.objects.values_list("id", "status"))
    tenants = {}
    total = Decimal("0")
    paying = 0
    for sub in Subscription.objects.all():
        mrr = round(subscription_mrr(sub, catalog), 2)
        tenants[str(sub.company_id)] = {"mrr": mrr, "plan": sub.plan, "status": status_by_company.get(sub.company_id, "")}
        total += Decimal(str(mrr))
        paying += 1 if mrr > 0 else 0
    snap, _ = RevenueSnapshot.objects.update_or_create(
        date=day,
        defaults={
            "mrr": total,
            "paying_tenants": paying,
            "total_tenants": len(status_by_company),
            "total_users": User.objects.count(),
            "tenants": tenants,
        },
    )
    return snap


def revenue_movements(days=30):
    """New / expansion / contraction / churned MRR between the snapshot `days` ago (or the oldest) and today."""
    from companies.models import Company, RevenueSnapshot

    latest = RevenueSnapshot.objects.order_by("-date").first()
    if latest is None:
        return None
    start_day = latest.date - timedelta(days=days)
    base = RevenueSnapshot.objects.filter(date__lte=start_day).order_by("-date").first() or RevenueSnapshot.objects.order_by("date").first()
    names = {str(k): v for k, v in Company.objects.values_list("id", "name")}
    result = {
        "from": base.date, "to": latest.date, "days": (latest.date - base.date).days,
        "start_mrr": float(base.mrr), "end_mrr": float(latest.mrr),
        "new": 0.0, "expansion": 0.0, "contraction": 0.0, "churned": 0.0,
        "new_count": 0, "expansion_count": 0, "contraction_count": 0, "churned_count": 0,
        "trials_converted": 0, "trials_at_start": 0, "churned_tenants": [],
    }
    before, after = base.tenants or {}, latest.tenants or {}
    for cid in set(before) | set(after):
        a = float((before.get(cid) or {}).get("mrr", 0) or 0)
        b = float((after.get(cid) or {}).get("mrr", 0) or 0)
        if (before.get(cid) or {}).get("plan") == "free":
            result["trials_at_start"] += 1
            if b > 0:
                result["trials_converted"] += 1
        if a == 0 and b > 0:
            result["new"] += b
            result["new_count"] += 1
        elif a > 0 and b == 0:
            result["churned"] += a
            result["churned_count"] += 1
            result["churned_tenants"].append({"id": cid, "name": names.get(cid, "Deleted workspace"), "mrr": a})
        elif b > a:
            result["expansion"] += b - a
            result["expansion_count"] += 1
        elif b < a:
            result["contraction"] += a - b
            result["contraction_count"] += 1
    for k in ("new", "expansion", "contraction", "churned"):
        result[k] = round(result[k], 2)
    result["net"] = round(result["new"] + result["expansion"] - result["contraction"] - result["churned"], 2)
    result["churn_rate"] = round(result["churned"] * 100 / result["start_mrr"], 1) if result["start_mrr"] else None
    result["trial_conversion"] = round(result["trials_converted"] * 100 / result["trials_at_start"], 1) if result["trials_at_start"] else None
    return result


def snapshot_history(days=90):
    from companies.models import RevenueSnapshot

    since = timezone.localdate() - timedelta(days=days)
    return [
        {"date": s.date.isoformat(), "mrr": float(s.mrr), "paying": s.paying_tenants, "tenants": s.total_tenants}
        for s in RevenueSnapshot.objects.filter(date__gte=since).order_by("date")
    ]


# ── Lifecycle emails & auto-suspend ───────────────────────────────────────────

def _recipients(company):
    from accounts.models import User

    users = User.objects.filter(company=company, is_active=True, role__in=("owner", "admin")).exclude(email="")
    return [u for u in users]


def _record(company, kind, key, detail=""):
    """True if this event is new (and is now recorded), False if it already happened."""
    from companies.models import LifecycleEvent

    try:
        with transaction.atomic():
            LifecycleEvent.objects.create(company=company, kind=kind, key=key, detail=detail[:255])
        return True
    except IntegrityError:
        return False


def _send(company, subject, heading, paragraphs, action_text="Choose a plan"):
    from accounts.emails import build_premium_email

    frontend = getattr(dj_settings, "FRONTEND_URL", "").rstrip("/")
    billing_url = f"{frontend}/billing" if frontend else None
    sent = 0
    for user in _recipients(company):
        name = user.first_name or user.username
        body_text = f"Hi {name},\n\n" + "\n\n".join(paragraphs) + (f"\n\n{action_text}: {billing_url}" if billing_url else "") + "\n\n— The Lumeo team"
        body_html = f"<p>Hi <strong>{name}</strong>,</p>" + "".join(f"<p>{p}</p>" for p in paragraphs)
        try:
            build_premium_email(
                subject=subject, heading=heading, body_text=body_text, body_html=body_html,
                pre_header="ACCOUNT", action_url=billing_url, action_text=action_text, to_email=user.email,
            ).send(fail_silently=False)
            sent += 1
        except Exception as exc:  # one bad address must not stop the run
            logger.warning("Lifecycle email to %s failed: %s", user.email, exc)
    return sent


def _system_audit(action, summary, company, **details):
    from companies.models import PlatformAuditLog

    PlatformAuditLog.objects.create(actor=None, actor_email="system", action=action, company=company, summary=summary[:500], details=details)


def run_lifecycle(now=None, force_emails=None):
    """Send due reminders and apply auto-suspend. Returns a summary dict."""
    from companies.models import Company, PlatformSettings
    from subscriptions.models import Plan, Subscription

    now = now or timezone.now()
    today = timezone.localdate(now)
    ps = PlatformSettings.get_settings()
    emails_on = ps.lifecycle_emails_enabled if force_emails is None else force_emails
    grace = timedelta(days=ps.suspend_grace_days or 0)
    summary = {"emails": 0, "reminders": [], "suspended": [], "emails_enabled": emails_on, "auto_suspend_enabled": ps.auto_suspend_enabled}

    def remind(company, kind, key, subject, heading, paragraphs, action_text="Choose a plan"):
        if not emails_on or not _record(company, kind, key, subject):
            return
        n = _send(company, subject, heading, paragraphs, action_text)
        summary["emails"] += n
        summary["reminders"].append({"company": company.name, "kind": kind, "emails": n})

    # Trials
    for company in Company.objects.filter(status=Company.Status.TRIAL, trial_ends_at__isnull=False):
        end_day = timezone.localdate(company.trial_ends_at)
        days_left = (end_day - today).days
        key = end_day.isoformat()
        if days_left in TRIAL_REMINDER_DAYS:
            remind(company, f"trial_{days_left}d", key,
                   f"Your Lumeo trial ends in {days_left} day{'s' if days_left != 1 else ''}",
                   "Your trial is ending soon",
                   [f"Your free trial of Lumeo for <strong>{company.name}</strong> ends on {end_day:%d %B %Y}.",
                    "Choose a plan to keep your leads, deals, invoices and team exactly as they are."])
        elif days_left < 0:
            if days_left >= -RECENT_END_DAYS:  # don't email workspaces whose trial ended long ago
                remind(company, "trial_ended", key, "Your Lumeo trial has ended", "Your trial has ended",
                       [f"The free trial for <strong>{company.name}</strong> ended on {end_day:%d %B %Y}.",
                        "Your data is safe. Pick a plan to continue where you left off."])
            if ps.auto_suspend_enabled and company.trial_ends_at + grace < now:
                sub = Subscription.objects.filter(company=company).first()
                if not (sub and sub.plan != Plan.FREE and sub.is_active and not sub.is_expired):
                    company.status = Company.Status.SUSPENDED
                    company.save(update_fields=["status", "updated_at"])
                    if sub:
                        sub.is_active = False
                        sub.save(update_fields=["is_active", "updated_at"])
                    _system_audit("tenant.auto-suspend", f"Auto-suspended {company.name}: trial ended {end_day:%d %b %Y}", company, reason="trial_ended", grace_days=ps.suspend_grace_days)
                    summary["suspended"].append(company.name)

    # Paid plans
    for sub in Subscription.objects.select_related("company").filter(is_active=True, expires_at__isnull=False).exclude(plan=Plan.FREE):
        company = sub.company
        if company.status == Company.Status.SUSPENDED:
            continue
        end_day = timezone.localdate(sub.expires_at)
        days_left = (end_day - today).days
        key = end_day.isoformat()
        if days_left in RENEWAL_REMINDER_DAYS:
            remind(company, f"renewal_{days_left}d", key,
                   f"Your {sub.get_plan_display()} plan renews in {days_left} day{'s' if days_left != 1 else ''}",
                   "Your plan is about to end",
                   [f"The {sub.get_plan_display()} plan for <strong>{company.name}</strong> is paid until {end_day:%d %B %Y}.",
                    "Renew now to avoid any interruption for your team."], action_text="Renew plan")
        elif days_left < 0:
            if days_left >= -RECENT_END_DAYS:
                remind(company, "plan_expired", key, f"Your {sub.get_plan_display()} plan has expired", "Your plan has expired",
                       [f"The {sub.get_plan_display()} plan for <strong>{company.name}</strong> expired on {end_day:%d %B %Y}.",
                        "Renew to keep full access for your team. Your data is safe."], action_text="Renew plan")
            if ps.auto_suspend_enabled and sub.expires_at + grace < now:
                sub.is_active = False
                sub.save(update_fields=["is_active", "updated_at"])
                company.status = Company.Status.SUSPENDED
                company.save(update_fields=["status", "updated_at"])
                _system_audit("tenant.auto-suspend", f"Auto-suspended {company.name}: {sub.get_plan_display()} plan expired {end_day:%d %b %Y}", company, reason="plan_expired", grace_days=ps.suspend_grace_days)
                summary["suspended"].append(company.name)

    ps.lifecycle_last_run = now
    ps.save(update_fields=["lifecycle_last_run", "updated_at"])
    return summary


def run_daily(force=False):
    """Snapshot + lifecycle, at most once per day unless forced."""
    from companies.models import PlatformSettings

    ps = PlatformSettings.get_settings()
    take_snapshot()
    try:
        from companies.trash import purge_expired
        purge_expired()
    except Exception:
        logger.exception("Trash purge failed")
    if not force and ps.lifecycle_last_run and timezone.localdate(ps.lifecycle_last_run) == timezone.localdate():
        return None
    try:
        return run_lifecycle()
    except Exception:
        logger.exception("Lifecycle run failed")
        return None
