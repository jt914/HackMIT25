'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setAuthToken } from "@/lib/backend-auth";
import { getApiEndpoint } from "@/lib/config";

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(getApiEndpoint('login-account'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Store the JWT token using our auth utility
        if (data.token) {
          setAuthToken(data.token);
        }
        router.push('/dashboard');
      } else {
        setError(data.detail || 'Login failed');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-orange-400/10 via-transparent to-amber-400/10"></div>
      <Card className="w-full max-w-lg border-0 shadow-2xl bg-white/90 backdrop-blur-lg relative z-10">
        <CardHeader className="text-center pb-8 pt-8">
          <Link href="/" className="flex items-center justify-center mb-6 group">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl flex items-center justify-center mr-3 shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105">
              <span className="text-white font-bold text-xl">C</span>
            </div>
            <span className="font-bold text-2xl bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">CodeByte</span>
          </Link>
          <CardTitle className="text-3xl font-bold text-gray-900 mb-3">Welcome back!</CardTitle>
          <p className="text-gray-600 text-lg">Sign in to continue your learning journey</p>
        </CardHeader>

        <CardContent className="px-8 pb-8">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl mb-6 animate-in slide-in-from-top-2">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="email" className="text-gray-700 font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="h-12 rounded-xl border-gray-200 focus:border-orange-300 focus:ring-orange-200 transition-all duration-300"
                required
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="password" className="text-gray-700 font-medium">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="h-12 rounded-xl border-gray-200 focus:border-orange-300 focus:ring-orange-200 transition-all duration-300"
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-gray-600">
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="font-semibold text-orange-600 hover:text-orange-700 hover:underline transition-colors">
                Sign up
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}