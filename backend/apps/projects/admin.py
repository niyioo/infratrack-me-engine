from django.contrib import admin
from apps.projects.models import Project, ProjectAssignment, ProjectStatusHistory

admin.site.register(Project)
admin.site.register(ProjectAssignment)
admin.site.register(ProjectStatusHistory)