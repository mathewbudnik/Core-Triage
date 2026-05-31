"""HTTP-level tests for forgot/reset password endpoints."""
from __future__ import annotations
import os
import sys
import unittest
from unittest import mock
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))


class PasswordResetEndpointTests(unittest.TestCase):
    def setUp(self):
        self.user_by_email = mock.patch("main.get_user_by_email").start()
        self.set_token = mock.patch("main.set_password_reset_token").start()
        self.consume_token = mock.patch("main.consume_password_reset_token").start()
        self.send_email = mock.patch("main.send_password_reset_email").start()
        self.user_by_email.return_value = (
            7, "user@example.com", "$2b$12$fakehash", 0, None, True,
        )
        self.set_token.return_value = ("hash", "plaintext-token-1234567890")
        self.send_email.return_value = True
        from main import app
        self.client = TestClient(app)

    def tearDown(self):
        mock.patch.stopall()

    def test_forgot_password_returns_200_for_known_email(self):
        r = self.client.post("/api/auth/forgot-password", json={"email": "user@example.com"})
        self.assertEqual(r.status_code, 200)
        self.send_email.assert_called_once()

    def test_forgot_password_returns_200_for_unknown_email_no_enum(self):
        self.user_by_email.return_value = None
        r = self.client.post("/api/auth/forgot-password", json={"email": "nope@example.com"})
        self.assertEqual(r.status_code, 200)
        self.send_email.assert_not_called()

    def test_reset_password_with_valid_token_succeeds(self):
        self.consume_token.return_value = 7
        r = self.client.post("/api/auth/reset-password", json={
            "token": "plaintext-token-1234567890",
            "new_password": "NewPass123!",
        })
        self.assertEqual(r.status_code, 200)
        self.consume_token.assert_called_once()

    def test_reset_password_with_invalid_token_returns_400(self):
        self.consume_token.return_value = None
        r = self.client.post("/api/auth/reset-password", json={
            "token": "wrong",
            "new_password": "NewPass123!",
        })
        self.assertEqual(r.status_code, 400)

    def test_reset_password_rejects_weak_password(self):
        r = self.client.post("/api/auth/reset-password", json={
            "token": "plaintext-token-1234567890",
            "new_password": "short",
        })
        self.assertEqual(r.status_code, 400)
