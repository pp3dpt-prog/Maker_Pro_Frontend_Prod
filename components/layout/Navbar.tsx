'use client'; // Necessário para usar hooks

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './Navbar.module.css'; 

export default function Navbar() {
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    // Verifica sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
    });

    // Escuta mudanças (Login/Logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <nav className={styles.navContainer}>
      <Link href="/" className={styles.logo}>
      <div style={{ color: 'white', fontWeight: 'bold', fontSize: '1.25rem' }}>
        Maker<span style={{ color: '#3b82f6' }}>Pro</span>
      </div>
      </Link>

      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        <Link href="/pricing" className={styles.buttonSecondary}>Preçário</Link>

        {user ? (
          // O que aparece quando ESTÁ LOGADO
          <button 
            onClick={handleLogout} 
            style={{ color: 'white', fontSize: '14px', cursor: 'pointer', background: 'transparent', border: 'none' }}
          >
            Logout
          </button>
        ) : (
          // O que aparece quando NÃO ESTÁ LOGADO (teu código original)
          <>
            <Link href="/login" style={{ color: 'white', fontSize: '14px', textDecoration: 'none' }}>Login</Link>
            <Link href="/register" className={styles.buttonPrimary}>Registo</Link>
          </>
        )}
      </div>
    </nav>
  );
}