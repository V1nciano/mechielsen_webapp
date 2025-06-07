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

  } catch {
    return NextResponse.json(
      { error: 'Database fout' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const { userId, role } = await request.json();
    const { searchParams } = new URL(request.url);
    const verified = searchParams.get('verified');
    const emailParam = searchParams.get('email');
    
    if (!userId || !role) {
      return NextResponse.json({ error: 'Missing userId or role' }, { status: 400 });
    }

    // Check for URL verification parameters first
    if (verified === 'true' && emailParam) {
      // URL verification found, proceed with admin privileges
    } else {
      // Fall back to session check
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
    }

    // Update user role using service client
    const serviceSupabase = createServiceSupabaseClient();
    
    // First check if the user profile exists
    const { error: checkError } = await serviceSupabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (checkError) {
      // If profile doesn't exist, create it
      const { error: insertError } = await serviceSupabase
        .from('user_profiles')
        .insert([{ user_id: userId, role }]);

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
    } else {
      // Update existing profile
      const { error: updateError } = await serviceSupabase
        .from('user_profiles')
        .update({ role })
        .eq('user_id', userId);

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error updating user role:', error);
    return NextResponse.json(
      { error: 'Database fout' },
      { status: 500 }
    );
  }
}

// Add DELETE endpoint for user deletion
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const verified = searchParams.get('verified');
    const emailParam = searchParams.get('email');
    
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    // Check for URL verification parameters first
    if (verified === 'true' && emailParam) {
      // URL verification found, proceed with admin privileges
    } else {
      // Fall back to session check
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
    }

    // Delete user using service client
    const serviceSupabase = createServiceSupabaseClient();
    
    // First delete the user profile
    const { error: profileError } = await serviceSupabase
      .from('user_profiles')
      .delete()
      .eq('user_id', userId);

    if (profileError) {
      console.error('Error deleting user profile:', profileError);
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    // Then delete the auth user
    const { error: authDeleteError } = await serviceSupabase.auth.admin.deleteUser(userId);

    if (authDeleteError) {
      console.error('Error deleting auth user:', authDeleteError);
      return NextResponse.json({ error: authDeleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Database fout' },
      { status: 500 }
    );
  }
} 