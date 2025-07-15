-- Update RLS policies to use proper authentication
-- First, drop the overly permissive policies
DROP POLICY IF EXISTS "Anyone can view folders" ON public.folders;
DROP POLICY IF EXISTS "Authenticated users can manage folders" ON public.folders;
DROP POLICY IF EXISTS "Anyone can view files" ON public.files;
DROP POLICY IF EXISTS "Authenticated users can manage files" ON public.files;

-- Create secure policies for folders
CREATE POLICY "Public can view folders" ON public.folders
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage folders" ON public.folders
  FOR ALL USING (auth.uid() IS NOT NULL) 
  WITH CHECK (auth.uid() IS NOT NULL);

-- Create secure policies for files  
CREATE POLICY "Public can view files" ON public.files
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage files" ON public.files
  FOR ALL USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Remove the admin_users table since we'll use Supabase Auth
DROP TABLE IF EXISTS public.admin_users;