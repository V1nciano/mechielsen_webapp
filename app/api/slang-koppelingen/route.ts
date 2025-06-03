import { NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// Helper function to create service client with error handling
function createServiceSupabaseClient() {
  console.log('🔍 Environment check:', {
    hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    serviceKeyLength: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0
  });
  
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
    const supabase = createRouteHandlerClient({ cookies });
    const { searchParams } = new URL(request.url);
    const machineId = searchParams.get('machineId');
    
    if (!machineId) {
      return NextResponse.json({ error: 'Missing machineId' }, { status: 400 });
    }

    // Note: Authentication is handled by the calling admin components
    // which use URL verification parameters (verified=true&email=...)

    // Create service client to bypass RLS
    let serviceSupabase;
    try {
      serviceSupabase = createServiceSupabaseClient();
    } catch (serviceError) {
      console.error('Service client creation failed:', serviceError);
      return NextResponse.json({ 
        error: 'Server configuration error: Please ensure SUPABASE_SERVICE_ROLE_KEY is set in environment variables.' 
      }, { status: 500 });
    }

    // Fetch existing connections for the machine
    const { data: connections, error: connectionsError } = await serviceSupabase
      .from('slangkoppelingen')
      .select('*')
      .eq('machine_id', machineId)
      .order('volgorde', { ascending: true });

    if (connectionsError) {
      console.error('Error fetching connections:', connectionsError);
      return NextResponse.json({ error: connectionsError.message }, { status: 500 });
    }

    return NextResponse.json(connections || []);

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const body = await request.json();

    // Validate required fields
    const requiredFields = [
      'machine_id',
      'slang_nummer',
      'slang_kleur',
      'slang_label',
      'ventiel_id',
      'poort',
      'functie_beschrijving',
      'instructie_tekst',
      'connection_type',
      'pressure_rating',
      'flow_rating'
    ];

    const missingFields = requiredFields.filter(field => !body[field]);
    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate connection type
    const validConnectionTypes = ['single_acting', 'double_acting', 'high_flow', 'low_flow'];
    if (!validConnectionTypes.includes(body.connection_type)) {
      return NextResponse.json(
        { error: 'Invalid connection type' },
        { status: 400 }
      );
    }

    // Validate pressure and flow ratings
    if (body.pressure_rating < 0 || body.pressure_rating > 350) {
      return NextResponse.json(
        { error: 'Pressure rating must be between 0 and 350 bar' },
        { status: 400 }
      );
    }

    if (body.flow_rating < 0 || body.flow_rating > 200) {
      return NextResponse.json(
        { error: 'Flow rating must be between 0 and 200 l/min' },
        { status: 400 }
      );
    }

    // Schuif bestaande koppelingen op als volgorde al bestaat
    await supabase
      .from('slangkoppelingen')
      .update({ volgorde: supabase.rpc('increment', { x: 1 }) })
      .eq('machine_id', body.machine_id)
      .eq('attachment_id', body.attachment_id)
      .gte('volgorde', body.volgorde);

    const { data, error } = await supabase
      .from('slangkoppelingen')
      .insert([body])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { error: 'Missing required field: id' },
        { status: 400 }
      );
    }

    // Validate connection type if provided
    if (body.connection_type) {
      const validConnectionTypes = ['single_acting', 'double_acting', 'high_flow', 'low_flow'];
      if (!validConnectionTypes.includes(body.connection_type)) {
        return NextResponse.json(
          { error: 'Invalid connection type' },
          { status: 400 }
        );
      }
    }

    // Validate pressure rating if provided
    if (body.pressure_rating !== undefined) {
      if (body.pressure_rating < 0 || body.pressure_rating > 350) {
        return NextResponse.json(
          { error: 'Pressure rating must be between 0 and 350 bar' },
          { status: 400 }
        );
      }
    }

    // Validate flow rating if provided
    if (body.flow_rating !== undefined) {
      if (body.flow_rating < 0 || body.flow_rating > 200) {
        return NextResponse.json(
          { error: 'Flow rating must be between 0 and 200 l/min' },
          { status: 400 }
        );
      }
    }

    // Schuif bestaande koppelingen op als volgorde al bestaat
    if (body.volgorde !== undefined) {
      await supabase
        .from('slangkoppelingen')
        .update({ volgorde: supabase.rpc('increment', { x: 1 }) })
        .eq('machine_id', body.machine_id)
        .eq('attachment_id', body.attachment_id)
        .gte('volgorde', body.volgorde);
    }

    const { data, error } = await supabase
      .from('slangkoppelingen')
      .update(body)
      .eq('id', body.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get('id');
    
    if (!connectionId) {
      return NextResponse.json({ error: 'Missing connection id' }, { status: 400 });
    }

    // Note: Authentication is handled by the calling admin components
    // which use URL verification parameters (verified=true&email=...)

    // Create service client to bypass RLS
    let serviceSupabase;
    try {
      serviceSupabase = createServiceSupabaseClient();
    } catch (serviceError) {
      console.error('Service client creation failed:', serviceError);
      return NextResponse.json({ 
        error: 'Server configuration error: Please ensure SUPABASE_SERVICE_ROLE_KEY is set in environment variables.' 
      }, { status: 500 });
    }

    // Delete connection
    const { error } = await serviceSupabase
      .from('slangkoppelingen')
      .delete()
      .eq('id', connectionId);

    if (error) {
      console.error('Error deleting connection:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 