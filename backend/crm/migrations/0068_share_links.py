import uuid

from django.db import migrations, models

MODELS = ("invoicepayment", "order", "purchaseorder")


def fill_tokens(apps, schema_editor):
    for name in MODELS:
        Model = apps.get_model("crm", name)
        for pk in Model.objects.values_list("pk", flat=True):
            Model.objects.filter(pk=pk).update(public_token=uuid.uuid4())


class Migration(migrations.Migration):

    dependencies = [
        ("crm", "0067_sales_tax_regime"),
    ]

    operations = [
        *[
            migrations.AddField(
                model_name=name,
                name="public_token",
                field=models.UUIDField(null=True, editable=False),
            )
            for name in MODELS
        ],
        migrations.RunPython(fill_tokens, migrations.RunPython.noop),
        *[
            migrations.AlterField(
                model_name=name,
                name="public_token",
                field=models.UUIDField(default=uuid.uuid4, editable=False, unique=True),
            )
            for name in MODELS
        ],
        migrations.AlterField(
            model_name="activity",
            name="activity_type",
            field=models.CharField(
                choices=[
                    ("call", "Call"),
                    ("meeting", "Meeting"),
                    ("email", "Email"),
                    ("note", "Note"),
                    ("status_change", "Status Change"),
                    ("share", "Document Shared"),
                ],
                db_index=True,
                max_length=50,
            ),
        ),
    ]
