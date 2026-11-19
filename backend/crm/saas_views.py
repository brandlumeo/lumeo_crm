"""SaaS (platform) admin API. Superusers only.

Tenants are companies. Every state-changing action is written to PlatformAuditLog.
"""
import csv
from collections import defaultdict
from datetime import datetime, timedelta, timezone as dt_timezone

from django.db.models import Count, Q, Sum
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import permissions, serializers, views
from rest_framework.response import Response

from accounts.models import User
from companies.models import Company, PlatformAuditLog, PlatformSettings
from subscriptions.models import PLAN_LIMIT_KEYS, PLAN_LIMITS, Plan, Subscription, get_plan_catalog

from .saas_metrics import ensure_subscriptions, month_starts, pct_change, subscription_mrr, tenant_rows
from .saas_serializers import SaasSettingsSerializer


EPOCH = datetime(1970, 1, 1, tzinfo=dt_timezone.utc)


class IsPlatformAdmin(permissions.BasePermission):
    """Platform admins are superusers (the only accounts that see the SaaS Admin link)."""

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_superuser)


def client_ip(request):
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR", "")
    return (forwarded.split(",")[0].strip() if forwarded else request.META.get("REMOTE_ADDR")) or None


def audit(request, action, summary, company=None, target_user=None, **details):
    PlatformAuditLog.objects.create(
        actor=request.user,
        actor_email=request.user.email,
        action=action,
        company=company,
        target_user=target_user,
        summary=summary[:500],
        details=details,
        ip_address=client_ip(request),
    )


def paginate(request, items, default_size=25):
    try:
        page = max(int(request.query_params.get("page", 1)), 1)
        size = min(max(int(request.query_params.get("page_size", default_size)), 1), 200)
    except ValueError:
        page, size = 1, default_size
    start = (page - 1) * size
    return {"count": len(items), "page": page, "page_size": size, "results": items[start:start + size]}


def user_name(u):
    return f"{u.first_name} {u.last_name}".strip() or u.email


def user_row(u):
    return {
        "id": u.id,
        "name": user_name(u),
        "email": u.email,
        "role": u.role,
        "designation": getattr(u, "designation", "") or "",
        "company": {"id": str(u.company_id), "name": u.company.name} if u.company_id else None,
        "is_active": u.is_active,
        "is_staff": u.is_staff,
        "is_superuser": u.is_superuser,
        "last_login": u.last_login,
        "date_joined": u.date_joined,
    }


def csv_response(filename, header, rows):
    response = HttpResponse(content_type="text/csv")
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    writer = csv.writer(response)
    writer.writerow(header)
    for row in rows:
        # Neutralise spreadsheet formulas in user-controlled text
        writer.writerow([f"'{v}" if isinstance(v, str) and v[:1] in ("=", "+", "-", "@") else v for v in row])
    return response


class SaasBaseView(views.APIView):
    permission_classes = [IsPlatformAdmin]


# ── Overview analytics ────────────────────────────────────────────────────────

class SaasStatsView(SaasBaseView):
    def get(self, request):
        ensure_subscriptions()
        now = timezone.now()
        d7, d30, d60 = now - timedelta(days=7), now - timedelta(days=30), now - timedelta(days=60)
        catalog = get_plan_catalog()

        companies = list(Company.objects.all())
        rows = tenant_rows(companies)
        subs = list(Subscription.objects.select_related("company"))
        mrr = sum(subscription_mrr(s, catalog) for s in subs)
        paying = [s for s in subs if subscription_mrr(s, catalog) > 0]
        new_mrr_30d = sum(subscription_mrr(s, catalog) for s in paying if s.created_at >= d30)

        new_t30 = sum(1 for c in companies if c.created_at >= d30)
        new_t_prev = sum(1 for c in companies if d60 <= c.created_at < d30)
        users = User.objects.all()
        new_u30 = users.filter(date_joined__gte=d30).count()
        new_u_prev = users.filter(date_joined__gte=d60, date_joined__lt=d30).count()

        # Monthly series (last 12 months)
        months = month_starts(12)
        series = []
        for i, start in enumerate(months):
            end = months[i + 1] if i + 1 < len(months) else now + timedelta(seconds=1)
            series.append({
                "month": start.strftime("%b %y"),
                "new_tenants": sum(1 for c in companies if start <= c.created_at < end),
                "new_users": users.filter(date_joined__gte=start, date_joined__lt=end).count(),
                "total_tenants": sum(1 for c in companies if c.created_at < end),
                # Current recurring value of paid subscriptions, by the month they started.
                "mrr": round(sum(subscription_mrr(s, catalog) for s in paying if s.created_at < end), 2),
                "new_mrr": round(sum(subscription_mrr(s, catalog) for s in paying if start <= s.created_at < end), 2),
            })

        plan_mix = []
        for key, label in Plan.choices:
            plan_subs = [s for s in subs if s.plan == key and s.is_active]
            plan_mix.append({"plan": key, "label": label, "tenants": len(plan_subs), "mrr": round(sum(subscription_mrr(s, catalog) for s in plan_subs), 2)})
        status_mix = defaultdict(int)
        for c in companies:
            status_mix[c.status] += 1

        expiring = sorted(
            (r for r in rows if r["status"] == "trial" and r["trial_ends_at"] and now <= r["trial_ends_at"] <= now + timedelta(days=14)),
            key=lambda r: r["trial_ends_at"],
        )
        at_risk = sorted((r for r in rows if r["status"] != "suspended" and r["health"]["label"] == "at_risk"), key=lambda r: (-r["mrr"], r["health"]["score"]))
        top = sorted(rows, key=lambda r: (r["records_30d"], r["active_users_30d"]), reverse=True)

        recent_logins = [user_row(u) for u in users.filter(last_login__isnull=False).select_related("company").order_by("-last_login")[:8]]
        recent_audit = [
            {"id": a.id, "summary": a.summary, "actor": a.actor_email, "action": a.action, "created_at": a.created_at}
            for a in PlatformAuditLog.objects.order_by("-created_at")[:6]
        ]
        total_users = users.count()
        return Response({
            "kpis": {
                "mrr": round(mrr, 2),
                "arr": round(mrr * 12, 2),
                "new_mrr_30d": round(new_mrr_30d, 2),
                "paying_tenants": len(paying),
                "arpa": round(mrr / len(paying), 2) if paying else 0,
                "total_tenants": len(companies),
                "active_tenants": status_mix.get("active", 0),
                "trial_tenants": status_mix.get("trial", 0),
                "suspended_tenants": status_mix.get("suspended", 0),
                "new_tenants_30d": new_t30,
                "new_tenants_change": pct_change(new_t30, new_t_prev),
                "total_users": total_users,
                "active_users_7d": users.filter(is_active=True, last_login__gte=d7).count(),
                "active_users_30d": users.filter(is_active=True, last_login__gte=d30).count(),
                "new_users_30d": new_u30,
                "new_users_change": pct_change(new_u30, new_u_prev),
                "paid_share": round(len(paying) * 100.0 / len(companies), 1) if companies else 0,
                "currency": "INR",
            },
            "series": series,
            "plan_mix": plan_mix,
            "status_mix": dict(status_mix),
            "expiring_trials": expiring[:6],
            "at_risk": at_risk[:6],
            "top_tenants": top[:6],
            "recent_signups": sorted(rows, key=lambda r: r["created_at"], reverse=True)[:6],
            "recent_logins": recent_logins,
            "recent_audit": recent_audit,
            "generated_at": now,
        })


# ── Tenants ───────────────────────────────────────────────────────────────────

def filtered_tenant_rows(request):
    ensure_subscriptions()
    qs = Company.objects.all()
    search = (request.query_params.get("search") or "").strip()
    if search:
        qs = qs.filter(Q(name__icontains=search) | Q(slug__icontains=search) | Q(company_email__icontains=search) | Q(users__email__icontains=search)).distinct()
    status_f = request.query_params.get("status")
    if status_f:
        qs = qs.filter(status=status_f)
    plan_f = request.query_params.get("plan")
    if plan_f:
        qs = qs.filter(subscription__plan=plan_f)
    rows = tenant_rows(qs)
    health_f = request.query_params.get("health")
    if health_f:
        rows = [r for r in rows if r["health"]["label"] == health_f]
    ordering = request.query_params.get("ordering") or "-created_at"
    key, reverse = ordering.lstrip("-"), ordering.startswith("-")
    sorters = {
        "created_at": lambda r: r["created_at"],
        "name": lambda r: r["name"].lower(),
        "mrr": lambda r: r["mrr"],
        "users": lambda r: r["users"],
        "health": lambda r: r["health"]["score"],
        "last_active": lambda r: r["last_active"] or EPOCH,
    }
    rows.sort(key=sorters.get(key, sorters["created_at"]), reverse=reverse)
    return rows


class SaasTenantListView(SaasBaseView):
    def get(self, request):
        return Response(paginate(request, filtered_tenant_rows(request)))


class SaasTenantExportView(SaasBaseView):
    def get(self, request):
        rows = filtered_tenant_rows(request)
        return csv_response(
            "tenants.csv",
            ["Company", "Status", "Plan", "Billing", "MRR (INR)", "Users", "Active users 30d", "Leads", "Deals", "Invoices", "Health", "Owner email", "Country", "Last active", "Joined"],
            [[r["name"], r["status"], r["plan_display"], r["billing_period"], r["mrr"], r["users"], r["active_users_30d"], r["usage"]["leads"], r["usage"]["deals"], r["usage"]["invoices"],
              r["health"]["score"], (r["owner"] or {}).get("email", ""), r["country"], r["last_active"].isoformat() if r["last_active"] else "", r["created_at"].date().isoformat()] for r in rows],
        )


class SaasTenantDetailView(SaasBaseView):
    def get(self, request, pk):
        company = get_object_or_404(Company, pk=pk)
        ensure_subscriptions()
        row = tenant_rows([company])[0]
        sub = company.subscription
        limits = sub.plan_limits
        now = timezone.now()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        from .models import Deal, Invoice, Lead, Quote

        invoices = Invoice.objects.filter(company=company)
        invoiced = list(invoices.values("currency").annotate(total=Sum("total"), n=Count("id")).order_by("-total"))
        months = month_starts(6)
        activity = []
        for i, start in enumerate(months):
            end = months[i + 1] if i + 1 < len(months) else now + timedelta(seconds=1)
            activity.append({
                "month": start.strftime("%b"),
                "leads": Lead.objects.filter(company=company, created_at__gte=start, created_at__lt=end).count(),
                "deals": Deal.objects.filter(company=company, created_at__gte=start, created_at__lt=end).count(),
                "invoices": invoices.filter(created_at__gte=start, created_at__lt=end).count(),
            })
        recent = []
        for label, Model, title_field in (("Lead", Lead, "name"), ("Deal", Deal, "title"), ("Invoice", Invoice, "invoice_number"), ("Quote", Quote, "title")):
            for obj in Model.objects.filter(company=company).order_by("-created_at")[:5]:
                recent.append({"type": label, "title": getattr(obj, title_field), "created_at": obj.created_at})
        recent.sort(key=lambda r: r["created_at"], reverse=True)

        team = [user_row(u) for u in User.objects.filter(company=company).select_related("company").order_by("-is_active", "role", "first_name")]
        return Response({
            **row,
            "contact": {
                "email": company.company_email or "",
                "website": company.company_website or "",
                "address": ", ".join(p for p in (company.address_line1, company.city, company.state, company.country) if p),
                "timezone": company.timezone,
                "domain": company.domain or "",
            },
            "modules": {k.replace("module_", "").replace("_enabled", ""): getattr(company, k) for k in (
                "module_crm_enabled", "module_hr_enabled", "module_finance_enabled", "module_projects_enabled",
                "module_attendance_enabled", "module_tickets_enabled", "module_events_enabled",
            )},
            "limits": {
                "users": {"used": row["active_users"], "max": limits["max_users"]},
                "leads_this_month": {"used": Lead.objects.filter(company=company, created_at__gte=month_start).count(), "max": limits["max_leads_monthly"]},
                "deals_this_month": {"used": Deal.objects.filter(company=company, created_at__gte=month_start).count(), "max": limits["max_deals_monthly"]},
            },
            "invoiced": [{"currency": r["currency"] or company.currency or "", "total": float(r["total"] or 0), "count": r["n"]} for r in invoiced],
            "activity": activity,
            "recent_records": recent[:10],
            "team": team,
            "audit": [
                {"id": a.id, "summary": a.summary, "actor": a.actor_email, "action": a.action, "created_at": a.created_at}
                for a in PlatformAuditLog.objects.filter(company=company).order_by("-created_at")[:15]
            ],
        })


class ChangePlanSerializer(serializers.Serializer):
    plan = serializers.ChoiceField(choices=Plan.choices)
    billing_period = serializers.ChoiceField(choices=("monthly", "yearly"), default="monthly")
    expires_at = serializers.DateTimeField(required=False, allow_null=True)


def _sync_company_status(company, sub):
    if not sub.is_active:
        company.status = "suspended"
    elif sub.plan != Plan.FREE:
        company.status = "active"
    else:
        company.status = "trial"
    company.save(update_fields=["status", "updated_at"])


class SaasTenantActionView(SaasBaseView):
    """POST /saas/tenants/<id>/<action>/ : change-plan | extend-trial | suspend | reactivate."""

    def post(self, request, pk, action):
        company = get_object_or_404(Company, pk=pk)
        ensure_subscriptions()
        sub = company.subscription
        before = {"plan": sub.plan, "billing_period": sub.billing_period, "status": company.status, "is_active": sub.is_active}

        if action == "change-plan":
            ser = ChangePlanSerializer(data=request.data)
            ser.is_valid(raise_exception=True)
            sub.plan = ser.validated_data["plan"]
            sub.billing_period = ser.validated_data["billing_period"]
            if "expires_at" in ser.validated_data:
                sub.expires_at = ser.validated_data["expires_at"]
            sub.is_active = True
            sub.save()
            _sync_company_status(company, sub)
            summary = f"Changed {company.name} to {sub.get_plan_display()} ({sub.billing_period})"
        elif action == "extend-trial":
            try:
                days = int(request.data.get("days", 0))
            except (TypeError, ValueError):
                days = 0
            if not 1 <= days <= 365:
                return Response({"days": "Enter between 1 and 365 days."}, status=400)
            base = company.trial_ends_at if company.trial_ends_at and company.trial_ends_at > timezone.now() else timezone.now()
            company.trial_ends_at = base + timedelta(days=days)
            if company.status == "suspended":
                company.status = "trial"
            company.save(update_fields=["trial_ends_at", "status", "updated_at"])
            if sub.plan == Plan.FREE:
                sub.expires_at = company.trial_ends_at
                sub.is_active = True
                sub.save(update_fields=["expires_at", "is_active", "updated_at"])
            summary = f"Extended {company.name}'s trial by {days} days (to {company.trial_ends_at:%d %b %Y})"
        elif action == "suspend":
            sub.is_active = False
            sub.save(update_fields=["is_active", "updated_at"])
            _sync_company_status(company, sub)
            reason = (request.data.get("reason") or "").strip()[:300]
            summary = f"Suspended {company.name}" + (f": {reason}" if reason else "")
        elif action == "reactivate":
            sub.is_active = True
            sub.save(update_fields=["is_active", "updated_at"])
            _sync_company_status(company, sub)
            summary = f"Reactivated {company.name}"
        else:
            return Response({"detail": "Unknown action."}, status=404)

        company.refresh_from_db()
        audit(request, f"tenant.{action}", summary, company=company, before=before,
              after={"plan": sub.plan, "billing_period": sub.billing_period, "status": company.status, "is_active": sub.is_active})
        return Response(tenant_rows([company])[0])


class SaasTenantBulkView(SaasBaseView):
    def post(self, request):
        action = request.data.get("action")
        ids = request.data.get("ids") or []
        if action not in ("suspend", "reactivate") or not isinstance(ids, list) or not ids:
            return Response({"detail": "Choose tenants and an action (suspend or reactivate)."}, status=400)
        ensure_subscriptions()
        done = 0
        for company in Company.objects.filter(pk__in=ids[:500]):
            sub = company.subscription
            sub.is_active = action == "reactivate"
            sub.save(update_fields=["is_active", "updated_at"])
            _sync_company_status(company, sub)
            audit(request, f"tenant.{action}", f"{'Suspended' if action == 'suspend' else 'Reactivated'} {company.name} (bulk)", company=company)
            done += 1
        return Response({"updated": done})


# ── Users ─────────────────────────────────────────────────────────────────────

def filtered_users(request):
    qs = User.objects.select_related("company")
    search = (request.query_params.get("search") or "").strip()
    if search:
        qs = qs.filter(Q(email__icontains=search) | Q(first_name__icontains=search) | Q(last_name__icontains=search) | Q(username__icontains=search) | Q(company__name__icontains=search))
    role = request.query_params.get("role")
    if role:
        qs = qs.filter(role=role)
    state = request.query_params.get("status")
    if state == "active":
        qs = qs.filter(is_active=True)
    elif state == "inactive":
        qs = qs.filter(is_active=False)
    elif state == "dormant":
        qs = qs.filter(is_active=True).filter(Q(last_login__isnull=True) | Q(last_login__lt=timezone.now() - timedelta(days=30)))
    elif state == "admins":
        qs = qs.filter(Q(is_superuser=True) | Q(is_staff=True))
    company = request.query_params.get("company")
    if company:
        qs = qs.filter(company_id=company)
    ordering = request.query_params.get("ordering") or "-date_joined"
    allowed = {"date_joined", "-date_joined", "last_login", "-last_login", "email", "-email", "first_name", "-first_name"}
    return qs.order_by(ordering if ordering in allowed else "-date_joined")


class SaasUserListView(SaasBaseView):
    def get(self, request):
        qs = filtered_users(request)
        page = paginate(request, qs)
        page["results"] = [user_row(u) for u in page["results"]]
        return Response(page)


class SaasUserExportView(SaasBaseView):
    def get(self, request):
        return csv_response(
            "users.csv",
            ["Name", "Email", "Role", "Company", "Active", "Platform admin", "Last login", "Joined"],
            [[user_name(u), u.email, u.role, u.company.name if u.company_id else "", "yes" if u.is_active else "no",
              "yes" if u.is_superuser else "no", u.last_login.isoformat() if u.last_login else "", u.date_joined.date().isoformat()]
             for u in filtered_users(request)],
        )


class SaasUserDetailView(SaasBaseView):
    """PATCH is_active only. Platform-admin flags are never editable through the API."""

    def patch(self, request, pk):
        target = get_object_or_404(User.objects.select_related("company"), pk=pk)
        if "is_active" not in request.data:
            return Response({"detail": "Only is_active can be changed here."}, status=400)
        active = bool(request.data.get("is_active"))
        if target.pk == request.user.pk and not active:
            return Response({"detail": "You can't deactivate your own account."}, status=400)
        if target.is_superuser and not active:
            return Response({"detail": "Platform admins can't be deactivated from here."}, status=400)
        target.is_active = active
        target.save(update_fields=["is_active"])
        audit(request, "user.activate" if active else "user.deactivate",
              f"{'Activated' if active else 'Deactivated'} {target.email}", company=target.company, target_user=target)
        return Response(user_row(target))


class SaasUserBulkView(SaasBaseView):
    def post(self, request):
        action = request.data.get("action")
        ids = request.data.get("ids") or []
        if action not in ("activate", "deactivate") or not isinstance(ids, list) or not ids:
            return Response({"detail": "Choose users and an action (activate or deactivate)."}, status=400)
        qs = User.objects.filter(pk__in=ids[:1000]).exclude(pk=request.user.pk)
        if action == "deactivate":
            qs = qs.exclude(is_superuser=True)
        targets = list(qs.select_related("company"))
        User.objects.filter(pk__in=[u.pk for u in targets]).update(is_active=action == "activate")
        for u in targets:
            audit(request, f"user.{action}", f"{'Activated' if action == 'activate' else 'Deactivated'} {u.email} (bulk)", company=u.company, target_user=u)
        return Response({"updated": len(targets)})


# ── Impersonation ─────────────────────────────────────────────────────────────

IMPERSONATION_HOURS = 2


class SaasImpersonateView(SaasBaseView):
    """Issue short-lived tokens for a tenant user. The admin's own session is kept by the browser."""

    def post(self, request, pk):
        from accounts.views import MyRefreshToken
        target = get_object_or_404(User.objects.select_related("company"), pk=pk)
        if target.pk == request.user.pk:
            return Response({"detail": "That's you."}, status=400)
        if target.is_superuser or target.is_staff:
            return Response({"detail": "Platform admins can't be impersonated."}, status=403)
        if not target.is_active:
            return Response({"detail": "This user is deactivated. Activate them first."}, status=400)
        if not target.company_id:
            return Response({"detail": "This user isn't part of a company."}, status=400)

        refresh = MyRefreshToken.for_user(target, record_login=False)
        refresh["imp"] = request.user.pk  # carried into every access token
        refresh.set_exp(lifetime=timedelta(hours=IMPERSONATION_HOURS))
        access = refresh.access_token
        audit(request, "impersonation.start", f"Logged in as {target.email} ({target.company.name})",
              company=target.company, target_user=target, hours=IMPERSONATION_HOURS)
        return Response({
            "access": str(access),
            "refresh": str(refresh),
            "user": {"id": target.pk, "name": user_name(target), "email": target.email},
            "company": {"id": str(target.company_id), "name": target.company.name},
            "expires_in_hours": IMPERSONATION_HOURS,
        })


class SaasImpersonationEndView(SaasBaseView):
    def post(self, request):
        target = User.objects.select_related("company").filter(pk=request.data.get("user_id")).first()
        if target:
            audit(request, "impersonation.end", f"Stopped viewing as {target.email}", company=target.company, target_user=target)
        return Response({"ok": True})


# ── Billing & plans ───────────────────────────────────────────────────────────

class SaasBillingView(SaasBaseView):
    def get(self, request):
        ensure_subscriptions()
        catalog = get_plan_catalog()
        overrides = PlatformSettings.get_settings().plan_overrides or {}
        subs = list(Subscription.objects.select_related("company"))
        now = timezone.now()
        plans = []
        for key, label in Plan.choices:
            plan_subs = [s for s in subs if s.plan == key and s.is_active]
            plans.append({
                "key": key,
                "name": label,
                **{k: catalog[key][k] for k in PLAN_LIMIT_KEYS},
                "defaults": {k: PLAN_LIMITS[key][k] for k in PLAN_LIMIT_KEYS},
                "customised": bool(overrides.get(key)),
                "tenants": len(plan_subs),
                "mrr": round(sum(subscription_mrr(s, catalog) for s in plan_subs), 2),
            })
        rows = []
        for s in subs:
            rows.append({
                "id": s.id,
                "company": {"id": str(s.company_id), "name": s.company.name, "status": s.company.status},
                "plan": s.plan,
                "plan_display": s.get_plan_display(),
                "billing_period": s.billing_period,
                "is_active": s.is_active,
                "expires_at": s.expires_at,
                "days_remaining": s.days_remaining,
                "mrr": round(subscription_mrr(s, catalog), 2),
                "razorpay": bool(s.razorpay_subscription_id or s.razorpay_payment_id),
                "created_at": s.created_at,
            })
        search = (request.query_params.get("search") or "").strip().lower()
        if search:
            rows = [r for r in rows if search in r["company"]["name"].lower()]
        plan_f = request.query_params.get("plan")
        if plan_f:
            rows = [r for r in rows if r["plan"] == plan_f]
        state = request.query_params.get("status")
        if state == "active":
            rows = [r for r in rows if r["is_active"]]
        elif state == "inactive":
            rows = [r for r in rows if not r["is_active"]]
        elif state == "expiring":
            rows = [r for r in rows if r["expires_at"] and now <= r["expires_at"] <= now + timedelta(days=30)]
        rows.sort(key=lambda r: (-r["mrr"], r["company"]["name"].lower()))
        mrr = sum(subscription_mrr(s, catalog) for s in subs)
        return Response({
            "summary": {
                "mrr": round(mrr, 2),
                "arr": round(mrr * 12, 2),
                "monthly_mrr": round(sum(subscription_mrr(s, catalog) for s in subs if s.billing_period != "yearly"), 2),
                "yearly_mrr": round(sum(subscription_mrr(s, catalog) for s in subs if s.billing_period == "yearly"), 2),
                "expiring_30d": sum(1 for s in subs if s.expires_at and now <= s.expires_at <= now + timedelta(days=30)),
                "paying": sum(1 for s in subs if subscription_mrr(s, catalog) > 0),
            },
            "plans": plans,
            "subscriptions": paginate(request, rows),
        })


class SaasPlanUpdateView(SaasBaseView):
    """PATCH {plan: {price_monthly: 699, max_users: 8, ...}} or {plan: null} to restore defaults."""

    def patch(self, request):
        settings_obj = PlatformSettings.get_settings()
        overrides = dict(settings_obj.plan_overrides or {})
        changes = {}
        for plan, values in (request.data or {}).items():
            if plan not in PLAN_LIMITS:
                return Response({"detail": f"Unknown plan '{plan}'."}, status=400)
            if values is None:
                overrides.pop(plan, None)
                changes[plan] = "restored defaults"
                continue
            if not isinstance(values, dict):
                return Response({"detail": "Send numbers for each limit."}, status=400)
            clean = dict(overrides.get(plan) or {})
            for key, value in values.items():
                if key not in PLAN_LIMIT_KEYS:
                    return Response({"detail": f"Unknown field '{key}'."}, status=400)
                try:
                    number = int(value)
                except (TypeError, ValueError):
                    return Response({"detail": f"{key} must be a whole number."}, status=400)
                if number < 0 or number > 100_000_000:
                    return Response({"detail": f"{key} is out of range."}, status=400)
                if number == PLAN_LIMITS[plan][key]:
                    clean.pop(key, None)
                else:
                    clean[key] = number
            if clean:
                overrides[plan] = clean
            else:
                overrides.pop(plan, None)
            changes[plan] = values
        settings_obj.plan_overrides = overrides
        settings_obj.save(update_fields=["plan_overrides", "updated_at"])
        audit(request, "plans.update", "Updated plan pricing/limits: " + ", ".join(changes), changes=changes)
        return Response({"ok": True, "plan_overrides": overrides})


# ── Audit log ─────────────────────────────────────────────────────────────────

class SaasAuditView(SaasBaseView):
    def get(self, request):
        qs = PlatformAuditLog.objects.select_related("company")
        search = (request.query_params.get("search") or "").strip()
        if search:
            qs = qs.filter(Q(summary__icontains=search) | Q(actor_email__icontains=search) | Q(company__name__icontains=search))
        action = request.query_params.get("action")
        if action:
            qs = qs.filter(action__startswith=action)
        page = paginate(request, qs, default_size=30)
        page["results"] = [{
            "id": a.id,
            "action": a.action,
            "summary": a.summary,
            "actor": a.actor_email,
            "company": {"id": str(a.company_id), "name": a.company.name} if a.company_id else None,
            "ip_address": a.ip_address,
            "details": a.details,
            "created_at": a.created_at,
        } for a in page["results"]]
        return Response(page)


# ── Platform settings ─────────────────────────────────────────────────────────

class SaasSettingsView(SaasBaseView):
    def get(self, request):
        return Response(SaasSettingsSerializer(PlatformSettings.get_settings()).data)

    def patch(self, request):
        settings_obj = PlatformSettings.get_settings()
        serializer = SaasSettingsSerializer(settings_obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        before = SaasSettingsSerializer(settings_obj).data
        serializer.save()
        changed = {k: v for k, v in serializer.data.items() if before.get(k) != v and k != "updated_at"}
        if changed:
            audit(request, "settings.update", "Updated platform settings: " + ", ".join(changed), changes=changed)
        return Response(serializer.data)
