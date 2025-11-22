import os
import io
import time
import logging
from minio import Minio
from minio.error import S3Error

logger = logging.getLogger(__name__)

class StorageClient:
    def __init__(self):
        self.endpoint = os.getenv("MINIO_ENDPOINT", "minio:9000").replace("http://", "")
        self.access_key = os.getenv("MINIO_ACCESS_KEY", "gangai_admin")
        self.secret_key = os.getenv("MINIO_SECRET_KEY", "gangai_secret_key")
        self.bucket = "projects"
        self.client = None
        
        # Lazy connection with retry
        self._connect()

    def _connect(self):
        retries = 5
        for i in range(retries):
            try:
                self.client = Minio(
                    endpoint=self.endpoint,
                    access_key=self.access_key,
                    secret_key=self.secret_key,
                    secure=False
                )
                if not self.client.bucket_exists(self.bucket):
                    self.client.make_bucket(self.bucket)
                logger.info("Connected to MinIO Storage")
                return
            except Exception as e:
                logger.warning(f"MinIO connection failed (attempt {i+1}/{retries}): {e}")
                time.sleep(2)
        logger.error("Could not connect to MinIO after retries.")

    def save_file(self, project_id: str, filename: str, content: str):
        """Saves code/text content to MinIO with error handling"""
        if not self.client:
            logger.error("Storage client not initialized")
            return None

        try:
            data = content.encode('utf-8')
            path = f"{project_id}/{filename}"
            
            self.client.put_object(
                self.bucket,
                path,
                io.BytesIO(data),
                len(data),
                content_type="text/plain"
            )
            logger.info(f"Saved {filename} to storage")
            return path
        except S3Error as e:
            logger.error(f"Failed to save file to MinIO: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected storage error: {e}")
            return None

    def get_file(self, path: str):
        """Retrieves file content from MinIO"""
        if not self.client:
            raise Exception("Storage client not initialized")
            
        try:
            response = self.client.get_object(self.bucket, path)
            return response.read().decode('utf-8')
        except Exception as e:
            logger.error(f"Failed to get file {path}: {e}")
            raise e
        finally:
            if 'response' in locals():
                response.close()
                
                
            response.release_conn()

storage = StorageClient()
