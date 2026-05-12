# Chat tab restructure + KB rendering cleanup

**Date:** 2026-05-11
**Owner:** Mathew
**Status:** Approved (mockups in `.superpowers/brainstorm/`)

## Problem

The Chat tab today defaults to AI chat (`kb` and `gpt` modes) with a small button to switch into the human Coach chat. Mathew wants to flip this — the human-coaching offer should be at parity with AI, not buried — while still letting free users access useful chat without paying.

Two related problems:
1. **No clear path to coaching** from the Chat tab; the AI is the assumed product.
2. **KB-mode responses look like raw search results** — bold filename + relevance score + dumped markdown chunks separated by `---`. Hard to read, doesn't feel like chat.

## Solution overview

Restructure the Chat tab into a **picker landing** that gives the coaching CTA equal weight with AI chat. Keep KB lookups free for everyone (always); paywall GPT usage only. Ship the KB-response cleanup at the same time so Lookup actually feels usable.

## Picker landing

**Layout:** two equal-size cards side-by-side on desktop, stacked on mobile (`flex flex-col sm:flex-row sm:gap-4`).

**Header:** "How do you want to chat?" with subhead "Both options stay available — pick whichever fits right now."

**Coach card** (left):
- Icon: gold "M" tile in coaching's amber palette
- Title: "Talk to Mathew"
- Badge: "Coaching"
- Description: "A real climbing coach. Personalised plans, technique advice, return-to-climb decisions."
- Meta: "Replies in 24–48h"
- CTA varies by tier (see matrix below)

**AI card** (right):
- Icon: teal "AI" tile
- Title: "Ask the AI"
- Badge: "Free"
- Description: "Instant climbing-injury lookups (free), or AI-synthesized answers (5 free / unlimited Pro)."
- CTA: "Start chatting →"

## Routing rules

| User state | Default landing | Has Switch link? |
|---|---|---|
| Anonymous, first visit | Picker | n/a |
| Anonymous, returning | Last-picked view | Yes |
| Free, first visit | Picker | n/a |
| Free, returning | Last-picked view | Yes |
| Pro, first/returning | Same as Free | Yes |
| Coaching subscriber | Coach chat (skip picker) | Yes |
| Mathew (coach role) | Inbox (skip picker) | Yes (3-option mini-picker: Inbox / Coach / AI) |

The Switch link sits in the top-right of the active view's header. Copy: "← Back to picker". Clicking clears the persisted last-view and returns to the picker.

## Per-tier access matrix

| Tier | KB lookup | GPT answer | Coach card CTA | AI card CTA |
|---|---|---|---|---|
| Anonymous | ✅ unlimited | 5 free / device (localStorage) | "Sign in to apply" → AuthModal | "Start chatting →" |
| Free | ✅ unlimited | 5 free / account | "Apply — $89/mo" → UpgradeModal (coaching) | "Start chatting →" |
| Pro ($10/mo) | ✅ unlimited | ✅ unlimited (Pro perk) | "Apply — $89/mo" → UpgradeModal (coaching) | "Start chatting →" |
| Coaching ($89/mo) | ✅ unlimited | ✅ unlimited | "Open chat with Mathew" (active view) | "Start chatting →" |
| Mathew (coach role) | ✅ | ✅ | "Open Inbox" | "Start chatting →" |

## AI view

Layout matches today's `ChatTab.jsx` AI chat with these changes:

**Mode toggle** in the view header (replaces the existing technical KB/GPT segmented control):
- "Lookup" — free for all users; runs `/api/chat` with `mode: 'kb'`
- "AI answer" — counter shown for free users (`2 of 5 used`); locked when exhausted (click → UpgradeModal)

**Default mode:** `kb` (free) for first-time users so nobody hits the paywall on their first AI message. Persisted via `coretriage_chat_mode` localStorage key after their first explicit choice.

**Limit-reached state on AI answer:**
- Tab shows lock icon
- Click → UpgradeModal opens with `trigger='chat_limit'`
- Lookup still works fine; user keeps getting useful info

**Switch ← Back to picker** link sits in the top-right of the AI view header.

## KB response rendering (Direction A — "cleaner flat markdown")

The backend `/api/chat` `mode='kb'` response changes from:

```
**finger_pulley.md** *(relevance 0.42)*

## A2 pulley rupture

A sudden, audible "pop"...

---

**finger_pulley.md** *(relevance 0.31)*

...

---

*Educational only — not a medical diagnosis. Safety: if worsening, severe pain at rest, numbness/tingling, significant weakness, instability, major swelling/bruising, or trauma — seek professional evaluation.*
```

…to:

```
▸ FINGER PULLEY INJURIES

A sudden, audible "pop"...

▸ CLIMBING-SPECIFIC FINGER ANATOMY

Pulley injuries typically present as...

— Educational only — not a medical diagnosis. If pain is severe, the finger looks deformed, or you can't bend it normally, seek professional evaluation.
```

**Concrete changes:**

1. **Strip relevance scores** from user-facing output (logged server-side for tuning).
2. **Prettify source labels** — convert `finger_pulley.md` → "Finger pulley injuries". Logic: drop `.md`, replace `_` with space, title-case. Lookup map for special cases (e.g., `general_load_management` → "Load management"). Use a `▸` glyph as the section marker, source label uppercase + tracked.
3. **Strip leading H2 markdown headings** from the chunk content if present (the source label already names the section). Avoids redundant `## A2 pulley rupture` headings.
4. **Trim excerpts** — cap each chunk at 800 chars (down from 2000), end with ellipsis if truncated. Most KB sections are under 800 already; the cap protects against the rare long one.
5. **Soft divider** between matches — replace `---` (renders as a heavy `<hr>`) with two newlines. The uppercase source labels visually demarcate sections without needing rules.
6. **Compact disclaimer** — replace the multi-clause safety-paragraph with a single one-line italic at the end: "Educational only — not a medical diagnosis. Seek professional evaluation if pain is severe, worsening, or accompanied by neurological symptoms."

These are pure formatting changes — no schema change, no frontend changes needed beyond the existing `ReactMarkdown` rendering.

## Persistence keys

- `coretriage_chat_view` — `'picker' | 'coach' | 'ai' | 'inbox'`. Cleared on logout. Drives "remember last choice" routing.
- `coretriage_chat_mode` — `'kb' | 'gpt'`. AI view's last-used mode.

Existing `ct_chat_used` localStorage key is retained for anonymous-user GPT usage tracking.

## Backend changes

`main.py` `/api/chat` (around lines 654–735):

1. **Split free-tier enforcement** — only count + check `FREE_CHAT_LIMIT` when `req.mode == "gpt"`. Move the `get_chat_used` / `increment_chat_used` calls inside an `if req.mode == "gpt"` block. KB requests bypass the limit entirely.
2. **Rewrite the KB response formatter** (lines 711–730) per the rendering changes above. Pull source-label logic into a helper (`_pretty_source(filename)`). Strip leading `## ...` heading from chunks if present.

No DB migrations. No new env vars.

## Component shape

```
ChatTab (router)
├─ ChatPicker          (default landing — two cards, tier-aware CTAs)
├─ AIChatView          (existing AI chat logic + new mode toggle in header)
├─ CoachChatView       (wraps existing CoachChat with the "← Back" header bar)
└─ CoachInboxView      (wraps existing CoachInbox — Mathew only)
```

`ChatTab.jsx` becomes a thin routing component (~80 lines):

1. Reads user tier + role + persisted view
2. Decides which sub-component to render
3. Passes a `onSwitchToPicker` callback to each sub-view
4. Renders shared modals (UpgradeModal, AuthModal trigger)

The existing in-file `ChatTab` body (the AI chat) gets extracted into `AIChatView.jsx`. Existing `CoachChat.jsx` and `CoachInbox.jsx` get thin header-bar wrappers (`CoachChatView.jsx`, `CoachInboxView.jsx`) that add the "← Back to picker" link without modifying the underlying components.

## Out of scope

- Touching the BodyDiagram, Triage, or Rehab tabs
- New AI providers (Claude, etc.) — the picker mentions "models" but for v1 it's just GPT vs KB
- Changing GPT pricing or the `FREE_CHAT_LIMIT` value (still 5)
- Coaching subscription flow itself (UpgradeModal stays as-is)
- Backend rate limiting (slowapi limits unchanged)
- Server-side persistence of chat-view preference (localStorage only)

## Open questions

None — design fully approved by user across the brainstorm flow.
