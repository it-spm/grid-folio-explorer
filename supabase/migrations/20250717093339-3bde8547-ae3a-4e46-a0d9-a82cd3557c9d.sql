-- Create storage policies for the file-explorer bucket to allow authenticated users to manage files
CREATE POLICY "Allow authenticated users to upload files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'file-explorer' AND auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to view files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'file-explorer' AND auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to update files" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'file-explorer' AND auth.uid() IS NOT NULL)
WITH CHECK (bucket_id = 'file-explorer' AND auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to delete files" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'file-explorer' AND auth.uid() IS NOT NULL);

-- Also allow bucket creation for authenticated users
CREATE POLICY "Allow authenticated users to create buckets" 
ON storage.buckets 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to view buckets" 
ON storage.buckets 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to update buckets" 
ON storage.buckets 
FOR UPDATE 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to delete buckets" 
ON storage.buckets 
FOR DELETE 
USING (auth.uid() IS NOT NULL);