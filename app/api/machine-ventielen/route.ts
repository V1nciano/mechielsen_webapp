import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

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

// GET - Fetch ventielen for a machine
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const machineId = searchParams.get('machineId');

    if (!machineId) {
      return NextResponse.json({ error: 'Machine ID is required' }, { status: 400 });
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

    const { data, error } = await serviceSupabase
      .from('machine_ventielen')
      .select('*')
      .eq('machine_id', machineId)
      .order('volgorde', { ascending: true });

    if (error) {
      console.error('Error fetching machine ventielen:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create new ventiel
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      machine_id,
      ventiel_nummer,
      functie_naam,
      positie,
      ventiel_type,
      omschrijving,
      kleur_code,
      poort_a_label,
      poort_b_label,
      volgorde,
      actief = true
    } = body;

    // Validation
    if (!machine_id || !ventiel_nummer || !functie_naam || !positie || !ventiel_type) {
      return NextResponse.json({ 
        error: 'Missing required fields: machine_id, ventiel_nummer, functie_naam, positie, ventiel_type' 
      }, { status: 400 });
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

    await serviceSupabase
      .from('machine_ventielen')
      .update({ volgorde: serviceSupabase.rpc('increment', { x: 1 }) })
      .eq('machine_id', machine_id)
      .gte('volgorde', volgorde);

    const { data, error } = await serviceSupabase
      .from('machine_ventielen')
      .insert({
        machine_id,
        ventiel_nummer,
        functie_naam,
        positie,
        ventiel_type,
        omschrijving,
        kleur_code,
        poort_a_label: poort_a_label || 'A',
        poort_b_label: poort_b_label || 'B',
        volgorde: volgorde || 1,
        actief
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating machine ventiel:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Update ventiel
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'Ventiel ID is required' }, { status: 400 });
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

    if (body.volgorde !== undefined) {
      await serviceSupabase
        .from('machine_ventielen')
        .update({ volgorde: serviceSupabase.rpc('increment', { x: 1 }) })
        .eq('machine_id', body.machine_id)
        .gte('volgorde', body.volgorde);
    }

    const { data, error } = await serviceSupabase
      .from('machine_ventielen')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating machine ventiel:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete ventiel
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Ventiel ID is required' }, { status: 400 });
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

    const { error } = await serviceSupabase
      .from('machine_ventielen')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting machine ventiel:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 