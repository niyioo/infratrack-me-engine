from pathlib import Path
import os
from datetime import timedelta

from .env_compat import build_env

env = build_env()

BASE_DIR = Path(__file__).resolve().parents[2]
env.read_env(BASE_DIR / ".env")

# Windows DLL dependency loading
if os.name == "nt":
    osgeo4w_bin = env("OSGEO4W_BIN", default="")
    if osgeo4w_bin and hasattr(os, "add_dll_directory"):
        os.add_dll_directory(osgeo4w_bin)

# GIS data dirs
gdal_data = env("GDAL_DATA", default="")
proj_lib = env("PROJ_LIB", default="")

if gdal_data:
    os.environ["GDAL_DATA"] = gdal_data

if proj_lib:
    os.environ["PROJ_LIB"] = proj_lib
    os.environ["PROJ_DATA"] = proj_lib

# GeoDjango library paths
GDAL_LIBRARY_PATH = env("GDAL_LIBRARY_PATH", default="")
GEOS_LIBRARY_PATH = env("GEOS_LIBRARY_PATH", default="")

SECRET_KEY = env("SECRET_KEY", default="unsafe-local-dev-secret-key")
DEBUG = env.bool("DEBUG", default=False)
ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=["127.0.0.1", "172.20.10.4", "localhost"])

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.gis",
    "rest_framework",
    "rest_framework_simplejwt",
    "django_filters",
    "corsheaders",
    "django_celery_beat",
    "drf_spectacular",
    "apps.common.apps.CommonConfig",
    "apps.accounts.apps.AccountsConfig",
    "apps.organizations.apps.OrganizationsConfig",
    "apps.projects.apps.ProjectsConfig",
    "apps.milestones.apps.MilestonesConfig",
    "apps.evidence.apps.EvidenceConfig",
    "apps.qa.apps.QaConfig",
    "apps.finance.apps.FinanceConfig",
    "apps.audits.apps.AuditsConfig",
    "apps.analytics.apps.AnalyticsConfig",
    "apps.notifications.apps.NotificationsConfig",
    "apps.citizen_reports.apps.CitizenReportsConfig",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.contrib.gis.db.backends.postgis",
        "NAME": env("DB_NAME", default="infratrack"),
        "USER": env("DB_USER", default="infra"),
        "PASSWORD": env("DB_PASSWORD", default="infra1234"),
        "HOST": env("DB_HOST", default="127.0.0.1"),
        "PORT": env("DB_PORT", default="5432"),
    }
}

AUTH_USER_MODEL = "accounts.User"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_FILTER_BACKENDS": (
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ),
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": env("THROTTLE_ANON", default="60/min"),
        "user": env("THROTTLE_USER", default="1000/day"),
        "login": env("THROTTLE_LOGIN", default="5/min"),
        "evidence_upload": env("THROTTLE_EVIDENCE_UPLOAD", default="30/hour"),
        "finance_action": env("THROTTLE_FINANCE_ACTION", default="20/hour"),
        "override_request": env("THROTTLE_OVERRIDE_REQUEST", default="10/day"),
        "citizen_report": env("THROTTLE_CITIZEN_REPORT", default="10/hour"),
        "citizen_lookup": env("THROTTLE_CITIZEN_LOOKUP", default="120/hour"),
    },
    # How many reverse proxies sit in front of Django. X-Forwarded-For is only trusted
    # this many hops deep; 0 means use REMOTE_ADDR (set to 1 behind nginx/a load balancer).
    "NUM_PROXIES": env.int("NUM_PROXIES", default=0),
}

# Citizen reports: automatic risk escalation by distinct anonymous reporters.
CITIZEN_REPORT_WINDOW_DAYS = env.int("CITIZEN_REPORT_WINDOW_DAYS", default=30)
CITIZEN_REPORT_HIGH_THRESHOLD = env.int("CITIZEN_REPORT_HIGH_THRESHOLD", default=3)
CITIZEN_REPORT_CRITICAL_THRESHOLD = env.int("CITIZEN_REPORT_CRITICAL_THRESHOLD", default=6)
CITIZEN_REPORT_DAILY_LIMIT_PER_PROJECT = env.int("CITIZEN_REPORT_DAILY_LIMIT_PER_PROJECT", default=3)

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=env.int("JWT_ACCESS_MINUTES", default=60)),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=env.int("JWT_REFRESH_DAYS", default=7)),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": False,
    "ALGORITHM": "HS256",
    "AUTH_HEADER_TYPES": ("Bearer",),
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
}

# File upload settings
MAX_UPLOAD_SIZE_MB = env.int("MAX_UPLOAD_SIZE_MB", default=50)
MAX_UPLOAD_SIZE_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024
ALLOWED_EVIDENCE_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
    "image/heic",
    "image/heif",
    "video/mp4",
    "video/quicktime",
    "video/x-msvideo",
    "application/pdf",
}
DATA_UPLOAD_MAX_MEMORY_SIZE = MAX_UPLOAD_SIZE_BYTES
FILE_UPLOAD_MAX_MEMORY_SIZE = MAX_UPLOAD_SIZE_BYTES

SPECTACULAR_SETTINGS = {
    "TITLE": "InfraTrack M&E Engine API",
    "DESCRIPTION": "Geo-verified monitoring and tranche-gating API",
    "VERSION": "1.0.0",
}

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Africa/Lagos"
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
MEDIA_URL = "/media/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_ROOT = BASE_DIR / "media"

CORS_ALLOW_ALL_ORIGINS = env.bool("CORS_ALLOW_ALL_ORIGINS", default=False)
CORS_ALLOWED_ORIGINS = env.list(
    "CORS_ALLOWED_ORIGINS",
    default=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8081",
        "http://127.0.0.1:8081",
        # Citizen portal (citizen-portal/)
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
)
CSRF_TRUSTED_ORIGINS = env.list(
    "CSRF_TRUSTED_ORIGINS",
    default=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
)
CORS_ALLOW_CREDENTIALS = env.bool("CORS_ALLOW_CREDENTIALS", default=True)

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

CELERY_BROKER_URL = env("REDIS_URL", default="redis://127.0.0.1:6379/0")
CELERY_RESULT_BACKEND = CELERY_BROKER_URL
CELERY_BEAT_SCHEDULER = "django_celery_beat.schedulers:DatabaseScheduler"
CELERY_TASK_ALWAYS_EAGER = env.bool("CELERY_TASK_ALWAYS_EAGER", default=False)
CELERY_TASK_EAGER_PROPAGATES = env.bool("CELERY_TASK_EAGER_PROPAGATES", default=False)
ANALYTICS_PORTFOLIO_REFRESH_MINUTES = env.int("ANALYTICS_PORTFOLIO_REFRESH_MINUTES", default=15)
ANALYTICS_PROJECT_REFRESH_MINUTES = env.int("ANALYTICS_PROJECT_REFRESH_MINUTES", default=60)
CELERY_BEAT_SCHEDULE = {
    "refresh-portfolio-snapshots": {
        "task": "apps.analytics.tasks.refresh_portfolio_snapshots_task",
        "schedule": timedelta(minutes=ANALYTICS_PORTFOLIO_REFRESH_MINUTES),
    },
    "refresh-all-project-snapshots": {
        "task": "apps.analytics.tasks.refresh_all_project_snapshots_task",
        "schedule": timedelta(minutes=ANALYTICS_PROJECT_REFRESH_MINUTES),
    },
}
