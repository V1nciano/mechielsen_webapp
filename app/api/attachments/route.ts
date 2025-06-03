import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const machineId = searchParams.get('machineId');
  if (!machineId) {
    return NextResponse.json({ error: 'Missing machineId' }, { status: 400 });
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  
  // Query attachments through the junction table attachment_machines
  const { data, error } = await supabase
    .from('attachment_machines')
    .select(`
      attachments!inner(*)
    `)
    .eq('machine_id', machineId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Extract the attachments from the junction table result
  const attachments = data?.map(item => item.attachments) || [];
  
  return NextResponse.json(attachments);
}
