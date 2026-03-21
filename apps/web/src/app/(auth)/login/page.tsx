'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/components/ui/toast';
import { Phone, Lock, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('returnUrl');
  const { login, isLoading, error, clearError, isAuthenticated, user } = useAuth({
    redirectIfAuthenticated: true,
  });
  const { toast } = useToast();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [formErrors, setFormErrors] = useState<{
    phone?: string;
    password?: string;
  }>({});

  useEffect(() => {
    if (error) {
      toast({ type: 'error', title: 'Login Failed', description: error });
      clearError();
    }
  }, [error, toast, clearError]);

  useEffect(() => {
    if (isAuthenticated && user) {
      const roleRoutes: Record<string, string> = {
        PASSENGER: '/passenger',
        DRIVER: '/driver/dashboard',
        RTSA_OFFICER: '/rtsa/dashboard',
        OPERATOR: '/operator/dashboard',
        ADMIN: '/admin/dashboard',
      };
      const destination = returnUrl
        ? decodeURIComponent(returnUrl)
        : (roleRoutes[user.role] ?? '/passenger');
      router.push(destination);
    }
  }, [isAuthenticated, user, router, returnUrl]);

  function validate(): boolean {
    const errors: typeof formErrors = {};
    const cleanPhone = phone.replace(/[\s\-()]/g, '');

    if (!cleanPhone) {
      errors.phone = 'Phone number is required';
    } else if (!/^(\+?260|0)?\d{9}$/.test(cleanPhone) && !/^\d{9}$/.test(cleanPhone)) {
      errors.phone = 'Enter a valid Zambian phone number';
    }

    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    try {
      await login(phone, password);
      toast({ type: 'success', title: 'Welcome back!' });
    } catch {
      // Error handled by useEffect above
    }
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Welcome Back</CardTitle>
        <p className="mt-1 text-sm text-gray-500">Sign in to your ZedPulse account</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Phone Number"
            type="tel"
            placeholder="+260 97 1234567"
            icon={<Phone className="h-4 w-4" />}
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              if (formErrors.phone) setFormErrors((p) => ({ ...p, phone: undefined }));
            }}
            error={formErrors.phone}
            autoComplete="tel"
          />

          <Input
            label="Password"
            type="password"
            placeholder="Enter your password"
            icon={<Lock className="h-4 w-4" />}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (formErrors.password) setFormErrors((p) => ({ ...p, password: undefined }));
            }}
            error={formErrors.password}
            autoComplete="current-password"
          />

          <Button type="submit" className="w-full" size="lg" loading={isLoading}>
            Sign In
            <ArrowRight className="h-4 w-4" />
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="font-medium text-[#0F6E56] hover:underline">
            Create one
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
