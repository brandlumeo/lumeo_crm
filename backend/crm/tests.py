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


