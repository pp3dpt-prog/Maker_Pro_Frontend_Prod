'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './Navbar.module.css';
import { ShieldCheck, Menu, X, ShoppingCart } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import NotificationBell from './NotificationBell';
import { useCart } from '@/components/loja/CartContext';

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();
  const { count } = useCart();

  async function checkAdminRole(userId: string): Promise<boolean> {
    const { data: perfil } = await supabase
      .from('prod_perfis')
      .select('role')
      .eq('id', userId)
      .maybeSingle();
    return perfil?.role === 'admin';
  }

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session) {
        setUser(null);
        setIsAdmin(false);
        return;
      }

      setUser(session.user);
      const admin = await checkAdminRole(session.user.id);
      setIsAdmin(admin);
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setUser(session.user);
        const admin = await checkAdminRole(session.user.id);
        setIsAdmin(admin);
      }

      if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsAdmin(false);
        setMobileOpen(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAdmin(false);
    setMobileOpen(false);
    window.location.href = '/';
  };

  return (
    <header className={styles.header}>
      <nav className={styles.navbar}>
        <div className={styles.brand}>
          <Link href="/">PP3D.pt</Link>
        </div>

        {/* Links desktop */}
        <div className={styles.desktopLinks}>
          <Link href="/loja">Loja</Link>
          <Link href="/precario">Preçário</Link>
          <Link href="/carrinho" aria-label={`Carrinho${count > 0 ? ` (${count} itens)` : ''}`} className={styles.inline}>
            <ShoppingCart size={16} />
            {count > 0 && <span>{count}</span>}
          </Link>

          {user ? (
            <>
              <NotificationBell userId={user.id} />

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
          <Link href="/loja" onClick={() => setMobileOpen(false)}>Loja</Link>
          <Link href="/precario" onClick={() => setMobileOpen(false)}>Preçário</Link>
          <Link href="/carrinho" onClick={() => setMobileOpen(false)}>
            <span className={styles.inline}><ShoppingCart size={16} /> Carrinho{count > 0 ? ` (${count})` : ''}</span>
          </Link>

          {user ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0' }}>
                <NotificationBell userId={user.id} />
                <span style={{ fontSize: 13, color: '#94a3b8' }}>Novidades</span>
              </div>

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
