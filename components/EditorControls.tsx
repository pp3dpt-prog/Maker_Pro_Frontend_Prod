'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function EditorControls({ produto, perfil, onUpdate, onGerarSucesso, stlUrl, modelos, familiaURL }: any) {
  const [loading, setLoading] = useState(false);
  const [localValores, setLocalValores] = useState<any>(null);

  useEffect(() => {
    if (produto) {
      const iniciais: any = {
        xPos: produto.default_x_nome ?? 0,
        yPos: produto.default_y_nome ?? 0,
        fontSize: produto.default_size_nome ?? 7,
        nome_pet: "NOME", // Este é o valor que o 3D lê
        xPosN: produto.default_x_num ?? 0,
        yPosN: produto.default_y_num ?? 0,
        fontSizeN: produto.default_size_num ?? 5,
        telefone: "123 456 789",
        fonte: produto.default_fonte || 'OpenSans',
        forma: produto.id?.includes('coracao') ? 'coracao' : 'normal',
        ...(produto.parametros_default || {}),
      };

      if (produto.ui_schema) {
        produto.ui_schema.forEach((c: any) => {
          // Garante que se o schema pedir "nome_pet", ele usa o valor inicial correto
          if (c.name && iniciais[c.name] === undefined) {
            iniciais[c.name] = c.value ?? c.default;
          }
        });
      }

      setLocalValores(iniciais);
      onUpdate(iniciais);
    }
  }, [produto?.id]);

  const handleChange = (k: string, v: any) => {
    const novos = { ...localValores, [k]: v };
    // Sincronização forçada: se o input mudar o campo do schema, atualiza a variável do 3D
    if (k === 'nome_pet' || k === 'nome') novos.nome_pet = v;
    if (k === 'telefone' || k === 'contacto') novos.telefone = v;
    
    setLocalValores(novos);
    onUpdate(novos);
  };

  if (!localValores) return null;

  const seccoes = Array.from(new Set(
    produto.ui_schema?.filter((c: any) => c.section && c.type !== 'hidden').map((c: any) => c.section)
  ));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ background: '#1e293b', padding: '15px', borderRadius: '12px', border: '1px solid #334155' }}>
        <label style={{ fontSize: '10px', color: '#3b82f6', fontWeight: 'bold', display: 'block', marginBottom: '12px' }}>FORMA DO DESIGN</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {modelos?.map((item: any) => (
            <Link key={item.id} href={`/customizador?familia=${familiaURL}&id=${item.id}`}
              style={{
                textDecoration: 'none', backgroundColor: item.id === produto?.id ? '#2563eb' : '#0f172a',
                padding: '12px', borderRadius: '8px', textAlign: 'center', fontSize: '10px', color: 'white', border: '1px solid #334155', fontWeight: 'bold'
              }}>
              {item.nome.toUpperCase()}
            </Link>
          ))}
        </div>
      </div>

      {seccoes.map((seccao: any) => (
        <div key={seccao} style={{ background: '#1e293b', padding: '15px', borderRadius: '12px', border: '1px solid #334155' }}>
          <label style={{ fontSize: '10px', color: '#3b82f6', fontWeight: 'bold', display: 'block', marginBottom: '12px' }}>{seccao.toUpperCase()}</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {produto.ui_schema.filter((c: any) => c.section === seccao && c.type !== 'hidden').map((c: any) => (
              <div key={c.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '9px', color: '#94a3b8' }}>{c.label?.toUpperCase()}</label>
                  {c.type === 'slider' && <span style={{ fontSize: '9px', color: '#3b82f6' }}>{localValores[c.name]}mm</span>}
                </div>
                {c.type === 'select' ? (
                  <select value={localValores[c.name]} onChange={(e) => handleChange(c.name, e.target.value)}
                    style={{ width: '100%', padding: '10px', background: '#0f172a', color: 'white', borderRadius: '8px', border: '1px solid #475569', marginTop: '5px' }}>
                    {c.options?.map((o: any) => <option key={o.value || o} value={o.value || o}>{o.label || o}</option>)}
                  </select>
                ) : c.type === 'slider' ? (
                  <input type="range" min={c.min} max={c.max} step={0.1} value={localValores[c.name]} 
                    onChange={(e) => handleChange(c.name, parseFloat(e.target.value))} style={{ width: '100%', marginTop: '8px' }} />
                ) : (
                  <input type="text" value={localValores[c.name]} onChange={(e) => handleChange(c.name, e.target.value)}
                    style={{ width: '100%', padding: '10px', background: '#0f172a', color: 'white', borderRadius: '8px', border: '1px solid #475569', marginTop: '5px' }} />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      <div style={{ background: '#0f172a', padding: '20px', borderRadius: '15px', border: '1px solid #1e293b' }}>
        <button onClick={() => onGerarSucesso(null)} style={{ width: '100%', padding: '15px', background: 'transparent', border: '1px solid #3b82f6', color: '#3b82f6', borderRadius: '10px', fontWeight: 'bold' }}>
          ATUALIZAR PREVIEW 3D
        </button>
      </div>
    </div>
  );
}