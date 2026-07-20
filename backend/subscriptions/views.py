import json
import logging
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
from django.conf import settings

from .models import Subscription, PLAN_LIMITS
from .serializers import PlanDetailSerializer, SubscriptionSerializer, build_plan_catalogue

logger = logging.getLogger(__name__)


class CurrentSubscriptionView(APIView):
    """
    GET  /api/v1/subscriptions/current/
    Returns the active subscription for the authenticated user's company.
    If no subscription exists yet, one is auto-created on the free plan.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        company = getattr(request.user, "company", None)
        if company is None:
            return Response(
                {"detail": "Authenticated user is not assigned to a company."},
                status=status.HTTP_404_NOT_FOUND,
            )

        subscription, _ = Subscription.objects.get_or_create(
            company=company,
            defaults={"plan": "free", "is_active": True},
        )
        serializer = SubscriptionSerializer(subscription)
        return Response(serializer.data)


class PlanCatalogueView(APIView):
    """
    GET  /api/v1/subscriptions/plans/
    Returns all available plans with pricing, limits, and whether it's the current plan.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        company = getattr(request.user, "company", None)
        current_plan = "free"

        if company is not None:
            sub = Subscription.objects.filter(company=company).first()
            if sub:
                current_plan = sub.plan

        catalogue = build_plan_catalogue(current_plan)
        serializer = PlanDetailSerializer(catalogue, many=True)
        return Response(serializer.data)


class CreateSubscriptionView(APIView):
    """
    POST /api/v1/subscriptions/checkout/
    Initiates a Razorpay subscription checkout session.
    If using placeholder key credentials, falls back dynamically to Developer Mock Mode.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        plan_key = request.data.get("plan_key")
        billing_period = request.data.get("billing_period", "monthly")

        if not plan_key or plan_key not in ["starter", "pro", "enterprise"]:
            return Response({"detail": "Invalid plan key."}, status=status.HTTP_400_BAD_REQUEST)

        company = getattr(request.user, "company", None)
        if company is None:
            return Response({"detail": "Authenticated user has no company."}, status=status.HTTP_400_BAD_REQUEST)

        rzp_id = getattr(settings, "RAZORPAY_KEY_ID", "")
        rzp_secret = getattr(settings, "RAZORPAY_KEY_SECRET", "")

        # Detect Developer Mock Mode
        is_mock = not rzp_id or rzp_id == "rzp_test_placeholder_key_id" or rzp_secret == "placeholder_key_secret"

        if is_mock:
            mock_sub_id = f"sub_mock_{plan_key}_{billing_period}_{company.id}"
            return Response({
                "subscription_id": mock_sub_id,
                "key_id": "rzp_test_mock_placeholder",
                "is_mock": True,
            })

        # Real Razorpay API Integration
        try:
            import razorpay
            client = razorpay.Client(auth=(rzp_id, rzp_secret))
            limits = PLAN_LIMITS.get(plan_key, {})
            price = limits.get("price_yearly" if billing_period == "yearly" else "price_monthly", 0)

            # Create the plan dynamically in Razorpay for ease of setup
            plan_name = f"Lumeo CRM - {plan_key.capitalize()} ({billing_period.capitalize()})"
            plan_data = {
                "period": "yearly" if billing_period == "yearly" else "monthly",
                "interval": 1,
                "item": {
                    "name": plan_name,
                    "amount": int(price * 100),  # in paise
                    "currency": "INR"
                }
            }
            rzp_plan = client.plan.create(data=plan_data)
            plan_id = rzp_plan["id"]

            # Create subscription session
            sub_data = {
                "plan_id": plan_id,
                "total_count": 12 if billing_period == "yearly" else 120,
                "quantity": 1,
                "customer_notify": 1
            }
            rzp_sub = client.subscription.create(data=sub_data)
            return Response({
                "subscription_id": rzp_sub["id"],
                "key_id": rzp_id,
                "is_mock": False
            })
        except Exception as e:
            logger.error(f"Razorpay API error: {e}")
            if not settings.DEBUG:
                # C4: Never silently fall back to free mock mode in production
                return Response(
                    {"detail": f"Payment service temporarily unavailable. Error details: {str(e)}"},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )
            # Only allow mock fallback in DEBUG/development mode
            mock_sub_id = f"sub_mock_{plan_key}_{billing_period}_{company.id}"
            return Response({
                "subscription_id": mock_sub_id,
                "key_id": "rzp_test_mock_placeholder",
                "is_mock": True,
                "detail": f"Razorpay API Error: {str(e)}. Switched to Mock gateway (dev only)."
            })


class VerifySubscriptionView(APIView):
    """
    POST /api/v1/subscriptions/verify/
    Verifies subscription signature and upgrades plan tier inside local database.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        company = getattr(request.user, "company", None)
        if company is None:
            return Response({"detail": "Authenticated user has no company."}, status=status.HTTP_400_BAD_REQUEST)

        razorpay_payment_id = request.data.get("razorpay_payment_id")
        razorpay_subscription_id = request.data.get("razorpay_subscription_id")
        razorpay_signature = request.data.get("razorpay_signature")
        plan_key = request.data.get("plan_key")
        billing_period = request.data.get("billing_period", "monthly")

        if not plan_key or plan_key not in ["free", "starter", "pro", "enterprise"]:
            return Response({"detail": "Invalid plan key."}, status=status.HTTP_400_BAD_REQUEST)

        is_mock = str(razorpay_subscription_id).startswith("sub_mock_")

        if not is_mock:
            # Real Razorpay Signature verification
            rzp_id = getattr(settings, "RAZORPAY_KEY_ID", "")
            rzp_secret = getattr(settings, "RAZORPAY_KEY_SECRET", "")
            try:
                import razorpay
                client = razorpay.Client(auth=(rzp_id, rzp_secret))
                params = {
                    "razorpay_payment_id": razorpay_payment_id,
                    "razorpay_subscription_id": razorpay_subscription_id,
                    "razorpay_signature": razorpay_signature
                }
                client.utility.verify_subscription_payment_signature(params)
            except Exception as e:
                return Response({"detail": f"Razorpay Signature check failed: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

        # Update or create active subscription record
        subscription, _ = Subscription.objects.get_or_create(company=company)
        subscription.plan = plan_key
        subscription.is_active = True

        offset_days = 365 if billing_period == "yearly" else 30
        subscription.expires_at = timezone.now() + timezone.timedelta(days=offset_days)

        subscription.razorpay_subscription_id = razorpay_subscription_id
        subscription.razorpay_payment_id = razorpay_payment_id
        subscription.razorpay_signature = razorpay_signature
        subscription.save()

        # Mark the company's status as active so the UI drops the 'Free Trial' mode
        company.status = "active"
        company.save(update_fields=["status"])

        # Send email alert to founder
        from notifications.tasks import send_notification_email
        admin_email = getattr(settings, 'ADMIN_NOTIFICATION_EMAIL', 'brandlumeollp@gmail.com')
        send_notification_email.delay(
            to_email=admin_email,
            title=f"🤑 New Subscription: {company.name} upgraded to {plan_key.upper()}!",
            body=f"Great news! {request.user.email} from {company.name} just purchased the {plan_key.upper()} ({billing_period}) plan."
        )

        serializer = SubscriptionSerializer(subscription)
        return Response({
            "detail": "Subscription upgraded successfully.",
            "subscription": serializer.data
        })


@method_decorator(csrf_exempt, name="dispatch")
class RazorpayWebhookView(APIView):
    """
    POST /api/v1/subscriptions/webhook/
    Public Razorpay Webhook listener to handle background billing cycle events.
    """
    permission_classes = []

    def post(self, request):
        payload = request.body.decode("utf-8")
        signature = request.headers.get("X-Razorpay-Signature", "")

        rzp_id = getattr(settings, "RAZORPAY_KEY_ID", "")
        rzp_secret = getattr(settings, "RAZORPAY_KEY_SECRET", "")

        is_mock = not rzp_id or rzp_id == "rzp_test_placeholder_key_id"

        if not is_mock:
            # C3: Implement HMAC-SHA256 webhook signature verification
            import hmac
            import hashlib
            webhook_secret = getattr(settings, "RAZORPAY_WEBHOOK_SECRET", "")
            if not webhook_secret:
                logger.error("RAZORPAY_WEBHOOK_SECRET is not configured. Rejecting webhook.")
                return Response(
                    {"detail": "Webhook secret not configured on the server."},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )
            if not signature:
                return Response({"detail": "Missing X-Razorpay-Signature header"}, status=status.HTTP_400_BAD_REQUEST)
            expected = hmac.new(
                webhook_secret.encode("utf-8"),
                payload.encode("utf-8"),
                hashlib.sha256,
            ).hexdigest()
            if not hmac.compare_digest(expected, signature):
                logger.warning("Razorpay webhook rejected: signature mismatch")
                return Response({"detail": "Invalid webhook signature"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            data = json.loads(payload)
            event = data.get("event")

            if event == "subscription.charged":
                entity = data["payload"]["subscription"]["entity"]
                sub_id = entity["id"]
                try:
                    sub = Subscription.objects.get(razorpay_subscription_id=sub_id)
                    sub.is_active = True
                    sub.expires_at = timezone.now() + timezone.timedelta(days=30)
                    sub.save()
                    
                    company = sub.company
                    company.status = "active"
                    company.save(update_fields=["status"])

                    from notifications.tasks import send_notification_email
                    admin_email = getattr(settings, 'ADMIN_NOTIFICATION_EMAIL', 'brandlumeollp@gmail.com')
                    send_notification_email.delay(
                        to_email=admin_email,
                        title=f"💳 Subscription Charged: {company.name}",
                        body=f"Razorpay webhook confirmed successful charge for subscription {sub_id}.\nCompany: {company.name}\nPlan: {sub.plan}"
                    )

                    logger.info(f"Webhook subscription.charged processed for {sub_id}")
                except Subscription.DoesNotExist:
                    pass
            elif event in ["subscription.halted", "subscription.cancelled"]:
                entity = data["payload"]["subscription"]["entity"]
                sub_id = entity["id"]
                try:
                    sub = Subscription.objects.get(razorpay_subscription_id=sub_id)
                    sub.is_active = False
                    sub.save()

                    company = sub.company
                    company.status = "suspended"
                    company.save(update_fields=["status"])

                    logger.info(f"Webhook subscription halted/cancelled for {sub_id}")
                except Subscription.DoesNotExist:
                    pass
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({"status": "ok"})
