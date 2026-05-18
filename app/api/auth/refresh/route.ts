import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.refreshSession();

  if (error || !data.session) {
    return NextResponse.json({ error: 'refresh_failed' }, { status: 401 });
  }

  return NextResponse.json({
    access_token: data.session.access_token,
    user_id: data.session.user.id,
  });
}
