# Capacitor iOS Shell + IAP + Native Plugins — Design Spec

**Status:** approved for implementation
**Owner:** Mathew Budnik
**Date:** 2026-05-25

## Context

CoreTriage today is a React + Vite PWA. To launch on the App Store, the app must be packaged as a real native iOS application — Apple guideline 4.2 ("minimum functionality") rejects bare PWA wrappers. This spec covers wrapping the existing React app in a Capacitor native shell, wiring up Apple's billing surface via RevenueCat, and adding the four "must-have" native bridges that make the app feel native: haptics, push notifications, safe-area insets, and the system share sheet.

The visual chrome, motion design, tier system, and landing page redesign that wrap this work are already at a high-end-mobile bar. What this spec adds is the **gates** required to ship them through the App Store and the **native bridges** required to make the app feel like an iOS app instead of a web view.

Coaching ($89/mo) stays outside the App Store payment system because it is a human-delivered service (Budnik personally reviewing video, sending plans, async messaging). Apple exempts physical services delivered by humans from IAP. The existing "Apply for coaching" mailto/form flow continues to work on both web and iOS.

## Scope

In scope (this sprint):

- Capacitor 6.x native shell, iOS only
- RevenueCat IAP integration with two products: monthly ($7.99) + annual ($79.99), both with a 14-day free trial
- Backend webhook ingesting RevenueCat events and updating CoreTriage's existing subscription columns
- Haptic feedback on key interactions
- Push notifications with two topics live at launch: new coach message and streak-about-to-break
- Native share sheet plumbing (the hook + plugin; specific share targets deferred)
- Status bar style, splash screen, app icon
- Safe-area insets so the app respects the notch / dynamic island / home indicator

Explicitly **out of scope** (each its own spec):

- App Store Connect assets (screenshots, description, App Privacy labels, support URL, keywords)
- Account deletion flow (Apple requirement, separate brainstorm)
- Specific share UIs (triage result card, climb log card, pyramid screenshot rendering)
- Quest-expiry push notification
- Android packaging
- Over-the-air JS updates (Capgo / Live Updates) — revisit post-launch
- Onboarding flow rework
- Empty / loading / error states across the app
- Performance pass (5.5 MB pose model precache reduction)
- Accessibility pass (Dynamic Type, focus traps, etc.)

## Audience

A single end user lives on one of three surfaces: the existing web app at coretriage.com, the new iOS app from the App Store, or in some cases both (signed up via web, then installed the app). Subscription state is owned by the FastAPI backend and is the same row regardless of where the user purchased. The frontend reads tier/subscription state through the existing `/api/auth/me` endpoint that the bundle helper added during the recent perf pass — no new authority over entitlement lives in the iOS app itself.

## Architecture

**Web view, not native UI.** The React app continues to be the UI in 100% of cases. Capacitor wraps it in a `WKWebView` inside a native iOS app shell. Native capabilities (IAP, haptics, push, share) are exposed via Capacitor's JavaScript bridge to the React layer through `@capacitor/*` packages. There is no Swift or Objective-C application code written by us — the Xcode project Capacitor generates is configuration plus signing, not source.

**Single source of truth for entitlement: the FastAPI backend.** The iOS app never asks RevenueCat "is this user Pro?" — it asks `/api/auth/me`. RevenueCat pushes entitlement changes to the backend via webhook. The backend writes those changes to the same `users.subscription_status` / `users.subscription_product` columns that Stripe already writes to. This keeps the existing tier-resolution logic in `get_user_state_bundle` and `get_user_tier` unchanged.

**Stripe remains the web billing path.** Users signing up at coretriage.com check out via Stripe as today. Users signing up inside the iOS app check out via RevenueCat / StoreKit. Both webhooks (Stripe + RevenueCat) write to the same columns. From a feature-gate standpoint, the source of the subscription is invisible to the rest of the codebase.

```
Web user             iOS user
   │                    │
   │ Stripe Checkout    │ RevenueCat / StoreKit
   ▼                    ▼
Stripe webhook ───┐  RevenueCat webhook
                  │      │
                  ▼      ▼
              FastAPI backend
              ─ writes users.subscription_status
              ─ writes users.subscription_product
                  │
                  ▼
            /api/auth/me  ────►  Frontend (web or iOS) reads tier from here
```

## Layer 1 — Native shell

### Capacitor install and project bootstrap

Add Capacitor 6.x to the existing `frontend/` workspace.

```bash
cd frontend
npm install @capacitor/core @capacitor/cli
npm install @capacitor/ios
npx cap init "CoreTriage" "com.coretriage.app" --web-dir=dist
npx cap add ios
```

This creates:
- `frontend/capacitor.config.ts` — Capacitor configuration
- `frontend/ios/` — generated Xcode project, checked into git

`capacitor.config.ts`:

```ts
import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.coretriage.app',
  appName: 'CoreTriage',
  webDir: 'dist',
  ios: {
    scheme: 'CoreTriage',
    contentInset: 'always',
  },
  server: {
    iosScheme: 'capacitor',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#1c2520',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
    Keyboard: {
      resize: 'native',
    },
  },
}

export default config
```

### Signing and Bundle ID

- Bundle ID: `com.coretriage.app` (Apple keyspace; cannot be changed after first TestFlight submission without re-provisioning)
- Apple Developer Team ID: Budnik's existing active account
- Provisioning profile created in App Store Connect; Xcode handles signing automatically once the Team ID is selected in `Signing & Capabilities`

### Splash screen and icon

- Source image: `frontend/branding/icon-source.png`, 1024×1024 PNG, forest background + CoreTriage logo centered
- Generate all required sizes:
  ```bash
  npm install -D @capacitor/assets
  npx capacitor-assets generate --ios
  ```
- Output lands in `frontend/ios/App/App/Assets.xcassets/`
- Splash background `#1c2520` (the `ct-forest` token), static logo, no animation. Apple HIG explicitly discourages animated splash screens.

### Safe areas

New file `frontend/src/lib/safeArea.js`:

```js
// Exposes CSS variables --ct-safe-top, --ct-safe-bottom, --ct-safe-left,
// --ct-safe-right that mirror env(safe-area-inset-*). Web fallback is 0px.

export function installSafeAreaVars() {
  const root = document.documentElement
  const set = (name, fallback) =>
    root.style.setProperty(`--ct-safe-${name}`, `env(safe-area-inset-${name}, ${fallback})`)
  set('top', '0px')
  set('bottom', '0px')
  set('left', '0px')
  set('right', '0px')
}
```

Called once from `App.jsx` on mount. Existing layout containers add `paddingTop: 'var(--ct-safe-top)'` and `paddingBottom: 'var(--ct-safe-bottom)'` where they sit at the screen edge — primarily the top of the header bar and the bottom of the mobile bottom nav.

Add `viewport-fit=cover` to the `<meta name="viewport">` in `frontend/index.html` so iOS exposes the safe-area-inset values to CSS.

### Status bar

`@capacitor/status-bar` plugin sets light text on the dark forest background. Applied once in `App.jsx`:

```jsx
useEffect(() => {
  if (Capacitor.isNativePlatform()) {
    StatusBar.setStyle({ style: Style.Light })
    StatusBar.setBackgroundColor({ color: '#1c2520' }) // Android only; iOS uses tinted background
  }
}, [])
```

### Keyboard

`@capacitor/keyboard` with `resize: 'native'` so iOS shrinks the web view when the keyboard opens. The chat composer at the bottom of `/chat` and the triage inputs no longer get covered.

---

## Layer 2 — IAP via RevenueCat

### Products in App Store Connect

Subscription Group: **CoreTriage Pro** (one group; Apple requires both monthly and annual to live in the same group so users can switch between them without double-billing).

| Product ID | Type | Price | Trial |
|---|---|---|---|
| `coretriage_pro_monthly` | Auto-renewing subscription | $7.99 USD / month | 14-day free intro |
| `coretriage_pro_annual` | Auto-renewing subscription | $79.99 USD / year | 14-day free intro |

Both products grant the RevenueCat entitlement `pro`.

### RevenueCat configuration

One project named "CoreTriage", one entitlement `pro`, one offering `default` containing both packages. App linked to the Bundle ID and the App Store Connect Shared Secret.

A `StoreKitConfig.storekit` file is checked into `frontend/ios/StoreKitConfig.storekit` for local sandbox testing in the iOS Simulator without round-tripping through App Store Connect.

### Frontend integration

New file `frontend/src/lib/iap/revenuecat.js`:

```js
// RevenueCat integration. Only initialized on native platforms.
// Web users see the existing Stripe checkout flow unchanged.

import { Capacitor } from '@capacitor/core'

let initialized = false

export async function initRevenueCat(user) {
  if (!Capacitor.isNativePlatform()) return
  if (initialized) return
  const { Purchases } = await import('@revenuecat/purchases-capacitor')
  await Purchases.configure({
    apiKey: import.meta.env.VITE_REVENUECAT_IOS_KEY,
    appUserID: String(user.id),
  })
  initialized = true
}

export async function getOfferings() {
  const { Purchases } = await import('@revenuecat/purchases-capacitor')
  const result = await Purchases.getOfferings()
  return result.current
}

export async function purchasePackage(pkg) {
  const { Purchases } = await import('@revenuecat/purchases-capacitor')
  return Purchases.purchasePackage({ aPackage: pkg })
}

export async function restorePurchases() {
  const { Purchases } = await import('@revenuecat/purchases-capacitor')
  return Purchases.restorePurchases()
}
```

The `appUserID` is the existing CoreTriage `users.id`. This means a user who signs up via the iOS app gets a RevenueCat customer keyed to their account; if they later log in on web, their subscription state is already on their server-side row (via the webhook below).

### Frontend paywall

Modify `frontend/src/components/UpgradeModal.jsx`. Add a `Capacitor.isNativePlatform()` branch:

- **Native:** call `getOfferings()` on mount, render two cards (Monthly / Annual) with `pkg.product.priceString` for Apple-localized pricing. Primary CTA calls `purchasePackage(pkg)`. Annual card is decorated with a "Save 17%" pill.
- **Web:** existing Stripe checkout flow unchanged.

Both paths include a "Restore Purchases" link that calls `restorePurchases()` on native and a no-op message on web (Stripe purchases auto-restore on auth). Apple App Review requires the restore link to exist and be functional on native.

After a successful purchase, the modal calls `await refreshMe()` (existing helper) which re-fetches `/api/auth/me`. The webhook will have updated `subscription_status` by then — but to handle race conditions, the modal optimistically marks the user as Pro in local state and dispatches the `ct:tier-promotion` event to trigger the existing celebration takeover.

### Backend integration

New endpoint in `main.py`:

```python
@app.post("/api/billing/revenuecat-webhook")
async def revenuecat_webhook(request: Request):
    # Verify Authorization header against RevenueCat shared secret.
    # See: https://www.revenuecat.com/docs/integrations/webhooks
    auth = request.headers.get("Authorization", "")
    expected = f"Bearer {os.getenv('REVENUECAT_WEBHOOK_AUTH')}"
    if not hmac.compare_digest(auth, expected):
        raise HTTPException(status_code=401, detail="Invalid signature")

    payload = await request.json()
    event = payload.get("event", {})
    event_type = event.get("type")
    app_user_id = event.get("app_user_id")
    if not app_user_id:
        return {"ok": True}

    # Map RevenueCat app_user_id (== str(users.id)) back to our user.
    try:
        user_id = int(app_user_id)
    except ValueError:
        return {"ok": True}

    entitlements = event.get("entitlement_ids") or []
    if event_type in ("INITIAL_PURCHASE", "RENEWAL", "PRODUCT_CHANGE", "UNCANCELLATION"):
        if "pro" in entitlements:
            update_subscription_from_revenuecat(
                user_id,
                status="active",
                product="pro",
                source="revenuecat",
            )
    elif event_type in ("CANCELLATION", "EXPIRATION"):
        update_subscription_from_revenuecat(
            user_id,
            status="canceled",
            product=None,
            source="revenuecat",
        )
    elif event_type == "BILLING_ISSUE":
        update_subscription_from_revenuecat(
            user_id,
            status="past_due",
            product="pro",
            source="revenuecat",
        )

    return {"ok": True}
```

The event-type set above is the minimum required by App Review. RevenueCat also dispatches `TRANSFER` and `SUBSCRIBER_ALIAS` events that this endpoint ignores — they don't affect entitlement.

New `database.py` helper:

```python
def update_subscription_from_revenuecat(user_id: int, status: str, product: Optional[str], source: str) -> None:
    """Apply a RevenueCat-sourced subscription state to a user row.

    Same target columns Stripe writes to (subscription_status, subscription_product).
    The `source` argument is stored for analytics / debugging via a new
    `subscription_source` column added by the migration in this sprint.
    """
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE users
                SET subscription_status = %s,
                    subscription_product = %s,
                    subscription_source = %s,
                    subscription_updated_at = NOW()
                WHERE id = %s;
                """,
                (status, product, source, int(user_id)),
            )
        conn.commit()
```

The `subscription_source` and `subscription_updated_at` columns are added via a new Alembic migration in `alembic/versions/0002_subscription_source.py` (Alembic was scaffolded on the stop-the-bleed branch — this is its first real use).

### Idempotency

RevenueCat retries failed webhook deliveries. To dedupe, an `event.id` is included on every event. New table `revenuecat_webhook_events (event_id TEXT PRIMARY KEY, received_at TIMESTAMPTZ)` mirrors the existing `stripe_webhook_events` pattern. The webhook handler tries to insert the event_id first and returns 200 immediately if it already exists, avoiding double-application of entitlement changes.

### Sandbox testing flow

For TestFlight builds:
1. Run on physical device signed into a Sandbox Apple ID (created in App Store Connect → Users → Sandbox)
2. Trigger purchase → Apple intercepts with sandbox payment sheet
3. RevenueCat receives the sandbox transaction and dispatches webhooks against `REVENUECAT_WEBHOOK_AUTH` (separate sandbox secret)
4. Verify the user's `subscription_status` updates to `active`

The sandbox webhook URL points at a Railway preview environment, not prod. New env var `REVENUECAT_WEBHOOK_AUTH_SANDBOX` distinguishes the two.

---

## Layer 3 — Native plugins

### Haptics

`npm install @capacitor/haptics`

New file `frontend/src/lib/haptics.js`:

```js
import { Capacitor } from '@capacitor/core'

let plugin = null
async function getPlugin() {
  if (!Capacitor.isNativePlatform()) return null
  if (!plugin) {
    const mod = await import('@capacitor/haptics')
    plugin = mod.Haptics
  }
  return plugin
}

export async function tap() {
  const h = await getPlugin()
  if (h) h.impact({ style: 'LIGHT' })
}

export async function success() {
  const h = await getPlugin()
  if (h) h.notification({ type: 'SUCCESS' })
}

export async function celebrate() {
  const h = await getPlugin()
  if (h) h.impact({ style: 'HEAVY' })
}
```

Wired into:

| Action | Helper |
|---|---|
| Any `.btn-primary` tap | `tap()` |
| `saveSession()` success in `/recover` | `success()` |
| `logTraining()` success in `/train` | `success()` |
| Tier promotion takeover trigger | `celebrate()` |
| Award unlock toast trigger | `success()` |

Web users get no haptics — the helpers no-op silently.

### Push notifications

`npm install @capacitor/push-notifications`

**Permission flow.** Apple HIG forbids asking for push permission on first launch — ask only after demonstrating value. New component `frontend/src/components/PushPermissionPrompt.jsx` shows a one-time card on the Hub after the user has completed at least one of: a triage session, a climb log, or a coach message. The card reads:

> **Stay in the loop.**
> We'll only ping you for new coach replies and to remind you when your streak is on the line. You can turn either off any time in Settings.
>
> [ Allow ] [ Not now ]

"Allow" calls `PushNotifications.requestPermissions()` then `PushNotifications.register()`. "Not now" sets `localStorage['coretriage_push_dismissed_at']` and the card never returns. Re-asking after the OS-level denial requires the user to manually toggle in iOS Settings — Apple gives one chance.

**Token registration.** `PushNotifications.addListener('registration', ({ value: apnsToken }) => ...)` → POST to new endpoint:

```python
@app.post("/api/push/register")
def push_register(request: Request, req: PushRegisterRequest, user: Dict = Depends(get_current_user)):
    register_push_device(user_id=user["id"], token=req.token, platform=req.platform)
    return {"ok": True}
```

New table:

```sql
CREATE TABLE push_devices (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    platform TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, token)
);
CREATE INDEX push_devices_user_idx ON push_devices (user_id);
```

Created via Alembic revision `0003_push_devices.py`.

**Topic 1: new coach message.** In `main.py`'s existing `send_coach_message` handler, after persisting the message, dispatch a push to the message's recipient — when a user sends, push to the coach (Budnik); when the coach sends, push to the user. Look up the recipient's `push_devices` rows and dispatch via APNs. Use the `aioapns` library (lightweight, async, supports JWT signing for token-based APNs auth). Add to `requirements.txt` and pin a version at implementation time.

```python
async def send_push_to_user(user_id: int, title: str, body: str, data: Dict[str, str]) -> None:
    tokens = get_push_tokens(user_id, platform="ios")
    if not tokens:
        return
    apns = APNs(key=APNS_KEY_PATH, key_id=APNS_KEY_ID, team_id=APPLE_TEAM_ID, topic="com.coretriage.app")
    for token in tokens:
        request = NotificationRequest(
            device_token=token,
            message={"aps": {"alert": {"title": title, "body": body}}, **data},
        )
        try:
            await apns.send_notification(request)
        except Exception as e:
            logger.warning("APNs dispatch failed for token %s: %s", token[:8], e)
```

New env vars: `APNS_KEY_ID`, `APNS_KEY_PATH` (path to the `.p8` key file from Apple Developer), `APPLE_TEAM_ID`.

Payload format:

```json
{
  "aps": { "alert": { "title": "New message from Coach", "body": "..." } },
  "route": "/chat?view=coach"
}
```

**Topic 2: streak about to break.** New script `scripts/streak_about_to_break_push.py` runs hourly via Railway scheduled task (`0 * * * *`). On each run, queries users with `current_streak > 0` (read from the existing streak calculation in the awards/streak system) who:
- have not logged a training session today (local to the user's timezone)
- have not already been pushed today (`streak_push_dispatched_at` < today's local midnight)
- are currently in their 20:00 local hour, computed from `users.timezone`

Users with `users.timezone IS NULL` fall back to 20:00 UTC dispatch. Push payload:

> **Your streak is on the line.**
> Log a climb today to keep your 5-day streak alive.

The 20:00 local time mirrors Duolingo / Strava / Apple Fitness convention — late-afternoon-to-evening windows convert best on this kind of habit nudge.

**Action handler.** `App.jsx` adds:

```jsx
useEffect(() => {
  if (!Capacitor.isNativePlatform()) return
  const subscription = PushNotifications.addListener('pushNotificationActionPerformed', (event) => {
    const route = event.notification.data?.route
    if (route) navigate(route)
  })
  return () => { subscription.remove() }
}, [navigate])
```

### Share sheet

`npm install @capacitor/share`

New file `frontend/src/lib/share.js`:

```js
import { Capacitor } from '@capacitor/core'

/**
 * Cross-platform share helper. On native, opens the iOS share sheet via
 * Capacitor. On web, uses navigator.share() if available, otherwise falls
 * back to copying the URL to clipboard with a toast.
 */
export async function share({ title, text, url }) {
  if (Capacitor.isNativePlatform()) {
    const { Share } = await import('@capacitor/share')
    await Share.share({ title, text, url })
    return
  }
  if (navigator.share) {
    try { await navigator.share({ title, text, url }); return } catch {}
  }
  try {
    await navigator.clipboard.writeText(url)
    window.dispatchEvent(new CustomEvent('ct:toast', { detail: { message: 'Link copied to clipboard' } }))
  } catch {
    window.dispatchEvent(new CustomEvent('ct:toast', { detail: { message: 'Could not share' } }))
  }
}
```

No specific share UI is wired in this sprint. Future tasks for triage result, climb card, and pyramid screenshot all consume this helper.

---

## Environment variables

Added in this sprint:

| Name | Where | Value |
|---|---|---|
| `VITE_REVENUECAT_IOS_KEY` | Frontend build env | RevenueCat iOS public key (safe to ship in app bundle) |
| `REVENUECAT_WEBHOOK_AUTH` | Backend env (prod) | Shared secret RevenueCat sends in the Authorization header |
| `REVENUECAT_WEBHOOK_AUTH_SANDBOX` | Backend env (sandbox) | Separate secret for sandbox webhooks |
| `APNS_KEY_ID` | Backend env | 10-char ID from Apple Developer → Keys |
| `APNS_KEY_PATH` | Backend env | Filesystem path to the `.p8` private key |
| `APPLE_TEAM_ID` | Backend env | 10-char Team ID from Apple Developer |

`.env.example` updated to include each with placeholder values and the documentation link.

## Files affected

**New:**
- `frontend/capacitor.config.ts`
- `frontend/ios/` (Xcode project, ~30 files generated)
- `frontend/branding/icon-source.png` (1024×1024 input for asset generator)
- `frontend/src/lib/safeArea.js`
- `frontend/src/lib/haptics.js`
- `frontend/src/lib/share.js`
- `frontend/src/lib/iap/revenuecat.js`
- `frontend/src/components/PushPermissionPrompt.jsx`
- `frontend/ios/StoreKitConfig.storekit` (sandbox config for Simulator)
- `alembic/versions/0002_subscription_source.py`
- `alembic/versions/0003_push_devices.py`
- `alembic/versions/0004_user_timezone.py` (adds `users.timezone TEXT` and `users.streak_push_dispatched_at TIMESTAMPTZ`)
- `scripts/streak_about_to_break_push.py`

**Modified:**
- `frontend/src/App.jsx` — status bar setup, push action listener, safe-area var install, timezone PUT on mount
- `frontend/src/components/UpgradeModal.jsx` — native paywall branch
- `frontend/src/components/HubTab.jsx` — render PushPermissionPrompt conditionally
- `frontend/index.html` — `viewport-fit=cover`
- `frontend/package.json` — Capacitor + RevenueCat + plugin deps
- `main.py` — RevenueCat webhook endpoint, push register endpoint, push dispatch on coach message, `PUT /api/user/timezone` endpoint
- `database.py` — `update_subscription_from_revenuecat`, `register_push_device`, `get_push_tokens`, `set_user_timezone`, `get_streak_push_candidates` helpers; `subscription_source`, `subscription_updated_at`, `timezone`, `streak_push_dispatched_at` columns; `push_devices` and `revenuecat_webhook_events` tables
- `requirements.txt` — add `aioapns`
- `.env.example` — six new env vars documented

**Unchanged:**
- Stripe code paths in `main.py` and `BillingReturnPage.jsx`
- Existing `get_user_state_bundle` and `get_user_tier` resolution
- All view components, lib hooks, design tokens

## Accessibility

- Haptic feedback respects `prefers-reduced-motion`: the new `haptics.js` helpers check `usePrefersReducedMotion` indirectly via a module-level cache populated on first call and skip haptic dispatch when reduced motion is preferred. (Apple's Reduce Motion setting does not directly affect haptics, but users who enable Reduce Motion typically also want fewer non-essential physical responses.)
- Push permission prompt has proper focus management: when the card appears on Hub, focus moves to the "Allow" button by default; Tab/Shift-Tab cycles through Allow → Not now → dismiss. Escape closes with the "Not now" behavior.
- The iOS status bar text style updates with the system theme so contrast against the forest background is always 4.5:1 or better.
- All native paywall buttons have `aria-label` set to the localized product title from RevenueCat so VoiceOver reads "Pro Monthly, $7.99 per month, 14-day free trial" rather than "Subscribe."

## Testing strategy

This sprint adds:

- **Unit tests** (vitest) for the pure helpers: `haptics.js` (no-op on web), `share.js` (clipboard fallback), `safeArea.js` (CSS var values).
- **Backend tests** (pytest) for the RevenueCat webhook handler covering: signature verify, each event type updates correctly, idempotency via event_id dedupe, malformed payload returns 200 (RevenueCat retries on non-200).
- **Manual sandbox flow** documented in a new `docs/runbook/ios-iap-sandbox.md` runbook: how to create sandbox Apple IDs, sign into TestFlight build, complete a sandbox purchase, verify the user row updates.
- **TestFlight smoke test** documented: full sign-up → upgrade → purchase → restore flow as the App Review checklist.

Component tests for `UpgradeModal` native branch are out of scope — verified manually in TestFlight builds. (The native code path can't run in vitest without mocking RevenueCat heavily; that mocking has historically produced false-confidence tests.)

## Resolved decisions

1. **APNs auth: token-based `.p8` key.** Budnik has the Apple Developer account but no existing APNs certificates. New `.p8` key generated in Apple Developer → Keys → "+" → enable APNs. Free, doesn't expire (vs certificates which roll annually), and is Apple's recommended path for new apps. Implementer downloads the `.p8` once at setup, stores at `APNS_KEY_PATH`, records the 10-char `APNS_KEY_ID` and the team's `APPLE_TEAM_ID` as env vars.

2. **RevenueCat plan: Free tier at launch.** Free covers up to $2.5K MRR (≈300 Pro subscribers) with no overage fee. Webhooks work on Free and ship with a shared-secret Authorization header that our handler verifies via `hmac.compare_digest` — no advanced signature verification needed. Upgrade to a paid tier only if/when MRR crosses the threshold and the 1% take starts to matter. This is the cheapest path: $0 to RevenueCat at launch, then 1% above the threshold.

3. **Streak push timing: 8 PM local to each user.** Duolingo, Strava, and Apple Fitness all converge on late-afternoon-to-evening local time for streak/activity reminders — Duolingo specifically targets ~8 PM. Mimic the pattern: dispatch each user's streak push at 20:00 in their own IANA timezone, not 18:00 UTC.

   Implementation deltas vs the 18:00 UTC version originally drafted:
   - New `users.timezone` column (Alembic migration `0004_user_timezone.py`), TEXT, nullable, IANA name like `America/Chicago`.
   - Frontend sets it at app boot via a new `PUT /api/user/timezone` endpoint, reading `Intl.DateTimeFormat().resolvedOptions().timeZone` from the browser. The request is fire-and-forget; failure to set is benign (users default to UTC).
   - `scripts/streak_about_to_break_push.py` becomes an hourly cron (Railway scheduled task at `0 * * * *`) instead of daily-at-18-UTC. Each run computes the current local hour for each candidate user and dispatches only to those currently in their 20:00 window. Users with no stored timezone fall back to a 20:00 UTC dispatch.
   - Idempotency: a `streak_push_dispatched_at` column on the user row prevents double-pushing in the same calendar day. Cleared on next-day midnight (UTC; close enough — users won't get two pushes in 24h).

## Post-launch optimizations (deferred but worth noting)

- **External Link Account Entitlement.** Apple permits qualifying apps to direct users to web sign-up instead of using IAP — savings of the full 30% Apple cut per Pro subscription. CoreTriage's "Health & Fitness" category isn't auto-eligible but can apply. Application is reviewed by Apple separately from the app itself. Recommended timing: ship via IAP, get App Review approval, apply for the entitlement once the app is live and stable. At $7.99/mo × 100 subscribers = $240/mo in savings if granted — material for an indie. The IAP architecture in this spec doesn't preclude future migration; the existing Stripe web flow stays operational throughout.
