CREATE TABLE IF NOT EXISTS public.rabbitech_developer_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('suggestion','bug','other')),
  message text NOT NULL CHECK (char_length(btrim(message)) BETWEEN 10 AND 2500),
  page text NOT NULL DEFAULT 'Rabbitech' CHECK (char_length(page) <= 120),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','reviewing','planned','done','declined')),
  admin_reply text,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rabbitech_developer_feedback ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.rabbitech_developer_feedback FROM anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.rabbitech_developer_feedback TO authenticated;
GRANT UPDATE (status, admin_reply, reviewed_by, updated_at)
  ON TABLE public.rabbitech_developer_feedback TO authenticated;

CREATE POLICY "users read own feedback and admins read all"
  ON public.rabbitech_developer_feedback
  FOR SELECT TO authenticated
  USING (author_user_id = (SELECT auth.uid()) OR public.is_rabbitech_admin());

CREATE POLICY "users submit feedback for themselves"
  ON public.rabbitech_developer_feedback
  FOR INSERT TO authenticated
  WITH CHECK (author_user_id = (SELECT auth.uid()));

CREATE POLICY "admins manage feedback status"
  ON public.rabbitech_developer_feedback
  FOR UPDATE TO authenticated
  USING (public.is_rabbitech_admin())
  WITH CHECK (public.is_rabbitech_admin());

CREATE INDEX IF NOT EXISTS rabbitech_developer_feedback_created_at_idx
  ON public.rabbitech_developer_feedback (created_at DESC);
CREATE INDEX IF NOT EXISTS rabbitech_developer_feedback_author_created_at_idx
  ON public.rabbitech_developer_feedback (author_user_id, created_at DESC);

ALTER PUBLICATION supabase_realtime ADD TABLE public.rabbitech_developer_feedback;
