'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Megaphone, Save, CheckCircle } from 'lucide-react';

export default function CampanhasPage() {
  const supabase = createClient();
  
  // Estados do Formulário
  const [titulo, setTitulo] = useState('');
  const [canal, setCanal] = useState('Feed da App');
  const [conteudo, setConteudo] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  const handleCriar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo) return alert("O título é obrigatório");

    setCarregando(true);
    
    const { error } = await supabase
      .from('prod_campanhas')
      .insert([
        { 
          titulo, 
          tipo: canal, 
          conteudo,
          ativa: true,
          segmento: 'todos' 
        }
      ]);

    if (error) {
      alert("Erro ao salvar: " + error.message);
    } else {
      setSucesso(true);
      setTitulo('');
      setConteudo('');
      setTimeout(() => setSucesso(false), 3000); // Esconde a mensagem após 3s
    }
    setCarregando(false);
  };

  return (
    <div className="min-h-screen bg-[#0a0a16] p-8 text-white">
      <div className="max-w-4xl mx-auto">
        <header className="mb-10">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Megaphone className="text-indigo-500" /> Gestão de Campanhas
          </h1>
          <p className="text-gray-400 mt-2">Crie e monitorize as promoções da plataforma.</p>
        </header>

        {/* Formulário */}
        <div className="bg-[#16162d] p-8 rounded-3xl border border-white/5 shadow-2xl">
          <h2 className="text-xl font-bold mb-6">Nova Campanha</h2>
          
          <form onSubmit={handleCriar} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Título */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Título</label>
                <input 
                  type="text" 
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ex: Promoção de Verão" 
                  className="bg-[#0a0a16] border border-white/10 p-4 rounded-xl text-white outline-none focus:border-indigo-500 transition-all"
                />
              </div>

              {/* Canal (Tipo) */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Canal</label>
                <select 
                  value={canal}
                  onChange={(e) => setCanal(e.target.value)}
                  className="bg-[#0a0a16] border border-white/10 p-4 rounded-xl text-white outline-none focus:border-indigo-500"
                >
                  <option>Feed da App</option>
                  <option>Banner Principal</option>
                  <option>Popup Notificação</option>
                </select>
              </div>
            </div>

            {/* Conteúdo */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Descrição da Campanha</label>
              <textarea 
                value={conteudo}
                onChange={(e) => setConteudo(e.target.value)}
                placeholder="Descreva o que os utilizadores vão ver..."
                className="bg-[#0a0a16] border border-white/10 p-4 rounded-xl text-white outline-none focus:border-indigo-500 h-32 resize-none"
              />
            </div>

            {/* Botão Submeter */}
            <button 
              type="submit"
              disabled={carregando}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {sucesso ? (
                <><CheckCircle size={20} /> Campanha Publicada!</>
              ) : (
                <><Save size={20} /> {carregando ? 'A processar...' : 'Confirmar e Publicar'}</>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}