'use client';
import { Cpu, ShieldCheck, Mail, Lock, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#050508] flex items-center justify-center p-8 relative overflow-hidden text-white">
      {/* Luzes de Fundo Dramáticas */}
      <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-indigo-600/15 blur-[160px] rounded-full" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] bg-purple-600/15 blur-[160px] rounded-full" />

      <div className="w-full max-w-[550px] z-10">
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-[2rem] bg-indigo-600/20 border border-indigo-500/30 mb-8 shadow-[0_0_50px_rgba(79,70,229,0.2)]">
            <Cpu className="text-indigo-400" size={48} />
          </div>
          
          {/* Título Massivo (text-7xl) */}
          <h1 className="text-6xl md:text-7xl font-black tracking-tighter mb-4 leading-none bg-gradient-to-b from-white to-gray-500 bg-clip-text text-transparent">
            MAKER <span className="text-indigo-500">PRO</span>
          </h1>
          <p className="text-gray-400 text-2xl font-light tracking-wide">Onde a precisão encontra o design.</p>
        </div>

        <div className="bg-white/[0.02] backdrop-blur-3xl border border-white/10 p-12 rounded-[4rem] shadow-2xl">
          <form className="space-y-10">
            <div>
              {/* Labels muito mais legíveis */}
              <label className="text-lg font-bold uppercase tracking-[0.3em] text-indigo-400/90 ml-2 mb-4 block">
                Teu Email
              </label>
              <div className="relative">
                <Mail className="absolute left-6 top-7 text-gray-500" size={28} />
                <input 
                  type="email" 
                  placeholder="exemplo@maker.com"
                  className="w-full bg-black/60 border border-white/10 rounded-[2rem] p-7 pl-16 text-2xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-gray-800"
                />
              </div>
            </div>

            <div>
              <label className="text-lg font-bold uppercase tracking-[0.3em] text-indigo-400/90 ml-2 mb-4 block">
                Senha de Acesso
              </label>
              <div className="relative">
                <Lock className="absolute left-6 top-7 text-gray-500" size={28} />
                <input 
                  type="password" 
                  placeholder="••••••••"
                  className="w-full bg-black/60 border border-white/10 rounded-[2rem] p-7 pl-16 text-2xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-gray-800"
                />
              </div>
            </div>

            {/* Botão Gigante e Chamativo */}
            <button className="w-full bg-indigo-600 hover:bg-indigo-500 py-8 rounded-[2.5rem] text-3xl font-black shadow-2xl shadow-indigo-600/40 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-4 group">
              ENTRAR <ArrowRight className="group-hover:translate-x-2 transition-transform" size={32} />
            </button>
          </form>
        </div>

        <footer className="mt-14 text-center">
          <p className="text-gray-500 text-xl">
            Primeira vez aqui? <a href="#" className="text-indigo-400 font-black hover:text-indigo-300 transition-colors">Cria a tua conta</a>
          </p>
        </footer>
      </div>
    </div>
  );
}