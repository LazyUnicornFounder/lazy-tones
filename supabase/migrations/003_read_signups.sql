-- Allow reading signup emails via RPC
CREATE OR REPLACE FUNCTION public.get_all_signups()
RETURNS TABLE(id uuid, email text, created_at timestamptz)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, email::text, created_at
  FROM auth.users
  ORDER BY created_at DESC;
$$;
