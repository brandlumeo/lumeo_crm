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


@pytest.mark.django_db
def test_agency_quote_pdf_and_sow_deliverables():
    from crm.models import Quote, QuoteLineItem, Lead
    from rest_framework.test import APIClient
    company1 = Company.objects.create(name="BrandLumeo Test LLP")
    user1 = User.objects.create_user(username="admin_bl", email="admin@brandlumeo.test", password="testpassword123", company=company1, role="admin")

    lead = Lead.objects.create(
        company=company1,
        name="Edufix Learning",
        email="edufix@test.com",
        mobile="+91 70342 87049"
    )

    quote = Quote.objects.create(
        company=company1,
        lead=lead,
        client_name="EDUFIX LEARNING",
        client_address="Calicut, Payyoli - 673522",
        client_phone="+91 70342 87049",
        title="Growth Package",
        quote_number="QT-TEST-001056",
        duration="1 Month",
        overview="This quotation covers our Growth Package for Edufix Learning...",
        payment_schedule=[
            {"milestone": "50% Advance", "amount": 8000},
            {"milestone": "50% Balance", "amount": 7999}
        ],
        timeline=[{"phase": "Week 1", "description": "Onboarding"}],
        client_responsibilities=["Access to Meta Business Manager"],
        exclusions=["Ad spend paid directly to Meta"],
        terms_conditions=["50% advance required"]
    )

    p = QuoteLineItem.objects.create(
        quote=quote,
        item_number="1",
        name="Growth Package",
        quantity=1,
        unit_price=15999,
        is_included=False
    )
    QuoteLineItem.objects.create(
        quote=quote,
        parent=p,
        item_number="1.1",
        name="Promotional Videos",
        quantity=4,
        unit_price=0,
        is_included=True
    )
    quote.calculate_totals()

    assert float(quote.total) == 15999.0

    client = APIClient()
    client.force_authenticate(user=user1)

    pdf_res = client.get(f"/api/v1/crm/quotes/{quote.id}/pdf/")
    assert pdf_res.status_code == 200
    assert pdf_res["Content-Type"] == "application/pdf"
    assert len(pdf_res.content) > 1000





@pytest.mark.django_db
def test_bill_gst_tds_and_numbering(setup_data):
    """GST split, discount, round-off and TDS are computed server-side; payments settle against net payable."""
    from decimal import Decimal
    from rest_framework.test import APIClient
    from crm.models import Vendor, Bill

    user = setup_data["user1"]
    user.role = "admin"
    user.save()
    company = setup_data["company1"]
    vendor = Vendor.objects.create(company=company, name="Studio Partners LLP", tax_id="32ABCDE1234F1Z5")
    other_vendor = Vendor.objects.create(company=setup_data["company2"], name="Other Co")

    client = APIClient()
    client.force_authenticate(user=user)

    payload = {
        "vendor": vendor.id,
        "vendor_reference": "SP/2026/117",
        "bill_date": "2026-11-18",
        "status": "open",
        "tax_regime": "in_gst",
        "supply_type": "intra",
        "place_of_supply": "Kerala",
        "discount_amount": "1000",
        "round_off": "0.40",
        "tds_section": "194J_P",
        "tds_rate": "10",
        "total_amount": "1",  # client-sent totals are ignored
        "items": [
            {"description": "Consulting", "hsn_sac_code": "998311", "quantity": 2, "unit_price": 5000, "tax_rate": 18},
            {"description": "Hosting", "quantity": 1, "unit_price": 2000, "tax_rate": 18},
        ],
    }
    res = client.post("/api/v1/crm/bills/", payload, format="json")
    assert res.status_code == 201, res.data
    bill = Bill.objects.get(id=res.data["id"])

    assert bill.bill_number == "BILL-00001"
    assert bill.vendor_tax_id == "32ABCDE1234F1Z5"  # defaulted from vendor tax_id
    assert bill.taxable_amount == Decimal("11000.00")
    assert (bill.cgst_amount, bill.sgst_amount, bill.igst_amount) == (Decimal("990.00"), Decimal("990.00"), Decimal("0"))
    assert bill.total_amount == Decimal("12980.40")
    assert bill.tds_amount == Decimal("1100.00")
    assert bill.net_payable == bill.amount_due == Decimal("11880.40")
    assert bill.items.get(description="Consulting").hsn_sac_code == "998311"

    # Inter-state switches to IGST
    res = client.patch(f"/api/v1/crm/bills/{bill.id}/", {"supply_type": "inter"}, format="json")
    assert res.status_code == 200, res.data
    bill.refresh_from_db()
    assert bill.igst_amount == Decimal("1980.00") and bill.cgst_amount == 0

    # Paying the net payable (not the gross total) settles the bill
    res = client.post(f"/api/v1/crm/bills/{bill.id}/record-payment/", {"amount": "11880.40", "payment_method": "upi"})
    assert res.status_code == 201
    bill.refresh_from_db()
    assert bill.status == Bill.Status.PAID and bill.amount_due == 0

    # Sequential numbering, GSTIN validation, PO/vendor tenancy
    res = client.post("/api/v1/crm/bills/", {**payload, "vendor_reference": "SP/2026/118"}, format="json")
    assert res.data["bill_number"] == "BILL-00002"
    res = client.post("/api/v1/crm/bills/", {**payload, "vendor_tax_id": "12345"}, format="json")
    assert res.status_code == 400 and "vendor_tax_id" in res.data
    res = client.post("/api/v1/crm/bills/", {**payload, "vendor": other_vendor.id}, format="json")
    assert res.status_code == 400

    # Voucher PDF renders with the new breakdown
    res = client.get(f"/api/v1/crm/bills/{bill.id}/pdf/")
    assert res.status_code == 200


@pytest.mark.django_db
def test_bill_uae_vat_reverse_charge_and_no_tax(setup_data):
    """UAE VAT (TRN, 5%/zero/exempt, no TDS), reverse charge, and tax-free bills."""
    from decimal import Decimal
    from rest_framework.test import APIClient
    from crm.models import Vendor, Bill

    user = setup_data["user1"]
    user.role = "admin"
    user.save()
    company = setup_data["company1"]
    company.country = "United Arab Emirates"
    company.currency = "AED"
    company.save()
    vendor = Vendor.objects.create(company=company, name="Dubai Print House", tax_id="100123456700003")

    client = APIClient()
    client.force_authenticate(user=user)

    base = {
        "vendor": vendor.id,
        "bill_date": "2026-11-18",
        "status": "open",
        "tds_section": "194J_P",  # must be ignored outside India
        "tds_rate": "10",
        "items": [
            {"description": "Brochures", "quantity": 10, "unit_price": 100, "tax_rate": 5, "tax_category": "standard"},
            {"description": "Export freight", "quantity": 1, "unit_price": 500, "tax_rate": 5, "tax_category": "zero"},
            {"description": "Insurance", "quantity": 1, "unit_price": 200, "tax_rate": 5, "tax_category": "exempt"},
        ],
    }

    # Regime defaults from company country; TRN copied from vendor
    res = client.post("/api/v1/crm/bills/", base, format="json")
    assert res.status_code == 201, res.data
    bill = Bill.objects.get(id=res.data["id"])
    assert bill.tax_regime == "ae_vat"
    assert bill.vendor_tax_id == "100123456700003"
    assert bill.subtotal == Decimal("1700.00")
    assert bill.tax_amount == Decimal("50.00")  # only the standard-rated line
    assert bill.cgst_amount == bill.sgst_amount == bill.igst_amount == 0
    assert bill.tds_section == "" and bill.tds_amount == 0
    assert bill.total_amount == bill.net_payable == Decimal("1750.00")
    assert bill.items.get(description="Insurance").tax_rate == 0

    # Reverse charge: VAT recorded but not payable to the vendor
    res = client.patch(f"/api/v1/crm/bills/{bill.id}/", {"reverse_charge": True}, format="json")
    assert res.status_code == 200, res.data
    bill.refresh_from_db()
    assert bill.reverse_charge_amount == Decimal("50.00")
    assert bill.tax_amount == 0
    assert bill.total_amount == bill.amount_due == Decimal("1700.00")

    # TRN validation
    res = client.post("/api/v1/crm/bills/", {**base, "vendor_tax_id": "29ABCDE1234F1Z5"}, format="json")
    assert res.status_code == 400 and "vendor_tax_id" in res.data

    # Bill with no tax at all
    res = client.post("/api/v1/crm/bills/", {
        **base,
        "items": [{"description": "Courier", "quantity": 1, "unit_price": 80, "tax_rate": 0}],
    }, format="json")
    assert res.status_code == 201, res.data
    assert Decimal(res.data["total_amount"]) == Decimal("80.00")
    assert Decimal(res.data["tax_amount"]) == 0

    # India GST reverse charge (RCM): no CGST/SGST payable to vendor
    res = client.post("/api/v1/crm/bills/", {
        **base, "tax_regime": "in_gst", "vendor_tax_id": "", "reverse_charge": True, "tds_section": "",
        "items": [{"description": "Legal fees", "quantity": 1, "unit_price": 10000, "tax_rate": 18}],
    }, format="json")
    assert res.status_code == 201, res.data
    assert Decimal(res.data["reverse_charge_amount"]) == Decimal("1800.00")
    assert Decimal(res.data["cgst_amount"]) == 0
    assert Decimal(res.data["total_amount"]) == Decimal("10000.00")

    # PDF renders for UAE + reverse charge
    res = client.get(f"/api/v1/crm/bills/{bill.id}/pdf/")
    assert res.status_code == 200
