from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from companies.models import Company
from .models import TimeLog, BreakLog, LeaveRequest, ExpenseClaim, OfficeAsset

User = get_user_model()


class AttendanceAPITests(APITestCase):
    def setUp(self):
        # 1. Set up standard testing company
        self.company = Company.objects.create(
            name="Test Workspace", slug="test-workspace", status="active"
        )

        # 2. Set up testing user
        self.user = User.objects.create_user(
            username="testuser",
            email="testuser@lumeo.local",
            password="SecurePassword123#",
            company=self.company,
            role="staff",
        )

        # 3. Authenticate client
        self.client.force_authenticate(user=self.user)

        # 4. Map API urls
        self.status_url = reverse("attendance:status")
        self.punch_in_url = reverse("attendance:punch_in")
        self.punch_out_url = reverse("attendance:punch_out")
        self.break_start_url = reverse("attendance:break_start")
        self.break_end_url = reverse("attendance:break_end")
        self.history_url = reverse("attendance:history")
        self.leave_list_create_url = reverse("attendance:leave_list_create")
        self.expense_list_create_url = reverse("attendance:expense_list_create")
        self.asset_list_create_url = reverse("attendance:asset_list_create")

    def test_current_status_offline(self):
        """Verify status reporting when not clocked in."""
        response = self.client.get(self.status_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["is_clocked_in"])
        self.assertFalse(response.data["is_on_break"])
        self.assertIsNone(response.data["active_log"])
        self.assertIsNone(response.data["active_break"])

    def test_punch_in_out_success(self):
        """Test full clock-in / clock-out flow with custom WFH location mode."""
        # 1. Punch In
        payload = {
            "work_location": "wfh",
            "latitude": 40.7128,
            "longitude": -74.0060,
            "notes": "Remote session started.",
        }
        response = self.client.post(self.punch_in_url, data=payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["work_location"], "wfh")
        self.assertEqual(float(response.data["latitude"]), 40.7128)
        self.assertEqual(float(response.data["longitude"]), -74.0060)
        self.assertEqual(response.data["notes"], "Remote session started.")

        # Verify active state
        status_res = self.client.get(self.status_url)
        self.assertTrue(status_res.data["is_clocked_in"])

        # 2. Punch Out
        out_payload = {"notes": "Completed and logging off."}
        out_response = self.client.post(self.punch_out_url, data=out_payload)
        self.assertEqual(out_response.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(out_response.data["clock_out"])
        self.assertEqual(out_response.data["notes"], "Completed and logging off.")

        # Verify inactive state
        status_res_2 = self.client.get(self.status_url)
        self.assertFalse(status_res_2.data["is_clocked_in"])

    def test_punch_in_double_guard(self):
        """Verify that double punch-in is blocked by active session validation."""
        # First punch-in succeeds
        self.client.post(self.punch_in_url, data={"work_location": "office"})

        # Second punch-in fails
        response = self.client.post(self.punch_in_url, data={"work_location": "wfh"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["detail"], "You are already clocked in.")

    def test_punch_out_offline_guard(self):
        """Verify punching out without active shift is blocked."""
        response = self.client.post(self.punch_out_url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["detail"], "You are not currently clocked in."
        )

    def test_break_lifecycle_success(self):
        """Test breaking lifecycle and transitions."""
        # 1. Clock in
        self.client.post(self.punch_in_url)

        # 2. Start Break
        response = self.client.post(
            self.break_start_url, data={"reason": "Lunch break"}
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["reason"], "Lunch break")

        # Verify status
        status_res = self.client.get(self.status_url)
        self.assertTrue(status_res.data["is_on_break"])

        # 3. End Break
        response_end = self.client.post(self.break_end_url)
        self.assertEqual(response_end.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(response_end.data["end_time"])

        # Verify status
        status_res_2 = self.client.get(self.status_url)
        self.assertFalse(status_res_2.data["is_on_break"])

    def test_break_overlapping_guard(self):
        """Ensure overlapping breaks within same shift are blocked."""
        self.client.post(self.punch_in_url)
        self.client.post(self.break_start_url)

        # Try to double-break
        response = self.client.post(self.break_start_url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["detail"], "You are already on a break.")

    def test_break_offline_guards(self):
        """Ensure breaks are blocked when user is clocked out."""
        response = self.client.post(self.break_start_url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["detail"], "You must be clocked in to start a break."
        )

    def test_break_auto_heal_on_clock_out(self):
        """Verify that punch-out auto-ends ongoing active breaks cleanly."""
        self.client.post(self.punch_in_url)
        self.client.post(self.break_start_url, data={"reason": "Lunch"})

        # Punch out directly while on break
        self.client.post(self.punch_out_url)

        # Verify shift is closed
        status_res = self.client.get(self.status_url)
        self.assertFalse(status_res.data["is_clocked_in"])
        self.assertFalse(status_res.data["is_on_break"])

        # Verify BreakLog was closed in database
        active_log = TimeLog.objects.filter(user=self.user).order_by("-clock_in").first()
        active_break = active_log.breaks.first()
        self.assertIsNotNone(active_break.end_time)

    def test_leave_request_create_success(self):
        """Test successful leave request creation."""
        payload = {
            "leave_type": "sick",
            "start_date": "2026-06-01",
            "end_date": "2026-06-05",
            "reason": "Medical checkup.",
        }
        response = self.client.post(self.leave_list_create_url, data=payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["leave_type"], "sick")
        self.assertEqual(response.data["status"], "pending")
        self.assertEqual(response.data["start_date"], "2026-06-01")
        self.assertEqual(response.data["end_date"], "2026-06-05")

    def test_leave_date_validation_error(self):
        """Verify that end_date earlier than start_date is blocked."""
        payload = {
            "leave_type": "paid",
            "start_date": "2026-06-05",
            "end_date": "2026-06-01",  # earlier!
            "reason": "Family trip.",
        }
        response = self.client.post(self.leave_list_create_url, data=payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("end_date", response.data)

    def test_leave_approval_by_manager(self):
        """Verify manager (owner/admin) can approve pending leaves."""
        # 1. Create a pending leave request in DB
        leave = LeaveRequest.objects.create(
            user=self.user,
            company=self.company,
            leave_type="paid",
            start_date="2026-06-10",
            end_date="2026-06-12",
            reason="Vacation.",
        )

        # 2. Create a manager user (role: owner)
        manager = User.objects.create_user(
            username="manageruser",
            email="manager@lumeo.local",
            password="SecurePassword123#",
            company=self.company,
            role="owner",
        )

        # 3. Authenticate as manager
        self.client.force_authenticate(user=manager)

        # 4. Patch approval
        approve_url = reverse("attendance:leave_approve", kwargs={"pk": leave.pk})
        payload = {"status": "approved", "manager_notes": "Approved. Have a good trip!"}
        response = self.client.patch(approve_url, data=payload)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "approved")
        self.assertEqual(response.data["manager_notes"], "Approved. Have a good trip!")
        self.assertEqual(response.data["approved_by"], manager.pk)

    def test_leave_approval_permission_denied(self):
        """Verify that standard employees (role: staff) are blocked from approving leaves."""
        leave = LeaveRequest.objects.create(
            user=self.user,
            company=self.company,
            leave_type="paid",
            start_date="2026-06-10",
            end_date="2026-06-12",
            reason="Vacation.",
        )

        # Try to patch approval as self (role: staff)
        approve_url = reverse("attendance:leave_approve", kwargs={"pk": leave.pk})
        payload = {"status": "approved", "manager_notes": "Self approved."}
        response = self.client.patch(approve_url, data=payload)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(
            response.data["detail"], "Permission denied. Only owners/admins can review leaves."
        )

    def test_expense_claim_create_success(self):
        """Verify successful expense claim logging."""
        payload = {
            "title": "Client dinner at Georgia Grill",
            "amount": 2500.50,
            "description": "Hosted executive team from Northwind Trading.",
        }
        response = self.client.post(self.expense_list_create_url, data=payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["title"], "Client dinner at Georgia Grill")
        self.assertEqual(float(response.data["amount"]), 2500.50)
        self.assertEqual(response.data["status"], "pending")

    def test_expense_claim_amount_validation_error(self):
        """Verify that zero/negative expense amounts are blocked."""
        payload = {
            "title": "Invalid expense",
            "amount": -50.00,  # invalid amount!
            "description": "Negative expense claim attempt.",
        }
        response = self.client.post(self.expense_list_create_url, data=payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("amount", response.data)

    def test_expense_claim_approval_by_manager(self):
        """Verify manager can review and approve expense claims."""
        # 1. Create a pending expense claim in DB
        expense = ExpenseClaim.objects.create(
            user=self.user,
            company=self.company,
            title="Office stationary",
            amount=350.00,
        )

        # 2. Authenticate as manager (role: owner)
        manager = User.objects.create_user(
            username="manageruser2",
            email="manager2@lumeo.local",
            password="SecurePassword123#",
            company=self.company,
            role="owner",
        )
        self.client.force_authenticate(user=manager)

        # 3. Patch approval
        approve_url = reverse("attendance:expense_approve", kwargs={"pk": expense.pk})
        payload = {"status": "approved", "manager_notes": "Approved. Receipts look good."}
        response = self.client.patch(approve_url, data=payload)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "approved")
        self.assertEqual(response.data["manager_notes"], "Approved. Receipts look good.")
        self.assertEqual(response.data["approved_by"], manager.pk)

    def test_expense_claim_approval_permission_denied(self):
        """Verify standard employees cannot approve expense claims."""
        expense = ExpenseClaim.objects.create(
            user=self.user,
            company=self.company,
            title="Flight tickets",
            amount=1200.00,
        )

        # Try to patch approval as staff member
        approve_url = reverse("attendance:expense_approve", kwargs={"pk": expense.pk})
        payload = {"status": "approved", "manager_notes": "Self approved."}
        response = self.client.patch(approve_url, data=payload)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(
            response.data["detail"], "Permission denied. Only owners/admins can review expenses."
        )

    def test_asset_create_by_manager(self):
        """Verify manager can successfully log new company assets."""
        # 1. Create a manager user (role: admin)
        manager = User.objects.create_user(
            username="adminmanager",
            email="adminmgr@lumeo.local",
            password="SecurePassword123#",
            company=self.company,
            role="admin",
        )
        self.client.force_authenticate(user=manager)

        # 2. Post asset
        payload = {
            "name": "MacBook Pro M3 Max",
            "serial_number": "C02XYZ12345",
            "condition": "new",
            "purchase_date": "2026-05-01",
        }
        response = self.client.post(self.asset_list_create_url, data=payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["name"], "MacBook Pro M3 Max")
        self.assertEqual(response.data["serial_number"], "C02XYZ12345")
        self.assertEqual(response.data["condition"], "new")

    def test_asset_create_permission_denied(self):
        """Verify standard staff are blocked from adding assets to inventory."""
        payload = {
            "name": "Unauthorized Tablet",
            "serial_number": "TAB987",
            "condition": "good",
        }
        response = self.client.post(self.asset_list_create_url, data=payload)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(
            response.data["detail"], "Permission denied. Only owners/admins can create company assets."
        )

    def test_asset_update_by_manager(self):
        """Verify manager can assign asset and update its condition."""
        asset = OfficeAsset.objects.create(
            company=self.company,
            name="Testing Monitor",
            serial_number="MON456",
            condition="good",
        )

        manager = User.objects.create_user(
            username="adminmanager2",
            email="adminmgr2@lumeo.local",
            password="SecurePassword123#",
            company=self.company,
            role="admin",
        )
        self.client.force_authenticate(user=manager)

        detail_url = reverse("attendance:asset_detail", kwargs={"pk": asset.pk})
        payload = {
            "assigned_to": self.user.pk,
            "condition": "fair",
        }
        response = self.client.put(detail_url, data=payload)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["assigned_to"], self.user.pk)
        self.assertEqual(response.data["condition"], "fair")

    def test_asset_delete_by_manager(self):
        """Verify manager can remove an asset from company inventory."""
        asset = OfficeAsset.objects.create(
            company=self.company,
            name="Old Keyboard",
            condition="damaged",
        )

        manager = User.objects.create_user(
            username="owneruser",
            email="owneruser@lumeo.local",
            password="SecurePassword123#",
            company=self.company,
            role="owner",
        )
        self.client.force_authenticate(user=manager)

        detail_url = reverse("attendance:asset_detail", kwargs={"pk": asset.pk})
        response = self.client.delete(detail_url)

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(OfficeAsset.objects.filter(pk=asset.pk).exists())



