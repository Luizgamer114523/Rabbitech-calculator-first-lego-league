# Rabbitech Telegram Bot

The webhook is implemented at `/api/telegram-webhook`. It is intentionally not enabled until a bot token and webhook secret are configured.

## Current commands

- `/start`, `/help`: command guide
- `/link CODE`: link a Telegram account to the signed-in Rabbitech account with a one-time code (10-minute expiry)
- `/team`: team and member role
- `/tasks`: up to 10 unfinished team tasks
- `/rounds`: last 5 rounds and their average
- `/notice`: active global notice
- `/support`: Rabbitech help link
- `/unlink`: remove the Telegram link

All commands except `/start`, `/help`, and `/link` require an account link. The webhook only handles private text chats. It does not accept team membership changes or admin actions through Telegram.

## Setup required before activation

1. Create the bot through Telegram's official `@BotFather`; keep the token private.
2. Add these server-only variables in Vercel Project Settings for the intended environment:
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_WEBHOOK_SECRET` (random secret, 32+ characters)
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Apply migration `supabase/migrations/20261028170000_telegram_bot_linking.sql` to the **active** Supabase project `ieijssfqonoucqheedac`. Review it first; do not apply it to the inactive project.
4. Configure Telegram's webhook using the bot token and the secret header:
   `https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://rabbitech-fllc.vercel.app/api/telegram-webhook&secret_token=<URL_ENCODED_SECRET>`
   Call the URL from a secure environment; never commit it or post it in chat.
5. Sign in to Rabbitech, open **Espaço da equipe**, generate a Telegram link code, then send `/link CODE` to the bot in a private chat.
6. Test with two accounts, an expired code, an already-linked Telegram account, a member with no team, and a non-member. Confirm no service-role key is shipped to the browser.

## Verification

- Syntax: `node --check api/telegram-webhook.js`
- Unit tests: `node --test tests/telegram-webhook.test.js`
- Smoke tests after deployment: webhook without the secret must return 401; GET must return 405; valid webhook updates should return 200.
- End-to-end Telegram delivery cannot be tested until a real bot token is configured and the webhook is registered.

## Safety and limitations

- Telegram IDs are linked by a short-lived, random one-time code generated only for an authenticated Rabbitech user.
- The database stores only a SHA-256 hash of each code.
- The bot uses the server-side Supabase service key and never exposes it to Telegram messages or the browser.
- Team data is scoped to the team of the linked user. Admin controls, account creation, task mutations, and global-notice publishing are deliberately not exposed as bot commands in this first phase.
- This initial version responds to `/notice` when requested; automatic push of every global notice is a separate outbound-notification step.
