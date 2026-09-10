import random
import bcrypt
import time
import redis
import logging

from src.backend.config import Config

logger = logging.getLogger(__name__)

# Lazy Redis client — created on first use, not at module import time.
# This prevents the container from crashing at startup if Redis is temporarily
# unreachable, and allows the health endpoint to remain responsive.
_redis_client: redis.Redis | None = None


def get_redis_client() -> redis.Redis:
    global _redis_client
    if _redis_client is None:
        _redis_client = redis.Redis.from_url(
            Config.REDIS_URL,
            decode_responses=True,
            socket_connect_timeout=5,
        )
    return _redis_client


def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))


def generate_otp() -> str:
    return str(random.randint(100000, 999999))


def store_otp(email: str, otp: str):
    get_redis_client().setex(f"otp:{email}", Config.OTP_EXPIRY_SECONDS, otp)
    get_redis_client().setex(f"lock:{email}", Config.OTP_LOCK_SECONDS, "locked")


def get_otp(email: str) -> str:
    return get_redis_client().get(f"otp:{email}")


def delete_otp(email: str):
    get_redis_client().delete(f"otp:{email}")
    get_redis_client().delete(f"lock:{email}")


def is_otp_locked(email: str) -> bool:
    return get_redis_client().exists(f"lock:{email}") > 0
