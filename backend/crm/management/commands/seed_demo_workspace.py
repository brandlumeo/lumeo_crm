from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from companies.models import Company
from crm.models import Customer, Deal, Lead, Note, Task


class Command(BaseCommand):
    help = "Create or refresh a demo company and CRM records for local development."

    def add_arguments(self, parser):
        parser.add_argument(
            "--username",
            default=None,
            help="Username to assign to the demo workspace. Defaults to the first superuser.",
        )

    def handle(self, *args, **options):
        user = self._resolve_user(options["username"])
        company = self._ensure_company()
        self._assign_user_to_company(user, company)
        self._seed_customers(company)
        self._seed_leads(company, user)
        self._seed_deals(company)
        self._seed_tasks(company, user)
        self._seed_notes(company)

        self.stdout.write(
            self.style.SUCCESS(
                f"Demo workspace ready: {company.name} assigned to {user.username}."
            )
        )

    def _resolve_user(self, username):
        user_model = get_user_model()

        if username:
            try:
                return user_model.objects.get(username=username)
            except user_model.DoesNotExist as exc:
                raise CommandError(f"User '{username}' does not exist.") from exc

        user = user_model.objects.filter(is_superuser=True).order_by("id").first()
        if user is None:
            raise CommandError(
                "No superuser found. Create one first or pass --username."
            )

        return user

    def _ensure_company(self):
        company, _ = Company.objects.update_or_create(
            slug="northwind-trading",
            defaults={
                "name": "Northwind Trading",
                "status": Company.Status.TRIAL,
                "trial_ends_at": timezone.now() + timedelta(days=9),
            },
        )
        return company

    def _assign_user_to_company(self, user, company):
        updates = []
        if user.company_id != company.id:
            user.company = company
            updates.append("company")
        if getattr(user, "role", None) != user.Role.OWNER:
            user.role = user.Role.OWNER
            updates.append("role")

        if updates:
            user.save(update_fields=updates)

    def _seed_leads(self, company, owner):
        leads = [
            ("Apex Logistics", "buyer@apexlogistics.com", Lead.Status.NEW),
            ("Velora Health", "ops@velorahealth.com", Lead.Status.CONTACTED),
            ("Saffron Mobility", "growth@saffronmobility.com", Lead.Status.QUALIFIED),
            ("North Peak Foods", "procurement@northpeakfoods.com", Lead.Status.WON),
        ]
        for name, email, status in leads:
            Lead.objects.update_or_create(
                company=company,
                email=email,
                defaults={
                    "name": name,
                    "status": status,
                    "assigned_to": owner,
                },
            )

    def _seed_customers(self, company):
        customers = [
            ("Bluecrest Retail", "team@bluecrestretail.com", "+91-98765-10001"),
            ("Helio Finance", "hello@heliofinance.com", "+91-98765-10002"),
            ("Nova Grid", "contact@novagrid.com", "+91-98765-10003"),
        ]
        for name, email, phone in customers:
            Customer.objects.update_or_create(
                company=company,
                email=email,
                defaults={
                    "name": name,
                    "phone": phone,
                },
            )

    def _seed_deals(self, company):
        deals = [
            ("Bluecrest annual renewal", Decimal("1280000.00"), Deal.Stage.WON),
            ("Helio expansion rollout", Decimal("4860000.00"), Deal.Stage.PROPOSAL),
            ("Nova Grid integration", Decimal("920000.00"), Deal.Stage.QUALIFIED),
            ("Saffron Mobility pilot", Decimal("640000.00"), Deal.Stage.NEGOTIATION),
        ]
        for title, amount, stage in deals:
            Deal.objects.update_or_create(
                company=company,
                title=title,
                defaults={
                    "amount": amount,
                    "stage": stage,
                },
            )

    def _seed_tasks(self, company, owner):
        today = timezone.localdate()
        tasks = [
            ("Send renewal proposal to Helio Finance", today + timedelta(days=1), Task.Status.IN_PROGRESS),
            ("Confirm legal review with Bluecrest", today + timedelta(days=2), Task.Status.TODO),
            ("Prepare Nova Grid implementation handoff", today + timedelta(days=4), Task.Status.TODO),
            ("Close Saffron pilot pricing loop", today + timedelta(days=6), Task.Status.DONE),
        ]
        for title, due_date, status in tasks:
            Task.objects.update_or_create(
                company=company,
                title=title,
                defaults={
                    "due_date": due_date,
                    "status": status,
                    "assigned_to": owner,
                },
            )

    def _seed_notes(self, company):
        notes = [
            "Bluecrest asked for quarterly billing terms before renewal approval.",
            "Helio wants the rollout plan split by region and support tier.",
            "Nova Grid prefers implementation kickoff in the first week of next month.",
        ]
        for content in notes:
            Note.objects.get_or_create(company=company, content=content)
