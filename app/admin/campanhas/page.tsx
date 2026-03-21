'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client'; // Ajusta o caminho se necessário
import { Megaphone, Send, CheckCircle2, AlertCircle } from 'lucide-react';

export default function CampanhasPage() {
  const supabase = createClient();

  // 1. Estados para os campos do formulário
  const [titulo, setTitulo] = useState('');
  const [canal, setCanal] = useState('Feed da App');
  const [conteudo, setConteudo] = useState('');
  
  // 2. Estados de controlo da UI
  const [carregando, setCarregando] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // 3. A FUNÇÃO QUE FALTAVA (handleCriar)
  const handleCriar = async () => {
    console.log("Iniciando submissão...");
    
    if (!titulo || !conteudo) {
      alert("Por favor, preenche o título e a descrição.");
      return;
    }

    setCarregando(true);
    setStatus('idle');

    try {
      const { error } = await supabase
        .from('prod_campanhas')
        .insert([
          { 
            titulo: titulo,
            tipo: canal, 
            conteudo: conteudo,
            ativa: true,
            segmento: 'todos'
          }
        ]);

      if (error) throw error;

      // Sucesso!
      setStatus('success');
      setTitulo('');
      setConteudo('');
      console.log("Campanha criada com sucesso!");
      
      // Volta ao estado normal após 3 segundos
      setTimeout(() => setStatus('idle'), 3000);

    } catch (error: any) {
      console.error("Erro ao salvar no Supabase:", error);
      setStatus('error');
      alert("Erro: " + error.message);
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

          <div className="flex flex-col gap-2 mb-8">
            <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Descrição / Conteúdo</label>
            <textarea 
              value={conteudo}
              onChange={(e) => setConteudo(e.target.value)}
              placeholder="Escreve aqui o texto da campanha..."
              className="bg-[#0a0a16] border border-white/10 p-4 rounded-xl text-white outline-none focus:border-indigo-500 h-32 resize-none"
            />
          </div>

          <button 
            type="button"
            onClick={handleCriar}
            disabled={carregando}
            className={`w-full font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 
              ${status === 'success' ? 'bg-green-600' : 'bg-indigo-600 hover:bg-indigo-500'} 
              disabled:opacity-50`}
          >
            {carregando ? (
              "A processar..."
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