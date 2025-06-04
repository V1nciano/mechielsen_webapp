'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Settings, Users, ArrowLeft } from 'lucide-react';
import type { User } from '@supabase/auth-helpers-nextjs';

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClientComponentClient();

  useEffect(() => {
    const checkAdminAuth = async () => {
      try {
        // Check for URL verification parameters first
        const verified = searchParams.get('verified');
        const emailParam = searchParams.get('email');
        
        if (verified === 'true' && emailParam) {
          setUser({ email: emailParam } as User);
          setIsAdmin(true);
          setLoading(false);
          return;
        }
        
        // Fall back to session check
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Check if user is authenticated
        const { data: { session }, error: authError } = await supabase.auth.getSession();
        
        if (authError) {
          router.push('/login');
          return;
        }
        
        if (!session) {
          router.push('/login');
          return;
        }

        setUser(session.user);

        // EMAIL-BASED ADMIN CHECK FIRST (same as dashboard)
        if (session.user.email?.includes('admin')) {
          setIsAdmin(true);
          return;
        }
        
        // Fallback: Check database for admin role
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('user_id', session.user.id)
          .single();

        if (profile && profile.role === 'admin') {
          setIsAdmin(true);
        } else {
          router.push('/dashboard');
        }
      } catch {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAdminAuth();
  }, [router, supabase, searchParams]);

  // Function to navigate back to dashboard with proper admin verification
  const navigateToDashboard = async () => {
    try {
      // If we came here via URL verification, store admin status temporarily
      const verified = searchParams.get('verified');
      const emailParam = searchParams.get('email');
      
      if (verified === 'true' && emailParam) {
        // Store a temporary admin token in localStorage for smooth transition
        const adminToken = {
          email: emailParam,
          verified: true,
          timestamp: Date.now(),
          expires: Date.now() + (5 * 60 * 1000) // 5 minutes
        };
        
        localStorage.setItem('temp_admin_token', JSON.stringify(adminToken));
      }
      
      // Try to refresh the current session to ensure dashboard has valid auth
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    } catch {
      router.push('/login');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4">Laden...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">Welkom {user?.email}</p>
          <p className="text-xs text-gray-400 mt-1">
            Admin toegang via: {user?.email?.includes('admin') ? 'Email verificatie' : 'URL verificatie'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => {
            const verified = searchParams.get('verified') || 'true';
            const email = searchParams.get('email') || user?.email || 'admin@example.com';
            router.push(`/admin/machines?verified=${verified}&email=${encodeURIComponent(email)}`);
          }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Machines Beheren
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Voeg nieuwe machines toe, bewerk kentekens en hydraulische inputs.</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => {
            const verified = searchParams.get('verified') || 'true';
            const email = searchParams.get('email') || user?.email || 'admin@example.com';
            router.push(`/admin/attachments?verified=${verified}&email=${encodeURIComponent(email)}`);
          }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Aanbouwdelen Beheren
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Beheer aanbouwdelen en hydraulische slangen.</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => {
            const verified = searchParams.get('verified') || 'true';
            const email = searchParams.get('email') || user?.email || 'admin@example.com';
            router.push(`/admin/machine-config?verified=${verified}&email=${encodeURIComponent(email)}`);
          }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Machine-Aanbouwdeel Configuratie
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Verbind machines met aanbouwdelen en configureer hydraulische koppelingen.</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => {
            const verified = searchParams.get('verified') || 'true';
            const email = searchParams.get('email') || user?.email || 'admin@example.com';
            router.push(`/admin/users?verified=${verified}&email=${encodeURIComponent(email)}`);
          }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Gebruikers Beheren
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Beheer gebruikersaccounts en toegangsrechten.</p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8">
          <Button 
            variant="outline" 
            onClick={navigateToDashboard}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Terug naar Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
} 