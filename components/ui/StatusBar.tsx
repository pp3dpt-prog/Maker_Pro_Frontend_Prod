'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Users, UserCheck, Play, Download, Box } from 'lucide-react';

export default function StatusBar() {
  // 1. Estado inicial com labels e configurações
  const [stats, setStats] = useState([
    { label: 'Utilizadores', value: '...', icon: Users, table: 'prod_perfis' },
    { label: 'Membros Pro', value: '...', icon: UserCheck, table: 'prod_perfis', filter: { acesso_comercial_ativo: true } },
    { label: 'Aplicações', value: '...', icon: Box, table: 'prod_programas' },
  ]);

  useEffect(() => {
    async function fetchStatus() {
      try {
        const updatedStatus = await Promise.all(
          stats.map(async (stat) => {
            let query = supabase
              .from(stat.table)
              .select('*', { count: 'exact', head: true });

            if (stat.filter) {
              query = query.match(stat.filter);
            }

            const { count, error } = await query;

            if (error) {
              console.error(`Erro ao buscar ${stat.label}:`, error);
              return { ...stat, value: '0' };
            }

            return {
              ...stat,
              value: (count || 0).toLocaleString('pt-PT'),
            };
          })
        );
        
        // Só atualizamos se os valores mudarem para evitar re-renders desnecessários
        setStats(updatedStatus);
      } catch (err) {
        console.error("Erro geral na StatusBar:", err);
      }
    }

    fetchStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Array vazio para executar apenas uma vez ao montar

  return (
    <div className="border-b border-[#1e293b] bg-[#0f172a] -mt-2">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between overflow-x-auto gap-3 no-scrollbar">
        {stats.map((stat, idx) => (
          <div key={idx} className="flex items-center gap-3 min-w-max px-4">
            <stat.icon className="text-[#3b82f6]" size={16} />
            <div className="flex items-baseline gap-2">
              <span className="text-white font-bold text-sm tracking-tight">
                {stat.value}
              </span>
              <span className="text-[#64748b] text-[10px] uppercase tracking-widest font-medium">
                {stat.label}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}