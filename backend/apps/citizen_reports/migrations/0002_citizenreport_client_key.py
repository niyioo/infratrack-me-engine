from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("citizen_reports", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="citizenreport",
            name="client_key",
            field=models.CharField(blank=True, default="", editable=False, max_length=64),
        ),
        migrations.AddConstraint(
            model_name="citizenreport",
            constraint=models.UniqueConstraint(
                condition=models.Q(("client_key", ""), _negated=True),
                fields=("client_key",),
                name="citizen_report_unique_client_key",
            ),
        ),
    ]
