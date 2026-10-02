from .base import *

DEBUG = True
# Dev only: the Android emulator reaches the host as 10.0.2.2 and physical phones
# use whatever LAN IP the PC has today, so don't pin addresses. prod.py requires
# an explicit ALLOWED_HOSTS.
ALLOWED_HOSTS = ["*"]
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:8081",
    "http://127.0.0.1:8081",
]
CSRF_TRUSTED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
