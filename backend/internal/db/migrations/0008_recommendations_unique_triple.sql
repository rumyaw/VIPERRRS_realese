-- Удаляем дубликаты (оставляем самую раннюю запись), иначе UNIQUE INDEX не создать (23505)
DELETE FROM recommendations r
WHERE r.id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY from_user_id, to_user_id, opportunity_id
             ORDER BY created_at ASC, id ASC
           ) AS rn
    FROM recommendations
  ) x
  WHERE rn > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_recommendations_from_to_opp
ON recommendations (from_user_id, to_user_id, opportunity_id);
