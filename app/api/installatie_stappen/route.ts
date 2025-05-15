import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const attachmentId = searchParams.get('attachmentId');
  if (!attachmentId) {
    return NextResponse.json({ error: 'Missing attachmentId' }, { status: 400 });
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data, error } = await supabase
    .from('installatie_stappen')
    .select('*')
    .eq('attachment_id', attachmentId)
    .order('stap_nummer', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
} 