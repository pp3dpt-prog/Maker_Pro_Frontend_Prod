import { supabase } from '@/lib/supabase';
import Link from 'next/link';

function FamilyCard({ familia, produtos }: { familia: string, produtos: any[] }) {
  // Escolhemos o primeiro produto da família como porta de entrada
  const principal = produtos[0];
  
  return (
    <Link href={`/customizador?familia=${familia}`} style={{ textDecoration: 'none' }}>
      <div style={{
        backgroundColor: '#1e293b', // AZUL MAIS CLARO E VIBRANTE
        border: '1px solid #334155', // BORDA DEFINIDA
        borderRadius: '24px',
        overflow: 'hidden',
        width: '280px',
        margin: '12px',
        transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        display: 'inline-block',
        verticalAlign: 'top',
        textAlign: 'left',
        boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
        cursor: 'pointer'
      }}>
        {/* Preview com Gradiente Azul Real */}
        <div style={{
          height: '180px',
          background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          borderBottom: '1px solid #334155',
          position: 'relative'
        }}>
          {/* Efeito de brilho no ícone */}
          <div style={{
            fontSize: '44px',
            filter: 'drop-shadow(0 0 15px rgba(59, 130, 246, 0.6))',
            marginBottom: '8px'
          }}>✨</div>
          
          <span style={{ 
            fontSize: '11px', 
            letterSpacing: '3px', 
            color: '#60a5fa', 
            fontWeight: '900',
            textTransform: 'uppercase'
          }}>Coleção Premium</span>
          
          <div style={{
            position: 'absolute',
            top: '15px',
            right: '15px',
            backgroundColor: '#0f172a',
            padding: '4px 10px',
            borderRadius: '20px',
            fontSize: '10px',
            color: '#94a3b8',
            border: '1px solid #1e293b'
          }}>
            {produtos.length} Opções
          </div>
        </div>

        {/* Info com contraste elevado */}
        <div style={{ padding: '24px' }}>
          <h3 style={{ 
            color: '#f8fafc', 
            fontSize: '20px', 
            fontWeight: '900', 
            margin: '0 0 10px 0', 
            textTransform: 'uppercase',
            letterSpacing: '-0.5px'
          }}>
            {familia.replace('-', ' ')}
          </h3>
          <p style={{ 
            color: '#94a3b8', 
            fontSize: '13px', 
            lineHeight: '1.6', 
            margin: '0 0 24px 0',
            fontWeight: '500'
          }}>
            Modelos de {familia.toLowerCase()} configuráveis em tempo real.
          </p>
          
          <div style={{ 
            color: 'white', 
            backgroundColor: '#2563eb', // AZUL VIVO
            padding: '12px', 
            borderRadius: '12px', 
            textAlign: 'center', 
            fontSize: '12px', 
            fontWeight: '800',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'
          }}>
            PERSONALIZAR →
          </div>
        </div>
      </div>
    </Link>
  );
}

export default async function Catalogo() {
  const { data: produtos } = await supabase.from('prod_designs').select('*');

  const familias = produtos?.reduce((acc: any, obj: any) => {
    const key = obj.familia || 'Geral';
    if (!acc[key]) acc[key] = [];
    acc[key].push(obj);
    return acc;
  }, {});

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#0f172a', // FUNDO AZUL MARINHO MAIS CLARO E SATURADO
      color: 'white', 
      padding: '80px 20px', 
      fontFamily: 'Inter, system-ui, sans-serif' 
    }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        
        <header style={{ marginBottom: '80px', textAlign: 'center' }}>
          <div style={{ 
            display: 'inline-block', 
            backgroundColor: 'rgba(59, 130, 246, 0.1)', 
            color: '#3b82f6', 
            padding: '4px 12px', 
            borderRadius: '20px', 
            fontSize: '11px', 
            fontWeight: 'bold',
            marginBottom: '16px',
            textTransform: 'uppercase',
            letterSpacing: '2px'
          }}>
            Configurador 3D
          </div>
          <h1 style={{ 
            fontSize: '42px', 
            fontWeight: '950', 
            margin: '0', 
            letterSpacing: '-2px', 
            color: '#f8fafc',
            textTransform: 'uppercase'
          }}>
            MakerPro <span style={{ color: '#3b82f6' }}>Catalog</span>
          </h1>
          <p style={{ color: '#64748b', fontSize: '16px', marginTop: '10px', fontWeight: '500' }}>
            Selecione a família de produtos para iniciar a configuração.
          </p>
        </header>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'center' }}>
          {Object.keys(familias || {}).map((nome) => (
            <FamilyCard key={nome} familia={nome} produtos={familias[nome]} />
          ))}
        </div>

      </div>
    </div>
  );
}