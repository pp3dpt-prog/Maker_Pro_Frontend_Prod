'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Ticket, Users, CreditCard, Activity, Plus } from 'lucide-react';
import CreateCouponForm from '@/components/admin/CreateCouponForm';





// 1. Definir o que é um Cupão para o TypeScript
interface Cupom {
  id: number;
  codigo: string;
  desconto_percent: number;
  usos_atuais: number;
  max_usos: number;
  ativo: boolean;
  created_at: string;
}


export default function AdminDashboard() {
  const [showModal, setShowModal] = useState(false);
  // 2. Tipar o useState para aceitar uma lista de Cupões
  const [cupons, setCupons] = useState<Cupom[]>([]);
  const [stats, setStats] = useState({ users: 0, tickets: 0 });
  const [loading, setLoading] = useState(true);
  

  const fetchData = async () => {
    setLoading(true);
    // Dentro da função fetchData ou useEffect
    const { data: perfil } = await supabase.from('perfis').select('role').single();
    console.log("O teu role atual é:", perfil?.role);
    // 3. Informar o Supabase que o retorno deve ser do tipo Cupom[]
    const { data: cuponsData } = await supabase
      .from('cupons')
      .select('*')
      .returns<Cupom[]>() 
      .order('created_at', { ascending: false });
    
    const { count: usersCount } = await supabase
      .from('perfis')
      .select('*', { count: 'exact', head: true });

    const { count: ticketsCount } = await supabase
      .from('tickets_suporte')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'aberto');

    setCupons(cuponsData || []);
    setStats({ users: usersCount || 0, tickets: ticketsCount || 0 });
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-[#0f0f1e] text-white p-8 relative">
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <CreateCouponForm 
            onSuccess={fetchData} 
            onClose={() => setShowModal(false)} 
          />
        </div>
      )}

      {/* Cabeçalho e Stats (Omitidos para brevidade, mantém os teus) */}
      
      <div className="bg-[#1a1a2e] rounded-2xl border border-indigo-500/10 overflow-hidden shadow-2xl mt-8">
        <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-[#16162d]">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Ticket className="text-indigo-400" /> Campanhas Ativas
          </h2>
          <button 
            onClick={() => setShowModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all"
          >
            <Plus size={18} /> Novo Cupão
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#0f0f1e] text-gray-500 text-[10px] uppercase tracking-widest">
              <tr>
                <th className="px-8 py-5">Código</th>
                <th className="px-8 py-5">Desconto</th>
                <th className="px-8 py-5">Usos</th>
                <th className="px-8 py-5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {cupons.map((cupom) => (
                <tr key={cupom.id} className="hover:bg-indigo-500/5 transition-colors">
                  <td className="px-8 py-5 font-mono text-indigo-400 font-bold">{cupom.codigo}</td>
                  <td className="px-8 py-5">{cupom.desconto_percent}%</td>
                  <td className="px-8 py-5">{cupom.usos_atuais} / {cupom.max_usos}</td>
                  <td className="px-8 py-5 text-right">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${
                      cupom.ativo ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                    }`}>
                      {cupom.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}