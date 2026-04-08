from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from src.backend.db.database import SessionLocal
from src.backend.models.user import User
from src.backend.schemas.auth_schemas import UserRegister, UserLogin, OTPVerify
from src.backend.auth.services import (
    generate_otp, store_otp, get_otp, delete_otp, 
    get_password_hash, is_otp_locked
)
from src.backend.auth.email_utils import send_otp_email


router = APIRouter(prefix="/auth", tags=["Authentication"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/send-otp")
async def send_otp(req: OTPVerify, db: Session = Depends(get_db)):
    # Check if user already exists
    user = db.query(User).filter(User.email == req.email).first()
    if user and user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is already registered and verified."
        )

    # Rate limiting
    if is_otp_locked(req.email):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Please wait 60 seconds before requesting another OTP."
        )

    # Generate and store OTP
    otp = generate_otp()
    store_otp(req.email, otp)

    # Send Email
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

    # Success: Delete OTP from Redis is done after registration is final
    return {"message": "OTP verified successfully. You can now set your password."}


@router.post("/register")
async def register(req: UserRegister, db: Session = Depends(get_db)):
    # Re-verify OTP to ensure process integrity
    cached_otp = get_otp(req.email)
    if not cached_otp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Registration session expired. Please verify OTP again."
        )

    # Check if user already exists
    existing_user = db.query(User).filter(User.email == req.email).first()
    if existing_user and existing_user.is_verified:
         raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User already registered."
        )

    if existing_user:
        # Update existing unverified user
        existing_user.name = req.name
        existing_user.hashed_password = get_password_hash(req.password)
        existing_user.is_verified = True
    else:
        # Create new verified user
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
        
    from src.backend.auth.services import verify_password
    if not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )
        
    return {
        "user_id": str(user.id),
        "name": user.name,
        "email": user.email
    }
