
-- 1. Drop the overly permissive UPDATE policy
DROP POLICY "Users can update own profile" ON profiles;

-- 2. Add restricted UPDATE policy — users can only update email (not plan/credits/polar_customer_id)
CREATE POLICY "Users can update own profile safe"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND plan IS NOT DISTINCT FROM (SELECT p.plan FROM profiles p WHERE p.id = auth.uid())
    AND credits_remaining IS NOT DISTINCT FROM (SELECT p.credits_remaining FROM profiles p WHERE p.id = auth.uid())
    AND polar_customer_id IS NOT DISTINCT FROM (SELECT p.polar_customer_id FROM profiles p WHERE p.id = auth.uid())
  );

-- 3. Add INSERT policy — only own profile, with enforced defaults
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (
    auth.uid() = id
    AND (plan IS NULL OR plan = 'free')
    AND (credits_remaining IS NULL OR credits_remaining = 2)
  );

-- 4. Explicit deny DELETE policy
CREATE POLICY "No user deletes on profiles"
  ON profiles FOR DELETE
  USING (false);
