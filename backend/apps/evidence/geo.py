from math import radians, sin, cos, sqrt, atan2


class GeoFenceService:
    @staticmethod
    def haversine_distance_meters(lat1, lon1, lat2, lon2):
        earth_radius = 6371000
        dlat = radians(lat2 - lat1)
        dlon = radians(lon2 - lon1)
        a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
        c = 2 * atan2(sqrt(a), sqrt(1 - a))
        return earth_radius * c

    @classmethod
    def validate_project_geofence(cls, project, latitude, longitude):
        site_lat = project.site_location.y
        site_lon = project.site_location.x
        distance = cls.haversine_distance_meters(site_lat, site_lon, latitude, longitude)
        return {
            "distance_meters": round(distance, 2),
            "within_geofence": distance <= project.geo_fence_radius_meters,
        }