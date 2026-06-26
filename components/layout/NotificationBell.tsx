'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Bell } from 'lucide-react';

type Campanha = {
  id: string;
  titulo: string;
  conteudo: string | null;
  created_at: string;
};

export default function NotificationBell({ userId }: { userId: string | null }) {
  const [campanhas, setCampanhas] = useState<Campanha[]>([]);
  const [vistasIds, setVistasIds] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userId) {
      setCampanhas([]);
      setVistasIds(new Set());
      return;
    }

    async function load() {
      const agora = new Date().toISOString();

      const [{ data: camps }, { data: vistas }] = await Promise.all([
        supabase
          .from('prod_campanhas')
          .select('id, titulo, conteudo, created_at')
          .eq('tipo', 'novidade')
          .eq('ativa', true)
          .or(`expira_em.is.null,expira_em.gt.${agora}`)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('prod_campanhas_vistas')
          .select('campanha_id')
          .eq('user_id', userId),
      ]);
      setCampanhas(camps ?? []);
      setVistasIds(new Set((vistas ?? []).map(v => v.campanha_id)));
    }

    load();
  }, [userId]);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const unread = campanhas.filter(c => !vistasIds.has(c.id));
  const unreadCount = unread.length;

  async function handleToggle() {
    const willOpen = !open;
    setOpen(willOpen);

    if (willOpen && unreadCount > 0 && userId) {
      const rows = unread.map(c => ({ user_id: userId, campanha_id: c.id }));
      await supabase
        .from('prod_campanhas_vistas')
        .upsert(rows, { onConflict: 'user_id,campanha_id', ignoreDuplicates: true });

      setVistasIds(prev => {
        const next = new Set(prev);
        unread.forEach(c => next.add(c.id));
        return next;
      });
    }
  }

  if (!userId) return null;

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <button
        onClick={handleToggle}
        aria-label="Notificações"
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          position: 'relative', padding: 6, color: '#94a3b8',
          display: 'flex', alignItems: 'center',
        }}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: 2, right: 2,
            background: '#ef4444', color: '#fff', fontSize: 10, fontWeight: 800,
            borderRadius: '50%', minWidth: 16, height: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 3px', lineHeight: 1,
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '130%', right: 0,
          width: 320, maxHeight: 400, overflowY: 'auto',
          background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12,
          boxShadow: '0 12px 32px rgba(0,0,0,0.5)', zIndex: 100,
        }}>
          <div style={{
            padding: '12px 16px', borderBottom: '1px solid #1e293b',
            fontWeight: 700, fontSize: 13, color: '#f1f5f9',
          }}>
            Novidades
          </div>

          {campanhas.length === 0 ? (
            <p style={{ padding: 24, color: '#8a96aa', fontSize: 13, textAlign: 'center', margin: 0 }}>
              Sem novidades por agora.
            </p>
          ) : (
            campanhas.map(c => (
              <div key={c.id} style={{ padding: '12px 16px', borderBottom: '1px solid #0a1120' }}>
                <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: 13, color: '#f1f5f9' }}>{c.titulo}</p>
                {c.conteudo && (
                  <p style={{ margin: '0 0 4px', fontSize: 12, color: '#94a3b8', lineHeight: 1.5 }}>{c.conteudo}</p>
                )}
                <p style={{ margin: 0, fontSize: 11, color: '#8a96aa' }}>
                  {new Date(c.created_at).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
