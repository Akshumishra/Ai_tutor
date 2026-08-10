import os
from dotenv import load_dotenv

load_dotenv(override=True)


class Config:
    DATABASE_URL = os.getenv("DATABASE_URL")
    
    # Redis Configuration
    REDIS_URL = os.getenv("REDIS_URL") or "redis://localhost:6379/0"
    
    # SMTP Configuration
    SMTP_SERVER = os.getenv("SMTP_SERVER") or "smtp.gmail.com"
    SMTP_PORT = int(os.getenv("SMTP_PORT") or 587)
    SMTP_USERNAME = os.getenv("SMTP_USERNAME")
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
    EMAILS_FROM = os.getenv("EMAILS_FROM") or "no-reply@aitutor.com"

    # OTP Configuration
    OTP_EXPIRY_SECONDS = int(os.getenv("OTP_EXPIRY_SECONDS") or 600)
    OTP_LOCK_SECONDS = int(os.getenv("OTP_LOCK_SECONDS") or 60)

    # OAuth
    GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
    GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
