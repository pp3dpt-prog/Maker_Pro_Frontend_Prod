'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Ticket, Percent, Users, X } from 'lucide-react';

interface CreateCouponProps {
  onSuccess: () => void;
  onClose: () => void;
}

export default function CreateCouponForm({ onSuccess, onClose }: CreateCouponProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    codigo: '',
    desconto: 10,
    limite: 100
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase
      .from('cupons')
      .insert([{ 
        codigo: formData.codigo.toUpperCase(), 
        desconto_percent: formData.desconto,
        max_usos: formData.limite,
        ativo: true 
      }]);

    if (!error) {
      alert("Campanha criada!");
      onSuccess(); //
      onClose();   //
    } else {
      alert("Erro: " + error.message);
    }
    setLoading(false);
  };

  return (
    <div className="bg-[#1a1a2e] p-6 rounded-2xl border border-indigo-500/20 w-full max-w-md shadow-2xl text-white">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <Ticket className="text-indigo-400" /> Novo Cupão
        </h3>
        <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
          <X size={20}/>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2 font-bold">Código</label>
          <input 
            required
            type="text" 
            placeholder="EX: MAKER20"
            className="w-full bg-[#0f0f1e] border border-gray-800 rounded-xl p-3 outline-none focus:border-indigo-500 transition-all uppercase text-white"
            onChange={(e) => setFormData({...formData, codigo: e.target.value})}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2 font-bold">Desconto (%)</label>
            <input 
              type="number" 
              value={formData.desconto}
              className="w-full bg-[#0f0f1e] border border-gray-800 rounded-xl p-3 outline-none focus:border-indigo-500 text-white"
              onChange={(e) => setFormData({...formData, desconto: parseInt(e.target.value)})}
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2 font-bold">Limite</label>
            <input 
              type="number" 
              value={formData.limite}
              className="w-full bg-[#0f0f1e] border border-gray-800 rounded-xl p-3 outline-none focus:border-indigo-500 text-white"
              onChange={(e) => setFormData({...formData, limite: parseInt(e.target.value)})}
            />
          </div>
        </div>

        <button 
          disabled={loading}
          type="submit"
          className="w-full bg-indigo-600 hover:bg-indigo-700 py-4 rounded-xl font-bold transition-all shadow-lg shadow-indigo-600/20 mt-4 disabled:opacity-50"
        >
          {loading ? "A processar..." : "Ativar Campanha"}
        </button>
      </form>
    </div>
  );
}