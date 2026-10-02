FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV DJANGO_SETTINGS_MODULE=config.settings.prod

WORKDIR /app

# GeoDjango runtime dependencies (GDAL, GEOS, PROJ) + Postgres client
RUN apt-get update && apt-get install -y --no-install-recommends \
        binutils \
        libproj-dev \
        gdal-bin \
        libgdal-dev \
        libgeos-dev \
        libpq-dev \
        postgresql-client \
        gcc \
        curl \
    && rm -rf /var/lib/apt/lists/*

# GDAL_LIBRARY_PATH / GEOS_LIBRARY_PATH are deliberately left unset: Debian installs the
# libraries under the multiarch dir (/usr/lib/<arch>-linux-gnu/), and GeoDjango finds them
# there automatically on both amd64 and arm64.

COPY requirements/ /app/requirements/
RUN pip install --no-cache-dir -r requirements/prod.txt

COPY . /app/

# media/ and staticfiles/ are excluded from the build context, so create them here:
# a new named volume mounted on a path takes that path's ownership from the image,
# and without these the volumes come up root-owned and the app user can't write
# uploads or collectstatic output.
RUN useradd --create-home --shell /bin/bash app \
    && mkdir -p /app/media /app/staticfiles \
    && chown -R app:app /app
USER app

EXPOSE 8000

CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "4", "--timeout", "120", "config.wsgi:application"]
