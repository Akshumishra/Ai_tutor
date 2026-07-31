import random
import redis
import bcrypt
from src.backend.config import Config


# Setup Redis
redis_client = redis.from_url(Config.REDIS_URL, decode_responses=True)


def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))


def generate_otp() -> str:
    return str(random.randint(100000, 999999))


def store_otp(email: str, otp: str):
    # Store OTP with TTL of 10 minutes
    redis_client.setex(f"otp:{email}", Config.OTP_EXPIRY_SECONDS, otp)
    # Set a resend lock for 60 seconds
    redis_client.setex(f"otp_lock:{email}", Config.OTP_LOCK_SECONDS, "1")


def get_otp(email: str) -> str:
    return redis_client.get(f"otp:{email}")


def delete_otp(email: str):
    redis_client.delete(f"otp:{email}")
    redis_client.delete(f"otp_lock:{email}")


def is_otp_locked(email: str) -> bool:
    return redis_client.exists(f"otp_lock:{email}")
