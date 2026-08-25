'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { slugify } from '@/lib/loja';
import { Camera, ImagePlus, Wand2, Check, X, Loader2, PackagePlus, Package } from 'lucide-react';

const FUNDOS = [
  { key: 'branco', nome: 'Branco', url: '/campanhas/fundos/estudio-branco.jpg', swatch: '#ffffff' },
  { key: 'cinza', nome: 'Cinza', url: '/campanhas/fundos/estudio-cinza.jpg', swatch: '#d6d8de' },
  { key: 'bege', nome: 'Bege', url: '/campanhas/fundos/estudio-bege.jpg', swatch: '#e7dccb' },
  { key: 'preto', nome: 'Preto', url: '/campanhas/fundos/estudio-preto.jpg', swatch: '#0a0a14' },
  { key: 'indigo', nome: 'Indigo', url: '/campanhas/fundos/estudio-indigo.jpg', swatch: '#4f46e5' },
] as const;

interface ProdutoOpt { id: string; nome: string; estado: string; preco_cents: number | null; }

interface FotoPronta { id: string; blob: Blob; url: string; }

const toCents = (v: string): number | null => {
  if (v.trim() === '') return null;
  const n = parseFloat(v.replace(',', '.'));
  return isNaN(n) ? null : Math.round(n * 100);
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
}

async function compositeOntoBackground(cutout: Blob, bgUrl: string): Promise<Blob> {
  const SIZE = 1600;
  const [cutoutImg, bgImg] = await Promise.all([
    loadImage(URL.createObjectURL(cutout)),
    loadImage(bgUrl),
  ]);
  const canvas = document.createElement('canvas');
  canvas.width = SIZE; canvas.height = SIZE;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bgImg, 0, 0, SIZE, SIZE);

  const maxDim = SIZE * 0.76;
  const scale = Math.min(maxDim / cutoutImg.width, maxDim / cutoutImg.height);
  const w = cutoutImg.width * scale, h = cutoutImg.height * scale;
  const x = (SIZE - w) / 2, y = (SIZE - h) / 2 + SIZE * 0.015;

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = SIZE * 0.025;
  ctx.shadowOffsetY = SIZE * 0.012;
  ctx.drawImage(cutoutImg, x, y, w, h);
  ctx.restore();

  return new Promise(res => canvas.toBlob(b => res(b!), 'image/jpeg', 0.92));
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(blob);
  });
}

export default function FotoProdutoStudio() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [rawUrl, setRawUrl] = useState<string | null>(null);
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [processando, setProcessando] = useState(false);
  const [progresso, setProgresso] = useState<string>('');
  const [cutoutBlob, setCutoutBlob] = useState<Blob | null>(null);
  const [cutoutUrl, setCutoutUrl] = useState<string | null>(null);
  const [fundoAtivo, setFundoAtivo] = useState<typeof FUNDOS[number]['key'] | null>(null);
  const [resultadoBlob, setResultadoBlob] = useState<Blob | null>(null);
  const [resultadoUrl, setResultadoUrl] = useState<string | null>(null);
  const [compondo, setCompondo] = useState(false);

  const [fotosProntas, setFotosProntas] = useState<FotoPronta[]>([]);

  const [produtos, setProdutos] = useState<ProdutoOpt[]>([]);
  const [modo, setModo] = useState<'existente' | 'novo'>('existente');
  const [produtoId, setProdutoId] = useState('');
  const [novoNome, setNovoNome] = useState('');
  const [novoPreco, setNovoPreco] = useState('');
  const [descricao, setDescricao] = useState('');
  const [tags, setTags] = useState('');

  const [guardando, setGuardando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucessoId, setSucessoId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('prod_loja_produtos')
        .select('id, nome, estado, preco_cents')
        .in('estado', ['ativo', 'rascunho'])
        .order('nome');
      setProdutos((data ?? []) as ProdutoOpt[]);
    })();
  }, []);

  function onFile(file: File | null) {
    if (!file) return;
    setRawFile(file);
    setRawUrl(URL.createObjectURL(file));
    setCutoutBlob(null); setCutoutUrl(null);
    setResultadoBlob(null); setResultadoUrl(null);
    setFundoAtivo(null);
    setErro('');
  }

  async function processarFundo() {
    if (!rawFile) return;
    setProcessando(true); setProgresso('A preparar…'); setErro('');
    try {
      const { removeBackground } = await import('@imgly/background-removal');
      const blob = await removeBackground(rawFile, {
        model: 'isnet_quint8',
        publicPath: `${window.location.origin}/models/bg-removal/`,
        output: { format: 'image/png' },
        progress: (key: string, current: number, total: number) => {
          setProgresso(`A processar (${key})… ${Math.round((current / Math.max(total, 1)) * 100)}%`);
        },
      });
      setCutoutBlob(blob);
      setCutoutUrl(URL.createObjectURL(blob));
    } catch (e: any) {
      setErro('Erro ao remover o fundo: ' + (e?.message ?? 'tenta novamente.'));
    } finally {
      setProcessando(false); setProgresso('');
    }
  }

  async function escolherFundo(key: typeof FUNDOS[number]['key']) {
    if (!cutoutBlob) return;
    setFundoAtivo(key);
    setCompondo(true); setErro('');
    try {
      const fundo = FUNDOS.find(f => f.key === key)!;
      const blob = await compositeOntoBackground(cutoutBlob, fundo.url);
      setResultadoBlob(blob);
      setResultadoUrl(URL.createObjectURL(blob));
    } catch {
      setErro('Erro ao aplicar o fundo.');
    } finally {
      setCompondo(false);
    }
  }

  function adicionarAosProntos() {
    if (!resultadoBlob || !resultadoUrl) return;
    setFotosProntas(prev => [...prev, { id: crypto.randomUUID(), blob: resultadoBlob, url: resultadoUrl }]);
    setRawFile(null); setRawUrl(null);
    setCutoutBlob(null); setCutoutUrl(null);
    setResultadoBlob(null); setResultadoUrl(null);
    setFundoAtivo(null);
  }

  function removerFotoPronta(id: string) {
    setFotosProntas(prev => prev.filter(f => f.id !== id));
  }

  async function guardar() {
    setErro('');
    if (fotosProntas.length === 0) { setErro('Adiciona pelo menos uma foto pronta.'); return; }
    if (modo === 'existente' && !produtoId) { setErro('Escolhe um produto.'); return; }
    if (modo === 'novo' && (!novoNome.trim() || toCents(novoPreco) == null)) { setErro('Preenche o nome e o preço do novo produto.'); return; }

    setGuardando(true);
    try {
      let id = produtoId;

      if (modo === 'novo') {
        const { data, error } = await supabase.from('prod_loja_produtos').insert({
          nome: novoNome.trim(),
          slug: slugify(novoNome),
          preco_cents: toCents(novoPreco) ?? 0,
          descricao: descricao.trim() || null,
          tags: tags.split(',').map(t => t.trim()).filter(Boolean),
          estado: 'rascunho',
        }).select('id').single();
        if (error || !data) throw new Error(error?.message ?? 'Erro ao criar produto.');
        id = data.id;
      } else if (descricao.trim() || tags.trim()) {
        const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (descricao.trim()) patch.descricao = descricao.trim();
        if (tags.trim()) patch.tags = tags.split(',').map(t => t.trim()).filter(Boolean);
        const { error } = await supabase.from('prod_loja_produtos').update(patch).eq('id', id);
        if (error) throw new Error(error.message);
      }

      const { count } = await supabase
        .from('prod_loja_imagens')
        .select('id', { count: 'exact', head: true })
        .eq('produto_id', id);
      let ordem = count ?? 0;

      for (const foto of fotosProntas) {
        const base64 = await blobToBase64(foto.blob);
        const resp = await fetch('/api/admin/loja/upload', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image_base64: base64, pasta: 'produtos' }),
        });
        const json = await resp.json();
        if (!resp.ok) throw new Error(json.error ?? 'Erro no upload.');
        await supabase.from('prod_loja_imagens').insert({ produto_id: id, url: json.url, ordem: ordem++ });
      }

      setSucessoId(id);
      setFotosProntas([]);
      setDescricao(''); setTags('');
      setNovoNome(''); setNovoPreco('');
      setProdutoId('');
    } catch (e: any) {
      setErro(e?.message ?? 'Erro ao guardar.');
    } finally {
      setGuardando(false);
    }
  }

  const btnBase = 'inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-all';

  const passoAtual = fotosProntas.length > 0 && !rawUrl ? 4 : cutoutUrl ? 3 : rawUrl ? 2 : 1;
  const PASSOS = [
    { n: 1, label: 'Foto' },
    { n: 2, label: 'Remover fundo' },
    { n: 3, label: 'Escolher fundo' },
    { n: 4, label: 'Guardar no produto' },
  ];

  return (
    <div className="bg-[#16162d] p-8 rounded-3xl border border-white/5 shadow-2xl mb-8">
      <h2 className="text-xl font-bold mb-1 flex items-center gap-3">
        <Wand2 className="text-indigo-400" /> Fotos para produto
      </h2>
      <p className="text-sm text-white/50 mb-5">Tira ou carrega uma foto do produto, remove o fundo automaticamente e aplica um dos fundos predefinidos. Depois anexa as fotos a um produto novo ou já existente.</p>

      <div className="flex items-center gap-1 mb-6 flex-wrap">
        {PASSOS.map((p, i) => (
          <div key={p.n} className="flex items-center gap-1">
            <div className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
              p.n === passoAtual ? 'bg-indigo-600 text-white' : p.n < passoAtual ? 'bg-indigo-600/20 text-indigo-300' : 'bg-white/5 text-white/35'
            }`}>
              <span className={`flex items-center justify-center w-4 h-4 rounded-full text-[10px] ${p.n <= passoAtual ? 'bg-white/20' : 'bg-white/10'}`}>{p.n < passoAtual ? '✓' : p.n}</span>
              {p.label}
            </div>
            {i < PASSOS.length - 1 && <div className="w-4 h-px bg-white/10" />}
          </div>
        ))}
      </div>

      {erro && <p className="text-red-400 text-sm mb-4">{erro}</p>}
      {sucessoId && (
        <div className="flex items-center justify-between gap-3 bg-green-600/15 border border-green-600/30 text-green-300 text-sm rounded-xl px-4 py-3 mb-6">
          <span className="flex items-center gap-2"><Check size={16} /> Fotos guardadas no produto.</span>
          <Link href={`/admin/loja/${sucessoId}`} className="underline font-bold">Abrir produto →</Link>
        </div>
      )}

      {/* Passo 1: escolher/tirar foto */}
      {!rawUrl && (
        <div className="flex flex-col items-center justify-center gap-4 border-2 border-dashed border-white/10 rounded-2xl py-12 px-6 mb-2 bg-black/10">
          <span className="text-4xl">📸</span>
          <p className="text-sm text-white/50 text-center max-w-xs">Começa por tirar uma foto ao produto, ou escolhe uma já existente da galeria.</p>
          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden"
            onChange={e => onFile(e.target.files?.[0] ?? null)} />
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
            onChange={e => onFile(e.target.files?.[0] ?? null)} />
          <div className="flex flex-wrap justify-center gap-3">
            <button type="button" onClick={() => cameraInputRef.current?.click()}
              className={`${btnBase} bg-indigo-600 hover:bg-indigo-500`}>
              <Camera size={18} /> Tirar foto
            </button>
            <button type="button" onClick={() => fileInputRef.current?.click()}
              className={`${btnBase} bg-white/5 hover:bg-white/10 text-white/80 border border-white/10`}>
              <ImagePlus size={18} /> Escolher da galeria
            </button>
          </div>
        </div>
      )}

      {/* Passo 2: preview + remover fundo */}
      {rawUrl && !cutoutUrl && (
        <div className="mb-2">
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            <img src={rawUrl} alt="" className="w-56 h-56 object-cover rounded-2xl border border-white/10" />
            <div className="flex flex-col gap-3">
              <p className="text-sm text-white/60 max-w-sm">
                {processando ? (progresso || 'A remover o fundo…') : 'Foto pronta. Remove o fundo para poderes escolher um dos fundos predefinidos.'}
              </p>
              <div className="flex gap-3">
                <button type="button" onClick={processarFundo} disabled={processando}
                  className={`${btnBase} bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50`}>
                  {processando ? <Loader2 size={18} className="animate-spin" /> : <Wand2 size={18} />}
                  {processando ? 'A processar…' : 'Remover fundo'}
                </button>
                <button type="button" onClick={() => { setRawFile(null); setRawUrl(null); }}
                  className={`${btnBase} bg-white/5 hover:bg-white/10 text-white/70 border border-white/10`}>
                  <X size={18} /> Cancelar
                </button>
              </div>
              {processando && <p className="text-xs text-white/40">A primeira vez descarrega o modelo de IA (pode demorar um pouco); as seguintes são rápidas.</p>}
            </div>
          </div>
        </div>
      )}

      {/* Passo 3: escolher fundo predefinido */}
      {cutoutUrl && (
        <div className="mb-2">
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            <div className="relative w-56 h-56 rounded-2xl overflow-hidden border border-white/10" style={{
              backgroundImage: `url(${FUNDOS.find(f => f.key === fundoAtivo)?.url ?? ''})`,
              backgroundSize: 'cover', backgroundColor: '#0a0a16',
            }}>
              <img src={resultadoUrl ?? cutoutUrl} alt="" className="absolute inset-0 w-full h-full object-contain p-3" />
              {compondo && <div className="absolute inset-0 flex items-center justify-center bg-black/40"><Loader2 className="animate-spin text-white" /></div>}
            </div>
            <div className="flex flex-col gap-3">
              <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Fundo</label>
              <div className="flex gap-2 flex-wrap max-w-xs">
                {FUNDOS.map(f => (
                  <button key={f.key} type="button" onClick={() => escolherFundo(f.key)} title={f.nome}
                    className={`w-10 h-10 rounded-full border-2 transition-all ${fundoAtivo === f.key ? 'border-indigo-400 scale-110' : 'border-white/20'}`}
                    style={{ background: f.swatch }} />
                ))}
              </div>
              <div className="flex gap-3 mt-1">
                <button type="button" onClick={adicionarAosProntos} disabled={!resultadoBlob}
                  className={`${btnBase} bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40`}>
                  <Check size={18} /> Usar esta foto
                </button>
                <button type="button" onClick={() => { setRawFile(null); setRawUrl(null); setCutoutBlob(null); setCutoutUrl(null); setResultadoBlob(null); setResultadoUrl(null); setFundoAtivo(null); }}
                  className={`${btnBase} bg-white/5 hover:bg-white/10 text-white/70 border border-white/10`}>
                  <X size={18} /> Descartar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fotos já prontas */}
      {fotosProntas.length > 0 && (
        <div className="mt-6 mb-6">
          <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block mb-3">Fotos prontas ({fotosProntas.length})</label>
          <div className="flex flex-wrap gap-3">
            {fotosProntas.map(f => (
              <div key={f.id} className="relative w-24 h-24">
                <img src={f.url} alt="" className="w-24 h-24 object-cover rounded-xl border border-white/10" />
                <button type="button" onClick={() => removerFotoPronta(f.id)}
                  className="absolute -top-2 -right-2 bg-red-600 rounded-full w-6 h-6 flex items-center justify-center text-xs">✕</button>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => { setRawFile(null); setRawUrl(null); }}
            className="mt-4 text-sm text-indigo-400 hover:text-indigo-300 underline">+ Adicionar mais uma foto</button>
        </div>
      )}

      {/* Destino: produto */}
      {fotosProntas.length > 0 && (
        <div className="border-t border-white/5 pt-6">
          <div className="flex gap-2 mb-5">
            <button type="button" onClick={() => setModo('existente')}
              className={`${btnBase} ${modo === 'existente' ? 'bg-indigo-600' : 'bg-white/5 text-white/60 border border-white/10'}`}>
              <Package size={16} /> Produto existente
            </button>
            <button type="button" onClick={() => setModo('novo')}
              className={`${btnBase} ${modo === 'novo' ? 'bg-indigo-600' : 'bg-white/5 text-white/60 border border-white/10'}`}>
              <PackagePlus size={16} /> Novo produto
            </button>
          </div>

          {modo === 'existente' ? (
            <div className="mb-5">
              <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Produto</label>
              <select value={produtoId} onChange={e => setProdutoId(e.target.value)}
                className="bg-[#0a0a16] border border-white/10 p-4 rounded-xl text-white outline-none focus:border-indigo-500 w-full mt-2">
                <option value="">— Escolhe um produto —</option>
                {produtos.map(p => (
                  <option key={p.id} value={p.id}>{p.nome} · {p.estado}{p.preco_cents != null ? ` · ${(p.preco_cents / 100).toFixed(2)} €` : ''}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
              <div>
                <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Nome</label>
                <input value={novoNome} onChange={e => setNovoNome(e.target.value)} placeholder="Ex: Pet-Tag Estrela"
                  className="bg-[#0a0a16] border border-white/10 p-4 rounded-xl text-white outline-none focus:border-indigo-500 w-full mt-2" />
              </div>
              <div>
                <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Preço (€)</label>
                <input value={novoPreco} onChange={e => setNovoPreco(e.target.value)} placeholder="6.90" inputMode="decimal"
                  className="bg-[#0a0a16] border border-white/10 p-4 rounded-xl text-white outline-none focus:border-indigo-500 w-full mt-2" />
              </div>
              <p className="md:col-span-2 text-xs text-white/40 -mt-2">O produto fica em rascunho — completa variantes, categoria e restantes detalhes em <Link href="/admin/loja" className="underline">Loja</Link> antes de o ativar.</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Descrição {modo === 'existente' && <span className="normal-case font-normal text-white/30">(deixa vazio para não alterar)</span>}</label>
              <textarea value={descricao} onChange={e => setDescricao(e.target.value)}
                className="bg-[#0a0a16] border border-white/10 p-4 rounded-xl text-white outline-none focus:border-indigo-500 w-full mt-2 h-24 resize-none" />
            </div>
            <div>
              <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Tags {modo === 'existente' && <span className="normal-case font-normal text-white/30">(deixa vazio para não alterar)</span>}</label>
              <input value={tags} onChange={e => setTags(e.target.value)} placeholder="pet-tags, natal, promo-agosto"
                className="bg-[#0a0a16] border border-white/10 p-4 rounded-xl text-white outline-none focus:border-indigo-500 w-full mt-2" />
            </div>
          </div>

          <button type="button" onClick={guardar} disabled={guardando}
            className={`w-full font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50`}>
            {guardando ? <><Loader2 size={18} className="animate-spin" /> A guardar…</> : <><Check size={18} /> Guardar no produto</>}
          </button>
        </div>
      )}
    </div>
  );
}
