"""Account deletion endpoint: requires correct password, cascades via FK."""
from __future__ import annotations
import os
import sys
import unittest
from unittest import mock
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))


class AccountDeletionTests(unittest.TestCase):
    def setUp(self):
        from main import app, hash_password, create_token
        self.app = app
        self.client = TestClient(app)
        self.token = create_token(7, "user@example.com")
        self.user_hash = hash_password("CorrectPass123!")

        self.user_by_id = mock.patch("main.get_user_by_id").start()
        # get_user_by_id returns (id, email, disclaimer_accepted) — see database.py
        self.user_by_id.return_value = (7, "user@example.com", True)
        self.user_by_email = mock.patch("main.get_user_by_email").start()
        self.user_by_email.return_value = (
            7, "user@example.com", self.user_hash, 0, None, True,
        )
        self.delete_user = mock.patch("main.delete_user").start()
        self.delete_user.return_value = True

    def tearDown(self):
        mock.patch.stopall()

    def _auth(self):
        return {"Authorization": f"Bearer {self.token}"}

    def test_delete_account_requires_auth(self):
        r = self.client.request("DELETE", "/api/auth/account", json={"password": "x"})
        self.assertEqual(r.status_code, 401)

    def test_delete_account_requires_correct_password(self):
        r = self.client.request(
            "DELETE", "/api/auth/account",
            headers=self._auth(),
            json={"password": "WrongPass123!"},
        )
        self.assertEqual(r.status_code, 401)
        self.delete_user.assert_not_called()

    def test_delete_account_success(self):
        r = self.client.request(
            "DELETE", "/api/auth/account",
            headers=self._auth(),
            json={"password": "CorrectPass123!"},
        )
        self.assertEqual(r.status_code, 200)
        self.delete_user.assert_called_once_with(7)
