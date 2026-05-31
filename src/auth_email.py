"""Password-reset email rendering and dispatch via Resend."""
from __future__ import annotations

import logging

from src.email import send_email

logger = logging.getLogger(__name__)


def send_password_reset_email(to: str, reset_url: str) -> bool:
    subject = "Reset your CoreTriage password"
    html = f"""
    <p>Hi,</p>
    <p>We received a request to reset your CoreTriage password.
    Click the link below within 60 minutes to choose a new one:</p>
    <p><a href="{reset_url}">{reset_url}</a></p>
    <p>If you didn't ask for this, you can ignore this email — your password
    won't change.</p>
    <p>— CoreTriage</p>
    """
    text = (
        "We received a request to reset your CoreTriage password.\n"
        f"Open this link within 60 minutes: {reset_url}\n\n"
        "If you didn't ask for this, ignore this email."
    )
    return send_email(to=to, subject=subject, html=html, text=text)
