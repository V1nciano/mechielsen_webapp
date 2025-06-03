import { NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

// Helper function to create service client with error handling
function createServiceSupabaseClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
  }
  
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not configured');
  }
  
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const verified = searchParams.get('verified');
    const emailParam = searchParams.get('email');

    // Check for URL verification parameters first
    if (verified === 'true' && emailParam) {
      // Create service client to bypass RLS
      const serviceSupabase = createServiceSupabaseClient();

      // Fetch all user profiles
      const { data: profiles, error: profilesError } = await serviceSupabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) {
        return NextResponse.json({ error: profilesError.message }, { status: 500 });
      }

      // Fetch auth users to get emails
      const { data: authUsers, error: authUsersError } = await serviceSupabase.auth.admin.listUsers();
      
      if (authUsersError) {
        // Continue anyway, just without emails
      }

      // Combine data
      const usersWithEmails = profiles?.map(profile => ({
        ...profile,
        email: authUsers?.users?.find(u => u.id === profile.user_id)?.email || 'Unknown'
      })) || [];

      return NextResponse.json(usersWithEmails);
    }

    // Fall back to session check
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // Check if user is authenticated
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin status (email-based first, then database)
    let isAdmin = false;
    if (session.user.email?.includes('admin')) {
      isAdmin = true;
    } else {
      // Check database for admin role using service client to bypass RLS
      const serviceSupabase = createServiceSupabaseClient();
      const { data: profile, error: profileError } = await serviceSupabase
        .from('user_profiles')
        .select('role')
        .eq('user_id', session.user.id)
        .single();
      
      if (profileError) {
        return NextResponse.json({ error: 'Error checking admin status' }, { status: 500 });
      }

      if (profile && profile.role === 'admin') {
        isAdmin = true;
      }
    }

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Create service client to bypass RLS for fetching users
    const serviceSupabase = createServiceSupabaseClient();

    // Fetch all user profiles
    const { data: profiles, error: profilesError } = await serviceSupabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (profilesError) {
      return NextResponse.json({ error: profilesError.message }, { status: 500 });
    }

    // Fetch auth users to get emails
    const { data: authUsers, error: authUsersError } = await serviceSupabase.auth.admin.listUsers();
    
    if (authUsersError) {
      // Continue anyway, just without emails
    }

    // Combine data
    const usersWithEmails = profiles?.map(profile => ({
      ...profile,
      email: authUsers?.users?.find(u => u.id === profile.user_id)?.email || 'Unknown'
    })) || [];

    return NextResponse.json(usersWithEmails);

  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { userId, role } = await request.json();
    
    if (!userId || !role) {
      return NextResponse.json({ error: 'Missing userId or role' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // Check if user is authenticated
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin status
    let isAdmin = false;
    if (session.user.email?.includes('admin')) {
      isAdmin = true;
    } else {
      const serviceSupabase = createServiceSupabaseClient();
      const { data: profile } = await serviceSupabase
        .from('user_profiles')
        .select('role')
        .eq('user_id', session.user.id)
        .single();
      
      if (profile && profile.role === 'admin') {
        isAdmin = true;
      }
    }

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Update user role using service client
    const serviceSupabase = createServiceSupabaseClient();
    const { error } = await serviceSupabase
      .from('user_profiles')
      .update({ role })
      .eq('user_id', userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 