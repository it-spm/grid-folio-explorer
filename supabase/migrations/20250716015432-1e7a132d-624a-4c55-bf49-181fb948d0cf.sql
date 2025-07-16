-- Reset admin password to 'admin123'
UPDATE public.admin_users 
SET password_hash = '$2b$10$K7L/8Y1t4.9QdTzjr6E8Q.8xJ2jR1Q9K3Fk7E6X5L2N4M8P9W1V3Y7',
    updated_at = now()
WHERE username = 'admin';