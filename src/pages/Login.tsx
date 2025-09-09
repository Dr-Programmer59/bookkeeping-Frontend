import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export const Login = () => {
  const { user, login, isLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  if (user) {
    return <Navigate to={user.role === 'admin' ? '/dashboard' : '/upload'} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    const success = await login(email, password);
    if (success) {
      // Navigation will be handled by the redirect in the component above
    } else {
      setError('Invalid email or password');
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      return;
    }
    
    // Simulate password reset
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    toast({
      title: "Reset link sent",
      description: "If an account exists with this email, you'll receive a reset link.",
    });
    
    setShowForgotPassword(false);
    setResetEmail('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-lg mobile-card">
        <CardHeader className="text-center space-y-1">
          <div className="mx-auto w-16 h-16 gradient-primary rounded-lg flex items-center justify-center mb-6 shadow-sm">
            <span className="text-primary-foreground font-bold text-xl">BP</span>
          </div>
          <CardTitle className="text-2xl sm:text-3xl font-bold text-foreground">
            BookKeep Pro
          </CardTitle>
          <CardDescription className="text-base">Sign in to your account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-3">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                disabled={isLoading}
                className="mobile-input"
              />
            </div>
            
            <div className="space-y-3">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                disabled={isLoading}
                className="mobile-input"
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full h-12 text-base font-semibold gradient-primary" 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
              <DialogTrigger asChild>
                <Button variant="link" className="text-sm hover:text-primary transition-colors duration-150">
                  Forgot your password?
                </Button>
              </DialogTrigger>
              <DialogContent className="mobile-card">
                <DialogHeader>
                  <DialogTitle>Reset Password</DialogTitle>
                  <DialogDescription>
                    Enter your email address and we'll send you a reset link.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleForgotPassword} className="space-y-6">
                  <div className="space-y-3">
                    <Label htmlFor="reset-email">Email</Label>
                    <Input
                      id="reset-email"
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="mobile-input"
                    />
                  </div>
                  <Button type="submit" className="w-full h-12 gradient-primary">
                    Send Reset Link
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          
          <div className="mt-8 p-4 bg-muted/30 rounded-xl border border-muted">
            <p className="text-sm font-medium mb-3 text-foreground">Backend Integration</p>
            <div className="text-xs space-y-2 text-muted-foreground">
              <div>
                Make sure your backend is running and the API_BASE_URL in src/lib/api.ts points to your backend server.
              </div>
              <div>
                Use your backend's registered credentials to login.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};