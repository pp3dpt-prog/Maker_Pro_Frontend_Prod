import { supabase } from '@/lib/supabase';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function CustomizadorPage({
  searchParams,
}: {
  searchParams: { id?: string };
}) {
  // 1. Verificar se o ID existe na URL
  const id = searchParams?.id;

  if (!id) {
    redirect('/produtos');
  }

  // 2. Procurar o produto (CORRIGIDO: 'produtoAtual' sem espaço)
  const { data: produtoAtual, error } = await supabase
    .from('prod_designs')
    .select('*')
    .eq('id', id)
    .single();

  // Se o ID não existir na base de dados, volta para o catálogo
  if (error || !produtoAtual) {
    redirect('/produtos');
  }

  // 3. Procurar modelos da mesma família
  const { data: modelosFamilia } = await supabase
    .from('prod_designs')
    .select('id, nome, familia')
    .eq('familia', produtoAtual.familia);

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#0f172a', color: 'white', fontFamily: 'Inter, sans-serif' }}>
      
      {/* BARRA LATERAL */}
      <div style={{ width: '350px', backgroundColor: '#1e293b', borderRight: '1px solid #334155', padding: '30px', display: 'flex', flexDirection: 'column', gap: '30px' }}>
        
        <header>
          <Link href="/produtos" style={{ color: '#3b82f6', textDecoration: 'none', fontSize: '12px', fontWeight: 'bold' }}>
            ← VOLTAR AO CATÁLOGO
          </Link>
          <h1 style={{ fontSize: '24px', fontWeight: '900', marginTop: '15px', textTransform: 'uppercase' }}>
            {produtoAtual.nome}
          </h1>
        </header>

        {/* SELETOR DE MODELOS */}
        <div>
          <label style={{ fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '15px', display: 'block' }}>
            Mudar Formato
          </label>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {modelosFamilia?.map((item) => (
              <Link
                key={item.id}
                href={`/customizador?id=${item.id}`}
                style={{
                  textDecoration: 'none',
                  backgroundColor: String(item.id) === String(id) ? '#2563eb' : '#0f172a',
                  border: String(item.id) === String(id) ? '1px solid #3b82f6' : '1px solid #334155',
                  borderRadius: '12px',
                  padding: '12px',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <span style={{ fontSize: '20px' }}>
                  {item.nome.toLowerCase().includes('osso') ? '🦴' : 
                   item.nome.toLowerCase().includes('coração') ? '❤️' : '✨'}
                </span>
                <span style={{ fontSize: '10px', fontWeight: 'bold', color: String(item.id) === String(id) ? 'white' : '#94a3b8' }}>
                  {item.nome.replace('Pet Tag - ', '')}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ÁREA 3D */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '100px', opacity: 0.1 }}>🧊</div>
          <p style={{ color: '#475569', fontWeight: 'bold' }}>{produtoAtual.nome.toUpperCase()}</p>
        </div>
      </div>

    </div>
  );
}