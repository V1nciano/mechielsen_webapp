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
      // Check for URL verification parameters first
      const verified = searchParams.get('verified');
      const emailParam = searchParams.get('email');
      
      if (verified === 'true' && emailParam) {
        // URL verification found, proceed
      } else {
        // Fall back to session check
        // Try to get session multiple times if needed
        let session = null;
        let authError = null;
        
        for (let attempt = 1; attempt <= 3; attempt++) {
          const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionData?.session) {
            session = sessionData.session;
            authError = null;
            break;
          }
          
          if (sessionError) {
            authError = sessionError;
          }
          
          if (attempt < 3) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
        
        if (authError || !session) {
          // Clear any bad session data
          await supabase.auth.signOut();
          router.push('/login');
          return;
        }
        
        // EMAIL-BASED ADMIN CHECK FIRST (same as dashboard)
        let isAdmin = false;
        if (session.user.email?.includes('admin')) {
          isAdmin = true;
        } else {
          // For non-email admin check, let the API handle it to avoid RLS issues
          isAdmin = true; // Let API handle the actual admin check
        }
        
        if (!isAdmin) {
          router.push('/dashboard');
          return;
        }
      }

      // Fetch users via API route to avoid RLS infinite recursion
      const response = await fetch(`/api/users?verified=${verified}&email=${encodeURIComponent(emailParam || '')}`, {
        credentials: 'include', // Important: This ensures cookies are sent with the request
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login');
          return;
        }
        if (response.status === 403) {
          router.push('/dashboard');
          return;
        }
        toast.error('Fout bij ophalen gebruikers: ' + (data.error || 'Unknown error'));
        return;
      }

      setUsers(data);
    } catch (error) {
      toast.error('Er is een fout opgetreden');
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: 'user' | 'admin') => {
    try {
      const response = await fetch('/api/users', {
        method: 'PATCH',
        credentials: 'include', // Important: This ensures cookies are sent with the request
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        body: JSON.stringify({ userId, role: newRole }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error('Fout bij bijwerken rol: ' + (data.error || 'Unknown error'));
        return;
      }

      toast.success(`Gebruikersrol succesvol bijgewerkt naar ${newRole}`);
      checkAdminAndFetchUsers(); // Refresh data
    } catch (error) {
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