from django.contrib import admin
from apps.analytics.models import PortfolioMetricSnapshot, ProjectMetricSnapshot

admin.site.register(ProjectMetricSnapshot)
admin.site.register(PortfolioMetricSnapshot)
