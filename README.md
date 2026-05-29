# Callous

A freemium mobile app for tracking mindset and resilience activities, built on the philosophy of David Goggins. Do hard things. Build your callus.

## What it does

- Log activities designed to harden your mindset (cold showers, hard runs, fasting, mental challenges, and more)
- Earn points and climb levels from **Soft** all the way to **Mentality Monster**
- Follow others and see their activity feed
- Get a weekly training plan tailored to your fitness level and equipment
- Compete on a weekly scoreboard

## Tech Stack

- **React Native + Expo** (iOS & Android)
- **Supabase** (Postgres, Auth, Storage)
- **Zustand** for state management
- **RevenueCat** for subscriptions

## Getting Started

```bash
npm install
```

Create `.env.local` with your Supabase credentials:

```
EXPO_PUBLIC_SUPABASE_URL=your-supabase-project-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Run migrations in **Supabase → SQL Editor** (in order):
1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_phase2.sql`

```bash
npx expo start
```

See `CLAUDE.md` for full architecture and development guidance.

## Build Status

| Phase | Status |
|---|---|
| Phase 1 — Auth & Onboarding | ✅ Complete |
| Phase 2 — Activity Logging | ✅ Complete |
| Phase 3 — Social | 🔜 Next |
| Phase 4 — Training Plans | 🔜 Planned |
| Phase 5 — Payments | 🔜 Planned |
| Phase 6 — Polish & Ship | 🔜 Planned |
