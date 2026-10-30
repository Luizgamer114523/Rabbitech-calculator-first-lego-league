-- Allow text messages and valid media-only messages in the team chat.
-- Empty bodies are accepted only when an audio/video attachment has a storage path.
ALTER TABLE public.team_messages
  DROP CONSTRAINT IF EXISTS team_messages_body_check;

ALTER TABLE public.team_messages
  ADD CONSTRAINT team_messages_body_check
  CHECK (
    (
      char_length(btrim(body)) BETWEEN 1 AND 2000
    )
    OR
    (
      char_length(btrim(body)) = 0
      AND media_type IN ('audio', 'video')
      AND media_path IS NOT NULL
      AND char_length(btrim(media_path)) > 0
    )
  );
