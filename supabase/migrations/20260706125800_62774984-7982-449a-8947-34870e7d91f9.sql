CREATE POLICY "Authenticated users can view daily activities"
  ON public.dev_daily_activities
  FOR SELECT
  TO authenticated
  USING (true);