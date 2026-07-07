import random
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from accounts.models import User
from companies.models import Company
from crm.models import Lead, Deal, Customer, Task
from attendance.models import TimeLog

class Command(BaseCommand):
    help = 'Generates dummy data for testing the CRM'

    def handle(self, *args, **kwargs):
        # We need a company to assign everything to. We will pick the first active company.
        company = Company.objects.active().first()
        if not company:
            self.stdout.write(self.style.ERROR("No active company found. Please create a company first."))
            return

        # Pick a few users in the company
        users = list(User.objects.filter(company=company))
        if not users:
            self.stdout.write(self.style.ERROR("No users found in the company."))
            return

        self.stdout.write(f"Generating data for company: {company.name}")

        # 1. Create Customers
        self.stdout.write("Creating customers...")
        customers = []
        for i in range(10):
            customer = Customer.objects.create(
                company=company,
                name=f"DummyCorp {random.randint(1000,9999)}",
                email=f"dummyclient{i}@example.com",
                phone=f"123456789{i}",
            )
            customers.append(customer)

        # 2. Create Leads and Deals
        self.stdout.write("Creating leads and deals...")
        leads = []
        for i in range(15):
            lead = Lead.objects.create(
                company=company,
                name=f"Dummy Lead {random.randint(100, 999)}",
                email=f"lead{i}@example.com",
                status=random.choice(Lead.Status.choices)[0],
                assigned_to=random.choice(users),
            )
            leads.append(lead)

            # Create deals for some leads
            if random.choice([True, False]):
                Deal.objects.create(
                    company=company,
                    title=f"Deal for {lead.name}",
                    amount=random.randint(1000, 50000),
                    assigned_to=lead.assigned_to,
                    expected_close_date=timezone.now().date() + timedelta(days=random.randint(5, 60)),
                    stage=random.choice(Deal.Stage.choices)[0],
                )

        # 3. Create Tasks
        self.stdout.write("Creating tasks...")
        for i in range(20):
            assigned = random.choice(users)
            Task.objects.create(
                company=company,
                title=f"Dummy Task {i}",
                due_date=timezone.now() + timedelta(days=random.randint(-5, 15)),
                assigned_to=assigned,
                status=random.choice(Task.Status.choices)[0],
            )

        # 4. Create TimeLogs records
        self.stdout.write("Creating TimeLogs...")
        for user in users:
            for i in range(14): # Last 14 days
                date = (timezone.now() - timedelta(days=i))
                if date.weekday() < 5: # Monday to Friday
                    # 90% chance they were present
                    if random.random() < 0.9:
                        TimeLog.objects.create(
                            user=user,
                            company=company,
                            clock_in=date.replace(hour=9, minute=random.randint(0, 30)),
                            clock_out=date.replace(hour=17, minute=random.randint(0, 30)),
                            work_location=random.choice(TimeLog.WorkLocation.choices)[0],
                        )

        self.stdout.write(self.style.SUCCESS("Successfully generated dummy data!"))
