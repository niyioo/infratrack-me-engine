from django.contrib import admin
from apps.qa.models import QAReview, QAReviewItem, FraudFlag

admin.site.register(QAReview)
admin.site.register(QAReviewItem)
admin.site.register(FraudFlag)