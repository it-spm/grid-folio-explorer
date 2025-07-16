import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import bcrypt from 'bcryptjs';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      console.log('Login attempt:', { username });
      
      // Get user from database
      const { data: user, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('username', username)
        .single();

      console.log('Database query result:', { user, error });

      if (error || !user) {
        console.log('User not found or database error:', error);
        toast.error('Invalid username or password');
        setIsLoading(false);
        return;
      }

      console.log('User found, comparing passwords...', { 
        inputPassword: password, 
        storedHash: user.password_hash 
      });

      // Verify password
      const isValid = await bcrypt.compare(password, user.password_hash);
      
      console.log('Password comparison result:', isValid);
      
      if (!isValid) {
        toast.error('Invalid username or password');
        setIsLoading(false);
        return;
      }

      // Store user session in localStorage
      localStorage.setItem('adminUser', JSON.stringify(user));
      toast.success('Login successful!');
      navigate('/');
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Login failed');
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mx-auto mb-4">
            <span className="text-primary-foreground font-bold text-lg">SPM</span>
          </div>
          <CardTitle className="text-2xl">Admin Login</CardTitle>
          <p className="text-muted-foreground">
            Sign in to manage Suparma files
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;