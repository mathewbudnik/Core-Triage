"""Transactional email sending via Resend.

Set RESEND_API_KEY in your environment to enable sending. If unset, send
operations log a warning and return False — useful for local development
where you don't want to actually send mail.

Set RESEND_FROM_EMAIL to override the From address. Defaults to the Resend
sandbox sender (`onboarding@resend.dev`), which works without a verified
domain. For production, verify your domain in the Resend dashboard and set
this to e.g. `noreply@coretriage.com`.
"""
from __future__ import annotations

import logging
import os
from typing import Optional

import requests

logger = logging.getLogger(__name__)

_RESEND_ENDPOINT = "https://api.resend.com/emails"
_DEFAULT_FROM = "CoreTriage <onboarding@resend.dev>"
_DEFAULT_TIMEOUT = 10  # seconds


def _api_key() -> Optional[str]:
    return os.getenv("RESEND_API_KEY")


def _from_address() -> str:
    return os.getenv("RESEND_FROM_EMAIL", _DEFAULT_FROM)


def send_email(to: str, subject: str, html: str, text: Optional[str] = None) -> bool:
    """Send a transactional email via Resend. Returns True on success.

    Failures are logged but never raised — email failures should not break the
    user-facing flow that triggered them (the user can request a resend)."""
    key = _api_key()
    if not key:
        logger.warning("RESEND_API_KEY not set; skipping email to %s (subject: %s)", to, subject)
        return False

    payload = {
        "from": _from_address(),
        "to": [to],
        "subject": subject,
        "html": html,
    }
    if text:
        payload["text"] = text

    try:
        resp = requests.post(
            _RESEND_ENDPOINT,
            headers={
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=_DEFAULT_TIMEOUT,
        )
        if resp.status_code >= 400:
            logger.error(
                "Resend send failed (status=%s, to=%s, subject=%s): %s",
                resp.status_code, to, subject, resp.text[:300],
            )
            return False
        return True
    except requests.RequestException as exc:
        logger.error("Resend network error sending to %s: %s", to, exc)
        return False


def send_verification_email(to: str, verify_url: str) -> bool:
    """Send the post-registration email-verification message."""
    subject = "Verify your CoreTriage email"
    html = f"""
    <!DOCTYPE html>
    <html>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background:#0b1220; color:#e7eaf0; padding:40px 20px;">
        <div style="max-width:520px; margin:0 auto; background:#101a2e; border:1px solid #1f2a44; border-radius:16px; padding:32px;">
          <h1 style="margin:0 0 16px; font-size:20px; color:#7dd3c0;">Welcome to CoreTriage</h1>
          <p style="margin:0 0 16px; font-size:14px; line-height:1.6;">
            Confirm your email address to finish setting up your account. This link will work for the next 24 hours.
          </p>
          <p style="margin:24px 0;">
            <a href="{verify_url}" style="display:inline-block; padding:12px 24px; background:#7dd3c0; color:#0b1220; text-decoration:none; border-radius:8px; font-weight:600;">
              Verify email
            </a>
          </p>
          <p style="margin:16px 0 0; font-size:12px; color:#8a93a6;">
            Or paste this link into your browser:<br>
            <span style="color:#a8b3c5; word-break:break-all;">{verify_url}</span>
          </p>
          <p style="margin:24px 0 0; font-size:11px; color:#8a93a6;">
            If you didn't create a CoreTriage account, you can safely ignore this email.
          </p>
        </div>
      </body>
    </html>
    """
    text = (
        f"Welcome to CoreTriage\n\n"
        f"Confirm your email address to finish setting up your account. This link works for the next 24 hours.\n\n"
        f"{verify_url}\n\n"
        f"If you didn't create a CoreTriage account, you can safely ignore this email."
    )
    return send_email(to=to, subject=subject, html=html, text=text)
