'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Settings, Users } from 'lucide-react';
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
        console.log('🔍 Admin page: Starting auth check...');
        
        // Check for URL verification parameters first
        const verified = searchParams.get('verified');
        const emailParam = searchParams.get('email');
        
        console.log('🔍 Admin page: URL params:', { verified, emailParam });
        
        if (verified === 'true' && emailParam) {
          console.log('🎉 Admin page: URL verification found! Granting admin access...');
          setUser({ email: emailParam } as User);
          setIsAdmin(true);
          setLoading(false);
          return;
        }
        
        // Fall back to session check
        console.log('🔍 Admin page: No URL verification, checking session...');
        
        // Small delay to allow Supabase to initialize properly
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Check if user is authenticated
        const { data: { session }, error: authError } = await supabase.auth.getSession();
        
        console.log('🔍 Admin page: Session result:', {
          hasSession: !!session,
          hasError: !!authError,
          userEmail: session?.user?.email
        });
        
        if (authError) {
          console.error('❌ Admin page: Auth error:', authError);
          router.push('/login');
          return;
        }
        
        if (!session) {
          console.log('❌ Admin page: No session found, redirecting to login');
          router.push('/login');
          return;
        }

        setUser(session.user);
        console.log('✅ Admin page: Session found for:', session.user.email);

        // EMAIL-BASED ADMIN CHECK FIRST (same as dashboard)
        if (session.user.email?.includes('admin')) {
          console.log('🎉 Admin page: Email contains admin - granting access!');
          setIsAdmin(true);
          return;
        }

        console.log('🔍 Admin page: Email does not contain admin, checking database...');
        
        // Fallback: Check database for admin role
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('user_id', session.user.id)
          .single();

        console.log('🔍 Admin page: Database profile result:', {
          profile,
          error: profileError
        });

        if (profile && profile.role === 'admin') {
          console.log('🎉 Admin page: Database admin found!');
          setIsAdmin(true);
        } else {
          console.log('❌ Admin page: User is not admin, redirecting to dashboard');
          router.push('/dashboard');
        }

        if (profileError) {
          console.log('Admin page: Profile query error:', profileError);
        }
      } catch (error) {
        console.error('❌ Admin page: Error checking admin auth:', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAdminAuth();
  }, [router, supabase, searchParams]);

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
              <p className="text-gray-600">Beheer aanbouwdelen en installatie instructies.</p>
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
            onClick={async () => {
              try {
                console.log('🔍 Admin: Preparing to go back to dashboard...');
                
                // First, try to refresh the session
                const { data: { session } } = await supabase.auth.getSession();
                
                if (session) {
                  console.log('✅ Admin: Session is valid, navigating to dashboard');
                  // Session is valid, navigate normally
                  router.push('/dashboard');
                } else {
                  console.log('❌ Admin: No session, navigating to login instead');
                  // No session, redirect to login
                  router.push('/login');
                }
              } catch (error) {
                console.error('❌ Admin: Error checking session:', error);
                router.push('/login');
              }
            }}
          >
            Terug naar Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
} 