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

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session) {
        setUser(null);
        setIsAdmin(false);
        return;
      }

      setUser(session.user);
      setIsAdmin(session.user.email === 'pp3d.pt@gmail.com');
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setUser(session.user);
        setIsAdmin(session.user.email === 'pp3d.pt@gmail.com');
      }

      if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsAdmin(false);
        setMobileOpen(false);
        router.push('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAdmin(false);
    setMobileOpen(false);
    router.push('/');
    router.refresh();
  };

  return (
    <header className={styles.header}>
      <nav className={styles.navbar}>
        <div className={styles.brand}>
          <Link href="/">MakerPro</Link>
        </div>

        {/* Links desktop */}
        <div className={styles.desktopLinks}>
          <Link href="/precario">Preçário</Link>

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
              <Link href="/registo">Registo</Link>
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
          <Link href="/precario" onClick={() => setMobileOpen(false)}>Preçário</Link>

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
              <Link href="/registo" onClick={() => setMobileOpen(false)}>Registo</Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}