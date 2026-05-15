'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, ArrowLeft, CreditCard, Shield, Zap } from 'lucide-react';

interface Plano {
  id: string;
  nome: string;
  preco: number;
  validade_dias: number;
  limite_downloads: number;
  permite_venda_comercial: boolean;
  vantagens?: string[];
}

interface Props {
  plano: Plano;
  userEmail: string;
  planoAtualNome: string | null;
}

export default function CheckoutClient({ plano, userEmail, planoAtualNome }: Props) {
  const router = useRouter();
  const [enviado, setEnviado] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleConfirmar = async () => {
    setLoading(true);
    // Placeholder: aqui vai a chamada ao Stripe quando estiver configurado
    await new Promise(r => setTimeout(r, 1000));
    setEnviado(true);
    setLoading(false);
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
            Recebemos o teu pedido para o plano <span className="text-white font-bold">{plano.nome}</span>.
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

        {/* Back */}
        <button
          onClick={() => router.push('/pricing')}
          className="flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-8 transition-colors"
        >
          <ArrowLeft size={16} /> Voltar aos planos
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">

          {/* Resumo do plano */}
          <div className="bg-[#1e293b] rounded-3xl border border-white/10 p-8 shadow-xl">
            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4">Resumo do pedido</p>

            <h2 className="text-2xl font-black text-white mb-1">{plano.nome}</h2>
            {planoAtualNome && (
              <p className="text-xs text-slate-500 mb-6">
                Plano atual: <span className="text-slate-400">{planoAtualNome}</span>
              </p>
            )}

            <div className="space-y-4 mb-8">
              <div className="flex justify-between items-center py-3 border-b border-white/5">
                <span className="text-slate-400 text-sm">Subscrição mensal</span>
                <span className="font-bold text-white">{plano.preco}€ / mês</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-white/5">
                <span className="text-slate-400 text-sm">Créditos incluídos</span>
                <span className="font-bold text-green-400">{plano.limite_downloads} créditos</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-white/5">
                <span className="text-slate-400 text-sm">Validade</span>
                <span className="font-bold text-white">{plano.validade_dias} dias</span>
              </div>
              {plano.permite_venda_comercial && (
                <div className="flex justify-between items-center py-3 border-b border-white/5">
                  <span className="text-slate-400 text-sm">Licença comercial</span>
                  <span className="text-green-400 text-sm font-bold">✓ Incluída</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2">
                <span className="font-bold text-white">Total</span>
                <span className="text-2xl font-black text-white">{plano.preco}€</span>
              </div>
            </div>

            {/* Features */}
            <div className="space-y-2">
              {(plano.vantagens && plano.vantagens.length > 0
                ? plano.vantagens
                : [
                    'Acesso ao Configurador 3D',
                    `${plano.limite_downloads} downloads de STL`,
                    plano.permite_venda_comercial ? 'Licença Comercial' : 'Uso Pessoal',
                  ]
              ).map((v, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-slate-300">
                  <CheckCircle2 size={14} className="text-indigo-400 flex-shrink-0" />
                  {v}
                </div>
              ))}
            </div>
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
                {loading ? 'A processar...' : 'Confirmar pedido'}
              </button>

              <p className="text-center text-slate-500 text-xs mt-4">
                Iremos contactar-te para confirmar o pagamento.
              </p>
            </div>

            {/* Trust badges */}
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
