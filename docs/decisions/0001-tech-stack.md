# ADR-0001: Tech Stack Choice

**Date**: 2026-06-04
**Status**: Accepted

## Context

v0.1 is a single-file vanilla HTML/JS prototype on Netlify. We need to scale
to web + iOS + Android, support multi-user with sync, and remain maintainable.

## Options considered

### Option A: React Native / Expo
- ✅ True native on iOS + Android
- ✅ Single codebase
- ❌ Web support is separate (Expo Web is OK but not first-class)
- ❌ Bigger jump from vanilla JS HTML
- ❌ Native module ecosystem can be painful

### Option B: Next.js + Capacitor
- ✅ Familiar web tooling
- ❌ Next.js SSR doesn't add value here — we're offline-first
- ❌ More complexity than we need

### Option C: PWA (extend v0.1 with manifest + service worker)
- ✅ Fastest path
- ❌ iOS treats PWAs as second-class
- ❌ Limited native APIs (no proper background sync, no high-quality camera)
- ❌ Apple's Safari PWA support has gaps in 2026 still

### Option D: React + Vite + Capacitor + Supabase ✅ **chosen**
- ✅ React + Vite = familiar, fast, well-supported
- ✅ Capacitor 6 = proven native wrapper, used by major apps
- ✅ Supabase = batteries-included backend (auth, DB, storage, realtime, free tier sufficient)
- ✅ TypeScript end-to-end
- ✅ One codebase, three platforms
- ✅ Easy migration path from v0.1 (per-component port)
- ⚠️ Capacitor MLKit barcode scanner needs platform-specific setup but is documented

## Decision
Option D.

## Consequences
- Need to maintain CLAUDE.md so Claude Code agents respect the stack
- Apple Developer + Google Play Console fees ($99/yr + $25 one-time)
- Supabase free tier limits: 500MB DB, 1GB storage, 50k MAU. Likely fine for ~50 users at U&M
- If we outgrow Supabase free, paid is $25/mo
