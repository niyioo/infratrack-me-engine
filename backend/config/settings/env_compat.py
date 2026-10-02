import os
from pathlib import Path


class FallbackEnv:
    """
    Minimal subset of django-environ used by this project.

    It keeps local runtime and tests working when django-environ is not
    installed, without changing the calling code throughout settings.
    """

    @staticmethod
    def read_env(path):
        env_path = Path(path)
        if not env_path.exists():
            return

        for raw_line in env_path.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))

    def __call__(self, key, default=None):
        return os.environ.get(key, default)

    def bool(self, key, default=False):
        value = os.environ.get(key)
        if value is None:
            return default
        return str(value).strip().lower() in {"1", "true", "yes", "on"}

    def int(self, key, default=0):
        value = os.environ.get(key)
        if value is None:
            return default
        return int(value)

    def list(self, key, default=None):
        value = os.environ.get(key)
        if value is None:
            return list(default or [])
        return [item.strip() for item in value.split(",") if item.strip()]


def build_env():
    try:
        import environ  # type: ignore

        return environ.Env()
    except ModuleNotFoundError:
        return FallbackEnv()
