'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { s, slugify } from '@/app/admin/loja/_ui';

interface Categoria { id: string; nome: string; }
interface DesignOpt { id: string; nome: string; }

interface Variante {
  id?: string;          // presente = já existe na DB
  cor: string;          // cor base
  cor_secundaria: string; // só se duasCores
  tamanho: string;
  sku: string;
  stock: number;
  preco_cents: number | null;  // override (null = herda)
  ativo: boolean;
}

interface Imagem {
  id?: string;
  url: string;
  ordem: number;
}

const ESTADOS = ['rascunho', 'ativo', 'inativo'];

// euros (string) <-> cents
const toCents = (v: string): number | null => {
  if (v.trim() === '') return null;
  const n = parseFloat(v.replace(',', '.'));
  return isNaN(n) ? null : Math.round(n * 100);
};
const toEuros = (c: number | null | undefined): string => (c == null ? '' : (c / 100).toString());

export default function ProductEditor({ produtoId }: { produtoId?: string }) {
  const router = useRouter();
  const isEdit = !!produtoId;

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [designs, setDesigns] = useState<DesignOpt[]>([]);

  const [nome, setNome] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [descricao, setDescricao] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [preco, setPreco] = useState('');
  const [precoPromo, setPrecoPromo] = useState('');
  const [estado, setEstado] = useState('rascunho');
  const [designId, setDesignId] = useState('');
  const [permitePersonalizar, setPermitePersonalizar] = useState(false);
  const [duasCores, setDuasCores] = useState(false);
  const [portes, setPortes] = useState('');
  const [pesoGramas, setPesoGramas] = useState('');
  const [stockSimples, setStockSimples] = useState('0'); // usado se sem variantes

  const [variantes, setVariantes] = useState<Variante[]>([]);
  const [imagens, setImagens] = useState<Imagem[]>([]);
  const [removedVarIds, setRemovedVarIds] = useState<string[]>([]);
  const [removedImgIds, setRemovedImgIds] = useState<string[]>([]);

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [erro, setErro] = useState('');

  // Auto-slug enquanto não for editado à mão
  useEffect(() => { if (!slugTouched) setSlug(slugify(nome)); }, [nome, slugTouched]);

  // Carregar opções (categorias + designs)
  useEffect(() => {
    (async () => {
      const [{ data: cats }, { data: dsgs }] = await Promise.all([
        supabase.from('prod_loja_categorias').select('id, nome').order('ordem'),
        supabase.from('prod_designs').select('id, nome').order('nome'),
      ]);
      setCategorias((cats ?? []) as Categoria[]);
      setDesigns((dsgs ?? []) as DesignOpt[]);
    })();
  }, []);

  // Carregar produto existente
  const loadProduto = useCallback(async () => {
    if (!produtoId) return;
    setLoading(true);
    const { data: p, error } = await supabase
      .from('prod_loja_produtos')
      .select('*, prod_loja_variantes(*), prod_loja_imagens(*)')
      .eq('id', produtoId)
      .single();
    if (error || !p) { setErro(error?.message ?? 'Produto não encontrado.'); setLoading(false); return; }

    setNome(p.nome ?? ''); setSlug(p.slug ?? ''); setSlugTouched(true);
    setDescricao(p.descricao ?? '');
    setCategoriaId(p.categoria_id ?? '');
    setPreco(toEuros(p.preco_cents));
    setPrecoPromo(toEuros(p.preco_promo_cents));
    setEstado(p.estado ?? 'rascunho');
    setDesignId(p.design_id ?? '');
    setPermitePersonalizar(!!p.permite_personalizar);
    setDuasCores(!!p.duas_cores);
    setPortes(toEuros(p.portes_cents));
    setPesoGramas(p.peso_gramas != null ? String(p.peso_gramas) : '');
    setStockSimples(String(p.stock ?? 0));
    setVariantes(((p.prod_loja_variantes ?? []) as any[]).map(v => ({
      id: v.id, cor: v.cor ?? '', cor_secundaria: v.cor_secundaria ?? '', tamanho: v.tamanho ?? '', sku: v.sku ?? '',
      stock: v.stock ?? 0, preco_cents: v.preco_cents, ativo: v.ativo ?? true,
    })));
    setImagens(((p.prod_loja_imagens ?? []) as any[]).map(i => ({ id: i.id, url: i.url, ordem: i.ordem ?? 0 })).sort((a, b) => a.ordem - b.ordem));
    setLoading(false);
  }, [produtoId]);

  useEffect(() => { loadProduto(); }, [loadProduto]);

  // ── Variantes ──
  function addVariante() {
    setVariantes(prev => [...prev, { cor: '', cor_secundaria: '', tamanho: '', sku: '', stock: 0, preco_cents: null, ativo: true }]);
  }
  function updVariante(i: number, patch: Partial<Variante>) {
    setVariantes(prev => prev.map((v, idx) => idx === i ? { ...v, ...patch } : v));
  }
  function rmVariante(i: number) {
    setVariantes(prev => {
      const v = prev[i];
      if (v.id) setRemovedVarIds(r => [...r, v.id!]);
      return prev.filter((_, idx) => idx !== i);
    });
  }

  // ── Fotos ──
  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true); setErro('');
    for (const file of Array.from(files)) {
      try {
        const base64 = await new Promise<string>((res, rej) => {
          const r = new FileReader();
          r.onload = () => res(r.result as string);
          r.onerror = rej;
          r.readAsDataURL(file);
        });
        const resp = await fetch('/api/admin/loja/upload', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image_base64: base64 }),
        });
        const json = await resp.json();
        if (!resp.ok) throw new Error(json.error ?? 'Erro no upload');
        setImagens(prev => [...prev, { url: json.url, ordem: prev.length }]);
      } catch (e: any) {
        setErro('Foto: ' + (e.message ?? 'erro'));
      }
    }
    setUploading(false);
  }
  function rmImagem(i: number) {
    setImagens(prev => {
      const img = prev[i];
      if (img.id) setRemovedImgIds(r => [...r, img.id!]);
      return prev.filter((_, idx) => idx !== i).map((x, idx) => ({ ...x, ordem: idx }));
    });
  }
  function moveImagem(i: number, dir: -1 | 1) {
    setImagens(prev => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next.map((x, idx) => ({ ...x, ordem: idx }));
    });
  }

  // ── Guardar ──
  async function guardar() {
    if (!nome.trim()) { setErro('O nome é obrigatório.'); return; }
    if (toCents(preco) == null) { setErro('Preço inválido.'); return; }
    setSaving(true); setErro('');

    const payload = {
      nome: nome.trim(),
      slug: slug.trim() || slugify(nome),
      descricao: descricao.trim() || null,
      categoria_id: categoriaId || null,
      preco_cents: toCents(preco),
      preco_promo_cents: toCents(precoPromo),
      estado,
      design_id: designId || null,
      permite_personalizar: permitePersonalizar,
      duas_cores: duasCores,
      portes_cents: toCents(portes),
      peso_gramas: pesoGramas.trim() === '' ? null : parseInt(pesoGramas, 10),
      stock: variantes.length > 0 ? 0 : (parseInt(stockSimples, 10) || 0),
      updated_at: new Date().toISOString(),
    };

    let id = produtoId;
    if (isEdit) {
      const { error } = await supabase.from('prod_loja_produtos').update(payload).eq('id', produtoId);
      if (error) { setErro('Produto: ' + error.message); setSaving(false); return; }
    } else {
      const { data, error } = await supabase.from('prod_loja_produtos').insert(payload).select('id').single();
      if (error || !data) { setErro('Produto: ' + (error?.message ?? '')); setSaving(false); return; }
      id = data.id;
    }

    // Variantes: apagar removidas, update existentes, insert novas
    if (removedVarIds.length) await supabase.from('prod_loja_variantes').delete().in('id', removedVarIds);
    for (let i = 0; i < variantes.length; i++) {
      const v = variantes[i];
      const row = {
        produto_id: id, cor: v.cor || null, cor_secundaria: duasCores ? (v.cor_secundaria || null) : null,
        tamanho: v.tamanho || null, sku: v.sku || null,
        stock: v.stock || 0, preco_cents: v.preco_cents, ordem: i, ativo: v.ativo,
      };
      if (v.id) await supabase.from('prod_loja_variantes').update(row).eq('id', v.id);
      else await supabase.from('prod_loja_variantes').insert(row);
    }

    // Imagens: apagar removidas, update ordem das existentes, insert novas
    if (removedImgIds.length) await supabase.from('prod_loja_imagens').delete().in('id', removedImgIds);
    for (let i = 0; i < imagens.length; i++) {
      const img = imagens[i];
      if (img.id) await supabase.from('prod_loja_imagens').update({ ordem: i }).eq('id', img.id);
      else await supabase.from('prod_loja_imagens').insert({ produto_id: id, url: img.url, ordem: i });
    }

    setSaving(false);
    router.push('/admin/loja');
  }

  if (loading) return <div style={s.page}><div style={s.wrap}><p style={{ color: '#64748b' }}>A carregar…</p></div></div>;

  const fieldRow: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 };
  const gridCols = duasCores ? '1fr 1fr 1fr 1fr 70px 80px 36px' : '1fr 1fr 1fr 80px 90px 36px';

  return (
    <div style={s.page}>
      <div style={s.wrap}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h1 style={s.h1}>{isEdit ? 'Editar produto' : 'Novo produto'}</h1>
          <Link href="/admin/loja" style={s.btnGhost}>← Produtos</Link>
        </div>

        {erro && <p style={{ color: '#f87171', marginBottom: 16 }}>{erro}</p>}

        {/* Dados base */}
        <div style={{ ...s.card, marginBottom: 20 }}>
          <div style={fieldRow}>
            <div>
              <label style={s.label}>Nome *</label>
              <input style={s.input} value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Marcador de livros" />
            </div>
            <div>
              <label style={s.label}>Slug (URL)</label>
              <input style={s.input} value={slug} onChange={e => { setSlug(e.target.value); setSlugTouched(true); }} placeholder="marcador-de-livros" />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={s.label}>Descrição</label>
            <textarea style={{ ...s.input, minHeight: 90, resize: 'vertical' }} value={descricao} onChange={e => setDescricao(e.target.value)} />
          </div>

          <div style={fieldRow}>
            <div>
              <label style={s.label}>Categoria</label>
              <select style={s.input} value={categoriaId} onChange={e => setCategoriaId(e.target.value)}>
                <option value="">— Sem categoria —</option>
                {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div>
              <label style={s.label}>Estado</label>
              <select style={s.input} value={estado} onChange={e => setEstado(e.target.value)}>
                {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
          </div>

          <div style={fieldRow}>
            <div>
              <label style={s.label}>Preço (€) *</label>
              <input style={s.input} value={preco} onChange={e => setPreco(e.target.value)} placeholder="19.99" inputMode="decimal" />
            </div>
            <div>
              <label style={s.label}>Preço promo (€)</label>
              <input style={s.input} value={precoPromo} onChange={e => setPrecoPromo(e.target.value)} placeholder="vazio = sem promo" inputMode="decimal" />
            </div>
          </div>

          <div style={fieldRow}>
            <div>
              <label style={s.label}>Portes (€) — override</label>
              <input style={s.input} value={portes} onChange={e => setPortes(e.target.value)} placeholder="vazio = usa portes globais" inputMode="decimal" />
            </div>
            <div>
              <label style={s.label}>Peso (gramas)</label>
              <input style={s.input} value={pesoGramas} onChange={e => setPesoGramas(e.target.value)} placeholder="Ex: 50" inputMode="numeric" />
            </div>
          </div>
        </div>

        {/* Ligação ao personalizador */}
        <div style={{ ...s.card, marginBottom: 20 }}>
          <label style={{ ...s.label, marginBottom: 12 }}>Ligação ao personalizador</label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, cursor: 'pointer' }}>
            <input type="checkbox" checked={permitePersonalizar} onChange={e => setPermitePersonalizar(e.target.checked)} />
            <span style={{ fontSize: 14, color: '#cbd5e1' }}>Este produto pode ser personalizado (mostra botão para o customizador)</span>
          </label>
          {permitePersonalizar && (
            <div>
              <label style={s.label}>Design associado</label>
              <select style={s.input} value={designId} onChange={e => setDesignId(e.target.value)}>
                <option value="">— Escolhe um design —</option>
                {designs.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* Variantes */}
        <div style={{ ...s.card, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <label style={{ ...s.label, margin: 0 }}>Variantes{duasCores ? ' (cor base / cor secundária / tamanho)' : ' (cor / tamanho)'}</label>
            <button style={s.btnGhost} onClick={addVariante} type="button">+ Adicionar variante</button>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, cursor: 'pointer' }}>
            <input type="checkbox" checked={duasCores} onChange={e => setDuasCores(e.target.checked)} />
            <span style={{ fontSize: 14, color: '#cbd5e1' }}>A peça pode ter duas cores (cor base + cor secundária)</span>
          </label>

          {variantes.length === 0 ? (
            <div>
              <p style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>Sem variantes — usa o stock simples do produto:</p>
              <div style={{ maxWidth: 200 }}>
                <label style={s.label}>Stock</label>
                <input style={s.input} value={stockSimples} onChange={e => setStockSimples(e.target.value)} inputMode="numeric" />
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: 8, fontSize: 10, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '0 2px' }}>
                <span>{duasCores ? 'Cor base' : 'Cor'}</span>
                {duasCores && <span>Cor secundária</span>}
                <span>Tamanho</span><span>SKU</span><span>Stock</span><span>Preço €</span><span></span>
              </div>
              {variantes.map((v, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: gridCols, gap: 8, alignItems: 'center' }}>
                  <input style={s.input} value={v.cor} onChange={e => updVariante(i, { cor: e.target.value })} placeholder={duasCores ? 'Preto' : 'Preto'} />
                  {duasCores && <input style={s.input} value={v.cor_secundaria} onChange={e => updVariante(i, { cor_secundaria: e.target.value })} placeholder="Branco" />}
                  <input style={s.input} value={v.tamanho} onChange={e => updVariante(i, { tamanho: e.target.value })} placeholder="M" />
                  <input style={s.input} value={v.sku} onChange={e => updVariante(i, { sku: e.target.value })} placeholder="SKU" />
                  <input style={s.input} value={v.stock} onChange={e => updVariante(i, { stock: parseInt(e.target.value, 10) || 0 })} inputMode="numeric" />
                  <input style={s.input} value={toEuros(v.preco_cents)} onChange={e => updVariante(i, { preco_cents: toCents(e.target.value) })} placeholder="herda" inputMode="decimal" />
                  <button style={{ ...s.btnDanger, padding: '8px 0' }} onClick={() => rmVariante(i)} type="button" title="Remover">✕</button>
                </div>
              ))}
              <p style={{ fontSize: 12, color: '#475569', margin: '4px 0 0' }}>Com variantes, o stock é por variante. Preço vazio herda o preço base.</p>
            </div>
          )}
        </div>

        {/* Fotos */}
        <div style={{ ...s.card, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <label style={{ ...s.label, margin: 0 }}>Fotos</label>
            <label style={{ ...s.btnGhost, cursor: 'pointer' }}>
              {uploading ? 'A enviar…' : '+ Adicionar fotos'}
              <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => onFiles(e.target.files)} disabled={uploading} />
            </label>
          </div>
          {imagens.length === 0 ? (
            <p style={{ fontSize: 13, color: '#64748b' }}>Sem fotos. A primeira foto é a principal.</p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {imagens.map((img, i) => (
                <div key={img.id ?? img.url} style={{ position: 'relative', width: 120 }}>
                  <img src={img.url} alt="" style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 10, border: i === 0 ? '2px solid #3b82f6' : '1px solid #1e293b' }} />
                  {i === 0 && <span style={{ position: 'absolute', top: 6, left: 6, background: '#3b82f6', color: '#fff', fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 6 }}>PRINCIPAL</span>}
                  <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                    <button style={{ ...s.btnGhost, padding: '4px 8px', flex: 1 }} onClick={() => moveImagem(i, -1)} type="button" disabled={i === 0}>←</button>
                    <button style={{ ...s.btnGhost, padding: '4px 8px', flex: 1 }} onClick={() => moveImagem(i, 1)} type="button" disabled={i === imagens.length - 1}>→</button>
                    <button style={{ ...s.btnDanger, padding: '4px 8px' }} onClick={() => rmImagem(i)} type="button">✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button style={s.btn} onClick={guardar} disabled={saving || uploading}>
            {saving ? 'A guardar…' : isEdit ? 'Guardar alterações' : 'Criar produto'}
          </button>
          <Link href="/admin/loja" style={s.btnGhost}>Cancelar</Link>
        </div>
      </div>
    </div>
  );
}
