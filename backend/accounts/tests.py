from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from companies.models import Company


User = get_user_model()


class UserModelTests(TestCase):
    def setUp(self):
        self.company = Company.objects.create(name="ABC Company")

    def test_user_belongs_to_company_with_default_staff_role(self):
        user = User.objects.create_user(
            username="staffuser",
            password="StrongPass123!",
            company=self.company,
        )

        self.assertEqual(user.company, self.company)
        self.assertEqual(user.role, User.Role.STAFF)

    def test_non_superuser_requires_company(self):
        with self.assertRaises(ValidationError):
            User.objects.create_user(
                username="orphanuser",
                password="StrongPass123!",
            )

    def test_superuser_can_exist_without_company(self):
        user = User.objects.create_superuser(
            username="platformadmin",
            password="StrongPass123!",
            email="admin@example.com",
        )

        self.assertIsNone(user.company)
        self.assertTrue(user.is_superuser)
        self.assertTrue(user.is_staff)


class MeApiTests(APITestCase):
    def setUp(self):
        self.company = Company.objects.create(name="ABC Company")
        self.user = User.objects.create_user(
            username="staffuser",
            password="StrongPass123!",
            email="staff@example.com",
            first_name="Staff",
            last_name="User",
            company=self.company,
            role=User.Role.MANAGER,
        )

    def test_me_endpoint_requires_authentication(self):
        response = self.client.get(reverse("accounts:me"))

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_token_obtain_pair_returns_access_and_refresh_tokens(self):
        response = self.client.post(
            reverse("accounts:token_obtain_pair"),
            {
                "username": self.user.username,
                "password": "StrongPass123!",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("lumeo_refresh", response.cookies)

    def test_me_endpoint_returns_authenticated_user_profile(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.get(reverse("accounts:me"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["username"], self.user.username)
        self.assertEqual(response.data["role"], self.user.role)
        self.assertEqual(response.data["company"]["slug"], self.company.slug)

class RegisterApiTests(APITestCase):
    def test_register_creates_company_and_owner_user(self):
        payload = {
            "first_name": "Test",
            "last_name": "User",
            "email": "test@newcompany.com",
            "password": "StrongPassword123!",
            "company_name": "New Tech Corp",
        }
        response = self.client.post(reverse("accounts:register"), payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("access", response.data)
        self.assertIn("lumeo_refresh", response.cookies)
        
        from companies.models import Company
        company = Company.objects.get(name="New Tech Corp")
        self.assertEqual(company.status, Company.Status.TRIAL)
        
        user = User.objects.get(email="test@newcompany.com")
        self.assertEqual(user.company, company)
        self.assertEqual(user.role, User.Role.ADMIN)

    def test_register_fails_with_weak_password(self):
        payload = {
            "first_name": "Test",
            "last_name": "User",
            "email": "test2@newcompany.com",
            "password": "123",
            "company_name": "New Tech Corp 2",
        }
        response = self.client.post(reverse("accounts:register"), payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        from companies.models import Company
        self.assertFalse(Company.objects.filter(name="New Tech Corp 2").exists())
