
-- Add icon column to folders table
ALTER TABLE public.folders ADD COLUMN icon TEXT DEFAULT 'folder';

-- Update existing folders to have the default icon
UPDATE public.folders SET icon = 'folder' WHERE icon IS NULL;
