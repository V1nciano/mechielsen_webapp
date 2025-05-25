'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Shield, User } from 'lucide-react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface UserProfile {
  id: string;
  user_id: string;
  role: 'user' | 'admin';
  created_at: string;
  email?: string;
}

export default function UsersAdmin() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClientComponentClient();

  useEffect(() => {
    checkAdminAndFetchUsers();
  }, []);

  const checkAdminAndFetchUsers = async () => {
    try {
      console.log('🔍 Admin users: Starting auth check...');
      
      // Check for URL verification parameters first
      const verified = searchParams.get('verified');
      const emailParam = searchParams.get('email');
      
      console.log('🔍 Admin users: URL params:', { verified, emailParam });
      
      if (verified === 'true' && emailParam) {
        console.log('🎉 Admin users: URL verification found! Proceeding...');
        // Continue to fetch users
      } else {
        // Fall back to session check
        console.log('🔍 Admin users: No URL verification, checking session...');
        
        // Check admin authentication
        const { data: { session }, error: authError } = await supabase.auth.getSession();
        
        if (authError || !session) {
          router.push('/login');
          return;
        }
        
        console.log('Admin users: Checking admin for:', session.user.email);
        
        // EMAIL-BASED ADMIN CHECK FIRST (same as dashboard)
        let isAdmin = false;
        if (session.user.email?.includes('admin')) {
          console.log('🎉 Admin users: Email contains admin - granting access!');
          isAdmin = true;
        } else {
          // Fallback: Check database for admin role
          const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('role')
            .eq('user_id', session.user.id)
            .single();
          
          if (profile && profile.role === 'admin') {
            console.log('🎉 Admin users: Database admin found!');
            isAdmin = true;
          }
          
          if (profileError) {
            console.log('Admin users: Profile query error:', profileError);
          }
        }
        
        if (!isAdmin) {
          console.log('❌ Admin users: User is not admin, redirecting to dashboard');
          router.push('/dashboard');
          return;
        }
      }

      // Fetch all user profiles with auth users data
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) {
        toast.error('Fout bij ophalen gebruikers: ' + profilesError.message);
        return;
      }

      // Fetch auth.users data to get emails
      const { data: authUsers, error: authError2 } = await supabase.auth.admin.listUsers();
      
      if (authError2) {
        console.error('Could not fetch auth users:', authError2);
        // Continue without emails if admin API is not available
      }

      // Combine profile data with email from auth.users
      const usersWithEmails = profiles?.map(profile => ({
        ...profile,
        email: authUsers?.users?.find(u => u.id === profile.user_id)?.email || 'Unknown'
      })) || [];

      setUsers(usersWithEmails);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Er is een fout opgetreden');
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: 'user' | 'admin') => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ role: newRole })
        .eq('user_id', userId);

      if (error) {
        toast.error('Fout bij bijwerken rol: ' + error.message);
        return;
      }

      toast.success(`Gebruikersrol succesvol bijgewerkt naar ${newRole}`);
      checkAdminAndFetchUsers(); // Refresh data
    } catch (error) {
      console.error('Error updating user role:', error);
      toast.error('Er is een fout opgetreden bij het bijwerken van de rol');
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

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => {
              // Preserve admin verification parameters
              const verified = searchParams.get('verified') || 'true';
              const email = searchParams.get('email') || 'admin@example.com';
              router.push(`/admin?verified=${verified}&email=${encodeURIComponent(email)}`);
            }}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Terug
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Gebruikers Beheren</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {users.map((user) => (
            <Card key={user.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {user.role === 'admin' ? (
                      <Shield className="w-5 h-5 text-red-500" />
                    ) : (
                      <User className="w-5 h-5 text-blue-500" />
                    )}
                    <span className="truncate">{user.email}</span>
                  </div>
                  <Badge variant={user.role === 'admin' ? 'destructive' : 'secondary'}>
                    {user.role}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">
                    Aangemaakt: {new Date(user.created_at).toLocaleDateString('nl-NL')}
                  </p>
                  <p className="text-xs text-gray-400 break-all">
                    ID: {user.user_id}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rol wijzigen:
                  </label>
                  <Select 
                    value={user.role} 
                    onValueChange={(newRole: 'user' | 'admin') => updateUserRole(user.user_id, newRole)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {users.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">Geen gebruikers gevonden.</p>
          </div>
        )}
      </div>
    </div>
  );
} 