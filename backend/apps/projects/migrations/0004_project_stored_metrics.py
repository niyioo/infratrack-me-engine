from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("projects", "0003_project_intake_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="project",
            name="health_score",
            field=models.PositiveSmallIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="project",
            name="health_band",
            field=models.CharField(blank=True, max_length=20),
        ),
        migrations.AddField(
            model_name="project",
            name="physical_completion_percent",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=5),
        ),
        migrations.AddField(
            model_name="project",
            name="financial_disbursement_percent",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=5),
        ),
        migrations.AddField(
            model_name="project",
            name="metrics_refreshed_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
