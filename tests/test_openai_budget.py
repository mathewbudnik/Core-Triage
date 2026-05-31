"""OpenAI budget + kill switch behavior."""
from __future__ import annotations
import os
import sys
import unittest
from unittest import mock
from datetime import date

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))


class FakeCursor:
    def __init__(self, store):
        self.store = store
        self._row = None

    def execute(self, sql, params=()):
        s = " ".join(sql.split()).strip()
        if "SELECT openai_tokens_today, openai_tokens_reset_date FROM users" in s:
            uid = params[0]
            row = self.store.get(uid, {"tokens": 0, "date": None})
            self._row = (row["tokens"], row["date"])
        elif "UPDATE users SET openai_tokens_today" in s:
            tokens, reset_date, uid = params
            self.store[uid] = {"tokens": tokens, "date": reset_date}

    def fetchone(self):
        return self._row

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False


class FakeConn:
    def __init__(self, store):
        self._s = store

    def cursor(self):
        return FakeCursor(self._s)

    def commit(self):
        pass

    def rollback(self):
        pass


class OpenAIBudgetTests(unittest.TestCase):
    def setUp(self):
        from contextlib import contextmanager
        self.store = {}

        @contextmanager
        def fake_connect():
            yield FakeConn(self.store)

        self._p = mock.patch("database._connect", fake_connect)
        self._p.start()

    def tearDown(self):
        self._p.stop()

    def test_first_call_records_usage(self):
        from database import consume_openai_tokens
        ok, remaining = consume_openai_tokens(user_id=1, tokens=500, daily_cap=10_000)
        self.assertTrue(ok)
        self.assertEqual(remaining, 9_500)

    def test_blocks_when_over_cap(self):
        from database import consume_openai_tokens
        self.store[1] = {"tokens": 9_900, "date": date.today()}
        ok, remaining = consume_openai_tokens(user_id=1, tokens=500, daily_cap=10_000)
        self.assertFalse(ok)
        self.assertEqual(remaining, 100)

    def test_resets_on_new_utc_day(self):
        from database import consume_openai_tokens
        from datetime import timedelta
        self.store[1] = {"tokens": 9_999, "date": date.today() - timedelta(days=1)}
        ok, remaining = consume_openai_tokens(user_id=1, tokens=500, daily_cap=10_000)
        self.assertTrue(ok)
        self.assertEqual(remaining, 9_500)
