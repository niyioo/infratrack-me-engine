import apps.citizen_reports.models
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("projects", "0003_project_intake_fields"),
        ("qa", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="CitizenReport",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("tracking_code", models.CharField(editable=False, max_length=16, unique=True)),
                (
                    "category",
                    models.CharField(
                        choices=[
                            ("NO_ACTIVITY", "No work happening on site"),
                            ("ABANDONED", "Project appears abandoned"),
                            ("POOR_QUALITY", "Poor quality work or materials"),
                            ("SAFETY_HAZARD", "Safety hazard to the public"),
                            ("NOT_AS_ANNOUNCED", "Work doesn't match what was announced"),
                            ("SUSPECTED_FRAUD", "Suspected corruption or fraud"),
                            ("PROGRESS_UPDATE", "Positive progress update"),
                            ("OTHER", "Other concern"),
                        ],
                        max_length=30,
                    ),
                ),
                ("description", models.TextField()),
                ("observed_on", models.DateField(blank=True, null=True)),
                ("latitude", models.FloatField(blank=True, null=True)),
                ("longitude", models.FloatField(blank=True, null=True)),
                (
                    "photo",
                    models.ImageField(
                        blank=True, null=True, upload_to=apps.citizen_reports.models.citizen_report_photo_path
                    ),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("NEW", "New"),
                            ("UNDER_REVIEW", "Under review"),
                            ("FIELD_VISIT_REQUESTED", "Field visit requested"),
                            ("ESCALATED", "Escalated"),
                            ("RESOLVED", "Resolved"),
                            ("DISMISSED", "Dismissed"),
                        ],
                        default="NEW",
                        max_length=30,
                    ),
                ),
                ("reporter_fingerprint", models.CharField(db_index=True, editable=False, max_length=64)),
                ("triaged_at", models.DateTimeField(blank=True, null=True)),
                ("triage_note", models.TextField(blank=True)),
                ("public_response", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "fraud_flag",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="citizen_reports",
                        to="qa.fraudflag",
                    ),
                ),
                (
                    "project",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="citizen_reports",
                        to="projects.project",
                    ),
                ),
                (
                    "triaged_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="triaged_citizen_reports",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
                "indexes": [models.Index(fields=["project", "created_at"], name="citizen_report_proj_created")],
            },
        ),
    ]
