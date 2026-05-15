'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { CheckCircle2 } from 'lucide-react';

interface Plano {
  id: string;
  nome: string;
  preco: number;
  preco_mensal: number | null;
  preco_anual: number | null;
  validade_dias: number;
  limite_downloads: number;
  permite_venda_comercial: boolean;
  vantagens?: string[];
}

export default function PricingPage() {
  const router = useRouter();
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [intervalo, setIntervalo] = useState<'mensal' | 'anual'>('mensal');

  useEffect(() => {
    async function carregarPlanos() {
      try {
        const { data, error } = await supabase
          .from('prod_planos')
          .select('*')
          .order('preco', { ascending: true });

        if (error) throw error;
        if (!data || data.length === 0) {
          setErro("Nenhum plano disponível de momento.");
          return;
        }
        setPlanos(data);
      } catch (err: unknown) {
        setErro(err instanceof Error ? err.message : 'Erro ao carregar planos');
      } finally {
        setLoading(false);
      }
    }
    carregarPlanos();
  }, []);

  const getPreco = (plano: Plano) => {
    if (intervalo === 'anual') {
      return plano.preco_anual ?? plano.preco_mensal ?? plano.preco;
    }
    return plano.preco_mensal ?? plano.preco;
  };

  const getPoupanca = (plano: Plano): number | null => {
    const mensal = plano.preco_mensal ?? plano.preco;
    const anual = plano.preco_anual;
    if (!anual || !mensal) return null;
    const totalMensal = mensal * 12;
    return Math.round(((totalMensal - anual) / totalMensal) * 100);
  };

  const getPopularId = () => {
    if (planos.length >= 3) return planos[Math.floor(planos.length / 2)].id;
    return planos[0]?.id ?? null;
  };

  if (loading) return (
    <div style={{ background: '#0f172a', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white', fontSize: 14 }}>
      A carregar planos...
    </div>
  );

  if (erro) return (
    <div style={{ background: '#0f172a', height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: '#f87171', padding: 20, textAlign: 'center' }}>
      <h2 style={{ marginBottom: 10 }}>⚠️ Erro</h2>
      <p style={{ color: '#94a3b8', fontSize: 14 }}>{erro}</p>
      <button onClick={() => window.location.reload()} style={{ marginTop: 20, padding: '10px 20px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
        Tentar Novamente
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0f172a] text-white" style={{ fontFamily: 'sans-serif' }}>

      {/* Header */}
      <div className="text-center pt-20 pb-10 px-4">
        <p className="text-[11px] font-black text-indigo-400 uppercase tracking-widest mb-4">Planos</p>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
          Escolhe o teu plano
        </h1>
        <p className="text-slate-400 text-lg max-w-xl mx-auto mb-10">
          Acesso ao configurador 3D, créditos para downloads e muito mais.
        </p>

        {/* Toggle mensal / anual */}
        <div className="inline-flex items-center bg-[#1e293b] border border-white/10 rounded-2xl p-1 gap-1">
          <button
            onClick={() => setIntervalo('mensal')}
            className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${
              intervalo === 'mensal'
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Mensal
          </button>
          <button
            onClick={() => setIntervalo('anual')}
            className={`px-5 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
              intervalo === 'anual'
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Anual
            <span className="bg-green-500/20 text-green-400 text-[10px] font-black px-2 py-0.5 rounded-full border border-green-500/30">
              ATÉ 17% OFF
            </span>
          </button>
        </div>
      </div>

      {/* Cards */}
      <div className="max-w-5xl mx-auto px-4 pb-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {planos.map((plano) => {
          const isPopular = plano.id === getPopularId();
          const preco = getPreco(plano);
          const poupanca = intervalo === 'anual' ? getPoupanca(plano) : null;

          return (
            <div
              key={plano.id}
              className={`relative flex flex-col rounded-3xl p-8 border transition-all ${
                isPopular
                  ? 'bg-indigo-600/10 border-indigo-500/50 shadow-2xl shadow-indigo-500/10'
                  : 'bg-[#1e293b] border-white/10'
              }`}
            >
              {isPopular && (
                <div className="absolute -top-3 left-6 bg-indigo-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
                  Mais Popular
                </div>
              )}

              {poupanca && poupanca > 0 && (
                <div className="absolute -top-3 right-6 bg-green-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
                  Poupa {poupanca}%
                </div>
              )}

              {/* Nome */}
              <div className="mb-6">
                <h2 className={`text-lg font-black uppercase tracking-wide mb-1 ${isPopular ? 'text-indigo-400' : 'text-white'}`}>
                  {plano.nome}
                </h2>
                {plano.permite_venda_comercial && (
                  <span className="text-[10px] font-bold text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full">
                    Licença Comercial
                  </span>
                )}
              </div>

              {/* Preço */}
              <div className="mb-6">
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-black text-white">{preco}€</span>
                  <span className="text-slate-400 text-sm mb-1">
                    {intervalo === 'anual' ? '/ ano' : '/ mês'}
                  </span>
                </div>
                {intervalo === 'anual' && plano.preco_mensal && (
                  <p className="text-slate-500 text-xs mt-1 line-through">
                    {(plano.preco_mensal * 12).toFixed(2)}€ / ano
                  </p>
                )}
                {intervalo === 'anual' && (
                  <p className="text-slate-400 text-xs mt-1">
                    ≈ {((preco) / 12).toFixed(2)}€ / mês
                  </p>
                )}
              </div>

              {/* Créditos */}
              <div className="bg-black/20 rounded-2xl p-4 mb-6 text-center">
                <p className="text-slate-400 text-xs mb-1">Downloads incluídos</p>
                <p className="text-3xl font-black text-green-400">{plano.limite_downloads}</p>
                <p className="text-slate-500 text-xs mt-1">créditos STL</p>
              </div>

              {/* Features */}
              <ul className="space-y-2 mb-8 flex-grow">
                {(plano.vantagens && plano.vantagens.length > 0
                  ? plano.vantagens
                  : [
                      'Configurador 3D completo',
                      `${plano.limite_downloads} downloads STL`,
                      plano.permite_venda_comercial ? 'Licença Comercial incluída' : 'Uso pessoal',
                      `Acesso por ${plano.validade_dias} dias`,
                    ]
                ).map((v, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                    <CheckCircle2 size={14} className="text-indigo-400 flex-shrink-0 mt-0.5" />
                    {v}
                  </li>
                ))}
              </ul>

              {/* Botão */}
              <button
                onClick={() => router.push(`/checkout?plan=${plano.id}&intervalo=${intervalo}`)}
                className={`w-full py-3 rounded-xl font-black text-sm uppercase tracking-widest transition-all ${
                  isPopular
                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                    : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
                }`}
              >
                {isPopular ? 'Começar Agora' : 'Selecionar Plano'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Footer note */}
      <div className="text-center pb-16 px-4">
        <p className="text-slate-500 text-sm">
          Dúvidas? Fala connosco — estamos aqui para ajudar.
        </p>
      </div>
    </div>
  );
}
