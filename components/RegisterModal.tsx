"use client";
import { useState } from 'react';
import { Mail, Lock, User, Ticket, X } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

export default function RegisterModal({ isOpen, onClose, onSuccess }) {
  if (!isOpen) return null;

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', promoCode: '' });

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: { data: { full_name: formData.name, applied_promo: formData.promoCode } }
    });

    if (error) {
      alert(error.message);
    } else {
      alert("Conta criada! Verifica o teu email.");
      onSuccess(); // Função para libertar o download após o registo
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#16162d] w-full max-w-md rounded-2xl border border-indigo-500/20 p-8 relative shadow-2xl">
        <button onClick={onClose} className="absolute right-4 top-4 text-gray-400 hover:text-white">
          <X size={24} />
        </button>

        <h2 className="text-2xl font-bold text-white mb-2">Quase lá! 🚀</h2>
        <p className="text-gray-400 text-sm mb-6">Cria uma conta gratuita para descarregar o teu STL personalizado.</p>

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="relative">
            <User className="absolute left-3 top-3 text-gray-500" size={18} />
            <input 
              required type="text" placeholder="Teu Nome" 
              className="w-full bg-[#0f0f1e] border border-gray-800 rounded-xl py-3 pl-10 pr-4 text-white focus:border-indigo-500 outline-none"
              onChange={(e) => setFormData({...formData, name: e.target.value})}
            />
          </div>

          <div className="relative">
            <Mail className="absolute left-3 top-3 text-gray-500" size={18} />
            <input 
              required type="email" placeholder="teu@email.com" 
              className="w-full bg-[#0f0f1e] border border-gray-800 rounded-xl py-3 pl-10 pr-4 text-white focus:border-indigo-500 outline-none"
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-3 text-gray-500" size={18} />
            <input 
              required type="password" placeholder="Password" 
              className="w-full bg-[#0f0f1e] border border-gray-800 rounded-xl py-3 pl-10 pr-4 text-white focus:border-indigo-500 outline-none"
              onChange={(e) => setFormData({...formData, password: e.target.value})}
            />
          </div>

          <button 
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-indigo-500/20"
          >
            {loading ? "A criar conta..." : "Criar Conta e Baixar STL"}
          </button>
        </form>
      </div>
    </div>
  );
}