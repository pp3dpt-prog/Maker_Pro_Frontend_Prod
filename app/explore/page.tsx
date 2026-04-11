type Design = {
  nome?: string;
  descricao?: string;
  parametros_default?: Record<string, unknown>;
  permite_venda_comercial?: boolean;
};

type Props = {
  design?: Design | null;
};

export default function DesignDetailView({ design }: Props) {
  // 1) Verificação de segurança inicial: se não houver design, mostra um loading
  // Isto evita que o código abaixo tente ler propriedades de algo que não existe
  if (!design) {
    return <div>Carregando design...</div>;
  }

  const parametros = design.parametros_default ?? null;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 20 }}>
      {/* 1. Área de Visualização */}
      <section style={{ padding: 16, border: '1px solid #e5e7eb', borderRadius: 10 }}>
        <h3 style={{ margin: 0 }}>Visualizador 3D</h3>
        <p style={{ marginTop: 8, marginBottom: 0 }}>Carregado</p>
      </section>

      {/* 2. Painel de Controlo */}
      <section style={{ marginTop: 16, padding: 16, border: '1px solid #e5e7eb', borderRadius: 10 }}>
        <h2 style={{ marginTop: 0 }}>
          {design.nome ?? 'Design sem nome'}
        </h2>

        <p style={{ marginTop: 8 }}>
          {design.descricao ?? 'Sem descrição disponível.'}
        </p>

        {/* Form de Parametrização */}
        <div style={{ marginTop: 16 }}>
          <h4 style={{ marginBottom: 8 }}>Parâmetros</h4>

          {parametros ? (
            <div style={{ display: 'grid', gap: 8 }}>
              {Object.entries(parametros).map(([key, value]) => (
                <div
                  key={key}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: 10,
                    border: '1px solid #f1f5f9',
                    borderRadius: 8,
                  }}
                >
                  <strong>{key}</strong>
                  <span style={{ opacity: 0.8 }}>
                    {value === null || value === undefined ? '' : String(value)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ opacity: 0.7 }}>Sem parâmetros disponíveis.</p>
          )}
        </div>

        {/* Área Comercial/Ação */}
        <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              border: '1px solid #0ea5e9',
              background: '#0ea5e9',
              color: 'white',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Gerar Ficheiro STL
          </button>

          {design.permite_venda_comercial ? (
            <button
              type="button"
              style={{
                padding: '10px 14px',
                borderRadius: 8,
                border: '1px solid #10b981',
                background: '#10b981',
                color: 'white',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Comprar Licença Comercial
            </button>
          ) : null}
        </div>
      </section>
    </div>
  );
}