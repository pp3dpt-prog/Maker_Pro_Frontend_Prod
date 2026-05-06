'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import DesignCard from '@/components/cards/DesignCard';

type Design = {
  id: string;
  nome: string;
  descricao: string;
  familia: string;
  preco_creditos: number;
  tags?: string[];
  thumbnail_url?: string;
};

export default function FamilyPage() {
  const searchParams = useSearchParams();
  const familyName = searchParams.get('name') || 'Desconhecida';
  
  const [designs, setDesigns] = useState<Design[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFamilyDesigns() {
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('prod_designs')
        .select('id, nome, descricao, familia, preco_creditos, tags, thumbnail_url')
        .eq('familia', familyName);

      if (error) {
        console.error('Erro ao buscar designs da família:', error);
      } else {
        setDesigns(data || []);
      }
      setLoading(false);
    }

    fetchFamilyDesigns();
  }, [familyName]);

  // Cores por família
  const familyColors: Record<string, { gradient: string; accent: string }> = {
    'Pet Tags': {
      gradient: 'from-pink-900 via-rose-800 to-pink-900',
      accent: 'from-pink-400 to-rose-500',
    },
    'Caixas': {
      gradient: 'from-amber-900 via-yellow-800 to-amber-900',
      accent: 'from-amber-400 to-yellow-500',
    },
    'Peças Mecânicas': {
      gradient: 'from-slate-900 via-gray-800 to-slate-900',
      accent: 'from-slate-400 to-gray-500',
    },
    'Hueforge / Artístico': {
      gradient: 'from-purple-900 via-indigo-800 to-purple-900',
      accent: 'from-purple-400 to-indigo-500',
    },
    'Vasos': {
      gradient: 'from-green-900 via-emerald-800 to-green-900',
      accent: 'from-green-400 to-emerald-500',
    },
    'geral': {
      gradient: 'from-blue-900 via-slate-800 to-blue-900',
      accent: 'from-blue-400 to-slate-500',
    },
  };

  const colors = familyColors[familyName] || familyColors['geral'];

  return (
    <main className="bg-slate-950 min-h-screen">
      <div style={{ padding: '40px' }}>
        {/* Breadcrumb e Cabeçalho */}
        <div className="mb-12">
          <Link 
            href="/produtos"
            className="text-blue-400 hover:text-blue-300 transition-colors text-sm mb-4 inline-flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Voltar ao Catálogo
          </Link>

          <div className={`bg-gradient-to-r ${colors.gradient} rounded-xl p-8 border border-slate-700/50`}>
            <h1 className="text-4xl font-bold text-white mb-2">
              {familyName}
            </h1>
            <p className="text-slate-300">
              {loading ? 'Carregando...' : `${designs.length} modelo${designs.length !== 1 ? 's' : ''} disponível${designs.length !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>

        {/* Conteúdo */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-slate-400">Carregando designs...</p>
          </div>
        ) : designs.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-slate-400">Nenhum design encontrado nesta família.</p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 24,
          }}>
            {designs.map(design => (
              <Link
                key={design.id}
                href={{
                  pathname: '/customizador',
                  query: { id: design.id },
                }}
                style={{ textDecoration: 'none' }}
              >
                <DesignCard design={design} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
