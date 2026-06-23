import os
import sys
import json
import django
import urllib.request
import urllib.error

# Ensure parent directory (backend) is on sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Set up Django environment for ORM cleanup and state prep
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.contrib.auth import get_user_model
from companies.models import Company
from crm.models import Deal
from attendance.models import TimeLog, BreakLog, LeaveRequest, ExpenseClaim, OfficeAsset

User = get_user_model()

def prepare_database_state():
    print("[ORM SETUP] Starting state preparation...")
    
    # 1. Fetch/Create Company
    company, _ = Company.objects.get_or_create(
        slug="northwind-trading",
        defaults={"name": "Northwind Trading", "status": "active"}
    )
    
    # 2. Fetch/Configure Owner (shamil)
    try:
        owner = User.objects.get(username="shamil")
        owner.company = company
        owner.role = "owner"
        owner.is_active = True
        owner.set_password("shamil123")
        owner.save()
    except User.DoesNotExist:
        owner = User.objects.create_user(
            username="shamil",
            email="brandlumeollp@gmail.com",
            password="shamil123",
            company=company,
            role="owner",
            is_active=True
        )
    print(f"  - Verified Owner 'shamil' with password 'shamil123'")

    # 3. Fetch/Configure Staff User
    try:
        staff = User.objects.get(username="staff_user")
        staff.company = company
        staff.role = "staff"
        staff.is_active = True
        staff.set_password("staff123")
        staff.save()
    except User.DoesNotExist:
        staff = User.objects.create_user(
            username="staff_user",
            email="brandlumeollp+staff@gmail.com",
            password="staff123",
            company=company,
            role="staff",
            is_active=True
        )
    print(f"  - Verified Staff 'staff_user' with password 'staff123'")

    # 4. Fetch/Create CRM Deal for expense linking
    deal, _ = Deal.objects.get_or_create(
        title="Northwind Enterprise Licensing",
        company=company,
        defaults={
            "amount": 50000.00,
            "stage": "proposal",
        }
    )
    print(f"  - Verified Deal '{deal.title}' for cost-per-deal linking.")

    # 5. Clean up active attendance, leaves, expenses, and assets
    deleted_time_logs, _ = TimeLog.objects.filter(user__in=[owner, staff]).delete()
    deleted_leaves, _ = LeaveRequest.objects.filter(user__in=[owner, staff]).delete()
    deleted_expenses, _ = ExpenseClaim.objects.filter(user__in=[owner, staff]).delete()
    deleted_assets, _ = OfficeAsset.objects.filter(company=company).delete()
    print(f"  - Cleaned up {deleted_time_logs} TimeLogs, {deleted_leaves} LeaveRequests, {deleted_expenses} ExpenseClaims, and {deleted_assets} OfficeAssets.\n")
    return deal, staff


def send_post(url, payload, headers=None):
    if headers is None:
        headers = {}
    headers["Content-Type"] = "application/json"
    
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req) as response:
            status_code = response.getcode()
            body = response.read().decode("utf-8")
            return status_code, json.loads(body) if body else {}
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        print(f"  - ERROR [HTTP {e.getcode()}]: {body}")
        raise Exception(f"HTTP {e.getcode()} - {body}")


def send_patch(url, payload, headers=None):
    if headers is None:
        headers = {}
    headers["Content-Type"] = "application/json"
    
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method="PATCH")
    try:
        with urllib.request.urlopen(req) as response:
            status_code = response.getcode()
            body = response.read().decode("utf-8")
            return status_code, json.loads(body) if body else {}
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        print(f"  - ERROR [HTTP {e.getcode()}]: {body}")
        raise Exception(f"HTTP {e.getcode()} - {body}")


def send_put(url, payload, headers=None):
    if headers is None:
        headers = {}
    headers["Content-Type"] = "application/json"
    
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method="PUT")
    try:
        with urllib.request.urlopen(req) as response:
            status_code = response.getcode()
            body = response.read().decode("utf-8")
            return status_code, json.loads(body) if body else {}
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        print(f"  - ERROR [HTTP {e.getcode()}]: {body}")
        raise Exception(f"HTTP {e.getcode()} - {body}")


def send_delete(url, headers=None):
    if headers is None:
        headers = {}
    req = urllib.request.Request(url, headers=headers, method="DELETE")
    try:
        with urllib.request.urlopen(req) as response:
            status_code = response.getcode()
            return status_code
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        print(f"  - ERROR [HTTP {e.getcode()}]: {body}")
        raise Exception(f"HTTP {e.getcode()} - {body}")


def run_e2e_live_tests():
    print("==================================================")
    # 0. Prep state
    deal, staff = prepare_database_state()
    
    base_url = "http://127.0.0.1:8000/api/v1"
    
    print("[TEST STEP 1] Fetching JWT access tokens from live server...")
    # Get Staff Token
    status_staff, staff_tokens = send_post(f"{base_url}/accounts/token/", {
        "username": "staff_user",
        "password": "staff123"
    })
    staff_access = staff_tokens["access"]
    print(f"  - Successfully authenticated 'staff_user' (HTTP {status_staff})")

    # Get Manager Token
    status_mgr, mgr_tokens = send_post(f"{base_url}/accounts/token/", {
        "username": "shamil",
        "password": "shamil123"
    })
    manager_access = mgr_tokens["access"]
    print(f"  - Successfully authenticated 'shamil' Manager (HTTP {status_mgr})\n")

    staff_headers = {"Authorization": f"Bearer {staff_access}"}
    manager_headers = {"Authorization": f"Bearer {manager_access}"}

    # 1. PUNCH IN
    print("[TEST STEP 2] Executing Staff Punch-In...")
    punch_in_payload = {
        "work_location": "wfh",
        "latitude": 12.9716,
        "longitude": 77.5946,
        "notes": "Remote clock-in from Bangalore home office."
    }
    status_in, log_in = send_post(f"{base_url}/attendance/punch-in/", punch_in_payload, headers=staff_headers)
    print(f"  - PUNCHED IN: ID={log_in['id']} location={log_in['work_location']} (HTTP {status_in})")
    
    # 2. START BREAK
    print("[TEST STEP 3] Starting break...")
    status_b_start, break_start = send_post(f"{base_url}/attendance/break-start/", {"reason": "Lunch"}, headers=staff_headers)
    print(f"  - BREAK STARTED: ID={break_start['id']} reason={break_start['reason']} (HTTP {status_b_start})")

    # 3. END BREAK
    print("[TEST STEP 4] Ending break...")
    status_b_end, break_end = send_post(f"{base_url}/attendance/break-end/", {}, headers=staff_headers)
    print(f"  - BREAK ENDED: ID={break_end['id']} (HTTP {status_b_end})")

    # 4. PUNCH OUT
    print("[TEST STEP 5] Executing Staff Punch-Out...")
    status_out, log_out = send_post(f"{base_url}/attendance/punch-out/", {"notes": "Logoff. Productive day!"}, headers=staff_headers)
    print(f"  - PUNCHED OUT: status={log_out['clock_out']} (HTTP {status_out})\n")

    # 5. SUBMIT LEAVE REQUEST
    print("[TEST STEP 6] Submitting Leave Request...")
    leave_payload = {
        "leave_type": "paid",
        "start_date": "2026-06-01",
        "end_date": "2026-06-03",
        "reason": "Family relocation trip."
    }
    status_l, leave_res = send_post(f"{base_url}/attendance/leaves/", leave_payload, headers=staff_headers)
    leave_id = leave_res["id"]
    print(f"  - LEAVE CREATED: ID={leave_id} status={leave_res['status']} type={leave_res['leave_type']} (HTTP {status_l})")

    # 6. APPROVE LEAVE REQUEST AS MANAGER
    print("[TEST STEP 7] Reviewing and Approving Leave Request as Manager...")
    approval_payload = {
        "status": "approved",
        "manager_notes": "Approved. Safe travels!"
    }
    status_a, approve_res = send_patch(f"{base_url}/attendance/leaves/{leave_id}/approve/", approval_payload, headers=manager_headers)
    print(f"  - LEAVE APPROVED: ID={approve_res['id']} status={approve_res['status']} notes={approve_res['manager_notes']} (HTTP {status_a})\n")

    # 7. SUBMIT EXPENSE CLAIM LINKED TO DEAL
    print("[TEST STEP 8] Submitting Expense Claim Linked to CRM Deal...")
    expense_payload = {
        "title": "Executive Catering & Travel",
        "amount": 1850.75,
        "deal": str(deal.id),
        "description": "Flight tickets and boardroom dinner for Northwind Trading deal pitch."
    }
    status_e, expense_res = send_post(f"{base_url}/attendance/expenses/", expense_payload, headers=staff_headers)
    expense_id = expense_res["id"]
    print(f"  - EXPENSE SUBMITTED: ID={expense_id} title='{expense_res['title']}' amount={expense_res['amount']} deal_linked='{expense_res['deal_name']}' (HTTP {status_e})")

    # 8. APPROVE EXPENSE CLAIM AS MANAGER
    print("[TEST STEP 9] Reviewing and Approving Expense Claim as Manager...")
    expense_approve_payload = {
        "status": "approved",
        "manager_notes": "Valid pitch expenses. Approved for payroll reimbursement."
    }
    status_ea, exp_app_res = send_patch(f"{base_url}/attendance/expenses/{expense_id}/approve/", expense_approve_payload, headers=manager_headers)
    print(f"  - EXPENSE APPROVED: ID={exp_app_res['id']} status={exp_app_res['status']} notes={exp_app_res['manager_notes']} (HTTP {status_ea})\n")

    # 9. CREATE OFFICE ASSET AS MANAGER
    print("[TEST STEP 10] Logging New Office Asset in Inventory...")
    asset_payload = {
        "name": "iPad Pro M4 (13-inch)",
        "serial_number": "IPAD-M4-9988",
        "condition": "new",
        "purchase_date": "2026-05-15"
    }
    status_as, asset_res = send_post(f"{base_url}/attendance/assets/", asset_payload, headers=manager_headers)
    asset_id = asset_res["id"]
    print(f"  - ASSET CREATED: ID={asset_id} name='{asset_res['name']}' serial={asset_res['serial_number']} condition={asset_res['condition']} (HTTP {status_as})")

    # 10. UPDATE / ASSIGN ASSET AS MANAGER
    print("[TEST STEP 11] Assigning Asset to Staff Member & Setting Condition...")
    assign_payload = {
        "assigned_to": staff.pk,
        "condition": "good"
    }
    status_asu, asset_up_res = send_put(f"{base_url}/attendance/assets/{asset_id}/", assign_payload, headers=manager_headers)
    print(f"  - ASSET ASSIGNED: assigned_to='{asset_up_res['assigned_to_name']}' condition={asset_up_res['condition']} (HTTP {status_asu})")

    # 11. REMOVE ASSET FROM CATALOG AS MANAGER
    print("[TEST STEP 12] Deleting Asset from Inventory Catalog...")
    status_asd = send_delete(f"{base_url}/attendance/assets/{asset_id}/", headers=manager_headers)
    print(f"  - ASSET DELETED: status={status_asd} (No Content)")

    print("\n==================================================")
    print("ALL LIVE INTEGRATION TESTS COMPLETED SUCCESSFULLY!")
    print("==================================================")


if __name__ == "__main__":
    try:
        run_e2e_live_tests()
    except Exception as e:
        print(f"\n[FAIL] Live E2E Integration tests failed: {e}")
        sys.exit(1)
