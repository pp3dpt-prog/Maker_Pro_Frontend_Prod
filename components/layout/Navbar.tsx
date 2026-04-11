'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './Navbar.module.css';
import Image from 'next/image';
import { ShieldCheck } from 'lucide-react';
import type { User } from '@supabase/supabase-js';

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      // Forçamos a limpeza de estados antes de verificar
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session) {
        setUser(null);
        setIsAdmin(false);
        return;
      }

      const currentUser = session.user;
      setUser(currentUser);
      setIsAdmin(currentUser?.email === 'pp3d.pt@gmail.com');
    };

    checkUser();

    // Este listener é crucial para quando o login/logout acontece noutras janelas ou modais
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setUser(session.user);
        setIsAdmin(session.user?.email === 'pp3d.pt@gmail.com');
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsAdmin(false);
        router.push('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAdmin(false);
    router.push('/');
    router.refresh();
  };

  return (
    <nav className={styles.navbar}>
      <div className={styles.left}>
        <Link href="/" className={styles.brand}>
          MakerPro
        </Link>
      </div>

      <div className={styles.center}>
        <Link href="/precario" className={styles.link}>
          Preçário
        </Link>
      </div>

      <div className={styles.right}>
        {user ? (
          <>
            {/* BOTÃO ADMIN - Verifica se o isAdmin está true */}
            {isAdmin && (
              <Link href="/admin" className={styles.adminBtn}>
                <ShieldCheck size={16} />
                Admin
              </Link>
            )}

            <Link href="/dashboard" className={styles.link}>
              Dashboard
            </Link>

            <button onClick={handleLogout} className={styles.logoutBtn}>
              Logout
            </button>
          </>
        ) : (
          <>
            <Link href="/login" className={styles.link}>
              Login
            </Link>
            <Link href="/registo" className={styles.link}>
              Registo
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}