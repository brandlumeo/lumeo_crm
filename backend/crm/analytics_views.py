from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import models
from django.db.models import Sum, Count, Avg, F, ExpressionWrapper, DurationField
from django.db.models.functions import TruncMonth
from crm.models import Deal, Lead

class PremiumAnalyticsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if not user.is_authenticated or user.company_id is None:
            return Response({"error": "Authenticated user is not assigned to a company."}, status=400)

        company = user.company
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

        return Response({
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
            "revenue_forecast": revenue_forecast
        })
