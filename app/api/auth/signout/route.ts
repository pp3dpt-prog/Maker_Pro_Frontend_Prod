import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) { return cookieStore.get(name)?.value; },
        set(name, value, options) { cookieStore.set(name, value, options); },
        remove(name, options) { cookieStore.set(name, '', { ...options, maxAge: 0 }); },
      },
    }
  );

  await supabase.auth.signOut();

  // 303 See Other força o browser a fazer GET na homepage em vez de POST
  return NextResponse.redirect(new URL('/', request.url), { status: 303 });
}
