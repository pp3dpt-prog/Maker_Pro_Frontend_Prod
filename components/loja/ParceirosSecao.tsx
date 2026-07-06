import type { Parceiro } from '@/lib/loja-server';

const pill: React.CSSProperties = {
  padding: '7px 14px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8,
  color: '#cbd5e1', fontSize: 13, fontWeight: 600, textDecoration: 'none', cursor: 'pointer',
};

const chip: React.CSSProperties = {
  display: 'inline-block', padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
  background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', color: '#93c5fd',
};

export default function ParceirosSecao({ parceiros }: { parceiros: Parceiro[] }) {
  if (parceiros.length === 0) return null;

  return (
    <div style={{ marginTop: 40, paddingTop: 32, borderTop: '1px solid #1e293b' }}>
      <h2 style={{ fontSize: 20, fontWeight: 800, color: '#f1f5f9', margin: '0 0 6px' }}>
        📍 Locais parceiros
      </h2>
      <p style={{ fontSize: 14, color: '#94a3b8', margin: '0 0 20px', lineHeight: 1.6 }}>
        Podes visitar estes parceiros para ver as peças ao vivo, personalizar e levantar/encomendar em pessoa.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        {parceiros.map(p => (
          <div key={p.id} style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 14, padding: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: '#f1f5f9', margin: '0 0 6px' }}>{p.nome}</h3>
            {p.descricao && <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6, margin: '0 0 12px' }}>{p.descricao}</p>}

            {(p.morada || p.cidade) && (
              <p style={{ fontSize: 13, color: '#cbd5e1', margin: '0 0 6px' }}>
                📌 {[p.morada, p.codigo_postal, p.cidade].filter(Boolean).join(', ')}
              </p>
            )}
            {p.horario_texto && (
              <p style={{ fontSize: 13, color: '#cbd5e1', margin: '0 0 12px', whiteSpace: 'pre-line' }}>
                🕒 {p.horario_texto}
              </p>
            )}

            {p.servicos.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '0 0 14px' }}>
                {p.servicos.map(s => (
                  <span key={s} style={chip}>{s}</span>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {p.telefone && <a href={`tel:${p.telefone}`} style={pill}>📞 {p.telefone}</a>}
              {p.email && <a href={`mailto:${p.email}`} style={pill}>✉️ Email</a>}
              {p.website_url && <a href={p.website_url} target="_blank" rel="noopener noreferrer" style={pill}>🌐 Website</a>}
              {p.facebook_url && <a href={p.facebook_url} target="_blank" rel="noopener noreferrer" style={pill}>Facebook</a>}
              {p.instagram_url && <a href={p.instagram_url} target="_blank" rel="noopener noreferrer" style={pill}>Instagram</a>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
