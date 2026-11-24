import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient as createAdmin } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return request.cookies.get(name)?.value; },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  // Páginas onde não forçamos a escolha de persona (evita loop/bloqueio do próprio fluxo).
  const SEM_GATE_BEM_VINDO = ['/bem-vindo', '/login', '/register', '/auth', '/logout'];

  if (path.startsWith('/admin')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Verificação 1: email definido em ADMIN_EMAIL (rápido, sem query à DB)
    const adminEmail = process.env.ADMIN_EMAIL;
    if (adminEmail && user.email?.toLowerCase().trim() === adminEmail.toLowerCase().trim()) {
      return response;
    }

    // Verificação 2: coluna role na tabela prod_perfis via service role (bypassa RLS)
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (serviceKey) {
      const adminClient = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);
      const { data: perfil } = await adminClient
        .from('prod_perfis')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      if (perfil?.role === 'admin') {
        return response;
      }
    }

    return NextResponse.redirect(new URL('/', request.url));
  }

  // Persona ainda não escolhida (tipo_utilizador = null): manda para /bem-vindo
  // em qualquer outra página, até o utilizador escolher. Admins ficam de fora.
  const adminEmail = process.env.ADMIN_EMAIL;
  const isAdminEmail = !!adminEmail && user?.email?.toLowerCase().trim() === adminEmail.toLowerCase().trim();
  if (user && !isAdminEmail && !SEM_GATE_BEM_VINDO.some(p => path.startsWith(p))) {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (serviceKey) {
      const adminClient = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);
      const { data: perfil } = await adminClient
        .from('prod_perfis')
        .select('tipo_utilizador, role')
        .eq('id', user.id)
        .maybeSingle();

      if (perfil && perfil.tipo_utilizador === null && perfil.role !== 'admin') {
        return NextResponse.redirect(new URL('/bem-vindo', request.url));
      }
    }
  }

  return response;
}

export const config = {
  // Todas as páginas exceto ficheiros estáticos e rotas de API.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/|.*\\..*).*)'],
};
