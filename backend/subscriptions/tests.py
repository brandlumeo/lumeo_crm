from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase
from rest_framework import status
from django.urls import reverse

from companies.models import Company
from subscriptions.models import Subscription, Plan

User = get_user_model()


class SubscriptionAPITests(APITestCase):
    def setUp(self):
        # Create test company
        self.company = Company.objects.create(
            name="Alpha Testing Corp",
            slug="alpha-testing-corp",
            status="active"
        )
        # Create test user associated with company
        self.user = User.objects.create_user(
            username="testuser",
            password="testpassword123",
            first_name="Test",
            last_name="User",
            email="testuser@alpha.com",
            company=self.company
        )

        # Force authenticate the user for DRF client
        self.client.force_authenticate(user=self.user)

    def test_get_current_subscription_auto_creates_free_plan(self):
        url = reverse("subscriptions:current")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["plan"], Plan.FREE)
        self.assertTrue(response.data["is_active"])
        self.assertIsNone(response.data["expires_at"])
        
        # Verify database record exists
        sub = Subscription.objects.get(company=self.company)
        self.assertEqual(sub.plan, Plan.FREE)

    def test_plan_catalogue_returns_available_tiers(self):
        url = reverse("subscriptions:plans")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # We expect 4 plans (free, starter, pro, enterprise)
        self.assertEqual(len(response.data), 4)
        
        # Free plan should be marked as is_current since user has no existing subscription record or is on free
        free_plan = next(p for p in response.data if p["key"] == "free")
        self.assertTrue(free_plan["is_current"])

    def test_checkout_session_creates_mock_payload_successfully(self):
        url = reverse("subscriptions:checkout")
        data = {
            "plan_key": "pro",
            "billing_period": "yearly"
        }
        response = self.client.post(url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["is_mock"])
        self.assertTrue(response.data["subscription_id"].startswith("sub_mock_pro_yearly_"))
        self.assertEqual(response.data["key_id"], "rzp_test_mock_placeholder")

    def test_verify_subscription_upgrades_local_database_record(self):
        # Create initial subscription
        Subscription.objects.get_or_create(company=self.company, defaults={"plan": "free"})

        url = reverse("subscriptions:verify")
        data = {
            "razorpay_payment_id": "pay_mock_12345",
            "razorpay_subscription_id": "sub_mock_pro_yearly_999",
            "razorpay_signature": "sig_mock_67890",
            "plan_key": "pro",
            "billing_period": "yearly"
        }
        response = self.client.post(url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["detail"], "Subscription upgraded successfully.")
        
        # Verify db changes
        sub = Subscription.objects.get(company=self.company)
        self.assertEqual(sub.plan, Plan.PRO)
        self.assertTrue(sub.is_active)
        self.assertIsNotNone(sub.expires_at)
        self.assertEqual(sub.razorpay_subscription_id, "sub_mock_pro_yearly_999")
        self.assertEqual(sub.razorpay_payment_id, "pay_mock_12345")

    def test_webhook_charged_extends_expiry_date(self):
        # Setup subscription record with Razorpay ID
        sub = Subscription.objects.create(
            company=self.company,
            plan=Plan.PRO,
            is_active=True,
            expires_at=timezone.now() + timezone.timedelta(days=5),
            razorpay_subscription_id="sub_mock_test_123"
        )

        url = reverse("subscriptions:webhook")
        payload = {
            "event": "subscription.charged",
            "payload": {
                "subscription": {
                    "entity": {
                        "id": "sub_mock_test_123",
                        "status": "active"
                    }
                }
              }
            }
        
        # Webhooks don't require authentication
        self.client.force_authenticate(user=None)
        response = self.client.post(url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        sub.refresh_from_db()
        # Expiry should have been extended to roughly 30 days from now
        self.assertTrue(sub.expires_at > timezone.now() + timezone.timedelta(days=28))
        self.assertTrue(sub.is_active)

    def test_webhook_cancelled_disables_subscription(self):
        sub = Subscription.objects.create(
            company=self.company,
            plan=Plan.PRO,
            is_active=True,
            razorpay_subscription_id="sub_mock_test_123"
        )

        url = reverse("subscriptions:webhook")
        payload = {
            "event": "subscription.cancelled",
            "payload": {
                "subscription": {
                    "entity": {
                        "id": "sub_mock_test_123",
                        "status": "cancelled"
                    }
                }
              }
            }
        
        self.client.force_authenticate(user=None)
        response = self.client.post(url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        sub.refresh_from_db()
        self.assertFalse(sub.is_active)
