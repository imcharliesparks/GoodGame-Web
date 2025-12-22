# GoodGame Page Inventory & Production-Ready Wish List

## Current Pages (App Router)
- `/` – Control panel linking to core areas (health, games, search, boards, profile).
- `/health` – Backend heartbeat checker against `/api/health`.
- `/games` – Cached games list with cursor pagination.
- `/games/search` – Debounced search over cached games through the proxy route.
- `/games/lookup` – External lookup helper for adding/importing games.
- `/games/[id]` – Game detail view for a specific cached game.
- `/boards` – Board list/management (create, edit, delete, reorder; Clerk-protected).
- `/boards/[id]` – Single board view with its board games.
- `/friends` – Friends list and requests management.
- `/profile/[id]` – see other people's profile/board view. Boards must be set to public or friends only.
- `/profile` – Viewer for the Clerk-linked Argus user record.
- `/ai/recommendations` – Curator UI for AI-powered recommendations (behind Clerk).
- `/sign-in` – Clerk sign-in catchall route.
- `/sign-up` – Clerk sign-up catchall route.

## Pages to Add
- `/onboarding` – First-time setup: create first board, import games, connect platforms.
- `/games/browse` – Discover by genre/publisher/platform tags (covers todo: explore by genre/publisher).
- `/boards/public/[id]` – Read-only public board share page with optional invite CTA.
- `/404` – Not found page aligned with branding.
- `/500` – Friendly error page with retry/support links.
- `/games/featured` – Curated/featured lists (top-rated, new releases, staff picks).

## Potential Future Pages
- `/friends/requests` – Dedicated inbox for incoming/outgoing requests and actions.
- `/friends/find` – User search/directory with filters; quick-add to boards/friends.
- `/activity` – Recent actions (board edits, ratings, friend activity) with filters.
- `/notifications` – Central notifications center + settings for email/push preferences.
- `/settings/account` – Display name, username, avatar, primary email, session management.
- `/settings/privacy` – Profile visibility, public board toggles, data export/delete controls.
- `/settings/security` – MFA, devices/sessions, connected accounts, API tokens if applicable.
- `/settings/notifications` – Channel preferences for friend requests, board changes, recommendations.
- `/support` – Help/FAQ, troubleshooting, and contact form to reach the team.
- `/status` – System status overview (can link out to an external status page).
- `/legal/terms` – Terms of Service.
- `/legal/privacy` – Privacy Policy.
- `/legal/cookies` – Cookie policy / tracking disclosure.
- `/maintenance` – Temporary downtime/upgrade notice page.
- `/admin` (optional) – Backoffice for feature flags, moderation, and user/board oversight.
