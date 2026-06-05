'use client';

import { useEffect, useState, useCallback } from 'react';

type Log = {
  id: string;
  created_at: string;
  level: 'info' | 'warn' | 'error';
  categoria: string;
  mensagem: string;
  contexto: Record<string, unknown> | null;
  user_email: string | null;
};

const LEVEL_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  info:  { bg: '#1e3a5f', color: '#93c5fd', label: 'INFO' },
  warn:  { bg: '#713f12', color: '#fde68a', label: 'WARN' },
  error: { bg: '#7f1d1d', color: '#fca5a5', label: 'ERRO' },
};

export default function LogsTab() {
  const [logs, setLogs]       = useState<Log[]>([]);
  const [dias, setDias]       = useState<string[]>([]);
  const [diaSel, setDiaSel]   = useState<string>(new Date().toISOString().slice(0, 10));
  const [levelSel, setLevelSel] = useState<string>('');
  const [catSel, setCatSel]   = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [expandido, setExpandido] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (diaSel) params.set('dia', diaSel);
    if (levelSel) params.set('level', levelSel);
    if (catSel) params.set('categoria', catSel);
    const res = await fetch(`/api/admin/logs?${params.toString()}`);
    const json = await res.json();
    setLogs(json.logs ?? []);
    if (json.dias?.length) setDias(json.dias);
    setLoading(false);
  }, [diaSel, levelSel, catSel]);

  useEffect(() => { carregar(); }, [carregar]);

  const selectStyle: React.CSSProperties = {
    background: '#0a1120', border: '1px solid #1e293b', borderRadius: 8,
    padding: '8px 12px', color: '#f1f5f9', fontSize: 13, fontFamily: 'inherit', cursor: 'pointer',
  };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>📋 Logs do sistema</h1>
        <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>
          Registos dos últimos 15 dias — eliminados automaticamente após esse período.
        </p>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div>
          <label style={{ display: 'block', fontSize: 11, color: '#64748b', marginBottom: 4 }}>Dia</label>
          <input type="date" value={diaSel} max={new Date().toISOString().slice(0, 10)}
            onChange={e => setDiaSel(e.target.value)} style={selectStyle} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 11, color: '#64748b', marginBottom: 4 }}>Nível</label>
          <select value={levelSel} onChange={e => setLevelSel(e.target.value)} style={selectStyle}>
            <option value="">Todos</option>
            <option value="info">Info</option>
            <option value="warn">Avisos</option>
            <option value="error">Erros</option>
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 11, color: '#64748b', marginBottom: 4 }}>Categoria</label>
          <select value={catSel} onChange={e => setCatSel(e.target.value)} style={selectStyle}>
            <option value="">Todas</option>
            <option value="seguranca">🛡️ Segurança</option>
            <option value="pagamento">Pagamentos</option>
            <option value="geracao">Geração STL</option>
            <option value="download">Downloads</option>
            <option value="suporte">Suporte</option>
            <option value="geral">Geral</option>
          </select>
        </div>
        <button onClick={carregar} style={{ ...selectStyle, alignSelf: 'flex-end', color: '#93c5fd', fontWeight: 600 }}>
          ↻ Actualizar
        </button>
        <span style={{ alignSelf: 'flex-end', fontSize: 12, color: '#475569', paddingBottom: 8 }}>
          {logs.length} registo{logs.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Lista */}
      {loading ? (
        <p style={{ color: '#64748b', fontSize: 14 }}>A carregar…</p>
      ) : logs.length === 0 ? (
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 14, padding: '40px 24px', textAlign: 'center', color: '#475569', fontStyle: 'italic' }}>
          Sem registos para este dia.
        </div>
      ) : (
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 14, overflow: 'hidden' }}>
          {logs.map((log, i) => {
            const st = LEVEL_STYLE[log.level] ?? LEVEL_STYLE.info;
            const temContexto = log.contexto && Object.keys(log.contexto).length > 0;
            return (
              <div key={log.id} style={{ borderBottom: i < logs.length - 1 ? '1px solid #1e293b' : 'none' }}>
                <div
                  onClick={() => temContexto && setExpandido(expandido === log.id ? null : log.id)}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px', cursor: temContexto ? 'pointer' : 'default' }}
                >
                  <span style={{ fontSize: 11, color: '#475569', fontFamily: 'monospace', whiteSpace: 'nowrap', paddingTop: 2 }}>
                    {new Date(log.created_at).toLocaleTimeString('pt-PT')}
                  </span>
                  <span style={{ flexShrink: 0, padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 800, background: st.bg, color: st.color }}>
                    {st.label}
                  </span>
                  <span style={{ flexShrink: 0, fontSize: 11, color: '#64748b', fontFamily: 'monospace' }}>
                    {log.categoria}
                  </span>
                  <span style={{ flex: 1, fontSize: 13, color: '#cbd5e1' }}>
                    {log.mensagem}
                    {log.user_email && <span style={{ color: '#475569' }}> · {log.user_email}</span>}
                  </span>
                  {temContexto && <span style={{ color: '#475569', fontSize: 12 }}>{expandido === log.id ? '▼' : '▶'}</span>}
                </div>
                {expandido === log.id && temContexto && (
                  <pre style={{ margin: 0, padding: '12px 16px 16px 60px', fontSize: 11, color: '#94a3b8', background: '#080c10', overflow: 'auto', fontFamily: 'monospace' }}>
                    {JSON.stringify(log.contexto, null, 2)}
                  </pre>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
