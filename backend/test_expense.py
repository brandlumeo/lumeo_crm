import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from attendance.serializers import ExpenseClaimSerializer

data = {
    "title": "Test Expense",
    "amount": "100.00",
    "description": "Test",
    "deal": ""
}
serializer = ExpenseClaimSerializer(data=data)
print("Is valid?", serializer.is_valid())
if not serializer.is_valid():
    print(serializer.errors)
