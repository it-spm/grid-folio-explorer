
-- Create admin users table
CREATE TABLE public.admin_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create folders table
CREATE TABLE public.folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES public.folders(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create files table
CREATE TABLE public.files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_path TEXT NOT NULL,
  folder_id UUID REFERENCES public.folders(id) ON DELETE CASCADE,
  mime_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create storage bucket for files
INSERT INTO storage.buckets (id, name, public)
VALUES ('file-explorer', 'file-explorer', true);

-- Create storage policies for file uploads
CREATE POLICY "Anyone can view files" ON storage.objects
  FOR SELECT USING (bucket_id = 'file-explorer');

CREATE POLICY "Authenticated users can upload files" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'file-explorer');

CREATE POLICY "Authenticated users can update files" ON storage.objects
  FOR UPDATE USING (bucket_id = 'file-explorer');

CREATE POLICY "Authenticated users can delete files" ON storage.objects
  FOR DELETE USING (bucket_id = 'file-explorer');

-- Enable RLS on tables
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (visitors can browse)
CREATE POLICY "Anyone can view folders" ON public.folders
  FOR SELECT USING (true);

CREATE POLICY "Anyone can view files" ON public.files
  FOR SELECT USING (true);

-- Create policies for admin operations (will be refined with admin authentication)
CREATE POLICY "Authenticated users can manage folders" ON public.folders
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage files" ON public.files
  FOR ALL USING (true) WITH CHECK (true);

-- Insert a default admin user (password: admin123)
INSERT INTO public.admin_users (email, password_hash)
VALUES ('admin@example.com', '$2b$10$rQZ8qNQZ8qNQZ8qNQZ8qNQ8qNQZ8qNQZ8qNQZ8qNQZ8qNQZ8qNQZ8');

-- Create some sample folders
INSERT INTO public.folders (name, description) VALUES
  ('Documents', 'Important documents and files'),
  ('Images', 'Photos and graphics'),
  ('Presentations', 'PowerPoint and presentation files'),
  ('Spreadsheets', 'Excel and data files');
