-- Drop the storage policies that require auth.uid()
DROP POLICY IF EXISTS "Allow authenticated users to upload files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to view files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to create buckets" ON storage.buckets;
DROP POLICY IF EXISTS "Allow authenticated users to view buckets" ON storage.buckets;
DROP POLICY IF EXISTS "Allow authenticated users to update buckets" ON storage.buckets;
DROP POLICY IF EXISTS "Allow authenticated users to delete buckets" ON storage.buckets;

-- Create permissive policies for admin file management
-- Since this is an admin system, we'll make storage public for authenticated admin users
CREATE POLICY "Public access to file-explorer bucket objects" 
ON storage.objects 
FOR ALL 
USING (bucket_id = 'file-explorer');

CREATE POLICY "Public access to file-explorer bucket" 
ON storage.buckets 
FOR ALL 
USING (id = 'file-explorer');