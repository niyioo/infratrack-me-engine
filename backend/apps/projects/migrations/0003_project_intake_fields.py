from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("projects", "0002_projectlifecycleevent"),
    ]

    operations = [
        migrations.AddField(
            model_name="project",
            name="evidence_required",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="project",
            name="funding_source",
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name="project",
            name="initial_disbursement_amount",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=16),
        ),
        migrations.AddField(
            model_name="project",
            name="inspection_required",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="project",
            name="notes",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="project",
            name="priority",
            field=models.CharField(
                choices=[
                    ("LOW", "Low"),
                    ("MEDIUM", "Medium"),
                    ("HIGH", "High"),
                    ("CRITICAL", "Critical"),
                ],
                default="MEDIUM",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="project",
            name="project_owner",
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name="project",
            name="reporting_frequency",
            field=models.CharField(
                choices=[
                    ("WEEKLY", "Weekly"),
                    ("BIWEEKLY", "Bi-Weekly"),
                    ("MONTHLY", "Monthly"),
                    ("QUARTERLY", "Quarterly"),
                    ("AD_HOC", "Ad Hoc"),
                ],
                default="MONTHLY",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="project",
            name="supervising_officer",
            field=models.CharField(blank=True, max_length=255),
        ),
    ]
