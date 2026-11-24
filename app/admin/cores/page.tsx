'use client';

// Cores: paleta global de filamentos + cores disponíveis/por omissão em cada produto.
import { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { s } from '../loja/_ui';

interface Cor { id: string; nome: string; hex: string; ativo: boolean; ordem: number; }
interface ParamCor { nome: string; label: string; default: string; paleta: string[]; }
interface DesignCores {
  id: string; nome: string; familia: string | null; estado: string | null;
  params: ParamCor[];
  cores_config: Record<string, { default?: string; permitidas?: string[] }> | null;
}
type Config = Record<string, { default?: string; permitidas?: string[] }>;

const up = (h: string) => (h ?? '').toUpperCase();

function Amostra({ hex, size = 22, sel, apagada, onClick, title }: { hex: string; size?: number; sel?: boolean; apagada?: boolean; onClick?: () => void; title?: string }) {
  return (
    <button type="button" onClick={onClick} title={title} aria-label={title} aria-pressed={sel}
      style={{
        width: size, height: size, borderRadius: '50%', padding: 0, background: hex, cursor: onClick ? 'pointer' : 'default',
        border: sel ? '2px solid #60a5fa' : '1px solid #334155', opacity: apagada ? 0.25 : 1,
        boxShadow: sel ? '0 0 0 2px rgba(96,165,250,0.35)' : 'none', flexShrink: 0,
      }} />
  );
}

export default function CoresAdminPage() {
  const [cores, setCores] = useState<Cor[]>([]);
  const [coresLivres, setCoresLivres] = useState(true);
  const [designs, setDesigns] = useState<DesignCores[]>([]);
  const [erro, setErro] = useState('');
  const [nova, setNova] = useState({ nome: '', hex: '#000000' });

  const [designId, setDesignId] = useState('');
  const [config, setConfig] = useState<Config>({});
  const [msg, setMsg] = useState('');
  const [aGuardar, setAGuardar] = useState(false);
  const [busca, setBusca] = useState('');

  const carregarCores = useCallback(async () => {
    const [{ data, error }, { data: cfg }] = await Promise.all([
      supabase.from('prod_cores').select('*').order('ordem'),
      supabase.from('prod_loja_config').select('cores_livres').eq('id', 1).maybeSingle(),
    ]);
    if (error) setErro(error.message);
    setCores((data ?? []) as Cor[]);
    setCoresLivres(cfg?.cores_livres ?? true);
  }, []);

  const carregarDesigns = useCallback(async () => {
    const res = await fetch('/api/admin/cores-config');
    if (res.ok) setDesigns(await res.json());
    else setErro('Não foi possível carregar os produtos.');
  }, []);

  useEffect(() => { carregarCores(); carregarDesigns(); }, [carregarCores, carregarDesigns]);

  const ativas = cores.filter(c => c.ativo);
  const nomeDe = (hex: string) => cores.find(c => up(c.hex) === up(hex))?.nome ?? hex;
  const design = designs.find(d => d.id === designId) ?? null;

  useEffect(() => { setConfig(design?.cores_config ?? {}); setMsg(''); }, [designId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Paleta global ──
  async function atualizarCor(c: Cor, mud: Partial<Cor>) {
    setCores(prev => prev.map(x => x.id === c.id ? { ...x, ...mud } : x));
    const { error } = await supabase.from('prod_cores').update(mud).eq('id', c.id);
    if (error) { setErro(error.message); carregarCores(); }
  }
  async function adicionarCor() {
    if (!nova.nome.trim()) { setErro('Dá um nome à cor.'); return; }
    setErro('');
    const { error } = await supabase.from('prod_cores').insert({ nome: nova.nome.trim(), hex: up(nova.hex), ordem: (cores.at(-1)?.ordem ?? 0) + 1 });
    if (error) { setErro(error.message.includes('duplicate') ? 'Essa cor já existe.' : error.message); return; }
    setNova({ nome: '', hex: '#000000' });
    carregarCores();
  }
  async function apagarCor(c: Cor) {
    if (!confirm(`Apagar a cor ${c.nome}? Para a esconder temporariamente (ex.: sem filamento), desativa-a.`)) return;
    const { error } = await supabase.from('prod_cores').delete().eq('id', c.id);
    if (error) { setErro(error.message); return; }
    setCores(prev => prev.filter(x => x.id !== c.id));
  }
  async function mover(c: Cor, dir: -1 | 1) {
    const i = cores.findIndex(x => x.id === c.id);
    const j = i + dir;
    if (j < 0 || j >= cores.length) return;
    const outra = cores[j];
    await Promise.all([
      supabase.from('prod_cores').update({ ordem: outra.ordem }).eq('id', c.id),
      supabase.from('prod_cores').update({ ordem: c.ordem }).eq('id', outra.id),
    ]);
    carregarCores();
  }
  async function mudarLivres(v: boolean) {
    setCoresLivres(v);
    const { error } = await supabase.from('prod_loja_config').update({ cores_livres: v }).eq('id', 1);
    if (error) { setErro(error.message); setCoresLivres(!v); }
  }

  // ── Por produto ──
  function permitidas(p: ParamCor): Set<string> {
    const c = config[p.nome]?.permitidas;
    if (c?.length) return new Set(c.map(up));
    // sem configuração: a paleta própria do design (ou todas as ativas)
    return new Set((p.paleta.length ? p.paleta : ativas.map(x => x.hex)).map(up));
  }
  function alternarCor(p: ParamCor, hex: string) {
    const set = permitidas(p);
    if (set.has(up(hex))) set.delete(up(hex)); else set.add(up(hex));
    setConfig(prev => ({ ...prev, [p.nome]: { ...prev[p.nome], permitidas: ativas.map(c => up(c.hex)).filter(h => set.has(h)) } }));
  }
  function todas(p: ParamCor, sim: boolean) {
    setConfig(prev => ({ ...prev, [p.nome]: { ...prev[p.nome], permitidas: sim ? ativas.map(c => up(c.hex)) : [] } }));
  }
  function copiarParaTodas(p: ParamCor) {
    if (!design) return;
    const perm = [...permitidas(p)];
    setConfig(prev => {
      const n = { ...prev };
      for (const q of design.params) n[q.nome] = { ...n[q.nome], permitidas: perm };
      return n;
    });
  }

  async function guardar(paraFamilia: boolean) {
    if (!design) return;
    const ids = paraFamilia && design.familia ? designs.filter(d => d.familia === design.familia).map(d => d.id) : [design.id];
    if (paraFamilia && !confirm(`Aplicar estas cores aos ${ids.length} produtos da família "${design.familia}"?`)) return;
    setAGuardar(true); setMsg('');
    const res = await fetch('/api/admin/cores-config', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids, config }) });
    setAGuardar(false);
    if (!res.ok) { setMsg('Erro ao guardar.'); return; }
    setMsg(paraFamilia ? `Guardado em ${ids.length} produtos.` : 'Guardado.');
    carregarDesigns();
  }
  async function repor() {
    if (!design || !confirm('Voltar às cores originais deste produto?')) return;
    await fetch('/api/admin/cores-config', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [design.id], config: null }) });
    setConfig({}); setMsg('Reposto.'); carregarDesigns();
  }

  const familias = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const m = new Map<string, DesignCores[]>();
    for (const d of designs) {
      if (q && !d.nome.toLowerCase().includes(q) && !(d.familia ?? '').toLowerCase().includes(q)) continue;
      const k = d.familia ?? 'outros';
      m.set(k, [...(m.get(k) ?? []), d]);
    }
    return [...m.entries()];
  }, [designs, busca]);

  return (
    <main style={s.page}>
      <div style={s.wrap}>
        <Link href="/admin" style={{ ...s.btnGhost, marginBottom: 20 }}>← Admin</Link>
        <h1 style={s.h1}>Cores</h1>
        <p style={s.sub}>As cores de filamento que tens, e que cores cada produto oferece ao cliente.</p>
        {erro && <p style={{ color: '#f87171', fontSize: 13 }}>{erro}</p>}

        {/* ── Paleta global ── */}
        <div style={{ ...s.card, marginBottom: 24 }}>
          <h2 style={{ margin: '0 0 6px', fontSize: 17 }}>Paleta de filamentos</h2>
          <p style={{ margin: '0 0 16px', fontSize: 13, color: '#8a96aa' }}>
            Desativa uma cor quando acabar o filamento — desaparece de todos os produtos até a voltares a ativar.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 8 }}>
            {cores.map((c, i) => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: '#0a1120', border: '1px solid #1e293b', borderRadius: 10, opacity: c.ativo ? 1 : 0.5 }}>
                <input type="color" value={c.hex} aria-label={`Cor ${c.nome}`} onChange={e => atualizarCor(c, { hex: up(e.target.value) })}
                  style={{ width: 30, height: 28, padding: 0, border: '1px solid #334155', borderRadius: 6, background: 'transparent', cursor: 'pointer' }} />
                <input defaultValue={c.nome} onBlur={e => e.target.value.trim() && e.target.value !== c.nome && atualizarCor(c, { nome: e.target.value.trim() })}
                  style={{ ...s.input, padding: '6px 8px', fontSize: 13 }} aria-label="Nome" />
                <span style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace' }}>{c.hex}</span>
                <label title="Ativa" style={{ display: 'flex' }}><input type="checkbox" checked={c.ativo} onChange={e => atualizarCor(c, { ativo: e.target.checked })} /></label>
                <button onClick={() => mover(c, -1)} disabled={i === 0} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }} aria-label="Subir">▲</button>
                <button onClick={() => mover(c, 1)} disabled={i === cores.length - 1} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }} aria-label="Descer">▼</button>
                <button onClick={() => apagarCor(c)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer' }} aria-label="Apagar">✕</button>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14, alignItems: 'center', flexWrap: 'wrap' }}>
            <input type="color" value={nova.hex} onChange={e => setNova({ ...nova, hex: e.target.value })} aria-label="Nova cor"
              style={{ width: 38, height: 36, padding: 0, border: '1px solid #334155', borderRadius: 6, background: 'transparent', cursor: 'pointer' }} />
            <input placeholder="Nome (ex.: Verde menta)" value={nova.nome} onChange={e => setNova({ ...nova, nome: e.target.value })} style={{ ...s.input, width: 240 }} />
            <button style={s.btn} onClick={adicionarCor}>+ Adicionar cor</button>
          </div>
          <label style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 18, fontSize: 14, color: '#cbd5e1' }}>
            <input type="checkbox" checked={coresLivres} onChange={e => mudarLivres(e.target.checked)} />
            Deixar o cliente escolher qualquer cor (seletor livre). Desliga para só mostrar as cores da paleta.
          </label>
        </div>

        {/* ── Por produto ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '280px minmax(0,1fr)', gap: 20, alignItems: 'start' }}>
          <div style={{ ...s.card, padding: 14, maxHeight: '75vh', overflowY: 'auto' }}>
            <input placeholder="Procurar produto…" value={busca} onChange={e => setBusca(e.target.value)} style={{ ...s.input, marginBottom: 10 }} />
            {familias.map(([fam, ds]) => (
              <div key={fam} style={{ marginBottom: 10 }}>
                <div style={{ ...s.label, marginBottom: 4 }}>{fam}</div>
                {ds.map(d => (
                  <button key={d.id} onClick={() => setDesignId(d.id)}
                    style={{ display: 'flex', justifyContent: 'space-between', width: '100%', textAlign: 'left', padding: '6px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13,
                      background: d.id === designId ? '#1e293b' : 'transparent', color: d.id === designId ? '#93c5fd' : '#cbd5e1' }}>
                    <span>{d.nome}</span>
                    {d.cores_config && <span title="Cores configuradas" style={{ color: '#34d399' }}>●</span>}
                  </button>
                ))}
              </div>
            ))}
          </div>

          <div style={s.card}>
            {!design ? (
              <p style={{ color: '#8a96aa', margin: 0 }}>Escolhe um produto à esquerda para definir as cores que o cliente pode escolher em cada parte da peça.</p>
            ) : (
              <>
                <h2 style={{ margin: '0 0 4px', fontSize: 17 }}>{design.nome}</h2>
                <p style={{ margin: '0 0 18px', fontSize: 13, color: '#8a96aa' }}>{design.familia} · {design.params.length} parte(s) com cor</p>

                {design.params.map(p => {
                  const perm = permitidas(p);
                  const omissao = up(config[p.nome]?.default ?? p.default);
                  return (
                    <div key={p.nome} style={{ padding: '14px 0', borderTop: '1px solid #1e293b' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 10, flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: 14 }}>{p.label}</strong>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button style={{ ...s.btnGhost, padding: '4px 10px', fontSize: 11 }} onClick={() => todas(p, true)}>Todas</button>
                          <button style={{ ...s.btnGhost, padding: '4px 10px', fontSize: 11 }} onClick={() => todas(p, false)}>Nenhuma</button>
                          {design.params.length > 1 && <button style={{ ...s.btnGhost, padding: '4px 10px', fontSize: 11 }} onClick={() => copiarParaTodas(p)}>Copiar para todas as partes</button>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                        {ativas.map(c => (
                          <Amostra key={c.id} hex={c.hex} title={`${c.nome}${perm.has(up(c.hex)) ? ' (disponível)' : ''}`}
                            sel={perm.has(up(c.hex))} apagada={!perm.has(up(c.hex))} onClick={() => alternarCor(p, c.hex)} />
                        ))}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 12, color: '#8a96aa' }}>Cor inicial:</span>
                        {omissao && /^#[0-9A-F]{6}$/.test(omissao) && <Amostra hex={omissao} size={18} />}
                        <select value={config[p.nome]?.default ?? ''} style={{ ...s.input, width: 220, padding: '6px 10px', fontSize: 13 }}
                          onChange={e => setConfig(prev => ({ ...prev, [p.nome]: { ...prev[p.nome], default: e.target.value || undefined } }))}>
                          <option value="">Original ({p.default ? nomeDe(p.default) : 'automática'})</option>
                          {ativas.filter(c => perm.has(up(c.hex))).map(c => <option key={c.id} value={up(c.hex)}>{c.nome}</option>)}
                        </select>
                      </div>
                    </div>
                  );
                })}

                <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                  <button style={s.btn} disabled={aGuardar} onClick={() => guardar(false)}>Guardar</button>
                  {design.familia && <button style={s.btnGhost} disabled={aGuardar} onClick={() => guardar(true)}>Guardar para toda a família ({designs.filter(d => d.familia === design.familia).length})</button>}
                  {design.cores_config && <button style={s.btnDanger} onClick={repor}>Repor originais</button>}
                  {msg && <span style={{ fontSize: 13, color: '#34d399' }}>{msg}</span>}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
