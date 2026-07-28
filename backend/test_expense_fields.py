import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from attendance.serializers import ExpenseClaimSerializer

serializer = ExpenseClaimSerializer()
for field_name, field in serializer.fields.items():
    print(f"{field_name}: read_only={field.read_only}")
