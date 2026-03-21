'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/components/ui/toast';
import { UserRole } from '@/types';
import { Phone, Lock, User, ArrowRight, ShieldCheck, KeyRound } from 'lucide-react';

type Step = 'register' | 'otp';

export default function RegisterPage() {
  const router = useRouter();
  const { register, isLoading, error, clearError, isAuthenticated, user } = useAuth({
    redirectIfAuthenticated: true,
  });
  const { toast } = useToast();

  const [step, setStep] = useState<Step>('register');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<string>('PASSENGER');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (error) {
      toast({ type: 'error', title: 'Registration Failed', description: error });
      clearError();
    }
  }, [error, toast, clearError]);

  useEffect(() => {
    if (isAuthenticated && user && step === 'register') {
      // After registration, move to OTP step
      setStep('otp');
    }
  }, [isAuthenticated, user, step]);

  function validateRegister(): boolean {
    const errors: Record<string, string> = {};
    const cleanPhone = phone.replace(/[\s\-()]/g, '');

    if (!name.trim()) {
      errors.name = 'Full name is required';
    } else if (name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters';
    }

    if (!cleanPhone) {
      errors.phone = 'Phone number is required';
    } else if (!/^(\+?260|0)?\d{9}$/.test(cleanPhone) && !/^\d{9}$/.test(cleanPhone)) {
      errors.phone = 'Enter a valid Zambian phone number';
    }

    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    if (!termsAccepted) {
      errors.terms = 'You must accept the terms and conditions';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!validateRegister()) return;

    try {
      await register(phone, name, password, role as UserRole);
      toast({
        type: 'success',
        title: 'Account Created',
        description: 'Please verify your phone number with the OTP sent to you.',
      });
    } catch {
      // Error handled by useEffect
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();

    if (!otp || otp.length < 4) {
      setFormErrors({ otp: 'Please enter the OTP code' });
      return;
    }

    setOtpLoading(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error?.message ?? 'Invalid OTP');
      }

      toast({ type: 'success', title: 'Phone Verified!' });
      const roleRoutes: Record<string, string> = {
        PASSENGER: '/passenger',
        DRIVER: '/driver/dashboard',
      };
      router.push(roleRoutes[role] ?? '/passenger');
    } catch (err) {
      toast({
        type: 'error',
        title: 'Verification Failed',
        description: err instanceof Error ? err.message : 'Invalid OTP code',
      });
    } finally {
      setOtpLoading(false);
    }
  }

  function handleSkipOtp() {
    const roleRoutes: Record<string, string> = {
      PASSENGER: '/passenger',
      DRIVER: '/driver/dashboard',
    };
    router.push(roleRoutes[role] ?? '/passenger');
  }

  if (step === 'otp') {
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#0F6E56]/10">
            <KeyRound className="h-7 w-7 text-[#0F6E56]" />
          </div>
          <CardTitle className="text-2xl">Verify Phone</CardTitle>
          <p className="mt-1 text-sm text-gray-500">Enter the OTP code sent to {phone}</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <Input
              label="OTP Code"
              type="text"
              placeholder="Enter 6-digit code"
              value={otp}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                setOtp(val);
                if (formErrors.otp) setFormErrors((p) => ({ ...p, otp: '' }));
              }}
              error={formErrors.otp}
              maxLength={6}
              className="text-center text-2xl tracking-[0.5em] font-mono"
              autoComplete="one-time-code"
            />

            <Button type="submit" className="w-full" size="lg" loading={otpLoading}>
              Verify
              <ShieldCheck className="h-4 w-4" />
            </Button>
          </form>

          <button
            onClick={handleSkipOtp}
            className="mt-4 w-full text-center text-sm text-gray-400 hover:text-gray-600"
          >
            Skip for now
          </button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Create Account</CardTitle>
        <p className="mt-1 text-sm text-gray-500">Join ZedPulse for safer travel across Zambia</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleRegister} className="space-y-4">
          <Input
            label="Full Name"
            type="text"
            placeholder="e.g. Mwamba Chanda"
            icon={<User className="h-4 w-4" />}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (formErrors.name) setFormErrors((p) => ({ ...p, name: '' }));
            }}
            error={formErrors.name}
            autoComplete="name"
          />

          <Input
            label="Phone Number"
            type="tel"
            placeholder="+260 97 1234567"
            icon={<Phone className="h-4 w-4" />}
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              if (formErrors.phone) setFormErrors((p) => ({ ...p, phone: '' }));
            }}
            error={formErrors.phone}
            autoComplete="tel"
          />

          <Select
            label="I am a"
            options={[
              { value: 'PASSENGER', label: 'Passenger' },
              { value: 'DRIVER', label: 'Driver' },
            ]}
            value={role}
            onChange={(e) => setRole(e.target.value)}
          />

          <Input
            label="Password"
            type="password"
            placeholder="At least 8 characters"
            icon={<Lock className="h-4 w-4" />}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (formErrors.password) setFormErrors((p) => ({ ...p, password: '' }));
            }}
            error={formErrors.password}
            autoComplete="new-password"
          />

          <Input
            label="Confirm Password"
            type="password"
            placeholder="Re-enter your password"
            icon={<Lock className="h-4 w-4" />}
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (formErrors.confirmPassword) setFormErrors((p) => ({ ...p, confirmPassword: '' }));
            }}
            error={formErrors.confirmPassword}
            autoComplete="new-password"
          />

          <div>
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => {
                  setTermsAccepted(e.target.checked);
                  if (formErrors.terms) setFormErrors((p) => ({ ...p, terms: '' }));
                }}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-[#0F6E56] focus:ring-[#0F6E56]"
              />
              <span className="text-sm text-gray-600">
                I agree to the{' '}
                <Link href="/terms" className="font-medium text-[#0F6E56] hover:underline">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="font-medium text-[#0F6E56] hover:underline">
                  Privacy Policy
                </Link>
              </span>
            </label>
            {formErrors.terms && <p className="mt-1 text-sm text-[#E24B4A]">{formErrors.terms}</p>}
          </div>

          <Button type="submit" className="w-full" size="lg" loading={isLoading}>
            Create Account
            <ArrowRight className="h-4 w-4" />
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-[#0F6E56] hover:underline">
            Sign in
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
