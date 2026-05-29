# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Callous is a freemium mobile app (iOS + Android) for tracking mindset and resilience activities inspired by David Goggins. Users log "hard things" from a curated activity list, earn points, climb levels, follow others, and receive rule-based weekly training plans (paid feature).

## Commands

```bash
# Install dependencies
npm install

# Start dev server (mobile)
npx expo start

# Start for web preview
npx expo start --web

# Start with a clean cache
npx expo start -c

# Type check
npx tsc --noEmit

# Lint
npx expo lint

# Build development APK (Android)
eas build --profile development --platform android

# Build for production
eas build --platform all
```

## Environment

Copy `.env.local` and fill in values:
- `EXPO_PUBLIC_SUPABASE_URL` — Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` — Supabase **anon/public** key (starts with `eyJ...`). Do NOT use the secret key.
- `EXPO_PUBLIC_RC_API_KEY_IOS` / `EXPO_PUBLIC_RC_API_KEY_ANDROID` — RevenueCat keys (Phase 5)

## Database Setup

Run migrations in order via **Supabase → SQL Editor**:
1. `supabase/migrations/001_initial_schema.sql` — full schema, RLS, triggers, seed data
2. `supabase/migrations/002_phase2.sql` — storage bucket, activity_equipment seeds, profiles INSERT policy

## Where We Left Off

Phases 1 and 2 are code-complete. The immediate blocker before moving to Phase 3 is:

**Fix signup error first.** When registering a new account, Supabase returns "Database error saving new user". This is caused by the `handle_new_user` trigger on `auth.users` failing. To diagnose: attempt a signup, then go to **Supabase → Logs → Postgres** and read the exact error. Likely a permissions or constraint issue in the trigger. Once signup works end-to-end, Phase 3 (social features) can begin.

**Testing setup note.** The app was tested via `npx expo start --web` (browser preview). A development APK was built via EAS for Android but QR scanning didn't connect due to a local network issue — tunnel mode (`npx expo start --tunnel`) was tried but also had issues. This is unresolved. For device testing, revisit tunnel mode or try Android Studio emulator (`press 'a'` in the Expo terminal).

## Known Issues / Open Items

- **Signup "Database error saving new user"** — Blocks end-to-end testing. Check Supabase → Logs → Postgres immediately after a failed signup attempt for the root cause.
- **Device preview not working** — QR code scanning fails with `java.lang.RuntimeException: Unable to load script`. Likely a local network/firewall issue. Try `npx expo start --tunnel` or Android Studio emulator.
- **Apple / Google sign-in** — Not implemented. Email/password only for now.
- **Profile avatar** — Shows initials only. Photo upload for avatars deferred (activity photo upload to Supabase Storage is working).
- **`activity_logs` SELECT policy** — Currently only allows users to read their own logs. Must be expanded in Phase 3 to allow reading followed users' logs for the feed.
- **Level thresholds** — Placeholder values in `src/constants/levels.ts`. To be confirmed before launch.

## Tech Stack

| Layer | Choice |
|---|---|
| Mobile | React Native + Expo SDK 56 (Expo Router for file-based routing) |
| Language | TypeScript throughout |
| Styling | StyleSheet.create with `constants/colors.ts` (black/white palette) |
| State | Zustand |
| Backend | Supabase (Postgres, Auth, Storage, Edge Functions) |
| Payments | RevenueCat (IAP) + Stripe (web billing) — Phase 5 |

## Architecture

### Navigation (Expo Router)

File-based routing under `src/app/` (configured via `tsconfig.json` path alias `@/*` → `src/*`):
- `(auth)/` — login, register, onboarding (unauthenticated)
- `(tabs)/` — main tab bar: feed, log, leaderboard, plan, profile
- Root `_layout.tsx` handles auth guard — listens to Supabase session, fetches profile, routes to login / onboarding / tabs automatically

### Key Data Flows

**Activity Logging:** User picks activity from filtered list (filtered by their `user_equipment`) → logs it → `activity_logs` row inserted → DB trigger increments `profiles.total_points` → level recalculated client-side from `constants/levels.ts`. Points also updated optimistically in Zustand store for instant UI feedback.

**Activity Filtering:** `useActivities` hook fetches all active activities + user equipment + `activity_equipment` join table, then client-side filters to only activities where the user has all required equipment. Activities with no equipment requirements are always shown.

**Training Plan:** Supabase Edge Function (`supabase/functions/generate-plan`) runs every Monday. Reads user's `fitness_level` + equipment, applies rule-based logic (week number drives progression), writes to `training_plans` table as JSON. Paywalled — `subscriptions.status` must be `active`.

**Social Feed:** `activity_logs` joined with `follows` — fetches logs from users the current user follows + own logs, ordered by `logged_at` DESC. Pull-to-refresh only (no real-time for MVP).

**Auth:** Supabase Auth (email/password). On sign-up, a Postgres trigger creates a minimal `profiles` row. Onboarding (3 steps) sets `username`, `bio`, `fitness_level`, and `user_equipment`. Auth guard in root layout checks `profile.username` — null means onboarding not complete, routes there automatically.

**Supabase client** (`src/lib/supabase.ts`): Uses `expo-secure-store` for token storage on native, falls back to default `localStorage` on web.

**Payments:** RevenueCat SDK manages App Store / Play Store subscriptions. RevenueCat webhook → Supabase Edge Function (`supabase/functions/revenuecat-webhook`) → upserts `subscriptions` table.

### Colour Scheme

Black/white only. See `src/constants/colors.ts` for the palette. Never introduce colour outside of this file.

### Activity & Equipment System

- `activities` table is admin-managed (edit directly in Supabase dashboard — no admin UI)
- `activity_equipment` junction defines what equipment an activity requires
- Users only see activities where they have all required equipment (or activities with no requirements)
- Custom activities bypass this — users can log anything with a free-text name

### Scoring & Levels

- Every logged activity = +1 point (`points_earned` on `activity_logs`, `total_points` on `profiles`)
- Level thresholds defined in `src/constants/levels.ts` — computed client-side via `getLevelForPoints()`
- Levels: Soft → Getting There → Hardening → Iron Mind → Built Different → Mentality Monster (thresholds TBD, currently placeholder values)

## Project Structure

```
callous/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── _layout.tsx
│   │   │   ├── login.tsx
│   │   │   ├── register.tsx
│   │   │   └── onboarding.tsx      # 3-step: username/bio → fitness level → equipment
│   │   ├── (tabs)/
│   │   │   ├── _layout.tsx
│   │   │   ├── feed.tsx            # Placeholder — Phase 3
│   │   │   ├── log.tsx             # Activity picker + log modal with photo
│   │   │   ├── leaderboard.tsx     # Placeholder — Phase 3
│   │   │   ├── plan.tsx            # Placeholder — Phase 4
│   │   │   └── profile.tsx         # Own profile: stats + activity log history
│   │   ├── _layout.tsx             # Root auth guard
│   │   └── index.tsx               # Redirects to login
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Button.tsx          # primary / outline / ghost variants
│   │   │   └── Input.tsx           # label + error state
│   │   └── features/
│   ├── constants/
│   │   ├── colors.ts               # Black/white palette — single source of truth
│   │   └── levels.ts               # Level thresholds + getLevelForPoints()
│   ├── hooks/
│   │   └── useActivities.ts        # Equipment-filtered activity list, grouped by category
│   ├── lib/
│   │   ├── supabase.ts             # Supabase client (platform-aware storage)
│   │   └── revenuecat.ts           # RevenueCat setup (Phase 5)
│   ├── stores/
│   │   ├── auth.store.ts           # Session + user (Zustand)
│   │   └── profile.store.ts        # Profile + subscription + isPremium flag
│   └── types/
│       ├── database.ts             # TypeScript interfaces for all DB tables
│       └── css.d.ts                # CSS module type declaration
└── supabase/
    ├── migrations/
    │   ├── 001_initial_schema.sql  # Full schema, RLS, triggers, seed data
    │   └── 002_phase2.sql          # Storage bucket, activity_equipment seeds
    └── functions/                  # Edge Functions (Phase 4+)
```

## Database Tables (summary)

- `profiles` — extends auth.users; username (nullable until onboarding), bio, avatar, fitness_level, total_points
- `equipment` — predefined equipment/access options (Sauna, Barbell, etc.)
- `user_equipment` — junction: which equipment a user has access to
- `activities` — predefined activity types with category and required equipment
- `activity_equipment` — junction: which equipment an activity requires
- `activity_logs` — every logged activity (user_id, activity_id, custom_name, notes, photo_url, logged_at)
- `follows` — social graph (follower_id → following_id)
- `training_plans` — weekly plans as JSON, one row per user per week
- `levels` — level name and point thresholds (seed data, also mirrored in constants/levels.ts)
- `subscriptions` — subscription status synced from RevenueCat

## Build Phases

- **Phase 1** ✅ — Foundation: Expo scaffold, Supabase setup, auth flows (login/register/onboarding)
- **Phase 2** ✅ — Activity Logging: equipment-filtered activity list, log modal, photo upload, points, levels, profile with history
- **Phase 3** — Social: follows, feed, leaderboard, user search, other profiles
- **Phase 4** — Training Plans: rule-based Edge Function generator, plan screen (paywalled)
- **Phase 5** — Payments: RevenueCat integration, paywall, webhook, subscription gating
- **Phase 6** — Polish & Ship: EAS builds, push notifications, App Store/Play Store submission
