import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from accounts.models import User
from crm.models import Lead, Customer, Deal, Task

user = User.objects.filter(is_superuser=False).first()
company = user.company

print(f"Adding data for {company.name}")

# Add Leads
try: Lead.objects.get_or_create(company=company, email="lenny@example.com", defaults={"name": "Lenny Kravitz", "status": "new", "assigned_to": user})
except Exception as e: print("Error Lead 1:", e)
try: Lead.objects.get_or_create(company=company, email="leonard@example.com", defaults={"name": "Leonard Hofstadter", "status": "contacted", "assigned_to": user})
except Exception as e: print("Error Lead 2:", e)
try: Lead.objects.get_or_create(company=company, email="leia@example.com", defaults={"name": "Princess Leia", "status": "won", "assigned_to": user})
except Exception as e: print("Error Lead 3:", e)

# Add Customers
try: Customer.objects.get_or_create(company=company, email="lex@example.com", defaults={"name": "Lex Luthor", "phone": "1234567890", "address": "Metropolis"})
except Exception as e: print("Error Customer 1:", e)
try: Customer.objects.get_or_create(company=company, email="leo@example.com", defaults={"name": "Leo DiCaprio", "phone": "0987654321", "address": "Hollywood"})
except Exception as e: print("Error Customer 2:", e)

# Add Deals
try: Deal.objects.get_or_create(company=company, title="LexCorp Acquisition", defaults={"customer_name": "Lex Luthor", "amount": 1000000.00, "stage": "proposal", "assigned_to": user})
except Exception as e: print("Error Deal 1:", e)
try: Deal.objects.get_or_create(company=company, title="Oscar Trophy Case", defaults={"customer_name": "Leo DiCaprio", "amount": 50000.00, "stage": "won", "assigned_to": user})
except Exception as e: print("Error Deal 2:", e)

# Add Tasks
try: Task.objects.get_or_create(company=company, title="Call Lenny back", defaults={"status": "pending", "assigned_to": user})
except Exception as e: print("Error Task 1:", e)
try: Task.objects.get_or_create(company=company, title="Email Leonard about the paper", defaults={"status": "in_progress", "assigned_to": user})
except Exception as e: print("Error Task 2:", e)

print("Done adding test data.")
