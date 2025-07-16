-- Create admin_users table for authentication
CREATE TABLE public.admin_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admin users can manage admin accounts" 
ON public.admin_users 
FOR ALL 
USING (auth.uid() IS NOT NULL);

-- Insert default admin user with hashed password (admin123)
INSERT INTO public.admin_users (username, password_hash) 
VALUES ('admin', '$2b$10$K7L/8Y1t4.9QdTzjr6E8Q.8xJ2jR1Q9K3Fk7E6X5L2N4M8P9W1V3Y7');