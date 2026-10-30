-- Allow private team-chat attachments of any file type, still limited to 25 MiB.
-- Storage remains private and existing team-membership RLS policies are unchanged.

ALTER TABLE public.team_messages
  DROP CONSTRAINT IF EXISTS team_messages_media_type_check,
  ADD CONSTRAINT team_messages_media_type_check
    CHECK (media_type IS NULL OR media_type IN ('audio','video','file'));

ALTER TABLE public.team_messages
  DROP CONSTRAINT IF EXISTS team_messages_body_check,
  ADD CONSTRAINT team_messages_body_check
    CHECK (
      (char_length(btrim(body)) BETWEEN 1 AND 2000)
      OR (
        char_length(btrim(body)) = 0
        AND media_type IN ('audio','video','file')
        AND media_path IS NOT NULL
        AND char_length(btrim(media_path)) > 0
      )
    );

ALTER TABLE public.team_messages
  DROP CONSTRAINT IF EXISTS team_messages_media_size_check,
  ADD CONSTRAINT team_messages_media_size_check
    CHECK (media_size IS NULL OR media_size BETWEEN 1 AND 26214400);

UPDATE storage.buckets
SET allowed_mime_types = NULL,
    file_size_limit = 26214400
WHERE id = 'rabbitech-team-chat';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'rabbitech-team-chat') THEN
    RAISE EXCEPTION 'Bucket rabbitech-team-chat does not exist.';
  END IF;
END $$;
