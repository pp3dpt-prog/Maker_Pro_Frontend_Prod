'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './Navbar.module.css'; 
import Image from 'next/image';
import { ShieldCheck } from 'lucide-react';

export default function Navbar() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Função para validar o user e o admin
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user || null;
      setUser(currentUser);
      
      // Verifica se o email é o teu (coloca o teu email real aqui)
      if (currentUser && currentUser.email === 'pp3d.pt@gmail.com') {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
    };

    checkUser();

    // Ouvir mudanças de login/logout
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user || null;
      setUser(currentUser);
      setIsAdmin(currentUser?.email === 'pp3d.pt@gmail.com');
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAdmin(false);
    router.push('/');
    router.refresh();
  };

  return (
    <nav className={styles.navContainer}>
      <Link href="/" className="flex items-center gap-4 no-underline">
        <Image src="/Logo.png" alt="Logo" width={50} height={50} className="object-contain" />
        <div style={{ color: 'white', fontWeight: '900', fontSize: '2.5rem', lineHeight: '1', letterSpacing: '-0.05em' }}>
          Maker<span style={{ color: '#3b82f6' }}>Pro</span>
        </div>
      </Link>

      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        <Link href="/pricing" className={styles.buttonSecondary}>Preçário</Link>

        {user ? (
          <>
            {/* BOTÃO ADMIN - Verifica se o isAdmin está true */}
            {isAdmin && (
              <Link href="/admin" className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-lg shadow-indigo-500/20 no-underline">
                <ShieldCheck size={18} /> Admin
              </Link>
            )}

            <Link href="/dashboard" className={styles.buttonPrimary}>Dashboard</Link>
            <button onClick={handleLogout} style={{ color: 'white', fontSize: '14px', cursor: 'pointer', background: 'transparent', border: 'none' }}>
              Logout
            </button>
          </>
        ) : (
          <>
            <Link href="/login" style={{ color: 'white', fontSize: '14px', textDecoration: 'none' }}>Login</Link>
            <Link href="/register" className={styles.buttonPrimary}>Registo</Link>
          </>
        )}
      </div>
    </nav>
  );
}