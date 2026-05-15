'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { CheckCircle2, RefreshCw, Loader2 } from 'lucide-react';

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
    async function carregarPlanos() {
      try {
        const { data, error } = await supabase
          .from('prod_planos')
          .select('*')
          .order('preco', { ascending: true });
        if (error) throw error;
        if (!data || data.length === 0) { setErro('Nenhum plano disponível.'); return; }
        setPlanos(data);
      } catch (err: unknown) {
        setErro(err instanceof Error ? err.message : 'Erro ao carregar planos');
      } finally {
        setLoading(false);
      }
    }
    carregarPlanos();
  }, []);

  const getPoupanca = (plano: Plano): number | null => {
    const mensal = plano.preco_mensal ?? plano.preco;
    const anual = plano.preco_anual;
    if (!anual || !mensal) return null;
    return Math.round(((mensal * 12 - anual) / (mensal * 12)) * 100);
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

    if (res.ok) {
      router.push('/dashboard');
      router.refresh();
    }
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
      <div className="text-center pt-20 pb-12 px-4">
        <p className="text-[11px] font-black text-indigo-400 uppercase tracking-widest mb-4">Planos</p>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">Escolhe o teu plano</h1>
        <p className="text-slate-400 text-lg max-w-xl mx-auto">
          Acesso ao configurador 3D, créditos para downloads e muito mais.
        </p>
      </div>

      {/* Cards */}
      <div className="max-w-5xl mx-auto px-4 pb-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
        {planos.map((plano) => {
          const isPopular = plano.id === getPopularId();
          const poupanca = getPoupanca(plano);
          const precoMensal = plano.preco_mensal ?? plano.preco;
          const precoAnual = plano.preco_anual;

          return (
            <div
              key={plano.id}
              className={`relative flex flex-col rounded-3xl p-8 border transition-all ${
                plano.gratuito
                  ? 'bg-[#1e293b] border-white/10'
                  : isPopular
                    ? 'bg-indigo-600/10 border-indigo-500/50 shadow-2xl shadow-indigo-500/10'
                    : 'bg-[#1e293b] border-white/10'
              }`}
            >
              {isPopular && !plano.gratuito && (
                <div className="absolute -top-3 left-6 bg-indigo-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
                  Mais Popular
                </div>
              )}

              {plano.gratuito && (
                <div className="absolute -top-3 left-6 bg-slate-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
                  Grátis
                </div>
              )}

              {/* Nome */}
              <div className="mb-5">
                <h2 className={`text-lg font-black uppercase tracking-wide mb-1 ${isPopular && !plano.gratuito ? 'text-indigo-400' : 'text-white'}`}>
                  {plano.nome}
                </h2>
                {plano.permite_venda_comercial && (
                  <span className="text-[10px] font-bold text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full">
                    Licença Comercial
                  </span>
                )}
              </div>

              {/* Preço — só para planos gratuitos mostramos aqui */}
              {plano.gratuito && (
                <div className="mb-5">
                  <div className="flex items-end gap-1 mb-1">
                    <span className="text-4xl font-black text-white">0€</span>
                    <span className="text-slate-400 text-sm mb-1">/ sempre</span>
                  </div>
                  <p className="text-slate-500 text-xs">Sem cartão de crédito</p>
                </div>
              )}

              {/* Créditos */}
              <div className="bg-black/20 rounded-2xl p-4 mb-5 text-center">
                <p className="text-slate-400 text-xs mb-1">Downloads incluídos</p>
                <p className="text-3xl font-black text-green-400">{plano.limite_downloads}</p>
                <p className="text-slate-500 text-xs mt-1">créditos STL</p>
              </div>

              {/* Recarga mensal — só para planos gratuitos com recarga */}
              {plano.gratuito && plano.recarga_creditos_mensal > 0 && (
                <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3 mb-5">
                  <RefreshCw size={14} className="text-green-400 flex-shrink-0" />
                  <p className="text-green-300 text-xs">
                    <span className="font-black">+{plano.recarga_creditos_mensal} créditos</span> adicionados automaticamente todos os meses
                  </p>
                </div>
              )}

              {/* Validade */}
              {plano.gratuito && (
                <div className="flex items-center justify-between text-sm mb-6">
                  <span className="text-slate-400">Validade</span>
                  <span className="text-white font-bold">{plano.validade_dias} dias (renovável)</span>
                </div>
              )}

              {/* Features */}
              <ul className="space-y-2 mb-8 flex-grow">
                {(plano.vantagens && plano.vantagens.length > 0
                  ? plano.vantagens
                  : [
                      'Configurador 3D completo',
                      `${plano.limite_downloads} créditos iniciais`,
                      plano.gratuito && plano.recarga_creditos_mensal > 0
                        ? `+${plano.recarga_creditos_mensal} créditos / mês`
                        : plano.permite_venda_comercial ? 'Licença Comercial' : 'Uso pessoal',
                    ]
                ).map((v, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                    <CheckCircle2 size={14} className="text-indigo-400 flex-shrink-0 mt-0.5" />
                    {v}
                  </li>
                ))}
              </ul>

              {/* Botões */}
              {plano.gratuito ? (
                /* Plano gratuito: apenas um botão de adesão */
                <button
                  onClick={() => handleAderirGratuito(plano.id)}
                  disabled={aderindoId === plano.id}
                  className="w-full py-3 rounded-xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 text-white border border-white/10 disabled:opacity-50"
                >
                  {aderindoId === plano.id
                    ? <><Loader2 size={14} className="animate-spin" /> A ativar...</>
                    : 'Começar Grátis'
                  }
                </button>
              ) : (
                /* Planos pagos: botão mensal + botão anual */
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => router.push(`/checkout?plan=${plano.id}&intervalo=mensal`)}
                    className={`w-full py-3 rounded-xl font-black text-sm transition-all flex items-center justify-between px-4 ${
                      isPopular
                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                        : 'bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10'
                    }`}
                  >
                    <span>Mensal</span>
                    <span className="font-black">
                      {precoMensal}€<span className="text-xs font-normal opacity-70"> /mês</span>
                    </span>
                  </button>

                  {precoAnual ? (
                    <button
                      onClick={() => router.push(`/checkout?plan=${plano.id}&intervalo=anual`)}
                      className="w-full py-3 rounded-xl font-black text-sm transition-all flex items-center justify-between px-4 bg-green-600/20 hover:bg-green-600/30 text-green-300 border border-green-500/30"
                    >
                      <span className="flex items-center gap-2">
                        Anual
                        {poupanca && poupanca > 0 && (
                          <span className="text-[9px] font-black bg-green-500/30 text-green-400 px-1.5 py-0.5 rounded-full">
                            -{poupanca}%
                          </span>
                        )}
                      </span>
                      <span className="font-black text-white">
                        {precoAnual}€<span className="text-xs font-normal opacity-70"> /ano</span>
                      </span>
                    </button>
                  ) : (
                    <div className="w-full py-3 rounded-xl text-center text-slate-600 text-xs border border-white/5">
                      Plano anual em breve
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="text-center pb-16 px-4">
        <p className="text-slate-500 text-sm">Dúvidas? Fala connosco — estamos aqui para ajudar.</p>
      </div>
    </div>
  );
}
