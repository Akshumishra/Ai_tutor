from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from uuid import UUID


class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(..., min_length=8)


class UserLogin(BaseModel):
    email: EmailStr
    password: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class VerifyResetOTPRequest(BaseModel):
    email: EmailStr
    otp_code: str

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp_code: str
    new_password: str = Field(..., min_length=8)
    confirm_password: str


class OTPVerify(BaseModel):
    email: EmailStr
    otp_code: str


class GoogleLogin(BaseModel):
    credential: Optional[str] = None
    code: Optional[str] = None


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    email: Optional[str] = None


class UserRead(BaseModel):
    id: UUID
    name: str
    email: EmailStr
    is_verified: bool

    class Config:
        from_attributes = True
