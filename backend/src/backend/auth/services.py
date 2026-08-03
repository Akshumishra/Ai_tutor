import random
import bcrypt
import time
import redis

from src.backend.config import Config

redis_client = redis.Redis.from_url(Config.REDIS_URL, decode_responses=True)

def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

def generate_otp() -> str:
    return str(random.randint(100000, 999999))

def store_otp(email: str, otp: str):
    redis_client.setex(f"otp:{email}", Config.OTP_EXPIRY_SECONDS, otp)
    redis_client.setex(f"lock:{email}", Config.OTP_LOCK_SECONDS, "locked")

def get_otp(email: str) -> str:
    return redis_client.get(f"otp:{email}")

def delete_otp(email: str):
    redis_client.delete(f"otp:{email}")
    redis_client.delete(f"lock:{email}")

def is_otp_locked(email: str) -> bool:
    return redis_client.exists(f"lock:{email}") > 0
