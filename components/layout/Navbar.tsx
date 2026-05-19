'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './Navbar.module.css';
import { ShieldCheck, Menu, X } from 'lucide-react';
import type { User } from '@supabase/supabase-js';

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();

  async function checkAdminRole(userId: string): Promise<boolean> {
    const { data: perfil } = await supabase
      .from('prod_perfis')
      .select('role')
      .eq('id', userId)
      .maybeSingle();

    return perfil?.role === 'admin';
  }

  useEffect(() => {
    // onAuthStateChange dispara INITIAL_SESSION no mount (sessão existente),
    // SIGNED_IN no login, TOKEN_REFRESHED na renovação, SIGNED_OUT no logout.
    // Tratar todos garante que o estado nunca fica desatualizado.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser(session.user);
        const admin = await checkAdminRole(session.user.id);
        setIsAdmin(admin);
      } else {
        setUser(null);
        setIsAdmin(false);
        setMobileOpen(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  return (
    <header className={styles.header}>
      <nav className={styles.navbar}>
        <div className={styles.brand}>
          <Link href="/" style={{ fontWeight: 900, letterSpacing: '-0.5px' }}>PP3D<span style={{ color: '#3b82f6' }}>.pt</span></Link>
        </div>

        {/* Links desktop */}
        <div className={styles.desktopLinks}>
          <Link href="/pricing">Preçário</Link>

          {user ? (
            <>
              {isAdmin && (
                <Link href="/admin">
                  <span className={styles.inline}>
                    <ShieldCheck size={16} />
                    Admin
                  </span>
                </Link>
              )}

              <Link href="/dashboard">Dashboard</Link>

              <button className={styles.btnGhost} onClick={handleLogout}>
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/login">Login</Link>
              <Link href="/register">Registo</Link>
            </>
          )}
        </div>

        {/* Toggle mobile */}
        <button
          className={styles.mobileToggle}
          onClick={() => setMobileOpen(v => !v)}
          aria-label={mobileOpen ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      {/* Menu mobile */}
      {mobileOpen && (
        <div className={styles.mobileMenu} role="menu">
          <Link href="/pricing" onClick={() => setMobileOpen(false)}>Preçário</Link>

          {user ? (
            <>
              {isAdmin && (
                <Link href="/admin" onClick={() => setMobileOpen(false)}>
                  <span className={styles.inline}>
                    <ShieldCheck size={16} />
                    Admin
                  </span>
                </Link>
              )}

              <Link href="/dashboard" onClick={() => setMobileOpen(false)}>Dashboard</Link>

              <button className={styles.btnPrimary} onClick={handleLogout}>
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/login" onClick={() => setMobileOpen(false)}>Login</Link>
              <Link href="/register" onClick={() => setMobileOpen(false)}>Registo</Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}
