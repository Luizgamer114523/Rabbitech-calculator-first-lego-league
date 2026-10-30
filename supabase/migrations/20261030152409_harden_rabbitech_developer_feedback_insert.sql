-- Prevent signed-in users from setting moderation fields during feedback submission.
REVOKE INSERT ON TABLE public.rabbitech_developer_feedback FROM authenticated;
GRANT INSERT (author_user_id, category, message, page)
  ON TABLE public.rabbitech_developer_feedback TO authenticated;
