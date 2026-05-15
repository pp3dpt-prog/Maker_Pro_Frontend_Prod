'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Megaphone, Send, CheckCircle2 } from 'lucide-react';

export default function CampanhasPage() {
  const [titulo, setTitulo] = useState('');
  const [canal, setCanal] = useState('Feed da App');
  const [conteudo, setConteudo] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [erro, setErro] = useState('');

  const handleCriar = async () => {
    if (!titulo || !conteudo) {
      setErro('Por favor, preenche o título e a descrição.');
      setStatus('error');
      return;
    }

    setCarregando(true);
    setStatus('idle');
    setErro('');

    try {
      const { error } = await supabase
        .from('prod_campanhas')
        .insert([{
          titulo,
          tipo: canal,
          conteudo,
          ativa: true,
          segmento: 'todos'
        }]);

      if (error) throw error;

      setStatus('success');
      setTitulo('');
      setConteudo('');
      setTimeout(() => setStatus('idle'), 3000);
    } catch {
      setStatus('error');
      setErro('Erro ao guardar a campanha. Tenta novamente.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a16] p-8 text-white">
      <div className="max-w-4xl mx-auto">

        <div className="bg-[#16162d] p-8 rounded-3xl border border-white/5 shadow-2xl">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
            <Megaphone className="text-indigo-400" /> Criar Nova Campanha
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Título</label>
              <input
                type="text"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ex: Promoção Flash"
                className="bg-[#0a0a16] border border-white/10 p-4 rounded-xl text-white outline-none focus:border-indigo-500 w-full"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Canal</label>
              <select
                value={canal}
                onChange={(e) => setCanal(e.target.value)}
                className="bg-[#0a0a16] border border-white/10 p-4 rounded-xl text-white outline-none focus:border-indigo-500 h-[58px]"
              >
                <option>Feed da App</option>
                <option>Banner Principal</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-2 mb-6">
            <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Descrição / Conteúdo</label>
            <textarea
              value={conteudo}
              onChange={(e) => setConteudo(e.target.value)}
              placeholder="Escreve aqui o texto da campanha..."
              className="bg-[#0a0a16] border border-white/10 p-4 rounded-xl text-white outline-none focus:border-indigo-500 h-32 resize-none"
            />
          </div>

          {erro && <p className="text-red-400 text-sm mb-4">{erro}</p>}

          <button
            type="button"
            onClick={handleCriar}
            disabled={carregando}
            className={`w-full font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2
              ${status === 'success' ? 'bg-green-600' : 'bg-indigo-600 hover:bg-indigo-500'}
              disabled:opacity-50`}
          >
            {carregando ? (
              'A processar...'
            ) : status === 'success' ? (
              <><CheckCircle2 size={20} /> Publicada com Sucesso!</>
            ) : (
              <><Send size={18} /> Confirmar e Publicar</>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
