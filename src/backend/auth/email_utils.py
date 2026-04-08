import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from src.backend.config import Config
from src.backend.auth.constants import OTP_EMAIL_TEMPLATE


def send_otp_email(email: str, otp: str):
    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Your AI Tutor OTP"
    msg["From"] = Config.EMAILS_FROM
    msg["To"] = email

    html = OTP_EMAIL_TEMPLATE.format(otp=otp)
    part = MIMEText(html, "html")
    msg.attach(part)

    try:
        with smtplib.SMTP(Config.SMTP_SERVER, Config.SMTP_PORT) as server:
            server.starttls()
            server.login(Config.SMTP_USERNAME, Config.SMTP_PASSWORD)
            server.sendmail(Config.EMAILS_FROM, email, msg.as_string())
        return True
    except Exception as e:
        print(f"Error sending email: {e}")
        return False
