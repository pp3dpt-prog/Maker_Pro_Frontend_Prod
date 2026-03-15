'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase'; // Ajusta o path conforme o teu projeto
import DesignCard from '@/components/cards/DesignCard';
import { Search, Filter, LayoutGrid, Zap, Loader2 } from 'lucide-react';

export default function ExploreView() {
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDesigns() {
      setLoading(true);
      const { data, error } = await supabase
        .from('designs') // Nome da tabela que criámos no schema prod
        .select('*')
        .order('criado_em', { ascending: false });

      if (!error && data) setDesigns(data);
      setLoading(false);
    }

    fetchDesigns();
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-100 font-sans">
      
      {/* Barra de Stats (Azul) */}
      <div className="border-b border-gray-800 bg-[#0d0d0d]/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-2 flex justify-between items-center text-[10px] uppercase tracking-widest text-gray-500">
          <div className="flex gap-6">
            <span className="flex items-center gap-1.5"><Zap size={12} className="text-blue-500 fill-blue-500"/> {designs.length} Designs</span>
            <span className="flex items-center gap-1.5">👥 30 Users</span>
            <span className="flex items-center gap-1.5 text-blue-400">💎 Premium Active</span>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Hero Section */}
        <section className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-3">
            Explore <span className="text-blue-500">Designs</span>
          </h1>
          <p className="text-gray-400 text-sm max-w-xl mx-auto">
            Personaliza parâmetros e gera ficheiros STL em segundos com tecnologia OpenSCAD.
          </p>
        </section>

        {/* Search & Filter Bar */}
        <div className="flex flex-col md:flex-row gap-4 mb-10">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
            <input 
              type="text" 
              placeholder="Procurar modelos..." 
              className="w-full bg-[#121212] border border-gray-800 rounded-lg py-2.5 pl-10 pr-4 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all text-sm"
            />
          </div>
          <button className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors">
            Novo Design
          </button>
        </div>

        {/* Grid de Conteúdo */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <Loader2 className="animate-spin mb-4 text-blue-500" size={32} />
            <p>A carregar galeria...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {designs.length > 0 ? (
              designs.map((design) => (
                <DesignCard key={design.id} design={design} />
              ))
            ) : (
              // Empty State (Aparece se não houver nada na DB)
              <div className="col-span-full border-2 border-dashed border-gray-800 rounded-2xl p-12 text-center">
                <p className="text-gray-500">Ainda não existem designs disponíveis.</p>
                <p className="text-blue-500 text-sm mt-2 cursor-pointer hover:underline">Sê o primeiro a criar!</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}