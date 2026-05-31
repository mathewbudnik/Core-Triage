"""Production startup must refuse to run with missing/placeholder secrets."""
from __future__ import annotations

import os
import sys
import unittest
from unittest import mock

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))


class StartupChecksTests(unittest.TestCase):
    def _reload_main(self):
        # main.py runs its checks at import time; reload under patched env.
        if "main" in sys.modules:
            del sys.modules["main"]
        import main  # noqa: F401

    def test_missing_stripe_webhook_secret_in_prod_raises(self):
        with mock.patch.dict(os.environ, {
            "ENVIRONMENT": "production",
            "SECRET_KEY": "a" * 64,
            "STRIPE_WEBHOOK_SECRET": "",
        }, clear=False):
            with self.assertRaises(RuntimeError) as cm:
                self._reload_main()
            self.assertIn("STRIPE_WEBHOOK_SECRET", str(cm.exception))

    def test_dev_env_does_not_require_stripe(self):
        with mock.patch.dict(os.environ, {
            "ENVIRONMENT": "development",
            "STRIPE_WEBHOOK_SECRET": "",
        }, clear=False):
            try:
                self._reload_main()
            except RuntimeError as e:
                if "STRIPE_WEBHOOK_SECRET" in str(e):
                    self.fail("Dev env should not require STRIPE_WEBHOOK_SECRET")
