'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, ArrowLeft, CreditCard, Shield, Zap } from 'lucide-react';

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

interface Props {
  plano: Plano;
  intervalo: 'mensal' | 'anual';
  userEmail: string;
  planoAtualNome: string | null;
}

export default function CheckoutClient({ plano, intervalo, userEmail, planoAtualNome }: Props) {
  const router = useRouter();
  const [enviado, setEnviado] = useState(false);
  const [loading, setLoading] = useState(false);

  const preco = intervalo === 'anual'
    ? (plano.preco_anual ?? plano.preco_mensal ?? plano.preco)
    : (plano.preco_mensal ?? plano.preco);

  const precoMensal = plano.preco_mensal ?? plano.preco;
  const poupanca = intervalo === 'anual' && plano.preco_anual
    ? Math.round(((precoMensal * 12 - plano.preco_anual) / (precoMensal * 12)) * 100)
    : null;

  const handleConfirmar = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plano_id: plano.id, intervalo }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao iniciar pagamento.');
      if (json.url) window.location.href = json.url;
    } catch (err: any) {
      alert(err.message);
      setLoading(false);
    }
  };

  if (enviado) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6">
        <div className="bg-[#1e293b] rounded-3xl border border-white/10 p-12 max-w-md w-full text-center shadow-2xl">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="text-green-400" size={32} />
          </div>
          <h1 className="text-2xl font-black text-white mb-3">Pedido recebido!</h1>
          <p className="text-slate-400 text-sm leading-relaxed mb-2">
            Recebemos o teu pedido para o plano{' '}
            <span className="text-white font-bold">{plano.nome}</span>{' '}
            <span className="text-indigo-400">({intervalo})</span>.
          </p>
          <p className="text-slate-400 text-sm leading-relaxed mb-8">
            Vamos contactar-te em breve para{' '}
            <span className="text-indigo-400 font-semibold">{userEmail}</span>{' '}
            com as instruções de pagamento.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-all"
          >
            Ir para o Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-white p-6 md:p-10">
      <div className="max-w-4xl mx-auto">

        <button
          onClick={() => router.push('/pricing')}
          className="flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-8 transition-colors"
        >
          <ArrowLeft size={16} /> Voltar aos planos
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">

          {/* Resumo */}
          <div className="bg-[#1e293b] rounded-3xl border border-white/10 p-8 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Resumo</p>
              <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${
                intervalo === 'anual'
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
              }`}>
                {intervalo === 'anual' ? '📅 Anual' : '🗓️ Mensal'}
              </span>
            </div>

            <h2 className="text-2xl font-black text-white mb-1">{plano.nome}</h2>
            {planoAtualNome && (
              <p className="text-xs text-slate-500 mb-6">
                Plano atual: <span className="text-slate-400">{planoAtualNome}</span>
              </p>
            )}

            <div className="space-y-0 mb-8">
              {[
                {
                  label: intervalo === 'anual' ? 'Subscrição anual' : 'Subscrição mensal',
                  valor: <span className="font-bold text-white">{preco}€ / {intervalo === 'anual' ? 'ano' : 'mês'}</span>
                },
                intervalo === 'anual' && plano.preco_anual ? {
                  label: 'Equivalente mensal',
                  valor: <span className="text-slate-300">{(plano.preco_anual / 12).toFixed(2)}€ / mês</span>
                } : null,
                poupanca ? {
                  label: 'Poupança vs mensal',
                  valor: <span className="font-bold text-green-400">-{poupanca}%</span>
                } : null,
                { label: 'Créditos incluídos', valor: <span className="font-bold text-green-400">{plano.limite_downloads} créditos</span> },
                { label: 'Validade', valor: <span className="font-bold text-white">{plano.validade_dias} dias</span> },
                plano.permite_venda_comercial ? {
                  label: 'Licença comercial',
                  valor: <span className="text-green-400 text-sm font-bold">✓ Incluída</span>
                } : null,
              ].filter(Boolean).map((row, i, arr) => (
                <div key={i} className={`flex justify-between items-center py-3 ${i < arr.length - 1 ? 'border-b border-white/5' : ''}`}>
                  <span className="text-slate-400 text-sm">{(row as {label: string; valor: React.ReactNode}).label}</span>
                  {(row as {label: string; valor: React.ReactNode}).valor}
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-white/10">
              <span className="font-bold text-white">Total</span>
              <div className="text-right">
                <span className="text-2xl font-black text-white">{preco}€</span>
                {intervalo === 'anual' && plano.preco_mensal && (
                  <p className="text-slate-500 text-xs line-through">{(plano.preco_mensal * 12).toFixed(2)}€</p>
                )}
              </div>
            </div>

            <ul className="mt-6 space-y-2">
              {(plano.vantagens?.length ? plano.vantagens : [
                'Configurador 3D completo',
                `${plano.limite_downloads} downloads STL`,
                plano.permite_venda_comercial ? 'Licença Comercial' : 'Uso Pessoal',
              ]).map((v, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-slate-300">
                  <CheckCircle2 size={13} className="text-indigo-400 flex-shrink-0" />
                  {v}
                </li>
              ))}
            </ul>
          </div>

          {/* Ação */}
          <div className="space-y-4">
            <div className="bg-[#1e293b] rounded-3xl border border-white/10 p-8 shadow-xl">
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4">Dados de contacto</p>

              <div className="bg-[#0f172a] rounded-xl border border-white/10 px-4 py-3 mb-6">
                <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Email</p>
                <p className="text-white font-semibold text-sm">{userEmail}</p>
              </div>

              <button
                onClick={handleConfirmar}
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-black py-4 rounded-xl transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-widest shadow-lg shadow-indigo-500/20"
              >
                <CreditCard size={16} />
                {loading ? 'A processar...' : `Confirmar pedido — ${preco}€`}
              </button>

              <p className="text-center text-slate-500 text-xs mt-4">
                Iremos contactar-te para confirmar o pagamento.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#1e293b] rounded-2xl border border-white/5 p-4 flex items-center gap-3">
                <Shield size={18} className="text-green-400 flex-shrink-0" />
                <p className="text-xs text-slate-400">Dados seguros e protegidos</p>
              </div>
              <div className="bg-[#1e293b] rounded-2xl border border-white/5 p-4 flex items-center gap-3">
                <Zap size={18} className="text-indigo-400 flex-shrink-0" />
                <p className="text-xs text-slate-400">Acesso imediato após pagamento</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
