import Link from 'next/link';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import ReparacaoCTA from '@/components/eletronica/ReparacaoCTA';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'PPtronica — Reparação e material eletrónico',
  description: 'PPtronica: reparação de eletrónica e informática, instalação de equipamentos e venda de material eletrónico.',
  alternates: { canonical: 'https://pp3d.pt/eletronica' },
};

type Preco = { nome: string; preco: string };
type Seccao = { titulo: string; items: Preco[] };

const SECCOES: Seccao[] = [
  {
    titulo: 'Eletrónica / Geral',
    items: [
      { nome: 'Orçamentos', preco: 'Oferta' },
      { nome: 'Deslocação < 15km', preco: '10,00 €' },
      { nome: 'Deslocação > 15km', preco: '0,45 €/km adicional' },
      { nome: 'Instalação de equipamentos', preco: 'Mediante orçamento' },
      { nome: 'Mão de obra', preco: '20,00 €' },
    ],
  },
  {
    titulo: 'Informática',
    items: [
      { nome: 'Formatação e reinstalação de S.O.', preco: '25,00 €' },
      { nome: 'Formação / configuração de software', preco: '15,00 €/hora' },
      { nome: 'Manutenção / limpeza — equipamentos fixos', preco: '25,00 €' },
      { nome: 'Manutenção / limpeza — equipamentos portáteis', preco: '30,00 €' },
    ],
  },
];

export default async function EletronicaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <main style={{ background: '#080c10', minHeight: '100vh', color: '#f1f5f9' }}>
      {/* Hero */}
      <div style={{ maxWidth: 820, margin: '0 auto', padding: '72px 32px 40px', textAlign: 'center' }}>
        <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#f59e0b', marginBottom: 14 }}>
          Uma marca Maker Pro
        </p>
        <h1 style={{ fontSize: 'clamp(30px,5vw,48px)', fontWeight: 900, letterSpacing: '-0.03em', margin: '0 0 16px', lineHeight: 1.1 }}>
          PP<span style={{ color: '#f59e0b' }}>tronica</span>
        </h1>
        <p style={{ fontSize: 16, color: '#8a96aa', lineHeight: 1.7, maxWidth: 560, margin: '0 auto 32px' }}>
          Reparação de eletrónica e informática, instalação de equipamentos e venda de material eletrónico.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <ReparacaoCTA loggedIn={!!user} email={user?.email} />
          <Link href="/loja" style={{ padding: '14px 28px', background: 'transparent', color: '#cbd5e1', border: '1px solid #334155', borderRadius: 12, fontSize: 15, fontWeight: 700, textDecoration: 'none' }}>
            Ver material
          </Link>
        </div>
      </div>

      {/* Preçário */}
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 32px 80px' }}>
        {SECCOES.map((sec) => (
          <div key={sec.titulo} style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#f59e0b', marginBottom: 14 }}>
              {sec.titulo}
            </h2>
            <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 16, overflow: 'hidden' }}>
              {sec.items.map((item, i) => (
                <div
                  key={item.nome}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '16px 20px',
                    borderBottom: i === sec.items.length - 1 ? 'none' : '1px solid #1e293b',
                  }}
                >
                  <span style={{ fontSize: 14, color: '#cbd5e1' }}>{item.nome}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', whiteSpace: 'nowrap' }}>{item.preco}</span>
                </div>
              ))}
            </div>
          </div>
        ))}

        <p style={{ fontSize: 13, color: '#8a96aa', textAlign: 'center', lineHeight: 1.6 }}>
          Outros pedidos específicos e reparações são sempre mediante pedido de orçamento, sem compromisso.
        </p>
      </div>
    </main>
  );
}
