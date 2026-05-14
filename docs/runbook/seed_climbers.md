# Seed Climbers Runbook

Bootstraps the Train tab leaderboard with 10 synthetic climber accounts so
new real users have peers to compare against. See the design spec:
[docs/superpowers/specs/2026-05-13-leaderboard-seed-climbers-design.md](../superpowers/specs/2026-05-13-leaderboard-seed-climbers-design.md).

## First-time setup

After the DB migrations land (they run automatically via `init_db()` on app
startup), run the init script ONCE on production:

```bash
.venv/bin/python -m scripts.seed_climbers_init
```

Expected output:

```
Seed climbers init complete: 10 new users, ~50-90 new training_logs.
```

This is idempotent — safe to re-run if something goes wrong. Re-running on a
fully-seeded DB outputs `0 new users, 0 new training_logs.`

## Daily cron (Railway)

Add a scheduled task in the Railway dashboard:

| Field | Value |
|---|---|
| Schedule | `0 6 * * *` (06:00 UTC daily) |
| Command | `python -m scripts.seed_climbers_tick` |
| Service | (same service that runs the FastAPI backend) |

The tick is idempotent — running it twice in one day is a no-op. Missing a
day produces no visible regression; the seed climbers just look like they
took a rest day.

## Verification

Open `/api/training/leaderboard?window=all&cohort=global` (authenticated)
and confirm seed climbers appear in the response. Per cohort:

- `cohort=beginner` → 3 seed climbers (Mira K., Reza A., Lior B.)
- `cohort=intermediate` → 3 (Eshan P., Yuki H., Tomi V.)
- `cohort=advanced` → 3 (Ariadne L., Linnea S., Beck M.)
- `cohort=elite` → 1 (Jasper M.)

## Teardown

When real users reach critical mass and seed climbers are no longer needed:

```sql
DELETE FROM users WHERE is_seed = TRUE;
```

Cascades to `athlete_profiles`, `training_logs`, `seed_progression` via FK.
Disable the Railway scheduled task. The leaderboard returns to whatever
real-user state exists at that moment.

## Adding or rotating personas

Edit `src/seed_climbers.py` and modify `SEED_PERSONAS`. Re-run
`seed_climbers_init.py` — new personas get inserted; existing ones unchanged.

**Do NOT** rename an existing persona — the email sentinel
(`seed+N@coretriage.local`) keys to the list index. Renaming would orphan
the prior account. To safely rename: bump the persona to a new index, then
manually delete the old `seed+N@` user from the DB.
