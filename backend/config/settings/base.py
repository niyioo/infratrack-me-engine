from pathlib import Path
import os
import environ

env = environ.Env()

BASE_DIR = Path(__file__).resolve().parents[2]
environ.Env.read_env(BASE_DIR / ".env")

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

SECRET_KEY = env("SECRET_KEY", default="unsafe-dev-key")
DEBUG = env.bool("DEBUG", default=False)
ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=["*"])

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
}

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

CORS_ALLOW_ALL_ORIGINS = True

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

CELERY_BROKER_URL = env("REDIS_URL", default="redis://127.0.0.1:6379/0")
CELERY_RESULT_BACKEND = CELERY_BROKER_URL