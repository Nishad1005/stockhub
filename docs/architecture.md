# Architecture

## High-level

```
┌─────────────────────────────────────────────────────────────┐
│  React + TypeScript (Vite)                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Screens (Capture, Items, Transfers, ...)           │   │
│  │  Components (Button, Modal, Toast, CameraScanner)   │   │
│  │  Hooks (useEntries, useTransfers, useAuth, ...)     │   │
│  └─────────────────┬───────────────────┬───────────────┘   │
│                    │                   │                    │
│           React Query (server state)  Zustand (UI state)    │
│                    │                   │                    │
└────────────────────┼───────────────────┴───────────────────┘
                     │
                     ▼
        ┌─────────────────────────┐
        │   Supabase JS Client    │
        └───────────┬─────────────┘
                    │
                    ▼ (over HTTPS)
        ┌─────────────────────────────────────────┐
        │   Supabase                              │
        │   ┌──────────┐  ┌──────┐  ┌─────────┐   │
        │   │ Postgres │  │ Auth │  │ Storage │   │
        │   └──────────┘  └──────┘  └─────────┘   │
        │           ┌──────────────┐               │
        │           │   Realtime   │               │
        │           └──────────────┘               │
        └─────────────────────────────────────────┘

        Native shell:                Local mirror:
        ┌──────────────┐             ┌──────────────────┐
        │  Capacitor 6 │             │ Capacitor SQLite │
        │  ┌─────────┐ │             │  (offline cache) │
        │  │   iOS   │ │             └──────────────────┘
        │  └─────────┘ │
        │  ┌─────────┐ │
        │  │ Android │ │
        │  └─────────┘ │
        └──────────────┘
```

## Data flow

**Online (default)**:
1. UI mutation → React Query mutation → Supabase JS → Postgres
2. Optimistic update → server confirms → cache reconciled

**Offline**:
1. UI mutation → write to local SQLite via wrapper
2. Queue item in `sync_queue` table
3. Background sync (when online) drains queue → Supabase

**Realtime** (optional, Phase 14+):
1. Supabase Realtime subscription on `entries` and `transfers`
2. Inbound changes from other devices → React Query cache update → UI re-render

## Auth flow

1. User opens app → Capacitor Preferences checked for stored session
2. If session valid → restore Supabase auth, render protected routes
3. If session expired → refresh token call → restore or redirect to login
4. RLS policies on every table enforce per-user/role access

## Offline-first strategy

| Operation | Behavior |
|-----------|----------|
| Capture entry | Write to local SQLite immediately, queue sync. UI shows entry as "Pending sync" badge until confirmed. |
| Edit entry | Same — local first, queue sync. Conflict: server wins, user notified. |
| Transfer | Local first. STN number reserved client-side (`STN/LOCAL/uuid`), replaced with real server STN on sync. |
| Read | Always serve from local SQLite. Background refresh from server when online. |
| Master search | Local SQLite mirror of master_items. Bulk-loaded on first login. |
| Photos | Stored in Capacitor Filesystem, queued for upload to Supabase Storage. |

## File responsibility map

- `src/lib/supabase.ts` — Supabase client only. No business logic.
- `src/lib/db/` (Phase 10) — local SQLite abstraction, sync queue.
- `src/hooks/` — all data fetching/mutation. Components never call supabase directly.
- `src/stores/` — Zustand stores for UI state only. Never put server data here.
- `src/screens/` — composition. Minimal logic — push it into hooks.
- `src/components/` — presentational. Should work in Storybook isolation.
