"""
Test configuration intentionally uses the configured Django database.

This project depends on GeoDjango/PostGIS fields and geospatial behavior,
so forcing SQLite here hides real integration issues.
"""

import os
from pathlib import Path

import django
import pytest
from django.core.management import call_command


OSGEO4W_ROOT = Path(r"C:\Users\Sammy\AppData\Local\Programs\OSGeo4W")
OSGEO4W_BIN = OSGEO4W_ROOT / "bin"
GDAL_DATA = OSGEO4W_ROOT / "apps" / "gdal" / "share" / "gdal"
PROJ_LIB = OSGEO4W_ROOT / "share" / "proj"

os.environ.setdefault("SECRET_KEY", "test-secret-key")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.test")

if OSGEO4W_BIN.exists():
    os.environ.setdefault("OSGEO4W_BIN", str(OSGEO4W_BIN))
    os.environ.setdefault("GDAL_LIBRARY_PATH", str(OSGEO4W_BIN / "gdal312.dll"))
    os.environ.setdefault("GEOS_LIBRARY_PATH", str(OSGEO4W_BIN / "geos_c.dll"))

if GDAL_DATA.exists():
    os.environ.setdefault("GDAL_DATA", str(GDAL_DATA))

if PROJ_LIB.exists():
    os.environ.setdefault("PROJ_LIB", str(PROJ_LIB))
    os.environ.setdefault("PROJ_DATA", str(PROJ_LIB))

django.setup()


@pytest.fixture(scope="session")
def django_db_setup(django_db_blocker):
    """
    Reuse the provisioned PostGIS test database instead of asking the
    application user to create/drop databases during local pytest runs.
    """

    from django.conf import settings

    test_db_name = os.environ.get("TEST_DB_NAME", "infratrack_test")
    settings.DATABASES["default"]["NAME"] = test_db_name
    settings.DATABASES["default"].setdefault("TEST", {})["NAME"] = test_db_name

    with django_db_blocker.unblock():
        call_command("migrate", interactive=False, run_syncdb=True, verbosity=0)

    yield
