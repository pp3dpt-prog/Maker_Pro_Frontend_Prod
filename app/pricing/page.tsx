'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Check, RefreshCw, Loader2, Zap } from 'lucide-react';

interface Plano {
  id: string;
  nome: string;
  preco: number;
  preco_mensal: number | null;
  preco_anual: number | null;
  validade_dias: number;
  limite_downloads: number;
  permite_venda_comercial: boolean;
  gratuito: boolean;
  recarga_creditos_mensal: number;
  vantagens?: string[];
}

export default function PricingPage() {
  const router = useRouter();
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [aderindoId, setAderindoId] = useState<string | null>(null);

  useEffect(() => {
    async function carregar() {
      try {
        const { data, error } = await supabase
          .from('prod_planos')
          .select('*')
          .order('preco', { ascending: true });
        if (error) throw error;
        if (!data?.length) { setErro('Nenhum plano disponível.'); return; }
        setPlanos(data);
      } catch (err: unknown) {
        setErro(err instanceof Error ? err.message : 'Erro ao carregar planos');
      } finally {
        setLoading(false);
      }
    }
    carregar();
  }, []);

  const getPoupanca = (plano: Plano) => {
    const m = plano.preco_mensal ?? plano.preco;
    const a = plano.preco_anual;
    if (!a || !m) return null;
    return Math.round(((m * 12 - a) / (m * 12)) * 100);
  };

  const getPopularId = () => {
    const pagos = planos.filter(p => !p.gratuito);
    if (pagos.length >= 2) return pagos[Math.floor(pagos.length / 2)].id;
    return pagos[0]?.id ?? null;
  };

  const handleAderirGratuito = async (planoId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login?redirect=/pricing'); return; }
    setAderindoId(planoId);
    const res = await fetch('/api/aderir-gratuito', { method: 'POST' });
    setAderindoId(null);
    if (res.ok) { router.push('/dashboard'); router.refresh(); }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#080c10] flex items-center justify-center text-slate-400 text-sm">
      A carregar planos...
    </div>
  );

  if (erro) return (
    <div className="min-h-screen bg-[#080c10] flex flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="text-red-400 text-sm">{erro}</p>
      <button onClick={() => window.location.reload()} className="px-5 py-2 bg-indigo-600 rounded-xl text-white text-sm font-bold">
        Tentar novamente
      </button>
    </div>
  );

  const popularId = getPopularId();

  return (
    <div className="min-h-screen bg-[#080c10] text-white">

      {/* ── HEADER ───────────────────────────────────────────────── */}
      <div className="text-center pt-24 pb-16 px-4">
        <p className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-5">Preçário</p>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4 text-white">
          Simples e transparente
        </h1>
        <p className="text-slate-500 text-base max-w-md mx-auto leading-relaxed">
          Começa grátis. Evolui quando precisares.
        </p>
      </div>

      {/* ── GRID DE CARDS ────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
          {planos.map((plano) => {
            const isPopular = plano.id === popularId && !plano.gratuito;
            const poupanca = getPoupanca(plano);
            const precoMensal = plano.preco_mensal ?? plano.preco;
            const precoAnual = plano.preco_anual;

            const features: string[] = plano.vantagens?.length
              ? plano.vantagens
              : [
                  'Configurador 3D completo',
                  `${plano.limite_downloads} downloads STL incluídos`,
                  plano.gratuito && plano.recarga_creditos_mensal > 0
                    ? `+${plano.recarga_creditos_mensal} créditos renovados por mês`
                    : plano.permite_venda_comercial
                      ? 'Licença Comercial incluída'
                      : 'Licença de uso pessoal',
                ];

            return (
              <div
                key={plano.id}
                className={`relative flex flex-col rounded-2xl overflow-hidden transition-all duration-200 ${
                  isPopular
                    ? 'ring-2 ring-indigo-500 shadow-2xl shadow-indigo-500/20'
                    : 'ring-1 ring-white/8'
                }`}
              >
                {/* Topo colorido */}
                <div className={`h-1.5 w-full ${
                  plano.gratuito ? 'bg-slate-600' :
                  isPopular ? 'bg-gradient-to-r from-indigo-500 to-violet-500' :
                  'bg-slate-700'
                }`} />

                <div className={`flex flex-col flex-1 p-7 ${
                  isPopular ? 'bg-[#13172a]' : 'bg-[#0f1420]'
                }`}>

                  {/* Badge + Nome */}
                  <div className="mb-6">
                    {isPopular && (
                      <span className="inline-block text-[9px] font-black text-indigo-300 bg-indigo-500/20 border border-indigo-500/30 px-2.5 py-0.5 rounded-full uppercase tracking-widest mb-3">
                        Mais Popular
                      </span>
                    )}
                    {plano.gratuito && (
                      <span className="inline-block text-[9px] font-black text-slate-300 bg-white/10 border border-white/10 px-2.5 py-0.5 rounded-full uppercase tracking-widest mb-3">
                        Grátis
                      </span>
                    )}
                    <h2 className="text-xl font-black text-white tracking-tight">{plano.nome}</h2>
                    {plano.permite_venda_comercial && (
                      <p className="text-[11px] text-green-400 font-semibold mt-1">Inclui Licença Comercial</p>
                    )}
                  </div>

                  {/* Preço principal */}
                  <div className="mb-6">
                    {plano.gratuito ? (
                      <>
                        <div className="flex items-baseline gap-1">
                          <span className="text-5xl font-black text-white">0€</span>
                          <span className="text-slate-500 text-sm">/ mês</span>
                        </div>
                        <p className="text-slate-600 text-xs mt-1.5">Sem cartão de crédito</p>
                      </>
                    ) : (
                      <>
                        <div className="flex items-baseline gap-1">
                          <span className="text-5xl font-black text-white">{precoMensal}€</span>
                          <span className="text-slate-500 text-sm">/ mês</span>
                        </div>
                        {precoAnual && (
                          <p className="text-slate-500 text-xs mt-1.5">
                            ou <span className="text-slate-300 font-semibold">{precoAnual}€/ano</span>
                            {poupanca && poupanca > 0 && (
                              <span className="ml-1.5 text-green-400 font-bold">— poupa {poupanca}%</span>
                            )}
                          </p>
                        )}
                      </>
                    )}
                  </div>

                  {/* Créditos em destaque */}
                  <div className="flex items-center gap-3 mb-6">
                    <div className={`flex items-center justify-center w-10 h-10 rounded-xl flex-shrink-0 ${
                      isPopular ? 'bg-indigo-500/20' : 'bg-white/5'
                    }`}>
                      <Zap size={18} className={isPopular ? 'text-indigo-400' : 'text-slate-400'} />
                    </div>
                    <div>
                      <p className="text-2xl font-black text-white leading-none">{plano.limite_downloads}</p>
                      <p className="text-slate-500 text-xs mt-0.5">créditos STL incluídos</p>
                    </div>
                    {plano.gratuito && plano.recarga_creditos_mensal > 0 && (
                      <div className="ml-auto flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 rounded-lg px-2.5 py-1.5">
                        <RefreshCw size={10} className="text-green-400" />
                        <span className="text-green-400 text-[10px] font-black">+{plano.recarga_creditos_mensal}/mês</span>
                      </div>
                    )}
                  </div>

                  {/* Divisor */}
                  <div className="border-t border-white/5 mb-5" />

                  {/* Features */}
                  <ul className="space-y-2.5 mb-8 flex-1">
                    {features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-slate-400">
                        <Check size={13} className={`flex-shrink-0 mt-0.5 ${isPopular ? 'text-indigo-400' : 'text-slate-500'}`} />
                        {f}
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  {plano.gratuito ? (
                    <button
                      onClick={() => handleAderirGratuito(plano.id)}
                      disabled={aderindoId === plano.id}
                      className="w-full py-3 rounded-xl text-sm font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 bg-white/8 hover:bg-white/12 text-white border border-white/10 disabled:opacity-40"
                    >
                      {aderindoId === plano.id
                        ? <><Loader2 size={13} className="animate-spin" /> A ativar...</>
                        : 'Começar Grátis'}
                    </button>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {/* Mensal */}
                      <button
                        onClick={() => router.push(`/checkout?plan=${plano.id}&intervalo=mensal`)}
                        className={`w-full py-3 rounded-xl text-sm font-black tracking-wide transition-all ${
                          isPopular
                            ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/25'
                            : 'bg-white/8 hover:bg-white/12 text-white border border-white/10'
                        }`}
                      >
                        Subscrição Mensal — {precoMensal}€
                      </button>

                      {/* Anual */}
                      {precoAnual ? (
                        <button
                          onClick={() => router.push(`/checkout?plan=${plano.id}&intervalo=anual`)}
                          className="w-full py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all text-slate-400 hover:text-white border border-white/5 hover:border-white/15 hover:bg-white/5 flex items-center justify-center gap-2"
                        >
                          Anual — {precoAnual}€
                          {poupanca && poupanca > 0 && (
                            <span className="text-green-400 font-black text-[10px] bg-green-500/15 px-1.5 py-0.5 rounded-md">
                              -{poupanca}%
                            </span>
                          )}
                        </button>
                      ) : (
                        <p className="text-center text-slate-700 text-xs py-2">Plano anual brevemente</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── RODAPÉ ───────────────────────────────────────────────── */}
      <div className="text-center pb-20 px-4">
        <p className="text-slate-600 text-sm">Dúvidas? Fala connosco.</p>
      </div>
    </div>
  );
}
