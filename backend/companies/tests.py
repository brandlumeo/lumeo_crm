from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Company

User = get_user_model()


class CompanyModelTests(TestCase):
    def test_company_generates_slug_from_name(self):
        company = Company.objects.create(name="ABC Company")

        self.assertEqual(company.slug, "abc-company")

    def test_company_generates_unique_slug_for_duplicate_names(self):
        Company.objects.create(name="ABC Company")
        company = Company.objects.create(name="ABC Company")

        self.assertEqual(company.slug, "abc-company-2")

    def test_is_trial_active_only_for_future_trial_company(self):
        active_trial = Company.objects.create(
            name="Trial Workspace",
            trial_ends_at=timezone.now() + timedelta(days=14),
        )
        expired_trial = Company.objects.create(
            name="Expired Workspace",
            trial_ends_at=timezone.now() - timedelta(days=1),
        )
        active_subscription = Company.objects.create(
            name="Live Workspace",
            status=Company.Status.ACTIVE,
            trial_ends_at=timezone.now() + timedelta(days=14),
        )

        self.assertTrue(active_trial.is_trial_active)
        self.assertFalse(expired_trial.is_trial_active)
        self.assertFalse(active_subscription.is_trial_active)


class CurrentCompanyApiTests(APITestCase):
    def setUp(self):
        self.company = Company.objects.create(name="ABC Company")
        self.user = User.objects.create_user(
            username="staffuser",
            password="StrongPass123!",
            company=self.company,
        )

    def test_current_company_endpoint_requires_authentication(self):
        response = self.client.get(reverse("companies:current"))

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_current_company_endpoint_returns_authenticated_users_company(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.get(reverse("companies:current"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["slug"], self.company.slug)
        self.assertEqual(response.data["name"], self.company.name)

    def test_current_company_endpoint_returns_404_when_user_has_no_company(self):
        platform_admin = User.objects.create_superuser(
            username="platformadmin",
            password="StrongPass123!",
            email="admin@example.com",
        )
        self.client.force_authenticate(user=platform_admin)

        response = self.client.get(reverse("companies:current"))

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
