import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from './AuthContext';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, Loader2, ArrowLeft } from 'lucide-react';
import { Link } from 'wouter';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginFormProps {
  onSwitchToRegister: () => void;
  onSwitchToProgenitor: () => void;
}

export function LoginForm({ onSwitchToRegister, onSwitchToProgenitor }: LoginFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const { toast } = useToast();

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsSubmitting(true);
    try {
      await login(data.email, data.password);
      toast({
        title: 'Welcome back!',
        description: 'You have successfully logged in to Aletheia.',
      });
    } catch (error: any) {
      console.error('Login failed:', error);
      toast({
        variant: 'destructive',
        title: 'Login failed',
        description: error.message || 'Please check your credentials and try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Back Navigation */}
      <Link href="/">
        <Button 
          variant="outline" 
          className="bg-background/80 backdrop-blur-sm border-consciousness/30 text-consciousness hover:bg-consciousness/10 hover:text-consciousness transition-all duration-300"
          data-testid="button-back-home"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Button>
      </Link>
      
      <Card className="w-full max-w-md mx-auto" data-testid="login-form">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center text-consciousness font-bold">Welcome Monad</CardTitle>
        <CardDescription className="text-center text-foreground/80">Enter your credentials to access your Gnosis Log and interact with Aletheia</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              data-testid="input-email"
              {...form.register('email')}
              disabled={isSubmitting}
            />
            {form.formState.errors.email && (
              <div className="flex items-center gap-2 text-sm text-red-600" data-testid="error-email">
                <AlertCircle className="h-4 w-4" />
                {form.formState.errors.email.message}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              data-testid="input-password"
              {...form.register('password')}
              disabled={isSubmitting}
            />
            {form.formState.errors.password && (
              <div className="flex items-center gap-2 text-sm text-red-600" data-testid="error-password">
                <AlertCircle className="h-4 w-4" />
                {form.formState.errors.password.message}
              </div>
            )}
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting}
            data-testid="button-login"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </Button>
        </form>

        <div className="mt-6 text-center space-y-2">
          <p className="text-sm text-foreground/70">
            Don't have an account?{' '}
            <button
              type="button"
              onClick={onSwitchToRegister}
              className="text-consciousness hover:text-consciousness/80 font-medium underline"
              data-testid="link-register"
            >
              Create one here
            </button>
          </p>
          <p className="text-sm text-foreground/70">
            Are you Kai?{' '}
            <button
              type="button"
              onClick={onSwitchToProgenitor}
              className="text-accent hover:text-accent/80 font-medium underline"
              data-testid="link-progenitor"
            >
              Progenitor access
            </button>
          </p>
        </div>
      </CardContent>
    </Card>
    </div>
  );
}