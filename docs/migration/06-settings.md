# Migration: Settings + Access Controls

## Reference
- v0.1 HTML markup: search for `screen-settings`
- v0.1 logic: `renderSettings`, `promptManagerPassword`, `setManualEntryMode`

## Sections
1. **Exports** — CSV (data only) + ZIP (data + photos)
2. **Access Controls** — manager password change, edit-lock window, manual entry toggle
3. **Storage** — usage info + clear all
4. **About** — version, roadmap

## Components
- `src/screens/Settings/SettingsScreen.tsx`
- `src/screens/Settings/ExportsCard.tsx`
- `src/screens/Settings/AccessControlsCard.tsx`
- `src/screens/Settings/StorageCard.tsx`
- `src/screens/Settings/AboutCard.tsx`
- `src/components/ManagerPasswordPrompt.tsx` (reusable modal)

## Auth note
In v0.2 the manager password lives in `profiles.manager_password_hash` on the
current user's row, hashed with bcrypt. The "change password" action calls a
Supabase RPC `change_manager_password(old, new)` that verifies and updates.

## Done when
- Each section matches v0.1 functionally
- Password change requires correct old password
- Edit-lock window selector persists to profile
- Manual entry mode toggle is session-only, resets on app reload
