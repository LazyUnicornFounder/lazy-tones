
-- Create storage bucket for showcase images
INSERT INTO storage.buckets (id, name, public)
VALUES ('showcase-images', 'showcase-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access
CREATE POLICY "Public read showcase images"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'showcase-images');

-- Allow service role to insert
CREATE POLICY "Service insert showcase images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'showcase-images');
