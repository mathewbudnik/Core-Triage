# Morning Report — Pre-Launch Must-Fix Sweep

**Worked overnight on:** 2026-04-30
**Status:** All five must-fix items resolved in code. ✅ frontend builds clean · ✅ 50/50 unit tests · ✅ 102/102 scenarios.

---

## ✅ Done while you slept (committed)

### 1. SECRET_KEY — local fixed, **production needs your hands**
- Your local `.env` had `SECRET_KEY=sk_test_…` (a Stripe key pasted into the JWT-secret slot). Replaced with a fresh `secrets.token_urlsafe(64)` value.
- The new value is in `.env` only (not committed; `.gitignore` covers it).
- Production fail-fast guard from yesterday's audit is still in place at [main.py:97-114](main.py#L97-L114) — it raises `RuntimeError` on startup if `ENVIRONMENT=production` and SECRET_KEY is missing or the dev placeholder.

**👉 You still need to do, in Railway:**
1. Open Railway → your CoreTriage backend service → Variables.
2. Generate a NEW value (do not reuse the local one — minimize the blast radius if either copy ever leaks):
   ```
   python -c "import secrets; print(secrets.token_urlsafe(64))"
   ```
3. Paste it into `SECRET_KEY`.
4. Confirm `ENVIRONMENT=production` is also set.
5. Redeploy. **All currently signed-in users will be logged out** (existing JWTs become invalid) — that's expected and correct.

### 2. Stripe webhook idempotency — done
- New table `stripe_webhook_events (event_id PK, event_type, received_at)` added to [database.py:243-253](database.py#L243-L253). Created automatically on next backend start.
- New helper `record_webhook_event(event_id, event_type)` in [database.py:498-521](database.py#L498-L521) — INSERT … ON CONFLICT DO NOTHING returns whether the event is new.
- Webhook handler [main.py:1033-1130](main.py#L1033-L1130) now records the event_id FIRST, before any side effects. Duplicate Stripe deliveries return `{"ok": true, "duplicate": true}` and skip the DB write. This is race-safe across multiple workers because Postgres enforces the PK.

### 3. Free-tier bypass via unknown price IDs — done
- The bypass: a subscription created outside our flow (Stripe dashboard, different product, $0 promo, etc.) used to flow through `update_subscription_state()` with `tier=None`, which preserved whatever tier the user already had. So someone could subscribe to ANY Stripe product on your account and keep Pro access indefinitely.
- Fix at [main.py:1101-1112](main.py#L1101-L1112): if `extract_subscription_state` returns `product=None` (= unrecognized price ID) AND it's not a deletion event, log a warning and return early — no tier change. Deletion events still force-cancel correctly.

### 4. `/api/health` actually checks the DB — done
- Was: returned `db_ready: True` from a lifespan-time flag that was never refreshed.
- Now [main.py:570-588](main.py#L570-L588): runs `SELECT 1` on every probe, returns the live result. Railway healthchecks and any uptime monitor (UptimeRobot, BetterUptime, etc.) will now actually fail when Postgres is down.

### 5. CORS — was already correct
- Audit was wrong about this. CORS is already locked to an explicit origin list at [main.py:276-288](main.py#L276-L288): `localhost:5173`, `localhost:3000`, your Vercel preview URL, `coretriage.com`, `www.coretriage.com`. No wildcard. **No change needed.**

---

## 📋 To do in Railway / Stripe dashboard (you only — I can't touch these)

| # | Where | What | Why |
|---|-------|------|-----|
| 1 | **Railway → Variables** | Set new `SECRET_KEY` (generate a fresh one, don't copy from local) | The current production value may be the leaked Stripe key, OR may be the dev placeholder. Either way, rotate. |
| 2 | **Railway → Variables** | Confirm `ENVIRONMENT=production` is set | Activates the fail-fast SECRET_KEY guard added yesterday. |
| 3 | **Stripe → Developers → Webhooks** | Confirm `STRIPE_WEBHOOK_SECRET` matches Railway's value | Already wired up, just verify after the next Stripe key rotation cycle. |
| 4 | **Stripe → Developers → Webhooks** | If you ever delete and recreate the webhook endpoint, the new dedup table will accept all events again — that's fine, just don't be surprised if you see one duplicated state-change burst on the very first re-delivery. | Informational. |

---

## 🔮 Recommended in week 1 (NOT done — needs your call)

These are from yesterday's audit. Ranked by impact:

1. **Add Sentry** (or any error tracker). Stdout logs vanish on Railway dyno restart. ~10 min setup.
2. **Pin `requirements.txt`.** Zero version pins right now → a breaking `openai` or `stripe` release ships to prod on next deploy.
3. **`Procfile` → 2 workers.** `gunicorn -w 2 -k uvicorn.workers.UvicornWorker main:app`. Currently single uvicorn worker → one slow OpenAI call blocks everything else.
4. **Postgres SSL.** Add `sslmode=require` to the connection params.
5. **Email-verification token expiry.** Currently never expires. Add a 24h TTL check.
6. **Automated DB backups.** Railway free tier is snapshots-only; set up a weekly `pg_dump` cron.
7. **Bundle splitting.** 2.1 MB unsplit JS bundle. `manualChunks` for `framer-motion` + `lucide-react` would cut TTI on mobile.

---

## 🧪 Verification I ran before committing

```
python -m unittest tests.test_triage_calibration   →  50/50 OK
python tests/run_all_scenarios.py                  →  102/102 PASS
cd frontend && npm run build                       →  built in 3.24s, no errors
python -c "import main"                            →  OK
python -c "import database"                        →  OK
```

All pre-existing tests still pass. No regressions detected.

---

## 📦 What's in this commit

- `database.py` — `stripe_webhook_events` table + `record_webhook_event()` helper
- `main.py` — webhook idempotency + unknown-price guard + real `/api/health` DB probe
- `.env` — local SECRET_KEY rotated (file is gitignored, will not appear in commit)
- `MORNING_REPORT.md` — this document

Sleep tight. The only thing blocking a confident public launch now is items #1 and #2 in the Railway/Stripe table above — both are <5 min of dashboard work.
