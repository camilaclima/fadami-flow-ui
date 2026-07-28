WITH norm AS (
  SELECT id, nullif(lower(trim(email)),'') AS em, lower(trim(name)) AS nm, created_at
  FROM public.team_members WHERE active
), keyed AS (
  SELECT n.id, n.em, n.created_at,
    COALESCE(n.em, (SELECT n2.em FROM norm n2 WHERE n2.nm = n.nm AND n2.em IS NOT NULL ORDER BY n2.created_at LIMIT 1), n.nm) AS k
  FROM norm n
), ranked AS (
  SELECT id, k, ROW_NUMBER() OVER (PARTITION BY k ORDER BY (em IS NULL), created_at) AS rn,
         FIRST_VALUE(id) OVER (PARTITION BY k ORDER BY (em IS NULL), created_at) AS canonical_id
  FROM keyed
), dups AS (
  SELECT id AS dup_id, canonical_id FROM ranked WHERE rn > 1 AND id <> canonical_id
),
-- repoint squad links
sm_moved AS (
  UPDATE public.squad_members sm SET team_member_id = d.canonical_id
  FROM dups d
  WHERE sm.team_member_id = d.dup_id
    AND NOT EXISTS (SELECT 1 FROM public.squad_members s2 WHERE s2.squad_id = sm.squad_id AND s2.team_member_id = d.canonical_id)
  RETURNING sm.id
),
sm_deleted AS (
  DELETE FROM public.squad_members sm USING dups d WHERE sm.team_member_id = d.dup_id RETURNING sm.id
),
spm_moved AS (
  UPDATE public.sprint_members m SET team_member_id = d.canonical_id
  FROM dups d
  WHERE m.team_member_id = d.dup_id
    AND NOT EXISTS (SELECT 1 FROM public.sprint_members m2 WHERE m2.sprint_id = m.sprint_id AND m2.team_member_id = d.canonical_id)
  RETURNING m.id
),
spm_deleted AS (
  DELETE FROM public.sprint_members m USING dups d WHERE m.team_member_id = d.dup_id RETURNING m.id
),
sbi AS (
  UPDATE public.sprint_backlog_items b SET team_member_id = d.canonical_id
  FROM dups d WHERE b.team_member_id = d.dup_id RETURNING b.id
),
tmp_moved AS (
  UPDATE public.team_member_products p SET team_member_id = d.canonical_id
  FROM dups d
  WHERE p.team_member_id = d.dup_id
    AND NOT EXISTS (SELECT 1 FROM public.team_member_products p2 WHERE p2.product_id = p.product_id AND p2.team_member_id = d.canonical_id)
  RETURNING p.id
),
tmp_deleted AS (
  DELETE FROM public.team_member_products p USING dups d WHERE p.team_member_id = d.dup_id RETURNING p.id
)
UPDATE public.team_members t SET active = false, updated_at = now()
FROM dups d WHERE t.id = d.dup_id;