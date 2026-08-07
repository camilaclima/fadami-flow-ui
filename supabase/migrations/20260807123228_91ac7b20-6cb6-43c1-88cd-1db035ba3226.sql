-- 1) Corrige registros criados no mesmo dia antes das 17h (regra: antes das 17h só é permitido registrar o dia útil anterior)
UPDATE public.dev_daily_entries
SET entry_date = '2026-08-05'
WHERE id IN (
  '9155c4df-b9c5-4d0a-a9eb-6d42ad33d15e',
  '9c15391d-0eae-4923-9bff-6d26df10ad65',
  '452f1a29-ed4d-4e0e-8f4a-34cca1743f68',
  'b52bc0bf-91c7-494f-a919-fd682c57a0e4',
  '22211e93-b411-4f7d-8c2f-40d19891f9c1',
  '587faddb-d371-42d1-b3ab-ba48f87c1b4a'
);

UPDATE public.dev_daily_entries
SET entry_date = '2026-08-06'
WHERE id IN (
  'b4ecb616-96ef-4af6-b6bb-5f913b3195bd',
  'c0314776-c7a9-496d-96ae-4afcb44cf0de',
  '14e7ca7e-7340-4773-94f1-f3811b94ddd1'
);

-- 2) Passa a garantir a regra no banco, mesmo se o navegador estiver com versão antiga em cache
CREATE OR REPLACE FUNCTION public.enforce_daily_entry_reference_date()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  local_now timestamp := (now() AT TIME ZONE 'America/Sao_Paulo');
BEGIN
  IF NEW.entry_date > local_now::date THEN
    RAISE EXCEPTION 'Não é permitido registrar daily para uma data futura.';
  END IF;

  IF NEW.entry_date = local_now::date AND EXTRACT(HOUR FROM local_now) < 17 THEN
    RAISE EXCEPTION 'A daily de hoje só pode ser registrada a partir das 17h. Selecione a opção "Ontem".';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_daily_entry_reference_date ON public.dev_daily_entries;
CREATE TRIGGER trg_enforce_daily_entry_reference_date
BEFORE INSERT ON public.dev_daily_entries
FOR EACH ROW EXECUTE FUNCTION public.enforce_daily_entry_reference_date();