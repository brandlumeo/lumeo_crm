"""Metrics for the SaaS (platform) admin: MRR, tenant usage and health.

Everything is computed with a handful of grouped queries so the tenant list
stays fast; tenant counts are small (hundreds), so ranking/filtering by health
happens in Python.
"""
from collections import defaultdict
from datetime import timedelta

from django.db.models import Count, Max, Q
from django.utils import timezone

from accounts.models import User
from companies.models import Company
from subscriptions.models import Plan, Subscription, get_plan_catalog, monthly_value

USAGE_MODELS = ("leads", "deals", "customers", "invoices", "quotes")


def _usage_models():
    from .models import Customer, Deal, Invoice, Lead, Quote
    return {"leads": Lead, "deals": Deal, "customers": Customer, "invoices": Invoice, "quotes": Quote}


def ensure_subscriptions():
    """Every company gets a Subscription row (older tenants pre-date the billing module)."""
    for comp in Company.objects.filter(subscription__isnull=True):
        Subscription.objects.get_or_create(
            company=comp,
            defaults={"plan": Plan.STARTER if comp.status == "active" else Plan.FREE, "is_active": comp.status != "suspended"},
        )


def subscription_mrr(sub, catalog):
    if sub is None or not sub.is_active or sub.plan == Plan.FREE or sub.is_expired:
        return 0.0
    return monthly_value(sub.plan, sub.billing_period, catalog)


def health(last_active, active_users, max_users, recent_records, sub, company):
    """0–100 score + label from recency, adoption, usage and subscription state."""
    now = timezone.now()
    score = 0
    if last_active:
        days = (now - last_active).days
        score += 40 if days <= 3 else 30 if days <= 7 else 20 if days <= 14 else 10 if days <= 30 else 0
    if max_users:
        score += round(min(active_users / max_users, 1) * 20)
    score += min(recent_records, 50) * 25 // 50
    if company.status == "suspended" or (sub and not sub.is_active):
        state = 0
    elif sub and sub.plan != Plan.FREE and not sub.is_expired:
        state = 15
    elif company.status == "trial" and (company.trial_ends_at is None or company.trial_ends_at >= now):
        state = 10
    else:
        state = 0
    score += state
    label = "healthy" if score >= 70 else "attention" if score >= 40 else "at_risk"
    return {"score": int(score), "label": label}


def tenant_rows(companies):
    """Usage, revenue and health for each company (list of dicts, same order)."""
    companies = list(companies)
    ids = [c.id for c in companies]
    if not ids:
        return []
    now = timezone.now()
    d30 = now - timedelta(days=30)
    catalog = get_plan_catalog()

    users = {
        r["company"]: r
        for r in User.objects.filter(company_id__in=ids).values("company").annotate(
            total=Count("id"),
            active=Count("id", filter=Q(is_active=True)),
            active_30d=Count("id", filter=Q(is_active=True, last_login__gte=d30)),
            last_active=Max("last_login"),
        )
    }
    usage = defaultdict(dict)
    recent = defaultdict(int)
    last_record = {}
    for key, Model in _usage_models().items():
        for r in Model.objects.filter(company_id__in=ids).values("company").annotate(
            n=Count("id"), n30=Count("id", filter=Q(created_at__gte=d30)), latest=Max("created_at"),
        ):
            usage[r["company"]][key] = r["n"]
            recent[r["company"]] += r["n30"]
            if r["latest"] and (r["company"] not in last_record or r["latest"] > last_record[r["company"]]):
                last_record[r["company"]] = r["latest"]
    owners = {}
    for u in User.objects.filter(company_id__in=ids, role__in=("owner", "admin")).order_by("company_id", "date_joined").values("company", "first_name", "last_name", "email", "id"):
        owners.setdefault(u["company"], u)
    subs = {s.company_id: s for s in Subscription.objects.filter(company_id__in=ids)}

    rows = []
    for c in companies:
        sub = subs.get(c.id)
        u = users.get(c.id, {})
        limits = catalog.get(sub.plan if sub else Plan.FREE, catalog[Plan.FREE])
        owner = owners.get(c.id)
        # Activity = latest login or latest record created, whichever is newer.
        last_login = u.get("last_active")
        last_active = max((d for d in (last_login, last_record.get(c.id)) if d), default=None)
        rows.append({
            "id": str(c.id),
            "name": c.name,
            "slug": c.slug,
            "status": c.status,
            "country": c.country or "",
            "currency": c.currency or "",
            "created_at": c.created_at,
            "trial_ends_at": c.trial_ends_at,
            "plan": sub.plan if sub else Plan.FREE,
            "plan_display": sub.get_plan_display() if sub else "Free Trial",
            "billing_period": sub.billing_period if sub else "monthly",
            "subscription_active": bool(sub and sub.is_active),
            "expires_at": sub.expires_at if sub else None,
            "subscription_expired": bool(sub and sub.plan != Plan.FREE and sub.is_expired),
            "mrr": round(subscription_mrr(sub, catalog), 2),
            "users": u.get("total", 0),
            "active_users": u.get("active", 0),
            "active_users_30d": u.get("active_30d", 0),
            "max_users": limits["max_users"],
            "last_active": last_active,
            "last_login": last_login,
            "usage": {k: usage[c.id].get(k, 0) for k in USAGE_MODELS},
            "records_30d": recent[c.id],
            "owner": {"id": owner["id"], "name": f"{owner['first_name']} {owner['last_name']}".strip() or owner["email"], "email": owner["email"]} if owner else None,
            "health": health(last_active, u.get("active", 0), limits["max_users"], recent[c.id], sub, c),
        })
    return rows


def month_starts(n):
    """First day (aware datetime) of each of the last n months, oldest first."""
    now = timezone.now()
    first = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    out = []
    y, m = first.year, first.month
    for _ in range(n):
        out.append(first.replace(year=y, month=m))
        m -= 1
        if m == 0:
            y, m = y - 1, 12
    return list(reversed(out))


def pct_change(current, previous):
    if not previous:
        return None if not current else 100.0
    return round((current - previous) * 100.0 / previous, 1)
