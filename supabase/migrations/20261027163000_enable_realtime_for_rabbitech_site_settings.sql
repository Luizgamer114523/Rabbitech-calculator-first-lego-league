DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'rabbitech_site_settings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.rabbitech_site_settings;
  END IF;
END
$$;
