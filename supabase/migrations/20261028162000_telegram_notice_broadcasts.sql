-- Idempotency ledger prevents duplicate Telegram delivery when multiple admin tabs receive the same Realtime event.
CREATE TABLE IF NOT EXISTS public.telegram_notice_broadcasts (
  notice_hash text PRIMARY KEY,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'sending' CHECK (status IN ('sending','sent','partial')),
  recipient_count integer NOT NULL DEFAULT 0 CHECK (recipient_count >= 0),
  failed_count integer NOT NULL DEFAULT 0 CHECK (failed_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.telegram_notice_broadcasts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.telegram_notice_broadcasts FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.telegram_notice_broadcasts TO service_role;
