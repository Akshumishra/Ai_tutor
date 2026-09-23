import os
import re
import httpx
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from google.oauth2 import id_token
from google.auth.transport import requests

from src.backend.db.database import SessionLocal
from src.backend.models.user import User
from src.backend.schemas.auth_schemas import (
    UserRegister, UserLogin, OTPVerify, GoogleLogin,
    ForgotPasswordRequest, VerifyResetOTPRequest, ResetPasswordRequest
)
from src.backend.auth.services import (
    generate_otp, store_otp, get_otp, delete_otp, 
    get_password_hash, is_otp_locked, verify_password
)
from src.backend.auth.email_utils import send_otp_email
from src.backend.config import Config

router = APIRouter(prefix="/auth", tags=["Authentication"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/send-otp")
async def send_otp(req: OTPVerify, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if user and user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is already registered and verified."
        )

    if is_otp_locked(req.email):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Please wait 60 seconds before requesting another OTP."
        )

    otp = generate_otp()
    store_otp(req.email, otp)

    if not send_otp_email(req.email, otp):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error delivering verification email. Please check SMTP settings."
        )

    return {"message": "OTP sent successfully to your email."}


@router.post("/verify-otp")
async def verify_otp(req: OTPVerify):
    cached_otp = get_otp(req.email)
    if not cached_otp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP has expired or does not exist."
        )

    if cached_otp != req.otp_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OTP code."
        )

    return {"message": "OTP verified successfully. You can now set your password."}


@router.post("/register")
async def register(req: UserRegister, db: Session = Depends(get_db)):
    cached_otp = get_otp(req.email)
    if not cached_otp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Registration session expired. Please verify OTP again."
        )

    existing_user = db.query(User).filter(User.email == req.email).first()
    if existing_user and existing_user.is_verified:
         raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User already registered."
        )

    if existing_user:
        existing_user.name = req.name
        existing_user.hashed_password = get_password_hash(req.password)
        existing_user.is_verified = True
    else:
        new_user = User(
            name=req.name,
            email=req.email,
            hashed_password=get_password_hash(req.password),
            is_verified=True
        )
        db.add(new_user)

    db.commit()
    delete_otp(req.email)
    return {"message": "Registration successful! You can now log in."}


@router.post("/login")
async def login(req: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )
    
    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email not verified. Please register again."
        )
        
    if not user.hashed_password or not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password (if you signed up with Google, please use the Google Login button)."
        )
        
    return {
        "user_id": str(user.id),
        "name": user.name,
        "email": user.email
    }


@router.post("/google")
async def google_login(req: GoogleLogin, db: Session = Depends(get_db)):
    email = None
    name = None

    try:
        if req.code:
            client_id = Config.GOOGLE_CLIENT_ID
            client_secret = Config.GOOGLE_CLIENT_SECRET
            token_res = httpx.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "code": req.code,
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "redirect_uri": "postmessage",
                    "grant_type": "authorization_code",
                },
            )
            token_data = token_res.json()
            if "error" in token_data:
                raise HTTPException(status_code=400, detail=token_data.get("error_description", "Failed to exchange code"))

            id_token_str = token_data.get("id_token")
            idinfo = id_token.verify_oauth2_token(
                id_token_str,
                requests.Request(),
                client_id
            )
            email = idinfo["email"]
            name = idinfo.get("name", "")

        elif req.credential:
            client_id = Config.GOOGLE_CLIENT_ID
            idinfo = id_token.verify_oauth2_token(
                req.credential,
                requests.Request(),
                client_id
            )
            email = idinfo["email"]
            name = idinfo.get("name", "")

        else:
            raise HTTPException(status_code=400, detail="No credential or code provided")

        user = db.query(User).filter(User.email == email).first()
        if not user:
            user = User(
                name=name,
                email=email,
                hashed_password=None,
                is_verified=True
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        return {
            "user_id": str(user.id),
            "name": user.name,
            "email": user.email
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/forgot-password")
async def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found"
        )

    otp = generate_otp()
    user.reset_otp = otp
    user.reset_otp_expires_at = datetime.utcnow() + timedelta(minutes=10)
    db.commit()
    send_otp_email(req.email, otp)
    
    return {"message": "If an account with that email exists, we sent a password reset OTP."}

@router.post("/verify-reset-otp")
async def verify_reset_otp(req: VerifyResetOTPRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not user.reset_otp or user.reset_otp != req.otp_code:
        raise HTTPException(status_code=400, detail="Invalid OTP")
        
    if user.reset_otp_expires_at and datetime.utcnow() > user.reset_otp_expires_at:
        raise HTTPException(status_code=400, detail="OTP has expired")
        
    return {"message": "OTP verified successfully"}

@router.post("/reset-password")
async def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    if req.new_password != req.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")
        
    if len(req.new_password) < 8 or \
       not re.search(r"[A-Z]", req.new_password) or \
       not re.search(r"[a-z]", req.new_password) or \
       not re.search(r"\d", req.new_password) or \
       not re.search(r"[!@#$%^&*(),.?\":{}|<>]", req.new_password):
        raise HTTPException(
            status_code=400, 
            detail="Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character."
        )

    user = db.query(User).filter(User.email == req.email).first()
    if not user or not user.reset_otp or user.reset_otp != req.otp_code:
        raise HTTPException(status_code=400, detail="Invalid OTP")
        
    if user.reset_otp_expires_at and datetime.utcnow() > user.reset_otp_expires_at:
        raise HTTPException(status_code=400, detail="OTP has expired")
        
    user.hashed_password = get_password_hash(req.new_password)
    user.reset_otp = None
    user.reset_otp_expires_at = None
    db.commit()
    
    return {"message": "Password reset successfully"}
