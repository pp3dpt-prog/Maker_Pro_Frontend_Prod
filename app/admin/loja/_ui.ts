// Estilos partilhados pelas páginas de /admin/loja (consistente com app/admin/page.tsx)
import type { CSSProperties } from 'react';

// Helpers puros vivem em lib/loja.ts (partilhados com a loja pública). Re-export por compat.
export { slugify, eur, prazoEntrega, PRAZO_DEFAULT } from '@/lib/loja';
export type { PrazoConfig } from '@/lib/loja';

export const s = {
  page: { minHeight: '100vh', background: '#080c10', color: '#f1f5f9', fontFamily: 'Inter, Arial, sans-serif', padding: '40px 32px' } as CSSProperties,
  wrap: { maxWidth: 1100, margin: '0 auto' } as CSSProperties,
  h1: { margin: '0 0 4px', fontSize: 24, fontWeight: 800 } as CSSProperties,
  sub: { margin: '0 0 28px', fontSize: 14, color: '#64748b' } as CSSProperties,
  card: { background: '#0f172a', border: '1px solid #1e293b', borderRadius: 14, padding: 24 } as CSSProperties,
  tableWrap: { background: '#0f172a', border: '1px solid #1e293b', borderRadius: 14, overflow: 'hidden' } as CSSProperties,
  table: { width: '100%', borderCollapse: 'collapse' } as CSSProperties,
  thead: { background: '#0a1120', borderBottom: '1px solid #1e293b' } as CSSProperties,
  th: { padding: '12px 18px', textAlign: 'left', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b' } as CSSProperties,
  td: { padding: '14px 18px', fontSize: 14, color: '#cbd5e1', borderBottom: '1px solid #0f172a' } as CSSProperties,
  input: { width: '100%', background: '#0a1120', border: '1px solid #1e293b', borderRadius: 8, padding: '10px 14px', color: '#f1f5f9', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' } as CSSProperties,
  label: { display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b', marginBottom: 6 } as CSSProperties,
  btn: { padding: '10px 20px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' } as CSSProperties,
  btnGhost: { padding: '10px 18px', background: 'transparent', color: '#94a3b8', border: '1px solid #1e293b', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 } as CSSProperties,
  btnDanger: { padding: '8px 14px', background: 'transparent', color: '#f87171', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' } as CSSProperties,
  badge: (bg: string, color: string): CSSProperties => ({ display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: bg, color, textTransform: 'uppercase', letterSpacing: '0.05em' }),
};

export const estadoBadge: Record<string, CSSProperties> = {
  ativo: s.badge('rgba(52,211,153,0.18)', '#34d399'),
  rascunho: s.badge('rgba(251,191,36,0.18)', '#fbbf24'),
  inativo: s.badge('rgba(248,113,113,0.18)', '#f87171'),
};
