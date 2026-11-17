import pytest
from django.core.exceptions import ValidationError
from accounts.models import User
from companies.models import Company
from crm.models import Lead

@pytest.fixture
def setup_data(db):
    company1 = Company.objects.create(name="Company A", domain="companya.com")
    company2 = Company.objects.create(name="Company B", domain="companyb.com")
    
    user1 = User.objects.create_user(email="user1@companya.com", username="user1", password="password123", company=company1, role="staff")
    user2 = User.objects.create_user(email="user2@companyb.com", username="user2", password="password123", company=company2, role="staff")
    
    return {
        "company1": company1,
        "company2": company2,
        "user1": user1,
        "user2": user2
    }

@pytest.mark.django_db
def test_lead_creation_success(setup_data):
    """Test that a Lead can be successfully created and assigned to a user in the same company."""
    lead = Lead.objects.create(
        company=setup_data["company1"],
        name="Test Lead",
        email="test@lead.com",
        assigned_to=setup_data["user1"]
    )
    assert lead.id is not None
    assert lead.company == setup_data["company1"]
    assert lead.assigned_to == setup_data["user1"]

@pytest.mark.django_db
def test_lead_assignment_security(setup_data):
    """Test that a Lead CANNOT be assigned to a user from a different company."""
    lead = Lead(
        company=setup_data["company1"],
        name="Hacked Lead",
        email="hacked@lead.com",
        assigned_to=setup_data["user2"] # Security breach attempt! User 2 is in Company 2
    )
    
    with pytest.raises(ValidationError) as exc_info:
        lead.save() # This should trigger full_clean() and raise an error
        
    assert "Assigned user must belong to the same company." in str(exc_info.value)


@pytest.mark.django_db
def test_finance_dashboard_rbac(setup_data):
    """Test RBAC enforcement for Finance Dashboard."""
    from rest_framework.test import APIClient
    company = setup_data["company1"]
    
    # 1. Regular staff should be forbidden
    staff_user = setup_data["user1"]
    client = APIClient()
    client.force_authenticate(user=staff_user)
    res = client.get("/api/v1/crm/finance-dashboard/")
    assert res.status_code == 403

    # 2. Manager should be allowed
    manager_user = User.objects.create_user(
        email="manager@companya.com",
        username="mgr1",
        password="password123",
        company=company,
        role="manager"
    )
    client.force_authenticate(user=manager_user)
    res = client.get("/api/v1/crm/finance-dashboard/")
    assert res.status_code == 200
    assert "kpis" in res.data
    assert "monthly_trends" in res.data
    assert len(res.data["monthly_trends"]) == 12

    # 3. Accountant should be allowed
    accountant_user = User.objects.create_user(
        email="accountant@companya.com",
        username="acct1",
        password="password123",
        company=company,
        role="accountant"
    )
    client.force_authenticate(user=accountant_user)
    res = client.get("/api/v1/crm/finance-dashboard/")
    assert res.status_code == 200

    # 4. Custom role with Finance Dashboard permission should be allowed
    company.roles = [
        {
            "id": "financial_analyst",
            "name": "Financial Analyst",
            "isAdmin": False,
            "permissions": {
                "Finance Dashboard": {"View": "All"}
            }
        }
    ]
    company.save()
    custom_role_user = User.objects.create_user(
        email="analyst@companya.com",
        username="analyst1",
        password="password123",
        company=company,
        role="financial_analyst"
    )
    client.force_authenticate(user=custom_role_user)
    res = client.get("/api/v1/crm/finance-dashboard/")
    assert res.status_code == 200


@pytest.mark.django_db
def test_income_crud_and_company_isolation(setup_data):
    """Test Income creation, listing, and multi-tenant company isolation."""
    from rest_framework.test import APIClient
    from crm.models import Income

    user1 = setup_data["user1"]
    user2 = setup_data["user2"]

    client = APIClient()
    client.force_authenticate(user=user1)

    # 1. Create income for company 1
    create_res = client.post("/api/v1/crm/income/", {
        "title": "Consulting Advance",
        "amount": "25000.00",
        "category": "consulting",
        "received_from": "Acme Corp",
        "payment_method": "bank_transfer",
        "reference": "UTR99887766",
        "notes": "Q4 strategy consulting"
    })
    assert create_res.status_code == 201
    income_id = create_res.data["id"]

    # Verify company and created_by were populated correctly
    inc = Income.objects.get(id=income_id)
    assert inc.company == setup_data["company1"]
    assert inc.created_by == user1
    assert str(inc.amount) == "25000.00"

    # 2. List incomes for user 1
    list_res = client.get("/api/v1/crm/income/")
    assert list_res.status_code == 200
    results = list_res.data.get("results", list_res.data)
    assert any(item["id"] == income_id for item in results)

    # 3. User 2 from Company 2 should NOT see Company 1's income
    client.force_authenticate(user=user2)
    user2_list = client.get("/api/v1/crm/income/")
    user2_results = user2_list.data.get("results", user2_list.data)
    assert not any(item["id"] == income_id for item in user2_results)


@pytest.mark.django_db
def test_bill_workflow_and_payments(setup_data):
    """Test Bill creation, line items, payment recording, auto-status updates, KPIs, PDF voucher, and multi-tenant isolation."""
    from rest_framework.test import APIClient
    from crm.models import Vendor, Bill, BillPayment

    user1 = setup_data["user1"]
    user1.role = "admin"
    user1.save()

    user2 = setup_data["user2"]
    company1 = setup_data["company1"]
    company2 = setup_data["company2"]

    vendor1 = Vendor.objects.create(company=company1, name="Cloud Server Provider Ltd", email="billing@cloudprovider.com")
    vendor2 = Vendor.objects.create(company=company2, name="Competitor Vendor", email="sales@comp.com")

    client = APIClient()
    client.force_authenticate(user=user1)

    # 1. Create a Bill with items, category, and payment terms
    create_res = client.post("/api/v1/crm/bills/", {
        "vendor": vendor1.id,
        "bill_date": "2026-11-01",
        "due_date": "2026-11-15",
        "category": "software",
        "payment_terms": "Net 15",
        "status": "open",
        "subtotal": "10000.00",
        "tax_amount": "1800.00",
        "total_amount": "11800.00",
        "notes": "Dedicated GPU server instances",
        "items": [
            {"description": "GPU Instance A100", "quantity": 1, "unit_price": 10000, "tax_rate": 18, "total": 11800}
        ]
    }, format="json")
    assert create_res.status_code == 201
    bill_id = create_res.data["id"]

    bill = Bill.objects.get(id=bill_id)
    assert bill.company == company1
    assert str(bill.total_amount) == "11800.00"
    assert str(bill.amount_due) == "11800.00"
    assert bill.category == "software"
    assert bill.payment_terms == "Net 15"

    # 2. Check KPIs endpoint
    kpis_res = client.get("/api/v1/crm/bills/kpis/")
    assert kpis_res.status_code == 200
    assert kpis_res.data["total_outstanding"] >= 11800.0

    # 3. Record Partial Payment (₹5,000)
    pay1_res = client.post(f"/api/v1/crm/bills/{bill_id}/record-payment/", {
        "amount": "5000.00",
        "payment_date": "2026-11-05",
        "payment_method": "bank_transfer",
        "transaction_id": "UTR5000PARTIAL",
        "notes": "Part payment 1"
    })
    assert pay1_res.status_code == 201
    bill.refresh_from_db()
    assert str(bill.amount_paid) == "5000.00"
    assert str(bill.amount_due) == "6800.00"
    assert bill.status == Bill.Status.PARTIAL
    assert bill.payments.count() == 1

    # 4. Record Final Settlement Payment (₹6,800)
    pay2_res = client.post(f"/api/v1/crm/bills/{bill_id}/record-payment/", {
        "amount": "6800.00",
        "payment_date": "2026-11-10",
        "payment_method": "upi",
        "transaction_id": "UPI6800FINAL",
        "notes": "Full balance clearance"
    })
    assert pay2_res.status_code == 201
    bill.refresh_from_db()
    assert str(bill.amount_paid) == "11800.00"
    assert str(bill.amount_due) == "0.00"
    assert bill.status == Bill.Status.PAID
    assert bill.payments.count() == 2

    # 5. PDF Voucher generation
    pdf_res = client.get(f"/api/v1/crm/bills/{bill_id}/pdf/")
    assert pdf_res.status_code == 200
    assert pdf_res["Content-Type"] == "application/pdf"
    assert len(pdf_res.content) > 100

    # 6. Multi-tenant security isolation check
    client.force_authenticate(user=user2)
    # User 2 cannot access bill details or record payments
    assert client.get(f"/api/v1/crm/bills/{bill_id}/").status_code == 404
    assert client.post(f"/api/v1/crm/bills/{bill_id}/record-payment/", {"amount": "100.00"}).status_code == 404
    assert client.get(f"/api/v1/crm/bills/{bill_id}/pdf/").status_code == 404



