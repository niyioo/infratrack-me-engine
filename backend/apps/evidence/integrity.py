import hashlib


class IntegrityService:
    @staticmethod
    def sha256_for_uploaded_file(file_obj):
        hasher = hashlib.sha256()
        for chunk in file_obj.chunks():
            hasher.update(chunk)
        return hasher.hexdigest()