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
    img.crossOrigin = 'anonymous';
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
}

const PEXELS_KEY_STORAGE = 'pp3d_pexels_key';
const ULTIMO_FUNDO_STORAGE = 'pp3d_ultimo_fundo';
const CANVAS_SIZE = 1600;

interface PexelsResult { id: number; thumb: string; full: string; }

// Desenha bgImg a cobrir size×size (crop centrado), tal como object-fit: cover.
function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, size: number) {
  const scale = Math.max(size / img.width, size / img.height);
  const w = img.width * scale, h = img.height * scale;
  ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
}

// Desenho síncrono (sem rede) — usado tanto na pré-visualização ao vivo como na exportação final.
function renderComposite(
  canvas: HTMLCanvasElement, bgImg: HTMLImageElement, cutoutImg: HTMLImageElement,
  scale: number, offX: number, offY: number,
) {
  const size = CANVAS_SIZE;
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, size, size);
  drawCover(ctx, bgImg, size);

  const maxDim = size * 0.76 * scale;
  const s = Math.min(maxDim / cutoutImg.width, maxDim / cutoutImg.height);
  const w = cutoutImg.width * s, h = cutoutImg.height * s;
  const x = (size - w) / 2 + offX, y = (size - h) / 2 + offY;

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = size * 0.025;
  ctx.shadowOffsetY = size * 0.012;
  ctx.drawImage(cutoutImg, x, y, w, h);
  ctx.restore();
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{ x: number; y: number; offX: number; offY: number } | null>(null);

  const [rawUrl, setRawUrl] = useState<string | null>(null);
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [processando, setProcessando] = useState(false);
  const [progresso, setProgresso] = useState<string>('');
  const [cutoutBlob, setCutoutBlob] = useState<Blob | null>(null);
  const [cutoutUrl, setCutoutUrl] = useState<string | null>(null);
  const [cutoutImgEl, setCutoutImgEl] = useState<HTMLImageElement | null>(null);
  const [fundoUrl, setFundoUrl] = useState<string | null>(null);
  const [fundoImgEl, setFundoImgEl] = useState<HTMLImageElement | null>(null);
  const [fundoCarregando, setFundoCarregando] = useState(false);
  const [scale, setScale] = useState(1);
  const [offX, setOffX] = useState(0);
  const [offY, setOffY] = useState(0);
  const [arrastando, setArrastando] = useState(false);

  const [pexelsKey, setPexelsKey] = useState('');
  const [pexelsKeyInput, setPexelsKeyInput] = useState('');
  const [pexelsQuery, setPexelsQuery] = useState('');
  const [pexelsResults, setPexelsResults] = useState<PexelsResult[]>([]);
  const [pexelsLoading, setPexelsLoading] = useState(false);
  const [pexelsErro, setPexelsErro] = useState('');

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
    const savedKey = localStorage.getItem(PEXELS_KEY_STORAGE) ?? '';
    setPexelsKey(savedKey);
    setPexelsKeyInput(savedKey);
  }, []);

  function guardarPexelsKey() {
    localStorage.setItem(PEXELS_KEY_STORAGE, pexelsKeyInput.trim());
    setPexelsKey(pexelsKeyInput.trim());
  }

  async function pesquisarPexels() {
    if (!pexelsKey || !pexelsQuery.trim()) return;
    setPexelsLoading(true); setPexelsErro(''); setPexelsResults([]);
    try {
      const resp = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(pexelsQuery.trim())}&per_page=12`, {
        headers: { Authorization: pexelsKey },
      });
      if (!resp.ok) throw new Error(resp.status === 401 ? 'Chave da API inválida.' : `Erro ${resp.status} ao pesquisar.`);
      const json = await resp.json();
      setPexelsResults((json.photos ?? []).map((p: any) => ({ id: p.id, thumb: p.src.medium, full: p.src.large2x ?? p.src.large })));
    } catch (e: any) {
      setPexelsErro(e?.message ?? 'Erro ao pesquisar no Pexels.');
    } finally {
      setPexelsLoading(false);
    }
  }

  function onFile(file: File | null) {
    if (!file) return;
    setRawFile(file);
    setRawUrl(URL.createObjectURL(file));
    setCutoutBlob(null); setCutoutUrl(null); setCutoutImgEl(null);
    setFundoUrl(null); setFundoImgEl(null);
    setScale(1); setOffX(0); setOffY(0);
    setErro('');
  }

  async function processarFundo() {
    if (!rawFile) return;
    setProcessando(true); setProgresso('A preparar…'); setErro('');

    // Diagnóstico temporário: regista todos os fetch() feitos durante o processo,
    // para identificar exatamente qual pedido falha (o erro da lib não diz o URL).
    const originalFetch = window.fetch;
    window.fetch = async (...args: Parameters<typeof fetch>) => {
      const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request)?.url ?? String(args[0]);
      try {
        const res = await originalFetch(...args);
        console.log('[bg-removal fetch]', res.status, url);
        return res;
      } catch (fetchErr) {
        console.error('[bg-removal fetch FAILED]', url, fetchErr);
        throw fetchErr;
      }
    };

    try {
      const { removeBackground } = await import('@imgly/background-removal');
      const blob = await removeBackground(rawFile, {
        model: 'isnet_quint8',
        publicPath: `${window.location.origin}/models/bg-removal/`,
        output: { format: 'image/png' },
        debug: true,
        progress: (key: string, current: number, total: number) => {
          setProgresso(`A processar (${key})… ${Math.round((current / Math.max(total, 1)) * 100)}%`);
        },
      });
      setCutoutBlob(blob);
      const url = URL.createObjectURL(blob);
      setCutoutUrl(url);
      const img = await loadImage(url);
      setCutoutImgEl(img);

      const ultimoFundo = localStorage.getItem(ULTIMO_FUNDO_STORAGE);
      if (ultimoFundo) escolherFundo(ultimoFundo);
    } catch (e: any) {
      console.error('[bg-removal ERROR]', e);
      setErro('Erro ao remover o fundo: ' + (e?.message ?? 'tenta novamente.'));
    } finally {
      window.fetch = originalFetch;
      setProcessando(false); setProgresso('');
    }
  }

  async function escolherFundo(url: string) {
    setFundoUrl(url);
    setFundoCarregando(true); setErro('');
    setScale(1); setOffX(0); setOffY(0);
    try {
      const img = await loadImage(url);
      setFundoImgEl(img);
      localStorage.setItem(ULTIMO_FUNDO_STORAGE, url);
    } catch {
      setFundoImgEl(null);
      setErro('Erro ao carregar este fundo. Se for uma foto do Pexels, tenta outra.');
    } finally {
      setFundoCarregando(false);
    }
  }

  // Redesenha o canvas (sem rede) sempre que a foto, o fundo, o zoom ou a posição mudam.
  useEffect(() => {
    if (!cutoutImgEl || !fundoImgEl || !canvasRef.current) return;
    renderComposite(canvasRef.current, fundoImgEl, cutoutImgEl, scale, offX, offY);
  }, [cutoutImgEl, fundoImgEl, scale, offX, offY]);

  function onDragStart(clientX: number, clientY: number) {
    if (!fundoImgEl) return;
    setArrastando(true);
    dragRef.current = { x: clientX, y: clientY, offX, offY };
  }
  function onDragMove(clientX: number, clientY: number) {
    if (!dragRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = CANVAS_SIZE / canvas.getBoundingClientRect().width;
    setOffX(dragRef.current.offX + (clientX - dragRef.current.x) * ratio);
    setOffY(dragRef.current.offY + (clientY - dragRef.current.y) * ratio);
  }
  function onDragEnd() {
    dragRef.current = null;
    setArrastando(false);
  }

  function adicionarAosProntos() {
    const canvas = canvasRef.current;
    if (!canvas || !fundoImgEl) return;
    canvas.toBlob(blob => {
      if (!blob) return;
      setFotosProntas(prev => [...prev, { id: crypto.randomUUID(), blob, url: URL.createObjectURL(blob) }]);
    }, 'image/jpeg', 0.92);
    setRawFile(null); setRawUrl(null);
    setCutoutBlob(null); setCutoutUrl(null); setCutoutImgEl(null);
    setFundoUrl(null); setFundoImgEl(null);
    setScale(1); setOffX(0); setOffY(0);
  }

  function removerFotoPronta(id: string) {
    setFotosProntas(prev => prev.filter(f => f.id !== id));
  }

  async function guardar() {
    setErro('');
    if (fotosProntas.length === 0) { setErro('Adiciona pelo menos uma foto pronta.'); return; }
    if (modo === 'existente' && !produtoId) { setErro('Escolhe um produto.'); return; }
    if (modo === 'novo' && !novoNome.trim()) { setErro('Preenche o nome do novo produto.'); return; }

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
            <div className="shrink-0">
              <div
                className="relative w-56 h-56 rounded-2xl overflow-hidden border border-white/10 bg-[#0a0a16] select-none"
                style={{ cursor: fundoImgEl ? (arrastando ? 'grabbing' : 'grab') : 'default', touchAction: 'none' }}
                onPointerDown={e => { (e.target as HTMLElement).setPointerCapture(e.pointerId); onDragStart(e.clientX, e.clientY); }}
                onPointerMove={e => arrastando && onDragMove(e.clientX, e.clientY)}
                onPointerUp={onDragEnd}
                onPointerCancel={onDragEnd}
              >
                {cutoutUrl && !fundoImgEl && (
                  <img src={cutoutUrl} alt="" className="absolute inset-0 w-full h-full object-contain p-6 pointer-events-none" />
                )}
                <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ display: fundoImgEl ? 'block' : 'none' }} />
                {fundoCarregando && <div className="absolute inset-0 flex items-center justify-center bg-black/40"><Loader2 className="animate-spin text-white" /></div>}
              </div>
              {fundoImgEl && (
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs text-white/40 shrink-0">Zoom</span>
                  <input type="range" min={0.5} max={2.5} step={0.05} value={scale}
                    onChange={e => setScale(parseFloat(e.target.value))}
                    className="w-full accent-indigo-500" />
                </div>
              )}
              {fundoImgEl && <p className="text-[11px] text-white/30 mt-1">Arrasta a foto para ajustar a posição.</p>}
            </div>
            <div className="flex flex-col gap-3 flex-1 min-w-0">
              <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Fundo</label>
              <div className="flex gap-2 flex-wrap max-w-xs">
                {FUNDOS.map(f => (
                  <button key={f.key} type="button" onClick={() => escolherFundo(f.url)} title={f.nome}
                    className={`w-10 h-10 rounded-full border-2 transition-all ${fundoUrl === f.url ? 'border-indigo-400 scale-110' : 'border-white/20'}`}
                    style={{ background: f.swatch }} />
                ))}
              </div>

              <div className="border-t border-white/5 pt-3 mt-1">
                <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Ou pesquisa uma foto grátis (Pexels)</label>
                {!pexelsKey ? (
                  <div className="flex gap-2 mt-2 max-w-sm">
                    <input value={pexelsKeyInput} onChange={e => setPexelsKeyInput(e.target.value)} placeholder="Chave da API do Pexels"
                      className="bg-[#0a0a16] border border-white/10 px-3 py-2 rounded-lg text-white text-sm outline-none focus:border-indigo-500 flex-1 min-w-0" />
                    <button type="button" onClick={guardarPexelsKey} disabled={!pexelsKeyInput.trim()}
                      className="px-3 py-2 rounded-lg text-sm font-bold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 shrink-0">Guardar</button>
                  </div>
                ) : (
                  <>
                    <div className="flex gap-2 mt-2 max-w-sm">
                      <input value={pexelsQuery} onChange={e => setPexelsQuery(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && pesquisarPexels()}
                        placeholder="Ex: mesa de madeira, estúdio…"
                        className="bg-[#0a0a16] border border-white/10 px-3 py-2 rounded-lg text-white text-sm outline-none focus:border-indigo-500 flex-1 min-w-0" />
                      <button type="button" onClick={pesquisarPexels} disabled={pexelsLoading || !pexelsQuery.trim()}
                        className="px-3 py-2 rounded-lg text-sm font-bold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 shrink-0">
                        {pexelsLoading ? <Loader2 size={16} className="animate-spin" /> : 'Pesquisar'}
                      </button>
                    </div>
                    {pexelsResults.length > 0 && (
                      <div className="flex gap-2 flex-wrap mt-3 max-w-md">
                        {pexelsResults.map(p => (
                          <button key={p.id} type="button" onClick={() => escolherFundo(p.full)} title="Usar como fundo"
                            className={`w-14 h-14 rounded-lg overflow-hidden border-2 transition-all ${fundoUrl === p.full ? 'border-indigo-400 scale-105' : 'border-white/10'}`}>
                            <img src={p.thumb} alt="" className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
                {pexelsErro && <p className="text-red-400 text-xs mt-2">{pexelsErro}</p>}
              </div>

              <div className="flex gap-3 mt-1">
                <button type="button" onClick={adicionarAosProntos} disabled={!fundoImgEl}
                  className={`${btnBase} bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40`}>
                  <Check size={18} /> Usar esta foto
                </button>
                <button type="button" onClick={() => { setRawFile(null); setRawUrl(null); setCutoutBlob(null); setCutoutUrl(null); setCutoutImgEl(null); setFundoUrl(null); setFundoImgEl(null); setScale(1); setOffX(0); setOffY(0); }}
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
                <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Preço (€) <span className="normal-case font-normal text-white/30">(opcional, dá para definir depois)</span></label>
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
