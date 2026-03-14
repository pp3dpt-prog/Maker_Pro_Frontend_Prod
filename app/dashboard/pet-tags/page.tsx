'use client';
import { useState } from 'react';

export default function PetTagsPage() {
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');

  const handleGerar = async () => {
    // Aqui ligaremos ao teu Backend seguro mais tarde
    console.log("Gerando STL para:", { nome, telefone });
  };

  return (
    <div className="flex h-full gap-6 text-white">
      {/* Esquerda: Visualização (Placeholder) */}
      <div className="flex-1 bg-[#1a1a2e] rounded-xl border border-indigo-500/10 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
        <div className="text-center z-10">
           <div className="w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl absolute -top-10 -left-10"></div>
           <p className="text-gray-500 italic">Preview 3D em tempo real em breve...</p>
        </div>
      </div>

      {/* Direita: Configurações (Estilo a imagem que enviaste) */}
      <div className="w-80 bg-[#1a1a2e] p-6 rounded-xl border border-indigo-500/10 space-y-6">
        <h2 className="text-xl font-bold border-b border-gray-800 pb-4 text-indigo-400">Object Settings</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Texto da Tag (Nome)</label>
            <input 
              type="text" 
              className="w-full bg-[#0f0f1e] border border-gray-700 p-2 rounded outline-none focus:border-indigo-500"
              placeholder="Ex: Bobi"
              onChange={(e) => setNome(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Telefone de Contato</label>
            <input 
              type="text" 
              className="w-full bg-[#0f0f1e] border border-gray-700 p-2 rounded outline-none focus:border-indigo-500"
              placeholder="Ex: 912345678"
              onChange={(e) => setTelefone(e.target.value)}
            />
          </div>
        </div>

        <button 
          onClick={handleGerar}
          className="w-full bg-indigo-600 hover:bg-indigo-700 p-3 rounded-lg font-bold shadow-[0_0_15px_rgba(79,70,229,0.4)] transition-all"
        >
          Gerar STL Grátis
        </button>
      </div>
    </div>
  );
}