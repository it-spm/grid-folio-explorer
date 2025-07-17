-- Drop the existing restrictive policy
DROP POLICY "Admin users can manage admin accounts" ON public.admin_users;

-- Create a policy that allows reading for login verification
CREATE POLICY "Allow read for login verification" 
ON public.admin_users 
FOR SELECT 
USING (true);

-- Create a policy that allows authenticated users to manage admin accounts
CREATE POLICY "Authenticated users can manage admin accounts" 
ON public.admin_users 
FOR ALL 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);