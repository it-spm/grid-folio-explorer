-- Update admin password to plain text
UPDATE public.admin_users 
SET password_hash = 'admin123',
    updated_at = now()
WHERE username = 'admin';