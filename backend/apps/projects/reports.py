"""
Project reports for funders and auditors.

`collect_project_report` gathers everything from the database into plain data;
`render_project_report_pdf` lays it out. The PDF carries a SHA-256 fingerprint of
that data, so an auditor holding two copies can tell whether they describe the
same state of the project. `export_projects_csv` is the portfolio-level export.
"""

import csv
import hashlib
import io
import json
from decimal import Decimal

from django.db.models import Count, Sum
from django.utils import timezone

from apps.analytics.services import AnalyticsService
from apps.citizen_reports.services import CitizenReportService
from apps.common.constants import SubmissionStatus, TrancheStatus


def _money(value, currency):
    return f"{currency} {Decimal(value or 0):,.2f}"


def _label(code):
    """CITIZEN_REPORT_ESCALATION -> Citizen report escalation."""
    return (code or "").replace("_", " ").capitalize() or "—"


def _date(value):
    return value.strftime("%d %b %Y") if value else "—"


def _datetime(value):
    return timezone.localtime(value).strftime("%d %b %Y %H:%M") if value else "—"


def collect_project_report(project, *, user):
    values = AnalyticsService._calculate_snapshot_values(project)
    health_score = AnalyticsService.health_from_values(values)
    currency = project.currency or ""

    counted = [SubmissionStatus.SUBMITTED, SubmissionStatus.UNDER_REVIEW, SubmissionStatus.APPROVED]
    milestones = []
    for m in project.milestones.order_by("sequence_order"):
        milestones.append(
            {
                "sequence": m.sequence_order,
                "name": m.name,
                "due_date": _date(m.due_date),
                "status": m.get_current_status_display(),
                "evidence": f"{m.submissions.filter(submission_status__in=counted).count()}/{m.required_evidence_count}",
                "qa_required": "Yes" if m.qa_required else "No",
                "completed": _date(m.completed_date),
            }
        )

    tranches = [
        {
            "number": t.tranche_number,
            "name": t.tranche_name,
            "amount": _money(t.planned_amount, currency),
            "status": t.get_current_status_display(),
            "released": _date(t.actual_release_date),
            "reference": t.release_reference or "—",
        }
        for t in project.tranches.order_by("tranche_number")
    ]
    disbursed_total = (
        project.tranches.filter(current_status=TrancheStatus.DISBURSED).aggregate(total=Sum("planned_amount"))["total"]
        or Decimal("0")
    )

    submissions = project.evidence_submissions.all()
    evidence = {
        "total": submissions.count(),
        "by_status": {
            row["submission_status"]: row["n"]
            for row in submissions.values("submission_status").annotate(n=Count("id")).order_by()
        },
        "geo_passed": submissions.filter(geo_validation_status="PASSED").count(),
        "geo_failed": submissions.filter(geo_validation_status="FAILED").count(),
        "pending_geofence_exceptions": project.geofenceexceptionrequest_set.filter(status="PENDING").count(),
    }

    qa_reviews = [
        {
            "date": _datetime(r.reviewed_at),
            "milestone": r.milestone.name,
            "decision": r.get_decision_display(),
            "score": f"{r.total_score}/{r.max_score}" if r.max_score else "—",
            "reviewer": r.reviewer.full_name or r.reviewer.email,
        }
        for r in project.qa_reviews.select_related("milestone", "reviewer").order_by("-reviewed_at")
    ]

    fraud_flags = [
        {
            "raised": _date(f.created_at),
            "type": _label(f.flag_type),
            "severity": _label(f.severity),
            "status": _label(f.status),
            "resolution": f.resolution_note or "—",
        }
        for f in project.fraud_flags.order_by("-created_at")
    ]

    # Same gate as everywhere else: complaint signals only for triage roles.
    citizen = CitizenReportService.summary_for_projects([project.id]) if CitizenReportService.can_view(user) else None

    location = project.site_location
    return {
        "project": {
            "code": project.project_code,
            "title": project.title,
            "agency": project.agency.name if project.agency_id else "—",
            "contractor": project.contractor.name if project.contractor_id else "—",
            "category": project.category or "—",
            "sector": project.sector or "—",
            "state": project.state,
            "lga": project.lga,
            "site_address": project.site_address or "—",
            "coordinates": f"{location.y:.5f}, {location.x:.5f}" if location else "—",
            "geofence_radius_m": project.geo_fence_radius_meters,
            "status": project.get_current_status_display(),
            "risk": project.get_risk_status_display(),
            "start_date": _date(project.start_date),
            "expected_end_date": _date(project.expected_end_date),
            "actual_end_date": _date(project.actual_end_date),
        },
        "performance": {
            "health_score": health_score,
            "health_band": AnalyticsService.health_band(health_score).replace("_", " ").title(),
            "physical_completion_percent": f"{values['physical_completion_percent']:.1f}%",
            "expected_progress_percent": (
                f"{values['expected_progress_percent']:.1f}%" if values["expected_progress_percent"] is not None else "—"
            ),
            "financial_disbursement_percent": f"{values['financial_disbursement_percent']:.1f}%",
            "burn_variance_percent": f"{values['burn_variance_percent']:+.1f} pts",
            "delayed_days": values["delayed_days"],
            "approved_milestones": f"{values['approved_milestones']}/{values['total_milestones']}",
        },
        "finance": {
            "budget": _money(project.budget_amount, currency),
            "disbursed": _money(disbursed_total, currency),
            "remaining": _money(project.budget_amount - disbursed_total, currency),
            "tranches": tranches,
        },
        "milestones": milestones,
        "evidence": evidence,
        "qa_reviews": qa_reviews,
        "fraud_flags": fraud_flags,
        "citizen_reports": citizen,
    }


def report_fingerprint(data):
    canonical = json.dumps(data, sort_keys=True, default=str, separators=(",", ":"))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def render_project_report_pdf(data, *, generated_by, generated_at):
    # Imported here so the rest of the app doesn't need reportlab loaded.
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import mm
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

    ink = colors.HexColor("#0F172A")
    brand = colors.HexColor("#0E3A73")
    accent = colors.HexColor("#0D9488")
    muted = colors.HexColor("#64748B")
    line = colors.HexColor("#E2E8F0")
    soft = colors.HexColor("#F1F5F9")

    styles = getSampleStyleSheet()
    body = ParagraphStyle("body", parent=styles["BodyText"], fontSize=9, leading=12, textColor=ink)
    small = ParagraphStyle("small", parent=body, fontSize=7.5, leading=10, textColor=muted)
    h1 = ParagraphStyle("h1", parent=styles["Title"], fontSize=17, leading=21, alignment=0, textColor=ink, spaceAfter=2)
    h2 = ParagraphStyle("h2", parent=styles["Heading2"], fontSize=11.5, leading=14, textColor=brand, spaceBefore=10, spaceAfter=5)
    cell = ParagraphStyle("cell", parent=body, fontSize=8, leading=10)
    cell_head = ParagraphStyle("cell_head", parent=cell, textColor=colors.white, fontName="Helvetica-Bold")

    fingerprint = report_fingerprint(data)
    project = data["project"]

    def kv_table(rows):
        t = Table([[Paragraph(k, small), Paragraph(str(v), cell)] for k, v in rows], colWidths=[42 * mm, None])
        t.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LINEBELOW", (0, 0), (-1, -1), 0.4, line),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ]))
        return t

    def grid(headers, rows, widths=None):
        if not rows:
            return Paragraph("None recorded.", small)
        table = Table(
            [[Paragraph(h, cell_head) for h in headers]] + [[Paragraph(str(v), cell) for v in r] for r in rows],
            colWidths=widths,
            repeatRows=1,
        )
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), brand),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, soft]),
            ("GRID", (0, 0), (-1, -1), 0.3, line),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ]))
        return table

    def footer(canvas, doc):
        canvas.saveState()
        canvas.setFont("Helvetica", 7)
        canvas.setFillColor(muted)
        canvas.drawString(15 * mm, 10 * mm, f"BuildWitness · {project['code']} · Fingerprint {fingerprint[:16]}…")
        canvas.drawRightString(A4[0] - 15 * mm, 10 * mm, f"Page {doc.page}")
        canvas.setStrokeColor(accent)
        canvas.setLineWidth(2)
        canvas.line(15 * mm, A4[1] - 12 * mm, A4[0] - 15 * mm, A4[1] - 12 * mm)
        canvas.restoreState()

    perf = data["performance"]
    finance = data["finance"]
    evidence = data["evidence"]

    story = [
        Paragraph("PROJECT MONITORING REPORT", ParagraphStyle("eyebrow", parent=small, textColor=accent, fontName="Helvetica-Bold")),
        Paragraph(f"{project['title']}", h1),
        Paragraph(f"{project['code']} · {project['lga']}, {project['state']}", body),
        Spacer(1, 4),
        Paragraph(f"Generated {generated_at} by {generated_by}", small),
        Spacer(1, 6),
    ]

    headline = Table(
        [[
            Paragraph(f"<b>{perf['health_score']}</b><br/>Health ({perf['health_band']})", cell),
            Paragraph(f"<b>{perf['physical_completion_percent']}</b><br/>Physical progress", cell),
            Paragraph(f"<b>{perf['financial_disbursement_percent']}</b><br/>Funds disbursed", cell),
            Paragraph(f"<b>{project['status']}</b><br/>Status · {project['risk']} risk", cell),
        ]],
        colWidths=[45 * mm] * 4,
    )
    headline.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), 0.6, line),
        ("INNERGRID", (0, 0), (-1, -1), 0.6, line),
        ("BACKGROUND", (0, 0), (-1, -1), soft),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story += [headline]

    story += [Paragraph("Project details", h2), kv_table([
        ("Implementing agency", project["agency"]),
        ("Contractor", project["contractor"]),
        ("Category / sector", f"{project['category']} / {project['sector']}"),
        ("Site", project["site_address"]),
        ("Site coordinates", f"{project['coordinates']} (geofence {project['geofence_radius_m']} m)"),
        ("Start / expected end", f"{project['start_date']} / {project['expected_end_date']}"),
        ("Actual end", project["actual_end_date"]),
        ("Expected progress by now", perf["expected_progress_percent"]),
        ("Days behind schedule", perf["delayed_days"]),
        ("Milestones approved", perf["approved_milestones"]),
    ])]

    story += [Paragraph("Finance", h2), kv_table([
        ("Approved budget", finance["budget"]),
        ("Disbursed to date", finance["disbursed"]),
        ("Remaining", finance["remaining"]),
        ("Spend vs progress", f"{perf['burn_variance_percent']} (funds disbursed minus physical progress)"),
    ]), Spacer(1, 5), grid(
        ["#", "Tranche", "Amount", "Status", "Released", "Payment ref."],
        [[t["number"], t["name"], t["amount"], t["status"], t["released"], t["reference"]] for t in finance["tranches"]],
        widths=[8 * mm, 42 * mm, 32 * mm, 26 * mm, 24 * mm, 48 * mm],
    )]

    story += [Paragraph("Milestones", h2), grid(
        ["#", "Milestone", "Due", "Status", "Evidence", "QA", "Completed"],
        [[m["sequence"], m["name"], m["due_date"], m["status"], m["evidence"], m["qa_required"], m["completed"]] for m in data["milestones"]],
        widths=[8 * mm, 58 * mm, 22 * mm, 30 * mm, 20 * mm, 14 * mm, 28 * mm],
    )]

    by_status = ", ".join(f"{k.replace('_', ' ').title()}: {v}" for k, v in sorted(evidence["by_status"].items())) or "—"
    story += [Paragraph("Field evidence", h2), kv_table([
        ("Submissions", f"{evidence['total']} ({by_status})"),
        ("Inside site geofence", evidence["geo_passed"]),
        ("Blocked outside geofence", evidence["geo_failed"]),
        ("Pending geofence exceptions", evidence["pending_geofence_exceptions"]),
    ])]

    story += [Paragraph("Quality assurance reviews", h2), grid(
        ["Date", "Milestone", "Decision", "Score", "Reviewer"],
        [[r["date"], r["milestone"], r["decision"], r["score"], r["reviewer"]] for r in data["qa_reviews"]],
        widths=[30 * mm, 50 * mm, 30 * mm, 18 * mm, 52 * mm],
    )]

    story += [Paragraph("Integrity flags", h2), grid(
        ["Raised", "Type", "Severity", "Status", "Resolution"],
        [[f["raised"], f["type"], f["severity"], f["status"], f["resolution"]] for f in data["fraud_flags"]],
        widths=[22 * mm, 38 * mm, 20 * mm, 22 * mm, 78 * mm],
    )]

    if data["citizen_reports"] is not None:
        c = data["citizen_reports"]
        story += [Paragraph("Citizen reports", h2), kv_table([
            ("Open reports", c["open"]),
            ("Escalated", c["escalated"]),
            ("New in the last 7 days", c["new_last_7_days"]),
        ]), Paragraph("Reports are anonymous; no reporter details are held or shown.", small)]

    story += [
        Spacer(1, 12),
        Paragraph("Document fingerprint (SHA-256 of the report data)", small),
        Paragraph(f"<font face='Courier'>{fingerprint}</font>", cell),
        Paragraph(
            "Two copies with the same fingerprint describe the same project state. "
            "Figures are computed from the live system at the time of generation.",
            small,
        ),
    ]

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=15 * mm,
        rightMargin=15 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
        title=f"{project['code']} project report",
        author="BuildWitness",
    )
    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    return buffer.getvalue(), fingerprint


EXPORT_COLUMNS = [
    ("project_code", "Project code"),
    ("title", "Title"),
    ("state", "State"),
    ("lga", "LGA"),
    ("category", "Category"),
    ("agency", "Agency"),
    ("contractor", "Contractor"),
    ("current_status", "Status"),
    ("risk_status", "Risk"),
    ("health_score", "Health score"),
    ("health_band", "Health band"),
    ("physical_completion_percent", "Physical progress %"),
    ("financial_disbursement_percent", "Funds disbursed %"),
    ("budget_amount", "Budget"),
    ("currency", "Currency"),
    ("start_date", "Start date"),
    ("expected_end_date", "Expected end"),
    ("actual_end_date", "Actual end"),
    ("metrics_refreshed_at", "Metrics as of"),
]


def _csv_safe(value):
    # Stop spreadsheet apps treating a cell as a formula (CSV injection).
    # Only text is escaped, so negative numbers stay numbers.
    if value is None:
        return ""
    if isinstance(value, str) and value[:1] in ("=", "+", "-", "@", "\t", "\r"):
        return "'" + value
    return value


def export_projects_csv(projects):
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow([label for _, label in EXPORT_COLUMNS])
    for p in projects.select_related("agency", "contractor"):
        row = {
            **{field: getattr(p, field, "") for field, _ in EXPORT_COLUMNS},
            "agency": p.agency.name if p.agency_id else "",
            "contractor": p.contractor.name if p.contractor_id else "",
        }
        if p.metrics_refreshed_at:
            row["metrics_refreshed_at"] = timezone.localtime(p.metrics_refreshed_at).strftime("%Y-%m-%d %H:%M")
        writer.writerow([_csv_safe(row[field]) for field, _ in EXPORT_COLUMNS])
    return buffer.getvalue()
