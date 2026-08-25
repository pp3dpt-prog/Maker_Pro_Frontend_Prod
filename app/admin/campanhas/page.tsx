'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Megaphone, Send, CheckCircle2, Package } from 'lucide-react';
import FotoProdutoStudio from '@/components/admin/campanhas/FotoProdutoStudio';

interface ProdutoRef {
  id: string; nome: string; descricao: string | null; preco_cents: number | null; estado: string;
  prod_loja_imagens?: { url: string; ordem: number }[];
}

export default function CampanhasPage() {
  const [produtos, setProdutos] = useState<ProdutoRef[]>([]);
  const [produtoBaseId, setProdutoBaseId] = useState('');

  const [titulo, setTitulo] = useState('');
  const [canal, setCanal] = useState('Feed da App');
  const [conteudo, setConteudo] = useState('');
  const [fotosProduto, setFotosProduto] = useState<string[]>([]);
  const [precoProduto, setPrecoProduto] = useState<number | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [erro, setErro] = useState('');

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('prod_loja_produtos')
        .select('id, nome, descricao, preco_cents, estado, prod_loja_imagens(url, ordem)')
        .in('estado', ['ativo', 'rascunho'])
        .order('nome');
      setProdutos((data ?? []) as unknown as ProdutoRef[]);
    })();
  }, []);

  function aplicarProdutoBase(id: string) {
    setProdutoBaseId(id);
    if (!id) { setFotosProduto([]); setPrecoProduto(null); return; }
    const p = produtos.find(x => x.id === id);
    if (!p) return;
    setTitulo(p.nome);
    setConteudo(p.descricao ?? '');
    setPrecoProduto(p.preco_cents ?? null);
    const fotos = (p.prod_loja_imagens ?? []).slice().sort((a, b) => a.ordem - b.ordem).map(i => i.url);
    setFotosProduto(fotos);
  }

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
    } catch (e: any) {
      setStatus('error');
      setErro('Erro ao guardar a campanha: ' + (e?.message ?? e?.error_description ?? JSON.stringify(e)));
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a16] p-8 text-white">
      <div className="max-w-4xl mx-auto">

        <div className="mb-8">
          <h1 className="text-2xl font-bold flex items-center gap-3">🖼️ Fotos de Produto</h1>
          <p className="text-sm text-white/50 mt-1">Prepara fotos de produto prontas a publicar e cria campanhas para as redes sociais.</p>
        </div>

        <FotoProdutoStudio />

        <div className="bg-[#16162d] p-8 rounded-3xl border border-white/5 shadow-2xl">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
            <Megaphone className="text-indigo-400" /> Criar Nova Campanha
          </h2>

          <div className="mb-6">
            <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
              <Package size={12} /> Basear num produto (opcional)
            </label>
            <select
              value={produtoBaseId}
              onChange={(e) => aplicarProdutoBase(e.target.value)}
              className="bg-[#0a0a16] border border-white/10 p-4 rounded-xl text-white outline-none focus:border-indigo-500 w-full mt-2"
            >
              <option value="">— Escrever campanha do zero —</option>
              {produtos.map(p => (
                <option key={p.id} value={p.id}>{p.nome} · {p.estado}{p.preco_cents != null ? ` · ${(p.preco_cents / 100).toFixed(2)} €` : ''}</option>
              ))}
            </select>
            {produtoBaseId && (
              <div className="mt-3 flex items-center gap-3">
                {fotosProduto.slice(0, 4).map(url => (
                  <img key={url} src={url} alt="" className="w-14 h-14 object-cover rounded-lg border border-white/10" />
                ))}
                {precoProduto != null && (
                  <span className="text-sm font-bold text-indigo-300">{(precoProduto / 100).toFixed(2)} €</span>
                )}
                <span className="text-xs text-white/40">Título e descrição preenchidos a partir do produto — podes ajustar abaixo.</span>
              </div>
            )}
          </div>

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
