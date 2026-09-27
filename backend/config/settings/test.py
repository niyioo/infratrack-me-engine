from .base import *
from .env_compat import build_env

env = build_env()

TEST_RUNNER = "django.test.runner.DiscoverRunner"
PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.MD5PasswordHasher",
]

DATABASES["default"]["TEST"] = {
    "NAME": env("TEST_DB_NAME", default="infratrack_test"),
}
