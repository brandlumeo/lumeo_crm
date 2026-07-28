import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from attendance.serializers import ExpenseClaimSerializer

data = {
    "title": "Test Expense 2",
    "amount": "50.00",
    "description": "Test",
}
serializer = ExpenseClaimSerializer(data=data)
print("Is valid without deal?", serializer.is_valid())
if not serializer.is_valid():
    print(serializer.errors)
