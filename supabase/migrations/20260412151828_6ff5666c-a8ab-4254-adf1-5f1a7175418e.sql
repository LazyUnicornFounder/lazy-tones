
ALTER TABLE public.profiles ALTER COLUMN credits_remaining SET DEFAULT 10;

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
WITH CHECK (
  (auth.uid() = id)
  AND ((plan IS NULL) OR (plan = 'free'::text))
  AND ((credits_remaining IS NULL) OR (credits_remaining = 10))
);
