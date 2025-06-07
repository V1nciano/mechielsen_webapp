'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Shield, User, Trash2, Settings, AlertTriangle, Calendar, Mail, Search, Filter, ChevronLeft, ChevronRight, MoreHorizontal, UserPlus, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface UserProfile {
  id: string;
  user_id: string;
  role: 'user' | 'admin';
  created_at: string;
  email?: string;
}

type SortField = 'email' | 'role' | 'created_at';
type SortDirection = 'asc' | 'desc';

export default function UsersAdmin() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [roleChangeDialog, setRoleChangeDialog] = useState<{userId: string, newRole: 'user' | 'admin', currentRole: 'user' | 'admin'} | null>(null);
  const [bulkDeleteDialog, setBulkDeleteDialog] = useState(false);
  
  // Search and filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'user' | 'admin'>('all');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  
  // Bulk selection
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  
  // View mode
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClientComponentClient();

  const checkAdminAndFetchUsers = useCallback(async () => {
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
    } catch {
      toast.error('Er is een fout opgetreden');
    } finally {
      setLoading(false);
    }
  }, [router, searchParams, supabase]);

  useEffect(() => {
    checkAdminAndFetchUsers();
  }, [checkAdminAndFetchUsers]);

  const updateUserRole = async (userId: string, newRole: 'user' | 'admin') => {
    try {
      const verified = searchParams.get('verified') || 'true';
      const emailParam = searchParams.get('email') || 'admin@example.com';
      
      const response = await fetch(`/api/users?verified=${verified}&email=${encodeURIComponent(emailParam)}`, {
        method: 'PATCH',
        credentials: 'include',
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

      toast.success(`Gebruikersrol succesvol bijgewerkt naar ${newRole === 'admin' ? 'Administrator' : 'Gebruiker'}`);
      checkAdminAndFetchUsers(); // Refresh data
    } catch {
      toast.error('Er is een fout opgetreden bij het bijwerken van de rol');
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      const verified = searchParams.get('verified') || 'true';
      const emailParam = searchParams.get('email') || 'admin@example.com';
      
      const response = await fetch(`/api/users?userId=${userId}&verified=${verified}&email=${encodeURIComponent(emailParam)}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error('Fout bij verwijderen gebruiker: ' + (data.error || 'Unknown error'));
        return;
      }

      toast.success('Gebruiker succesvol verwijderd');
      checkAdminAndFetchUsers(); // Refresh data
    } catch {
      toast.error('Er is een fout opgetreden bij het verwijderen van de gebruiker');
    }
  };

  const bulkDeleteUsers = async () => {
    const deletePromises = Array.from(selectedUsers).map(userId => deleteUser(userId));
    await Promise.all(deletePromises);
    setSelectedUsers(new Set());
    setBulkDeleteDialog(false);
  };

  const handleRoleChange = (userId: string, newRole: 'user' | 'admin') => {
    const user = users.find(u => u.user_id === userId);
    if (user && user.role !== newRole) {
      setRoleChangeDialog({
        userId,
        newRole,
        currentRole: user.role
      });
    }
  };

  const confirmRoleChange = async () => {
    if (roleChangeDialog) {
      await updateUserRole(roleChangeDialog.userId, roleChangeDialog.newRole);
      setRoleChangeDialog(null);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const toggleUserSelection = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map(user => user.user_id)));
    }
  };

  // Filtered and sorted users
  const filteredUsers = useMemo(() => {
    const filtered = users.filter(user => {
      const matchesSearch = 
        user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.user_id.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      
      return matchesSearch && matchesRole;
    });

    // Sort users
    filtered.sort((a, b) => {
      let aValue: string | Date;
      let bValue: string | Date;

      switch (sortField) {
        case 'email':
          aValue = a.email || '';
          bValue = b.email || '';
          break;
        case 'role':
          aValue = a.role;
          bValue = b.role;
          break;
        case 'created_at':
          aValue = new Date(a.created_at);
          bValue = new Date(b.created_at);
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [users, searchQuery, roleFilter, sortField, sortDirection]);

  // Paginated users
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredUsers.slice(startIndex, startIndex + pageSize);
  }, [filteredUsers, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredUsers.length / pageSize);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50/30">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Gebruikers laden...</p>
        </div>
      </div>
    );
  }

  const renderTableView = () => (
    <Card className="bg-white/90 backdrop-blur-sm border border-gray-200">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/50">
              <TableHead className="w-12">
                <Checkbox 
                  checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('email')}
              >
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email
                  {sortField === 'email' && (
                    <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('role')}
              >
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Rol
                  {sortField === 'role' && (
                    <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('created_at')}
              >
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Aangemaakt
                  {sortField === 'created_at' && (
                    <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </TableHead>
              <TableHead>Acties</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedUsers.map((user) => (
              <TableRow key={user.id} className="hover:bg-gray-50/50">
                <TableCell>
                  <Checkbox 
                    checked={selectedUsers.has(user.user_id)}
                    onCheckedChange={() => toggleUserSelection(user.user_id)}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      user.role === 'admin' 
                        ? 'bg-red-100 text-red-600' 
                        : 'bg-blue-100 text-blue-600'
                    }`}>
                      {user.role === 'admin' ? (
                        <Shield className="w-4 h-4" />
                      ) : (
                        <User className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium">{user.email}</div>
                      <div className="text-xs text-gray-500">{user.user_id}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge 
                    variant={user.role === 'admin' ? 'destructive' : 'secondary'}
                    className="text-xs"
                  >
                    {user.role === 'admin' ? 'Administrator' : 'Gebruiker'}
                  </Badge>
                </TableCell>
                <TableCell>
                  {new Date(user.created_at).toLocaleDateString('nl-NL')}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleRoleChange(user.user_id, user.role === 'admin' ? 'user' : 'admin')}>
                        <Settings className="w-4 h-4 mr-2" />
                        Rol wijzigen naar {user.role === 'admin' ? 'Gebruiker' : 'Admin'}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => deleteUser(user.user_id)}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Verwijderen
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  const renderCardsView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {paginatedUsers.map((user) => (
        <Card key={user.id} className="bg-white/90 backdrop-blur-sm border border-gray-200 hover:shadow-xl transition-all duration-200 group">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <Checkbox 
                  checked={selectedUsers.has(user.user_id)}
                  onCheckedChange={() => toggleUserSelection(user.user_id)}
                />
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  user.role === 'admin' 
                    ? 'bg-red-100 text-red-600' 
                    : 'bg-blue-100 text-blue-600'
                }`}>
                  {user.role === 'admin' ? (
                    <Shield className="w-5 h-5" />
                  ) : (
                    <User className="w-5 h-5" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-900 truncate">{user.email}</span>
                  </div>
                  <Badge 
                    variant={user.role === 'admin' ? 'destructive' : 'secondary'}
                    className="text-xs"
                  >
                    {user.role === 'admin' ? 'Administrator' : 'Gebruiker'}
                  </Badge>
                </div>
              </div>
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* User Info */}
            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>Aangemaakt: {new Date(user.created_at).toLocaleDateString('nl-NL')}</span>
              </div>
              <div className="text-xs text-gray-400 break-all">
                <span className="font-medium">User ID:</span> {user.user_id}
              </div>
            </div>

            {/* Role Management */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Rol wijzigen
              </label>
              <Select 
                value={user.role} 
                onValueChange={(newRole: 'user' | 'admin') => handleRoleChange(user.user_id, newRole)}
              >
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Gebruiker
                    </div>
                  </SelectItem>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Administrator
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Delete User */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  size="sm"
                  className="w-full flex items-center justify-center gap-2 h-10 opacity-80 hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-4 h-4" />
                  Gebruiker Verwijderen
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                    </div>
                    <AlertDialogTitle>Gebruiker Verwijderen</AlertDialogTitle>
                  </div>
                  <AlertDialogDescription className="text-base">
                    Weet je zeker dat je de gebruiker <strong>{user.email}</strong> wilt verwijderen?
                    <br /><br />
                    <span className="text-red-600 font-medium">
                      ⚠️ Deze actie kan niet ongedaan worden gemaakt. Alle gegevens van deze gebruiker worden permanent verwijderd.
                    </span>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuleren</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteUser(user.user_id)}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Permanent Verwijderen
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen p-4 sm:p-8 bg-gradient-to-br from-gray-50 to-blue-50/30">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 bg-white/80 backdrop-blur-sm shadow-sm rounded-xl p-6 border border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <Button
                variant="outline"
                onClick={() => {
                  const verified = searchParams.get('verified') || 'true';
                  const email = searchParams.get('email') || 'admin@example.com';
                  router.push(`/admin?verified=${verified}&email=${encodeURIComponent(email)}`);
                }}
                className="flex items-center gap-2 w-fit hover:bg-gray-50 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Terug naar Admin
              </Button>
              <div className="border-l border-gray-300 pl-4">
                <h1 className="text-3xl font-bold text-gray-900 mb-1">Gebruikers Beheren</h1>
                <p className="text-gray-600 text-sm">Beheer gebruikersrollen en accounts</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge className="bg-blue-100 text-blue-800 border-blue-300 w-fit">
                {filteredUsers.length} van {users.length} gebruiker{users.length !== 1 ? 's' : ''}
              </Badge>
              {selectedUsers.size > 0 && (
                <Badge className="bg-orange-100 text-orange-800 border-orange-300 w-fit">
                  {selectedUsers.size} geselecteerd
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="mb-6 bg-white/80 backdrop-blur-sm shadow-sm rounded-xl p-6 border border-gray-200">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Zoek op email of ID..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10 h-10"
                />
              </div>
              
              <Select value={roleFilter} onValueChange={(value: 'all' | 'user' | 'admin') => {
                setRoleFilter(value);
                setCurrentPage(1);
              }}>
                <SelectTrigger className="w-40 h-10">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4" />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle rollen</SelectItem>
                  <SelectItem value="user">Gebruikers</SelectItem>
                  <SelectItem value="admin">Administrators</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* View and Actions */}
            <div className="flex items-center gap-3">
              {selectedUsers.size > 0 && (
                <AlertDialog open={bulkDeleteDialog} onOpenChange={setBulkDeleteDialog}>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="w-4 h-4 mr-2" />
                      {selectedUsers.size} verwijderen
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Meerdere gebruikers verwijderen</AlertDialogTitle>
                      <AlertDialogDescription>
                        Weet je zeker dat je {selectedUsers.size} gebruiker{selectedUsers.size !== 1 ? 's' : ''} wilt verwijderen?
                        Deze actie kan niet ongedaan worden gemaakt.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuleren</AlertDialogCancel>
                      <AlertDialogAction onClick={bulkDeleteUsers} className="bg-red-600 hover:bg-red-700">
                        Verwijderen
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              
              <Select value={pageSize.toString()} onValueChange={(value) => {
                setPageSize(parseInt(value));
                setCurrentPage(1);
              }}>
                <SelectTrigger className="w-20 h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex border rounded-lg overflow-hidden">
                <Button
                  variant={viewMode === 'table' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                  className="rounded-none"
                >
                  <Users className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'cards' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('cards')}
                  className="rounded-none"
                >
                  <UserPlus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        {filteredUsers.length === 0 ? (
          <div className="text-center py-16 bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 text-lg font-medium">
              {users.length === 0 ? 'Geen gebruikers gevonden' : 'Geen gebruikers voldoen aan de filters'}
            </p>
            <p className="text-gray-400 text-sm mt-2">
              {users.length === 0 
                ? 'Er zijn nog geen gebruikers geregistreerd in het systeem'
                : 'Probeer je zoek- of filtercriteria aan te passen'
              }
            </p>
          </div>
        ) : (
          <>
            {viewMode === 'table' ? renderTableView() : renderCardsView()}
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between bg-white/80 backdrop-blur-sm shadow-sm rounded-xl p-4 border border-gray-200">
                <div className="text-sm text-gray-600">
                  Pagina {currentPage} van {totalPages} ({filteredUsers.length} resultaten)
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Vorige
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className="w-8 h-8 p-0"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Volgende
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Role Change Confirmation Dialog */}
        <AlertDialog open={!!roleChangeDialog} onOpenChange={() => setRoleChangeDialog(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Settings className="w-5 h-5 text-blue-600" />
                </div>
                <AlertDialogTitle>Rol Wijzigen</AlertDialogTitle>
              </div>
              <AlertDialogDescription className="text-base">
                {roleChangeDialog && (
                  <>
                    Weet je zeker dat je de rol van{' '}
                    <strong>{users.find(u => u.user_id === roleChangeDialog.userId)?.email}</strong>{' '}
                    wilt wijzigen van{' '}
                    <Badge variant={roleChangeDialog.currentRole === 'admin' ? 'destructive' : 'secondary'} className="mx-1">
                      {roleChangeDialog.currentRole === 'admin' ? 'Administrator' : 'Gebruiker'}
                    </Badge>{' '}
                    naar{' '}
                    <Badge variant={roleChangeDialog.newRole === 'admin' ? 'destructive' : 'secondary'} className="mx-1">
                      {roleChangeDialog.newRole === 'admin' ? 'Administrator' : 'Gebruiker'}
                    </Badge>
                    ?
                    <br /><br />
                    {roleChangeDialog.newRole === 'admin' && (
                      <span className="text-amber-600 font-medium">
                        ⚠️ Deze gebruiker krijgt volledige toegang tot alle admin functies.
                      </span>
                    )}
                    {roleChangeDialog.newRole === 'user' && roleChangeDialog.currentRole === 'admin' && (
                      <span className="text-blue-600 font-medium">
                        ℹ️ Deze gebruiker verliest alle admin rechten en kan alleen nog de dashboard bekijken.
                      </span>
                    )}
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuleren</AlertDialogCancel>
              <AlertDialogAction onClick={confirmRoleChange}>
                Rol Wijzigen
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
} 