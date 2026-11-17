from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import models
from django.db.models import Sum, Count, Avg, F, ExpressionWrapper, DurationField, Q
from django.db.models.functions import TruncMonth
from django.utils import timezone
from decimal import Decimal
import calendar
from crm.models import Deal, Lead, Customer, Task, Note, Product, DailyRevenue, Invoice, InvoicePayment, Bill
from attendance.models import Payroll, ExpenseClaim

class CrmCountsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if not user.is_authenticated or user.company_id is None:
            return Response({"error": "Authenticated user is not assigned to a company."}, status=400)
        
        company = user.company
        
        cache_key = f"crm_counts_{company.id}"
        cached_data = cache.get(cache_key)
        if cached_data:
            return Response(cached_data)
        
        response_data = {
            "leads": Lead.objects.filter(company=company, status="new").count(),
            "customers": Customer.objects.filter(company=company).count(),
            "deals": Deal.objects.filter(company=company, stage="prospect").count(),
            "tasks": Task.objects.filter(company=company).count(),
            "notes": Note.objects.filter(company=company).count(),
            "products": Product.objects.filter(company=company).count(),
        }
        
        # Cache for 5 minutes
        cache.set(cache_key, response_data, 300)
        
        return Response(response_data)
from django.core.cache import cache
from crm.models import Deal, Lead

class PremiumAnalyticsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if not user.is_authenticated or user.company_id is None:
            return Response({"error": "Authenticated user is not assigned to a company."}, status=400)

        company = user.company
        
        # Check cache first (cache per company for 15 minutes)
        cache_key = f"premium_analytics_{company.id}"
        cached_data = cache.get(cache_key)
        if cached_data:
            return Response(cached_data)

        deals = Deal.objects.filter(company=company)

        # Stage distribution & expected value
        stage_weights = {
            "prospect": 0.15,
            "qualified": 0.35,
            "proposal": 0.60,
            "negotiation": 0.82,
            "won": 1.00,
            "lost": 0.00
        }
        
        funnel_stats = deals.values("stage").annotate(
            count=Count("id"),
            total_value=Sum("amount")
        )
        
        expected_value = 0
        funnel_data = []
        for stat in funnel_stats:
            stage = stat["stage"]
            val = float(stat["total_value"] or 0)
            weight = stage_weights.get(stage, 0)
            expected_value += val * weight
            funnel_data.append({
                "stage": stage,
                "count": stat["count"],
                "total_value": val,
                "weighted_value": val * weight
            })

        # Sales Rep leaderboard
        rep_leaderboard = deals.filter(stage="won", assigned_to__isnull=False).values(
            username=F("assigned_to__username")
        ).annotate(
            total_closed=Sum("amount"),
            deal_count=Count("id")
        ).order_by("-total_closed")[:5]

        # Win/Loss counts
        won_count = deals.filter(stage="won").count()
        lost_count = deals.filter(stage="lost").count()
        total_closed = won_count + lost_count

        # Sales Velocity (Average days to close won deals)
        won_deals = deals.filter(stage="won")
        velocity_data = won_deals.annotate(
            duration=ExpressionWrapper(F('updated_at') - F('created_at'), output_field=DurationField())
        ).aggregate(avg_duration=Avg('duration'))
        
        avg_velocity_days = 0
        if velocity_data['avg_duration'] is not None:
            avg_velocity_days = velocity_data['avg_duration'].total_seconds() / (3600 * 24)

        # Revenue by Month
        revenue_by_month_qs = won_deals.annotate(
            month=TruncMonth('updated_at')
        ).values('month').annotate(
            revenue=Sum('amount')
        ).order_by('month')
        
        revenue_by_month = [
            {
                "month": entry['month'].strftime('%Y-%m') if entry['month'] else 'Unknown',
                "revenue": float(entry['revenue'] or 0)
            }
            for entry in revenue_by_month_qs
        ]

        # Lead Conversion Rate over time
        leads = Lead.objects.filter(company=company)
        leads_by_month_qs = leads.annotate(
            month=TruncMonth('created_at')
        ).values('month').annotate(
            total_leads=Count('id'),
            won_leads=Count('id', filter=models.Q(status="won"))
        ).order_by('month')
        
        lead_conversion = [
            {
                "month": entry['month'].strftime('%Y-%m') if entry['month'] else 'Unknown',
                "total": entry['total_leads'],
                "won": entry['won_leads'],
                "rate": (entry['won_leads'] / entry['total_leads'] * 100) if entry['total_leads'] > 0 else 0
            }
            for entry in leads_by_month_qs
        ]

        # Revenue Forecast
        active_deals = deals.filter(expected_close_date__isnull=False).exclude(stage__in=["won", "lost"])
        forecast_by_month_raw = active_deals.annotate(
            month=TruncMonth('expected_close_date')
        ).values('month', 'stage').annotate(
            total_amount=Sum('amount')
        )
        
        forecast_dict = {}
        for entry in forecast_by_month_raw:
            month_str = entry['month'].strftime('%Y-%m') if entry['month'] else 'Unknown'
            stage = entry['stage']
            amount = float(entry['total_amount'] or 0)
            weight = stage_weights.get(stage, 0)
            weighted_amount = amount * weight
            
            if month_str not in forecast_dict:
                forecast_dict[month_str] = {"month": month_str, "expected_revenue": 0}
            forecast_dict[month_str]["expected_revenue"] += weighted_amount
            
        revenue_forecast = sorted(list(forecast_dict.values()), key=lambda x: x["month"])

        daily_revenue_qs = DailyRevenue.objects.filter(company=company).order_by('date')
        daily_revenue = [
            {
                "date": entry.date.strftime('%Y-%m-%d'),
                "revenue": float(entry.total_revenue)
            }
            for entry in daily_revenue_qs
        ]

        response_data = {
            "expected_pipeline_value": expected_value,
            "funnel": funnel_data,
            "leaderboard": list(rep_leaderboard),
            "win_loss": {
                "won": won_count,
                "lost": lost_count,
                "ratio": (won_count / total_closed * 100) if total_closed > 0 else 0
            },
            "sales_velocity_days": round(avg_velocity_days, 1),
            "revenue_by_month": revenue_by_month,
            "lead_conversion": lead_conversion,
            "revenue_forecast": revenue_forecast,
            "daily_revenue": daily_revenue
        }
        
        # Save to cache for 15 minutes (900 seconds)
        cache.set(cache_key, response_data, 900)

        return Response(response_data)


def can_access_finance_dashboard(user):
    """
    Check if a user is authorized to view the executive Finance Dashboard.
    Authorized users:
      - Superusers
      - Company Owners, Primary Admins, Secondary Admins / Managers (role='manager', can_manage_team, has_management_access)
      - Accountants / Accounts staff (role or designation containing 'account', 'finance', 'cfo', 'controller', 'bookkeeper', 'auditor')
      - Any custom role granted 'Finance Dashboard' permission in Company Settings > Roles & Permissions.
    """
    if not user or not user.is_authenticated:
        return False
    if user.is_superuser:
        return True

    role = (getattr(user, "role", "") or "").lower()
    if role in ["owner", "admin", "manager", "accountant", "accounts"]:
        return True

    if getattr(user, "can_manage_team", False) or getattr(user, "has_management_access", False):
        return True

    designation = (getattr(user, "designation", "") or "").lower()
    finance_keywords = ["account", "finance", "cfo", "controller", "bookkeeper", "auditor"]
    if any(kw in designation for kw in finance_keywords):
        return True

    company = getattr(user, "company", None)
    if company and company.roles:
        role_id = "employee" if role == "staff" else role
        role_data = next((r for r in company.roles if r.get("id") == role_id or str(r.get("name", "")).lower() == role), None)
        if role_data:
            if role_data.get("isAdmin"):
                return True
            perms = role_data.get("permissions", {})
            fd_view = perms.get("Finance Dashboard", {}).get("View")
            if fd_view and fd_view != "None":
                return True
            dashboards_perm = perms.get("Dashboards", {})
            sub_perms = dashboards_perm.get("sub", {})
            if sub_perms.get("View Finance Dashboard") and sub_perms.get("View Finance Dashboard") != "None":
                return True

    return False


class FinanceDashboardView(APIView):
    """
    Monthly Income vs Expenses Executive Finance Dashboard.
    Provides gross inflow, operational outflow breakdown (payroll, vendor bills, expense claims),
    net margins, working capital receivables/payables, 12-month trends, and recent transaction stream.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if not user.is_authenticated or user.company_id is None:
            return Response({"error": "Authenticated user is not assigned to a company."}, status=400)

        if not can_access_finance_dashboard(user):
            return Response(
                {"error": "You do not have permission to view the Finance Dashboard. Please contact your company administrator."},
                status=403
            )

        company = user.company
        now = timezone.now()

        try:
            year = int(request.query_params.get("year", now.year))
        except (ValueError, TypeError):
            year = now.year

        try:
            month = int(request.query_params.get("month", now.month))
            if month < 1 or month > 12:
                month = now.month
        except (ValueError, TypeError):
            month = now.month

        from decimal import Decimal
        import calendar
        from django.db.models import Q
        from crm.models import Invoice, InvoicePayment, Bill
        from attendance.models import Payroll, ExpenseClaim

        # 1. 12-Month Bulk Aggregation for Selected Year
        payments_qs = InvoicePayment.objects.filter(
            invoice__company=company,
            payment_date__year=year
        ).values("payment_date__month").annotate(total=Sum("amount"))
        payment_by_month = {item["payment_date__month"]: Decimal(str(item["total"] or 0)) for item in payments_qs}

        paid_invoices_with_payments = InvoicePayment.objects.filter(invoice__company=company).values("invoice_id")
        direct_invoices_qs = Invoice.objects.filter(
            company=company,
            status="paid",
            issue_date__year=year
        ).exclude(id__in=paid_invoices_with_payments).values("issue_date__month").annotate(total=Sum("total"))
        direct_invoices_by_month = {item["issue_date__month"]: Decimal(str(item["total"] or 0)) for item in direct_invoices_qs}

        payroll_qs = Payroll.objects.filter(
            company=company,
            year=year
        ).exclude(status="cancelled").values("month").annotate(total=Sum("net_salary"))
        payroll_by_month = {item["month"]: Decimal(str(item["total"] or 0)) for item in payroll_qs}

        bills_qs = Bill.objects.filter(
            company=company,
            bill_date__year=year
        ).values("bill_date__month").annotate(
            total_paid=Sum("amount_paid"),
            total_full_paid=Sum("total_amount", filter=Q(status="paid", amount_paid=Decimal("0.00")))
        )
        bills_by_month = {}
        for item in bills_qs:
            m = item["bill_date__month"]
            paid = Decimal(str(item["total_paid"] or 0))
            full_paid = Decimal(str(item["total_full_paid"] or 0))
            bills_by_month[m] = paid + full_paid

        claims_qs = ExpenseClaim.objects.filter(
            company=company,
            status="approved",
            created_at__year=year
        ).values("created_at__month").annotate(total=Sum("amount"))
        claims_by_month = {item["created_at__month"]: Decimal(str(item["total"] or 0)) for item in claims_qs}

        # Build 12-Month Array
        months_data = []
        month_abbrs = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        for m in range(1, 13):
            inflow_m = payment_by_month.get(m, Decimal("0.00")) + direct_invoices_by_month.get(m, Decimal("0.00"))
            payroll_m = payroll_by_month.get(m, Decimal("0.00"))
            bills_m = bills_by_month.get(m, Decimal("0.00"))
            claims_m = claims_by_month.get(m, Decimal("0.00"))
            outflow_m = payroll_m + bills_m + claims_m
            net_m = inflow_m - outflow_m
            margin_m = round(float(net_m / inflow_m * 100), 1) if inflow_m > 0 else 0.0

            months_data.append({
                "month": m,
                "name": month_abbrs[m - 1],
                "full_name": calendar.month_name[m],
                "inflow": float(inflow_m),
                "payroll": float(payroll_m),
                "bills": float(bills_m),
                "claims": float(claims_m),
                "outflow": float(outflow_m),
                "net_profit": float(net_m),
                "margin_pct": margin_m,
                "is_selected": (m == month),
            })

        # Selected Month Specific Figures
        selected_month_data = months_data[month - 1]
        gross_inflow = selected_month_data["inflow"]
        payroll_expense = selected_month_data["payroll"]
        bills_expense = selected_month_data["bills"]
        claims_expense = selected_month_data["claims"]
        total_outflow = selected_month_data["outflow"]
        net_profit = selected_month_data["net_profit"]
        margin_pct = selected_month_data["margin_pct"]

        # Expense breakdown percentages for selected month
        if total_outflow > 0:
            payroll_pct = round((payroll_expense / total_outflow) * 100, 1)
            bills_pct = round((bills_expense / total_outflow) * 100, 1)
            claims_pct = round((claims_expense / total_outflow) * 100, 1)
        else:
            payroll_pct = 0.0
            bills_pct = 0.0
            claims_pct = 0.0

        # Outstanding Working Capital Balances
        pending_receivables = Invoice.objects.filter(
            company=company,
            status__in=["sent", "overdue", "partially_paid", "draft"]
        ).aggregate(total=Sum("total"))["total"] or Decimal("0.00")

        pending_payables = Bill.objects.filter(
            company=company,
            status__in=["open", "partial", "draft"]
        ).aggregate(total=Sum("amount_due"))["total"] or Decimal("0.00")

        # Annual Totals for Selected Year
        annual_inflow = sum(m["inflow"] for m in months_data)
        annual_outflow = sum(m["outflow"] for m in months_data)
        annual_net_profit = annual_inflow - annual_outflow
        annual_margin_pct = round((annual_net_profit / annual_inflow * 100), 1) if annual_inflow > 0 else 0.0

        # Recent Financial Transactions (up to 10 latest across all categories)
        recent_tx = []

        # 1. Payments received
        for p in InvoicePayment.objects.filter(invoice__company=company).select_related("invoice", "invoice__customer").order_by("-payment_date", "-id")[:6]:
            cust_name = p.invoice.customer.name if p.invoice and p.invoice.customer else "Client"
            inv_num = p.invoice.invoice_number if p.invoice else ""
            recent_tx.append({
                "id": f"pay-{p.id}",
                "type": "inflow",
                "category": "Client Payment",
                "title": f"Payment: {cust_name}",
                "amount": float(p.amount),
                "date": p.payment_date.strftime("%Y-%m-%d") if p.payment_date else str(p.created_at.date()),
                "status": "Received",
                "reference": inv_num or f"INV-{p.id}"
            })

        # 2. Paid invoices without separate payment record
        for inv in Invoice.objects.filter(company=company, status="paid").exclude(id__in=paid_invoices_with_payments).select_related("customer").order_by("-updated_at")[:4]:
            cust_name = inv.customer.name if inv.customer else "Client"
            recent_tx.append({
                "id": f"inv-{inv.id}",
                "type": "inflow",
                "category": "Invoice Settled",
                "title": f"Invoice: {cust_name}",
                "amount": float(inv.total),
                "date": inv.issue_date.strftime("%Y-%m-%d") if inv.issue_date else str(inv.created_at.date()),
                "status": "Settled",
                "reference": inv.invoice_number
            })

        # 3. Payroll payouts
        for pay in Payroll.objects.filter(company=company).exclude(status="cancelled").select_related("user").order_by("-created_at")[:6]:
            u_name = f"{pay.user.first_name} {pay.user.last_name}".strip() if pay.user else "Employee"
            if not u_name and pay.user:
                u_name = pay.user.username
            m_abbr = calendar.month_abbr[pay.month] if 1 <= pay.month <= 12 else str(pay.month)
            recent_tx.append({
                "id": f"payroll-{pay.id}",
                "type": "payroll",
                "category": "Payroll Salary",
                "title": f"Salary: {u_name} ({m_abbr} {pay.year})",
                "amount": float(pay.net_salary),
                "date": pay.pay_date.strftime("%Y-%m-%d") if pay.pay_date else str(pay.created_at.date()),
                "status": pay.status.title(),
                "reference": f"PAY-{pay.year}-{pay.month:02d}"
            })

        # 4. Vendor bills
        for b in Bill.objects.filter(company=company).select_related("vendor").order_by("-bill_date", "-id")[:6]:
            v_name = b.vendor.name if b.vendor else "Vendor"
            recent_tx.append({
                "id": f"bill-{b.id}",
                "type": "bill",
                "category": "Vendor Bill",
                "title": f"Bill #{b.bill_number} - {v_name}",
                "amount": float(b.total_amount),
                "date": b.bill_date.strftime("%Y-%m-%d") if b.bill_date else str(b.due_date),
                "status": b.status.title(),
                "reference": b.bill_number
            })

        # 5. Expense claims
        for c in ExpenseClaim.objects.filter(company=company, status="approved").select_related("user").order_by("-created_at")[:4]:
            u_name = f"{c.user.first_name} {c.user.last_name}".strip() if c.user else "Employee"
            recent_tx.append({
                "id": f"claim-{c.id}",
                "type": "claim",
                "category": "Employee Claim",
                "title": f"Claim: {c.title} ({u_name})",
                "amount": float(c.amount),
                "date": c.created_at.strftime("%Y-%m-%d"),
                "status": "Approved",
                "reference": "CLAIM"
            })

        recent_tx.sort(key=lambda x: x["date"], reverse=True)
        recent_tx = recent_tx[:10]

        response_data = {
            "year": year,
            "month": month,
            "month_name": calendar.month_name[month],
            "kpis": {
                "gross_inflow": gross_inflow,
                "total_outflow": total_outflow,
                "net_profit": net_profit,
                "margin_pct": margin_pct,
                "pending_receivables": float(pending_receivables),
                "pending_payables": float(pending_payables),
                "payroll_expense": payroll_expense,
                "bills_expense": bills_expense,
                "claims_expense": claims_expense,
            },
            "expense_breakdown": {
                "payroll": {"amount": payroll_expense, "percentage": payroll_pct},
                "bills": {"amount": bills_expense, "percentage": bills_pct},
                "claims": {"amount": claims_expense, "percentage": claims_pct},
            },
            "annual_summary": {
                "inflow": annual_inflow,
                "outflow": annual_outflow,
                "net_profit": annual_net_profit,
                "margin_pct": annual_margin_pct,
            },
            "monthly_trends": months_data,
            "recent_transactions": recent_tx,
        }

        return Response(response_data)
