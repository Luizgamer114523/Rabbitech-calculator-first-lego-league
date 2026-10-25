# Rabbitech repair notes — 2026-10-25

## Scope
- Consolidated the mobile dock into `assets/css/mobile-dock.css`.
- Consolidated dock expansion, language-button placement, and admin navigation visibility into `assets/js/mobile-dock.js`.
- Removed the older competing mobile layout CSS blocks and duplicate dock/admin controllers from `index.html`.
- Kept the existing main app, language/consent behavior, scoring, leaderboard, and Supabase logic intact.

## Admin navigation
The Admin button is hidden unless the authenticated user is the configured owner account or the application has marked the authenticated user as an admin. This is a UI visibility rule, not a replacement for server-side authorization. Supabase RLS/RPC checks must remain the security boundary.

## Validation still required
- Test dock placement and expansion on small Android screens.
- Test language consent/reopen controls and full-page language behavior.
- Test admin and non-admin accounts.
- Verify ranking, scoring, notices, and feature toggles.
- Deploy only after these checks pass.
