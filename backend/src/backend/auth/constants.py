OTP_EXPIRY_SECONDS = 600
OTP_LOCK_SECONDS = 60

OTP_EMAIL_TEMPLATE = """
<html>
    <body>
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
            <h2 style="color: #FFD700; text-align: center;">AI Tutor Verification</h2>
            <p>Hello,</p>
            <p>Thank you for registering with AI Tutor. Your One-Time Password (OTP) for email verification is:</p>
            <div style="font-size: 32px; font-weight: bold; text-align: center; margin: 30px 0; color: #1a1a1a; letter-spacing: 5px;">
                {otp}
            </div>
            <p>This code will expire in 10 minutes. If you did not request this code, please ignore this email.</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 40px 0;">
            <p style="font-size: 12px; color: #888; text-align: center;">&copy; 2026 AI Tutor. All rights reserved.</p>
        </div>
    </body>
</html>
"""
