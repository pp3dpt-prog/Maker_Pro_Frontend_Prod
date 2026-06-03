'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import styles from './Navbar.module.css';
import { ShieldCheck, Menu, X, LifeBuoy } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import SupportModal from '@/components/SupportModal';

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showSupport, setShowSupport] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser(session.user);
        // Verificar admin via API (cobre ADMIN_EMAIL + DB role com service role)
        fetch('/api/auth/is-admin')
          .then(r => r.json())
          .then(({ isAdmin }) => setIsAdmin(!!isAdmin))
          .catch(() => setIsAdmin(false));
      } else {
        setUser(null);
        setIsAdmin(false);
        setMobileOpen(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/signout', { method: 'POST' });
    window.location.href = '/';
  };

  return (
    <>
    {showSupport && user && <SupportModal onClose={() => setShowSupport(false)} />}
    <header className={styles.header}>
      <nav className={styles.navbar}>
        <div className={styles.brand}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
            <img src="/favicon.ico" alt="PP3D.pt" style={{ width: '38px', height: '38px', borderRadius: '50%' }} />
            <span style={{ fontWeight: 900, letterSpacing: '-0.5px', color: 'white' }}>PP3D<span style={{ color: '#3b82f6' }}>.pt</span></span>
          </Link>
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

              <button className={styles.btnGhost} onClick={() => setShowSupport(true)} title="Suporte">
                <LifeBuoy size={16} />
              </button>

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
    </>
  );
}
