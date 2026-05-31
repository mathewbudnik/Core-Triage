"""Unit tests for password-reset DB helpers (no real Postgres)."""
from __future__ import annotations
import os
import sys
import unittest
from unittest import mock
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))


class FakeCursor:
    def __init__(self, store):
        self.store = store
        self._result = None

    def execute(self, sql, params=()):
        s = " ".join(sql.split()).strip()
        if s.startswith("UPDATE users SET password_reset_token_hash"):
            token_hash, expires_at, uid = params
            self.store.setdefault(uid, {})["hash"] = token_hash
            self.store[uid]["expires"] = expires_at
            self._result = None
        elif s.startswith("SELECT id, password_reset_token_hash, password_reset_expires_at FROM users WHERE password_reset_token_hash IS NOT NULL"):
            rows = []
            for uid, data in self.store.items():
                if data.get("hash") and data.get("expires"):
                    rows.append((uid, data["hash"], data["expires"]))
            self._all = rows
            self._result = None
        elif s.startswith("UPDATE users SET password_hash"):
            new_password_hash, uid = params
            self.store.setdefault(uid, {})["password_hash"] = new_password_hash
            self.store[uid]["hash"] = None
            self.store[uid]["expires"] = None
        else:
            self._result = None

    def fetchone(self):
        return self._result

    def fetchall(self):
        return getattr(self, "_all", [])

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False


class FakeConn:
    def __init__(self, store):
        self._store = store

    def cursor(self):
        return FakeCursor(self._store)

    def commit(self):
        pass

    def rollback(self):
        pass


class PasswordResetDbTests(unittest.TestCase):
    def setUp(self):
        self.store = {}
        from contextlib import contextmanager

        @contextmanager
        def fake_connect():
            yield FakeConn(self.store)

        self._patcher = mock.patch("database._connect", fake_connect)
        self._patcher.start()

    def tearDown(self):
        self._patcher.stop()

    def test_set_and_consume_round_trip(self):
        from database import set_password_reset_token, consume_password_reset_token
        self.store[42] = {}
        token_hash, plaintext = set_password_reset_token(42, ttl_minutes=60)
        self.assertTrue(plaintext)
        new_user_id = consume_password_reset_token(plaintext, new_password_hash="$2b$12$fakehash")
        self.assertEqual(new_user_id, 42)

    def test_consume_returns_none_for_wrong_token(self):
        from database import set_password_reset_token, consume_password_reset_token
        self.store[42] = {}
        set_password_reset_token(42, ttl_minutes=60)
        self.assertIsNone(consume_password_reset_token("nope-this-is-not-the-real-token", new_password_hash="x"))

    def test_consume_returns_none_for_expired_token(self):
        from database import set_password_reset_token, consume_password_reset_token
        self.store[42] = {}
        _, plaintext = set_password_reset_token(42, ttl_minutes=60)
        # Manually expire it
        self.store[42]["expires"] = datetime.now(timezone.utc) - timedelta(minutes=1)
        self.assertIsNone(consume_password_reset_token(plaintext, new_password_hash="x"))

    def test_token_is_single_use(self):
        from database import set_password_reset_token, consume_password_reset_token
        self.store[42] = {}
        _, plaintext = set_password_reset_token(42, ttl_minutes=60)
        self.assertEqual(consume_password_reset_token(plaintext, new_password_hash="x"), 42)
        self.assertIsNone(consume_password_reset_token(plaintext, new_password_hash="x"))
