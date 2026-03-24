from rest_framework import serializers
from apps.organizations.models import Agency, Contractor


class AgencySerializer(serializers.ModelSerializer):
    class Meta:
        model = Agency
        fields = "__all__"


class ContractorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contractor
        fields = "__all__"