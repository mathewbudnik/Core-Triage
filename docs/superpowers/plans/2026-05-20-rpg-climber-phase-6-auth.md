# RPG Climber — Phase 6: Auth / modals / landing re-chrome Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Re-chrome the remaining auth modals, profile/onboarding modals, banner notifications, the landing page, the about page, the account menu, the crash fallback, and a refreshed marketing hero. **Chrome only — zero behavior changes.** Per overnight guardrails: billing/Stripe paths are NOT modified, auth logic stays identical (only AuthModal chrome moves), no remote push, no server restart.

**Architecture:** Same pattern as Phase 4 — replace ad-hoc panel chrome with `<Surface>` + `<Eyebrow>`, swap `bg-panel`/`border-outline`/`text-text`/`text-muted` for `ct-*` tokens, swap any `var(--tier-c)` chrome accents to `ct-terracotta`. Sheets/modals keep their own framing (don't wrap their outer in Surface). Forms and inputs become `bg-ct-forest-deep border border-ct-hairline`.

**Tech Stack:** No new deps.

---

## Components in scope (15)

### Auth + identity (5)
- `AuthModal.jsx` — sign-in / sign-up modal
- `DisplayNamePromptModal.jsx` — onboarding name
- `AvatarPickerModal.jsx` — avatar selection
- `DisclaimerModal.jsx` — first-launch disclaimer
- `LegalModal.jsx` — privacy / terms reader

### Account + nav (3)
- `AccountMenu.jsx` — slide-out account drawer
- `AboutTab.jsx` — about / settings / version
- `Logo.jsx` — app logo

### Banners + toasts (4)
- `EmailVerificationBanner.jsx`
- `TrialStatusBanner.jsx`
- `SavedToHistoryBanner.jsx`
- `AwardUnlockToast.jsx`

### Landing + edge (3)
- `Landing.jsx` — marketing landing page
- `TipCard.jsx` — generic tip surface
- `Coachmark.jsx` — onboarding tooltip
- `CrashFallback.jsx` — error boundary fallback
- `PlausibilityConfirmModal.jsx` — grade-plausibility confirmation modal

### NOT MODIFIED (guardrails)
- `BillingReturnPage.jsx` — billing/Stripe path. DO NOT TOUCH.
- AuthModal's actual auth logic (signInWithPassword, signUp, OAuth) is preserved exactly. Only its CSS chrome moves.

That's ~15 files. Grouped into 5 batched tasks below.

---

## Task 1: Auth + identity modals chrome refresh

**Files:**
- Modify: `frontend/src/components/AuthModal.jsx` (chrome only — auth logic preserved)
- Modify: `frontend/src/components/DisplayNamePromptModal.jsx`
- Modify: `frontend/src/components/AvatarPickerModal.jsx`
- Modify: `frontend/src/components/DisclaimerModal.jsx`
- Modify: `frontend/src/components/LegalModal.jsx`
- Modify: `frontend/src/components/PlausibilityConfirmModal.jsx`

## Conversion patterns (identical to Phase 4)

1. **Modal outer**: DO NOT wrap in `<Surface>`. Modals have their own fixed-position framing. Refresh internal chrome only.
2. **Internal cards/sections** that aren't the modal frame → `<Surface tier="default">` or `tier="flat"`.
3. **Eyebrow labels** → `<Eyebrow>`.
4. **Text tokens**: `text-text` → `text-ct-cream`, `text-muted` → `text-ct-cream/60`, etc.
5. **Inputs**: refresh to `bg-ct-forest-deep border border-ct-hairline text-ct-cream placeholder:text-ct-cream/40 focus:border-ct-terracotta/50`.
6. **Primary buttons**: `bg-ct-terracotta text-ct-cream`.
7. **Secondary buttons**: `bg-ct-hairline text-ct-cream/80 border border-ct-rim`.
8. **Error messages**: keep red-ish for semantic meaning (`text-red-400` or similar), but refresh background to `bg-red-500/10`.

## Critical invariants for AuthModal

- Sign-in form (email/password) and its submit handler — preserved exactly.
- Sign-up form, OAuth buttons (Google, Apple if present), magic link — preserved exactly.
- Switch between sign-in / sign-up tabs — preserved.
- Error handling, success redirect — preserved.
- ONLY CSS / class names change.

- [ ] **Step 1: Apply mechanical conversions to each file**
- [ ] **Step 2: Run tests + build** (`cd frontend && npm test -- --run && npm run build`)
- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/AuthModal.jsx frontend/src/components/DisplayNamePromptModal.jsx frontend/src/components/AvatarPickerModal.jsx frontend/src/components/DisclaimerModal.jsx frontend/src/components/LegalModal.jsx frontend/src/components/PlausibilityConfirmModal.jsx
git commit -m "feat(auth): re-chrome auth + identity modals on RPG palette"
```

---

## Task 2: Account menu + about + logo chrome refresh

**Files:**
- Modify: `frontend/src/components/AccountMenu.jsx`
- Modify: `frontend/src/components/AboutTab.jsx`
- Modify: `frontend/src/components/Logo.jsx`

## Specifics

- `AccountMenu`: slide-out drawer — outer drawer framing stays, internal rows/sections refresh to `Surface tier="flat"`. Avatar block uses `ct-terra-tint` background. Sign-out CTA: `bg-ct-hairline text-ct-cream/80`. Dangerous actions (delete account) keep red accent.
- `AboutTab`: section headers → `<Eyebrow>`. Version + commit-sha block uses `ct-tnum` + `text-ct-cream/60`. Background stays page-default (no Surface wrap on the tab root).
- `Logo`: if it uses any palette tokens, refresh to ct-* tokens. If it's purely SVG with no CSS palette, leave alone.

- [ ] **Step 1: Apply conversions**
- [ ] **Step 2: Tests + build**
- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/AccountMenu.jsx frontend/src/components/AboutTab.jsx frontend/src/components/Logo.jsx
git commit -m "feat(account): re-chrome AccountMenu + About + Logo on RPG palette"
```

---

## Task 3: Banners + toasts

**Files:**
- Modify: `frontend/src/components/EmailVerificationBanner.jsx`
- Modify: `frontend/src/components/TrialStatusBanner.jsx`
- Modify: `frontend/src/components/SavedToHistoryBanner.jsx`
- Modify: `frontend/src/components/AwardUnlockToast.jsx`

## Specifics

- Banners are full-width strips above main content. Use `bg-ct-terra-tint border-y border-ct-terracotta/30` for accent banners. Use `bg-ct-forest-deep border-y border-ct-hairline` for neutral.
- Toasts (AwardUnlockToast) — keep their own positioning framing, refresh internal chrome to `Surface tier="default"` with terracotta accent ring on success state.
- `TrialStatusBanner` may already use specific colors for status (active/expired) — preserve the semantic color but update the chrome around it.

- [ ] **Step 1: Apply conversions**
- [ ] **Step 2: Tests + build**
- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/EmailVerificationBanner.jsx frontend/src/components/TrialStatusBanner.jsx frontend/src/components/SavedToHistoryBanner.jsx frontend/src/components/AwardUnlockToast.jsx
git commit -m "feat(notify): re-chrome banners + AwardUnlockToast on RPG palette"
```

---

## Task 4: Landing + TipCard + Coachmark + CrashFallback

**Files:**
- Modify: `frontend/src/components/Landing.jsx`
- Modify: `frontend/src/components/TipCard.jsx`
- Modify: `frontend/src/components/Coachmark.jsx`
- Modify: `frontend/src/components/CrashFallback.jsx`

## Specifics

- `Landing`: This is the marketing page for not-yet-signed-in visitors. Apply the RPG aesthetic — forest-deep hero with terracotta CTA, cream typography. Keep all section structure (hero, features, CTA). The "Get started" / "Log in" buttons → `bg-ct-terracotta`. Headlines use `ct-display`. Subheads use `ct-title` or `text-xl`.
- `TipCard`: refresh to `Surface tier="flat"` or `tier="default"` with terra-soft icon accent.
- `Coachmark`: tooltip-style overlay. Refresh internal card chrome, keep its position/arrow logic.
- `CrashFallback`: error boundary fallback. Keep its functional simplicity — `Surface tier="default"` with cream text, terra-tint icon, terracotta retry button.

- [ ] **Step 1: Apply conversions**
- [ ] **Step 2: Tests + build**
- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/Landing.jsx frontend/src/components/TipCard.jsx frontend/src/components/Coachmark.jsx frontend/src/components/CrashFallback.jsx
git commit -m "feat(landing): re-chrome Landing + TipCard + Coachmark + CrashFallback"
```

---

## Task 5: Phase 6 sweep + retro

- [ ] **Step 1: Full sweep**

Run: `cd frontend && npm test -- --run && npm run build`
Expected: 80/80 PASS, build clean.

- [ ] **Step 2: Manually verify auth flow chrome only (read-only inspection)**

Don't actually run the dev server (guardrail). Just confirm via `git diff` that AuthModal's submit handlers, API calls, and form refs are unchanged — only CSS classes / style props moved.

- [ ] **Step 3: Phase 6 retro stub**

Append to `docs/superpowers/specs/2026-05-20-rpg-climber-design.md`:

```markdown
## Phase 6 retrospective (added after implementation)

Phase 6 shipped on 2026-05-20 — N commits on `redesign/rpg-climber` since the Phase 6 plan, build green, 80/80 tests passing.

- [findings filled in by implementer]
```

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/specs/2026-05-20-rpg-climber-design.md
git commit -m "docs(spec): Phase 6 retrospective stub"
```

---

## Critical invariants

- **DO NOT touch `BillingReturnPage.jsx`** — overnight guardrail.
- **DO NOT change auth behavior** — AuthModal chrome only. Sign-in, sign-up, OAuth, magic link, error handling, success redirect all preserved exactly.
- **DO NOT push to remote, open PRs, or restart the dev server.**
- All modal/sheet outer framing preserved — only internal chrome refreshes.
- All hooks, navigation, API calls, form handlers preserved.
- Crash fallback's error handling (Sentry capture if present) preserved.

---

## Out of scope for Phase 6

- BillingReturnPage chrome (explicit guardrail — billing untouched).
- ProfileSetup re-chrome (different surface, deferred or noted).
- Stripe checkout / upgrade flow logic (chrome only — no payment-path changes).
- Backend.
