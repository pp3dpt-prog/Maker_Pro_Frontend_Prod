import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export async function POST() {
  const cookieStore = await cookies();

  // Usa getAll/setAll para que os cookies da sessão renovada sejam
  // escritos na resposta (ao contrário do createClient de Server Components
  // que tem set/remove como no-op)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const { data, error } = await supabase.auth.refreshSession();

  if (error || !data.session) {
    return NextResponse.json({ error: 'refresh_failed' }, { status: 401 });
  }

  return NextResponse.json({
    access_token: data.session.access_token,
    user_id: data.session.user.id,
  });
}
