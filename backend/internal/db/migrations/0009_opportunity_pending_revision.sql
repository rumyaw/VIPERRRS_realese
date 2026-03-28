-- Правки опубликованных карточек: до одобрения куратором на сайте остаётся предыдущая версия.
ALTER TABLE opportunities
  ADD COLUMN IF NOT EXISTS pending_revision jsonb,
  ADD COLUMN IF NOT EXISTS revision_moderation_status text;
