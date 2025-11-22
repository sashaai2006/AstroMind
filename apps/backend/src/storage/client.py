import os
from minio import Minio
from io import BytesIO
import logging

logger = logging.getLogger(__name__)

class StorageClient:
    def __init__(self):
        self.endpoint = os.getenv("MINIO_ENDPOINT", "minio:9000").replace("http://", "").replace("https://", "")
        self.access_key = os.getenv("MINIO_ACCESS_KEY", "gangai_admin")
        self.secret_key = os.getenv("MINIO_SECRET_KEY", "gangai_secret_key")
        self.bucket_name = "gangai-artifacts"
        self.client = None

    def connect(self):
        if not self.client:
            try:
                self.client = Minio(
                    self.endpoint,
                    access_key=self.access_key,
                    secret_key=self.secret_key,
                    secure=False  # Internal docker network usually http
                )
                if not self.client.bucket_exists(self.bucket_name):
                    self.client.make_bucket(self.bucket_name)
                logger.info("Connected to MinIO")
            except Exception as e:
                logger.error(f"Failed to connect to MinIO: {e}")
                raise

    def upload_file(self, project_id: str, filename: str, content: str):
        if not self.client:
            self.connect()
        
        data = BytesIO(content.encode('utf-8'))
        length = len(content.encode('utf-8'))
        object_name = f"{project_id}/{filename}"
        
        try:
            self.client.put_object(
                self.bucket_name,
                object_name,
                data,
                length,
                content_type="text/plain"
            )
            return object_name
        except Exception as e:
            logger.error(f"Failed to upload file: {e}")
            raise

# Singleton
storage = StorageClient()

