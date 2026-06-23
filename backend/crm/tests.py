from datetime import date, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core import mail
from django.core.exceptions import ValidationError
from django.test import TestCase
from django.test.utils import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from companies.models import Company

from .models import Customer, Deal, Lead, Note, Task, SMTPConfig, EmailTemplate, WebhookSubscription, WebhookDeliveryLog, Activity, WorkflowSequence, WorkflowStep, WorkflowRun, WorkflowStepRun
from .workflows import process_due_workflow_steps


User = get_user_model()


class CrmModelTests(TestCase):
    def setUp(self):
        self.company = Company.objects.create(name="ABC Company")
        self.other_company = Company.objects.create(name="XYZ Company")
        self.user = User.objects.create_user(
            username="manager1",
            password="StrongPass123!",
            company=self.company,
            role=User.Role.MANAGER,
        )
        self.other_user = User.objects.create_user(
            username="manager2",
            password="StrongPass123!",
            company=self.other_company,
            role=User.Role.MANAGER,
        )

    def test_lead_defaults_to_new_status(self):
        lead = Lead.objects.create(
            company=self.company,
            name="Acme Lead",
            email="lead@example.com",
            assigned_to=self.user,
        )

        self.assertEqual(lead.status, Lead.Status.NEW)

    def test_lead_rejects_assignee_from_other_company(self):
        with self.assertRaises(ValidationError):
            Lead.objects.create(
                company=self.company,
                name="Cross Tenant Lead",
                email="cross@example.com",
                assigned_to=self.other_user,
            )

    def test_customer_creation(self):
        customer = Customer.objects.create(
            company=self.company,
            name="Acme Customer",
            email="customer@example.com",
            phone="+91-9999999999",
        )

        self.assertEqual(str(customer), "Acme Customer")

    def test_deal_defaults_to_prospect_stage(self):
        deal = Deal.objects.create(
            company=self.company,
            title="Enterprise Plan",
            amount=Decimal("15000.00"),
        )

        self.assertEqual(deal.stage, Deal.Stage.PROSPECT)

    def test_task_rejects_assignee_from_other_company(self):
        with self.assertRaises(ValidationError):
            Task.objects.create(
                company=self.company,
                title="Follow up with lead",
                due_date=date.today() + timedelta(days=2),
                assigned_to=self.other_user,
            )

    def test_task_allows_same_company_assignee(self):
        task = Task.objects.create(
            company=self.company,
            title="Prepare proposal",
            due_date=date.today() + timedelta(days=3),
            assigned_to=self.user,
        )

        self.assertEqual(task.status, Task.Status.TODO)
        self.assertEqual(task.assigned_to, self.user)

    def test_note_string_representation_uses_content_snippet(self):
        note = Note.objects.create(
            company=self.company,
            content="Call scheduled for next Tuesday with procurement team.",
        )

        self.assertIn("Call scheduled", str(note))


class CrmApiTests(APITestCase):
    def setUp(self):
        self.company = Company.objects.create(name="ABC Company")
        self.other_company = Company.objects.create(name="XYZ Company")
        self.user = User.objects.create_user(
            username="manager1",
            password="StrongPass123!",
            company=self.company,
            role=User.Role.MANAGER,
        )
        self.other_user = User.objects.create_user(
            username="manager2",
            password="StrongPass123!",
            company=self.other_company,
            role=User.Role.MANAGER,
        )
        self.superuser = User.objects.create_superuser(
            username="platformadmin",
            password="StrongPass123!",
            email="admin@example.com",
        )
        self.company_lead = Lead.objects.create(
            company=self.company,
            name="Acme Lead",
            email="lead@acme.com",
            assigned_to=self.user,
        )
        self.company_lead_two = Lead.objects.create(
            company=self.company,
            name="Bravo Lead",
            email="bravo@acme.com",
            status=Lead.Status.CONTACTED,
            assigned_to=self.user,
        )
        self.other_lead = Lead.objects.create(
            company=self.other_company,
            name="Other Lead",
            email="lead@other.com",
            assigned_to=self.other_user,
        )
        self.company_deal_one = Deal.objects.create(
            company=self.company,
            title="Starter Plan",
            amount=Decimal("5000.00"),
            stage=Deal.Stage.PROSPECT,
        )
        self.company_deal_two = Deal.objects.create(
            company=self.company,
            title="Enterprise Plan",
            amount=Decimal("25000.00"),
            stage=Deal.Stage.PROPOSAL,
        )
        self.company_task_one = Task.objects.create(
            company=self.company,
            title="Send intro email",
            due_date=date.today() + timedelta(days=1),
            status=Task.Status.TODO,
            assigned_to=self.user,
        )
        self.company_task_two = Task.objects.create(
            company=self.company,
            title="Schedule discovery call",
            due_date=date.today() + timedelta(days=7),
            status=Task.Status.IN_PROGRESS,
            assigned_to=self.user,
        )

    def test_lead_list_requires_authentication(self):
        response = self.client.get(reverse("crm:lead-list"))

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_lead_list_is_scoped_to_authenticated_users_company(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.get(reverse("crm:lead-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 2)
        returned_ids = {item["id"] for item in response.data["results"]}
        self.assertEqual(returned_ids, {self.company_lead.id, self.company_lead_two.id})

    def test_lead_detail_returns_404_for_other_company_record(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.get(
            reverse("crm:lead-detail", kwargs={"pk": self.other_lead.pk})
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_create_lead_assigns_authenticated_users_company(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            reverse("crm:lead-list"),
            {
                "name": "Fresh Lead",
                "email": "fresh@example.com",
                "status": Lead.Status.CONTACTED,
                "assigned_to_id": self.user.id,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        created = Lead.objects.get(pk=response.data["id"])
        self.assertEqual(created.company, self.company)
        self.assertEqual(created.assigned_to, self.user)

    def test_create_lead_rejects_other_company_assignee(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            reverse("crm:lead-list"),
            {
                "name": "Invalid Lead",
                "email": "invalid@example.com",
                "assigned_to_id": self.other_user.id,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("assigned_to_id", response.data)

    def test_lead_list_supports_status_filter(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.get(
            reverse("crm:lead-list"),
            {"status": Lead.Status.CONTACTED},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["id"], self.company_lead_two.id)

    def test_lead_list_supports_search(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.get(reverse("crm:lead-list"), {"search": "Bravo"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["id"], self.company_lead_two.id)

    def test_lead_list_supports_ordering(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.get(reverse("crm:lead-list"), {"ordering": "name"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ordered_names = [item["name"] for item in response.data["results"]]
        self.assertEqual(ordered_names, ["Acme Lead", "Bravo Lead"])

    def test_create_customer_assigns_authenticated_users_company(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            reverse("crm:customer-list"),
            {
                "name": "Acme Customer",
                "email": "customer@example.com",
                "phone": "+91-9999999999",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        customer = Customer.objects.get(pk=response.data["id"])
        self.assertEqual(customer.company, self.company)

    def test_customer_list_supports_email_filter(self):
        Customer.objects.create(
            company=self.company,
            name="First Customer",
            email="first@example.com",
            phone="+91-9999999998",
        )
        Customer.objects.create(
            company=self.company,
            name="Second Customer",
            email="second@example.com",
            phone="+91-9999999997",
        )
        self.client.force_authenticate(user=self.user)

        response = self.client.get(
            reverse("crm:customer-list"),
            {"email": "second@example.com"},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["email"], "second@example.com")

    def test_create_deal_assigns_authenticated_users_company(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            reverse("crm:deal-list"),
            {
                "title": "Enterprise Annual Plan",
                "amount": "25000.00",
                "stage": Deal.Stage.PROPOSAL,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        deal = Deal.objects.get(pk=response.data["id"])
        self.assertEqual(deal.company, self.company)

    def test_deal_list_supports_stage_and_amount_filters(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.get(
            reverse("crm:deal-list"),
            {
                "stage": Deal.Stage.PROPOSAL,
                "min_amount": "20000.00",
            },
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["id"], self.company_deal_two.id)

    def test_create_task_rejects_other_company_assignee(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            reverse("crm:task-list"),
            {
                "title": "Send contract",
                "due_date": str(date.today() + timedelta(days=5)),
                "assigned_to_id": self.other_user.id,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("assigned_to_id", response.data)

    def test_task_list_supports_status_and_due_date_filters(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.get(
            reverse("crm:task-list"),
            {
                "status": Task.Status.IN_PROGRESS,
                "due_date_to": str(date.today() + timedelta(days=10)),
            },
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["id"], self.company_task_two.id)

    def test_create_note_assigns_authenticated_users_company(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            reverse("crm:note-list"),
            {
                "content": "Customer requested follow-up next week.",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        note = Note.objects.get(pk=response.data["id"])
        self.assertEqual(note.company, self.company)

    def test_note_list_supports_search(self):
        Note.objects.create(
            company=self.company,
            content="Send pricing breakdown after internal review.",
        )
        Note.objects.create(
            company=self.company,
            content="Customer asked about onboarding timeline.",
        )
        self.client.force_authenticate(user=self.user)

        response = self.client.get(reverse("crm:note-list"), {"search": "pricing"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertIn("pricing breakdown", response.data["results"][0]["content"])

    def test_superuser_can_create_customer_for_any_company(self):
        self.client.force_authenticate(user=self.superuser)

        response = self.client.post(
            reverse("crm:customer-list"),
            {
                "company_id": str(self.other_company.id),
                "name": "Platform Created Customer",
                "email": "platform@example.com",
                "phone": "+91-8888888888",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        customer = Customer.objects.get(pk=response.data["id"])
        self.assertEqual(customer.company, self.other_company)

    def test_superuser_can_filter_leads_across_companies(self):
        self.client.force_authenticate(user=self.superuser)

        response = self.client.get(
            reverse("crm:lead-list"),
            {"search": "Lead"},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 3)

    def test_deal_reordering_bulk(self):
        self.client.force_authenticate(user=self.user)
        # Create deals with default orders
        d1 = Deal.objects.create(company=self.company, title="Deal A", amount=Decimal("100.0"), stage=Deal.Stage.PROSPECT)
        d2 = Deal.objects.create(company=self.company, title="Deal B", amount=Decimal("200.0"), stage=Deal.Stage.PROSPECT)
        
        # Test bulk reorder API
        url = reverse("crm:deal-list") + "reorder/"
        payload = {
            "deals": [
                {"id": d1.id, "stage": Deal.Stage.QUALIFIED, "row_order": 10},
                {"id": d2.id, "stage": Deal.Stage.QUALIFIED, "row_order": 5}
            ]
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        d1.refresh_from_db()
        d2.refresh_from_db()
        self.assertEqual(d1.stage, Deal.Stage.QUALIFIED)
        self.assertEqual(d1.row_order, 10)
        self.assertEqual(d2.stage, Deal.Stage.QUALIFIED)
        self.assertEqual(d2.row_order, 5)

    def test_deal_reordering_multi_tenant_isolation(self):
        self.client.force_authenticate(user=self.user)
        # Deal belonging to XYZ company
        other_deal = Deal.objects.create(company=self.other_company, title="Secret Deal", amount=Decimal("500.0"), stage=Deal.Stage.PROSPECT)
        
        url = reverse("crm:deal-list") + "reorder/"
        payload = {
            "deals": [
                {"id": other_deal.id, "stage": Deal.Stage.WON, "row_order": 1}
            ]
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify it wasn't modified since it belongs to other company
        other_deal.refresh_from_db()
        self.assertEqual(other_deal.stage, Deal.Stage.PROSPECT)

    def test_premium_analytics_endpoint(self):
        self.client.force_authenticate(user=self.user)
        # Clear any setup deals to isolate expected value calculation
        Deal.objects.filter(company=self.company).delete()
        # Create deals to compute metrics
        Deal.objects.create(company=self.company, title="Won Deal", amount=Decimal("10000.0"), stage=Deal.Stage.WON, assigned_to=self.user)
        Deal.objects.create(company=self.company, title="Lost Deal", amount=Decimal("5000.0"), stage=Deal.Stage.LOST, assigned_to=self.user)
        Deal.objects.create(company=self.company, title="Prospect Deal", amount=Decimal("20000.0"), stage=Deal.Stage.PROSPECT, assigned_to=self.user)
        
        # Request analytics
        url = reverse("crm:premium_analytics")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Expected pipeline value: (10000 * 1.0) + (5000 * 0) + (20000 * 0.15) = 10000 + 3000 = 13000
        self.assertAlmostEqual(response.data["expected_pipeline_value"], 13000.0)
        self.assertEqual(response.data["win_loss"]["won"], 1)
        self.assertEqual(response.data["win_loss"]["lost"], 1)
        self.assertAlmostEqual(response.data["win_loss"]["ratio"], 50.0)
        
        # Leaderboard should list our user
        self.assertTrue(len(response.data["leaderboard"]) > 0)
        self.assertEqual(response.data["leaderboard"][0]["username"], self.user.username)
        self.assertAlmostEqual(float(response.data["leaderboard"][0]["total_closed"]), 10000.0)

    def test_smtp_config_multi_tenant_isolation(self):
        self.user.role = User.Role.ADMIN
        self.user.save()
        self.client.force_authenticate(user=self.user)
        SMTPConfig.objects.create(
            company=self.company,
            host="smtp.company.com",
            port=587,
            username="user1",
            password="pwd1",
            from_email="noreply@company.com"
        )
        
        url = reverse("crm:smtp-config-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["host"], "smtp.company.com")
        self.assertEqual(response.data["results"][0]["password"], "********")

        self.other_user.role = User.Role.ADMIN
        self.other_user.save()
        self.client.force_authenticate(user=self.other_user)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 0)

    def test_email_template_crud(self):
        self.user.role = User.Role.ADMIN
        self.user.save()
        self.client.force_authenticate(user=self.user)
        url = reverse("crm:email-template-list")
        
        response = self.client.post(url, {
            "name": "Welcome Lead",
            "subject": "Hello {{name}}",
            "body_content": "Welcome to {{company_name}}!"
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["name"], "Welcome Lead")

    def test_email_send_endpoint_parses_variables_and_logs_activity(self):
        self.client.force_authenticate(user=self.user)
        url = reverse("crm:email_send")
        
        payload = {
            "lead_id": self.company_lead.id,
            "subject": "Hello {{name}} from {{user_name}}",
            "body": "Welcome to {{company_name}}!",
        }
        
        response = self.client.post(url, payload, format="json")
        if response.status_code != 200:
            print("Response Data:", response.data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["message"], "Email sent successfully.")
        
        activity = Activity.objects.filter(lead=self.company_lead).first()
        self.assertIsNotNone(activity)
        self.assertEqual(activity.activity_type, Activity.ActivityType.EMAIL)
        self.assertIn("Subject: Hello Acme Lead from manager1", activity.description)

    from unittest.mock import patch
    @patch("requests.post")
    def test_webhook_test_event_dispatches_correctly(self, mock_post):
        class MockResponse:
            status_code = 200
            text = "OK"
        mock_post.return_value = MockResponse()
        
        self.user.role = User.Role.ADMIN
        self.user.save()
        self.client.force_authenticate(user=self.user)
        sub = WebhookSubscription.objects.create(
            company=self.company,
            target_url="https://example.com/webhook",
            secret_token="supersecret",
            event_triggers=["deal.won"]
        )
        url = reverse("crm:webhook-subscription-detail", kwargs={"pk": sub.pk}) + "test-event/"
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        mock_post.assert_called_once()
        
        log = WebhookDeliveryLog.objects.filter(subscription=sub).first()
        self.assertIsNotNone(log)
        self.assertEqual(log.response_status, 200)
        self.assertEqual(log.event_type, "webhook.test")


@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
class WorkflowSequenceTests(TestCase):
    def setUp(self):
        self.company = Company.objects.create(name="Sequence Co")
        self.user = User.objects.create_user(
            username="sequence_admin",
            password="StrongPass123!",
            company=self.company,
            role=User.Role.ADMIN,
        )

    def test_lead_creation_enrolls_sequence_and_schedules_steps(self):
        sequence = WorkflowSequence.objects.create(
            company=self.company,
            name="New lead follow-up",
            trigger_event=WorkflowSequence.TriggerEvent.LEAD_CREATED,
        )
        WorkflowStep.objects.create(
            sequence=sequence,
            order=1,
            delay_minutes=0,
            action_type=WorkflowStep.ActionType.CREATE_TASK,
            action_payload={"task_title": "Call {record_name}", "due_days_offset": 1},
        )

        lead = Lead.objects.create(
            company=self.company,
            name="Jordan Lee",
            email="jordan@example.com",
            assigned_to=self.user,
        )

        run = WorkflowRun.objects.get(sequence=sequence, record_id=lead.id)
        self.assertEqual(run.status, WorkflowRun.Status.ACTIVE)
        step_run = WorkflowStepRun.objects.get(run=run)
        self.assertEqual(step_run.status, WorkflowStepRun.Status.PENDING)
        self.assertEqual(step_run.step.order, 1)

    def test_process_due_steps_creates_linked_task_and_completes_run(self):
        sequence = WorkflowSequence.objects.create(
            company=self.company,
            name="Qualified lead task",
            trigger_event=WorkflowSequence.TriggerEvent.LEAD_CREATED,
        )
        WorkflowStep.objects.create(
            sequence=sequence,
            order=1,
            delay_minutes=0,
            action_type=WorkflowStep.ActionType.CREATE_TASK,
            action_payload={"task_title": "Follow up with {record_name}", "due_days_offset": 2},
        )

        lead = Lead.objects.create(
            company=self.company,
            name="Morgan Shaw",
            email="morgan@example.com",
            assigned_to=self.user,
        )

        processed = process_due_workflow_steps()
        self.assertEqual(processed, 1)

        run = WorkflowRun.objects.get(sequence=sequence, record_id=lead.id)
        step_run = WorkflowStepRun.objects.get(run=run)
        task = Task.objects.get(workflow_step_run=step_run)

        self.assertEqual(run.status, WorkflowRun.Status.COMPLETED)
        self.assertEqual(step_run.status, WorkflowStepRun.Status.COMPLETED)
        self.assertEqual(task.lead, lead)
        self.assertEqual(task.assigned_to, self.user)
        self.assertEqual(task.title, "Follow up with Morgan Shaw")

    def test_due_email_step_sends_and_logs_activity(self):
        sequence = WorkflowSequence.objects.create(
            company=self.company,
            name="Lead intro email",
            trigger_event=WorkflowSequence.TriggerEvent.LEAD_CREATED,
        )
        WorkflowStep.objects.create(
            sequence=sequence,
            order=1,
            delay_minutes=0,
            action_type=WorkflowStep.ActionType.SEND_EMAIL,
            action_payload={
                "subject": "Hello {{name}}",
                "body": "Welcome to {{company_name}}, {{name}}.",
            },
        )

        lead = Lead.objects.create(
            company=self.company,
            name="Taylor Cruz",
            email="taylor@example.com",
            assigned_to=self.user,
        )

        processed = process_due_workflow_steps()
        self.assertEqual(processed, 1)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].subject, "Hello Taylor Cruz")

        activity = Activity.objects.filter(lead=lead, activity_type=Activity.ActivityType.EMAIL).first()
        self.assertIsNotNone(activity)
        self.assertIn("Welcome to Sequence Co, Taylor Cruz.", activity.description)

    def test_lead_status_stop_cancels_remaining_steps(self):
        sequence = WorkflowSequence.objects.create(
            company=self.company,
            name="Multi-step follow-up",
            trigger_event=WorkflowSequence.TriggerEvent.LEAD_CREATED,
        )
        WorkflowStep.objects.create(
            sequence=sequence,
            order=1,
            delay_minutes=0,
            action_type=WorkflowStep.ActionType.CREATE_TASK,
            action_payload={"task_title": "Step 1 for {record_name}", "due_days_offset": 0},
        )
        WorkflowStep.objects.create(
            sequence=sequence,
            order=2,
            delay_minutes=60,
            action_type=WorkflowStep.ActionType.CREATE_TASK,
            action_payload={"task_title": "Step 2 for {record_name}", "due_days_offset": 0},
        )

        lead = Lead.objects.create(
            company=self.company,
            name="Riley Hart",
            email="riley@example.com",
            assigned_to=self.user,
        )
        process_due_workflow_steps()

        lead.status = Lead.Status.WON
        lead.save()

        run = WorkflowRun.objects.get(sequence=sequence, record_id=lead.id)
        step_runs = {step_run.step.order: step_run for step_run in run.step_runs.select_related("step")}

        self.assertEqual(run.status, WorkflowRun.Status.STOPPED)
        self.assertEqual(step_runs[1].status, WorkflowStepRun.Status.COMPLETED)
        self.assertEqual(step_runs[2].status, WorkflowStepRun.Status.CANCELLED)


class WorkflowSequenceApiTests(APITestCase):
    def setUp(self):
        self.company = Company.objects.create(name="API Sequence Co")
        self.user = User.objects.create_user(
            username="api_admin",
            password="StrongPass123!",
            company=self.company,
            role=User.Role.ADMIN,
        )
        self.client.force_authenticate(user=self.user)

    def test_admin_can_create_workflow_sequence_with_nested_steps(self):
        response = self.client.post(
            reverse("crm:workflow-sequence-list"),
            {
                "name": "Qualified Lead Sequence",
                "trigger_event": WorkflowSequence.TriggerEvent.LEAD_QUALIFIED,
                "steps": [
                    {
                        "order": 1,
                        "delay_minutes": 0,
                        "action_type": WorkflowStep.ActionType.CREATE_TASK,
                        "action_payload": {
                            "task_title": "Reach out to {record_name}",
                            "due_days_offset": 1,
                        },
                    },
                    {
                        "order": 2,
                        "delay_minutes": 1440,
                        "action_type": WorkflowStep.ActionType.SEND_EMAIL,
                        "action_payload": {
                            "subject": "Checking in with {{name}}",
                            "body": "Quick follow-up from {{company_name}}.",
                        },
                    },
                ],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(WorkflowSequence.objects.count(), 1)
        self.assertEqual(WorkflowStep.objects.filter(sequence__company=self.company).count(), 2)
        self.assertEqual(response.data["steps"][0]["action_type"], WorkflowStep.ActionType.CREATE_TASK)
