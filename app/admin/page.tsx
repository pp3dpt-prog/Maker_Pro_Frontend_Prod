'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Ticket, Users, Megaphone, LayoutDashboard, Tag, Plus, MessageCircle, Twitter, X 
} from 'lucide-react';
import CreateCouponForm from '@/components/admin/CreateCouponForm';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';

// --- INTERFACES ---
interface Cupom { id: number; codigo: string; desconto_percent: number; usos_atuais: number; max_usos: number; ativo: boolean; }
interface TicketSuporte { id: string; assunto: string; user_email: string; status: 'aberto' | 'fechado'; prioridade: 'baixa' | 'media' | 'alta'; created_at: string; }
interface Campanha { id: string; titulo: string; tipo: string; cliques: number; vistas: number; ativa: boolean; created_at: string; }

const chartData = [
  { name: 'Seg', users: 40, cliques: 240 },
  { name: 'Ter', users: 30, cliques: 139 },
  { name: 'Qua', users: 65, cliques: 980 },
  { name: 'Qui', users: 45, cliques: 390 },
  { name: 'Sex', users: 90, cliques: 480 },
  { name: 'Sáb', users: 70, cliques: 380 },
  { name: 'Dom', users: 110, cliques: 430 },
];

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'stats' | 'cupons' | 'tickets' | 'campanhas'>('stats');
  const [showModal, setShowModal] = useState(false);
  const [cupons, setCupons] = useState<Cupom[]>([]);
  const [tickets, setTickets] = useState<TicketSuporte[]>([]);
  const [campanhas, setCampanhas] = useState<Campanha[]>([]);
  const [stats, setStats] = useState({ users: 0, tickets: 0 });
  const [loading, setLoading] = useState(true);

  const handleCriar = async () => {
  console.log("Iniciando gravação...");
  
  // Aqui podes adicionar a lógica do Supabase depois
  alert("A função handleCriar foi chamada com sucesso!");
  
  // Exemplo de insert (ajusta os nomes das variáveis se necessário)
  /*
  const { error } = await supabase
    .from('prod_campanhas')
    .insert([{ titulo: 'Teste', ativa: true }]);
  */
};

  // --- CARREGAMENTO DE DADOS ---
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: cData } = await supabase.from('cupons').select('*').order('created_at', { ascending: false });
      const { data: tData } = await supabase.from('prod_tickets_suporte').select('*').order('created_at', { ascending: false });
      const { data: cpData } = await supabase.from('prod_campanhas').select('*').order('created_at', { ascending: false });

      const { count: uCount } = await supabase.from('prod_perfis').select('*', { count: 'exact', head: true });
      const { count: tOpenCount } = await supabase.from('prod_tickets_suporte').select('*', { count: 'exact', head: true }).eq('status', 'aberto');

      setCupons(cData || []);
      setTickets(tData || []);
      setCampanhas(cpData || []);
      setStats({ users: uCount || 0, tickets: tOpenCount || 0 });
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- FUNÇÕES DE AÇÃO ---
  const shareCampaign = (plataforma: 'wa' | 'tw', camp: Campanha) => {
    const url = encodeURIComponent(`https://oteusite.com/promo/${camp.id}`);
    const texto = encodeURIComponent(`🔥 Nova Campanha: ${camp.titulo}! `);
    const links = {
      wa: `https://api.whatsapp.com/send?text=${texto}${url}`,
      tw: `https://twitter.com/intent/tweet?text=${texto}&url=${url}`
    };
    window.open(links[plataforma], '_blank');
  };

  const deleteCoupon = async (id: number) => {
    if (!confirm("Eliminar este cupão?")) return;
    await supabase.from('cupons').delete().eq('id', id);
    fetchData();
  };

  const toggleTicketStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'aberto' ? 'fechado' : 'aberto';
    await supabase.from('prod_tickets_suporte').update({ status: newStatus }).eq('id', id);
    fetchData();
  };

  return (
    <div className="min-h-screen bg-[#0f0f1e] text-white flex font-sans">
      {/* SIDEBAR */}
      <aside className="w-64 bg-[#16162d] border-r border-white/5 p-6 flex flex-col gap-8 flex-shrink-0">
        <div className="text-indigo-500 font-black text-2xl italic tracking-tighter">ADMIN</div>
        <nav className="flex flex-col gap-2">
          <MenuButton active={activeTab === 'stats'} onClick={() => setActiveTab('stats')} icon={<LayoutDashboard size={20}/>} label="Geral" />
          <MenuButton active={activeTab === 'cupons'} onClick={() => setActiveTab('cupons')} icon={<Tag size={20}/>} label="Cupões" />
          <MenuButton active={activeTab === 'tickets'} onClick={() => setActiveTab('tickets')} icon={<Ticket size={20}/>} label="Tickets" />
          <MenuButton active={activeTab === 'campanhas'} onClick={() => setActiveTab('campanhas')} icon={<Megaphone size={20}/>} label="Campanhas" />
        </nav>
      </aside>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-10 space-y-10">
          
          {showModal && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
              <div className="relative bg-[#16162d] p-2 rounded-3xl border border-white/10 w-full max-w-md shadow-2xl">
                <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"><X size={20}/></button>
                <CreateCouponForm onSuccess={() => { fetchData(); setShowModal(false); }} onClose={() => setShowModal(false)} />
              </div>
            </div>
          )}

          {/* ECRÃ GERAL (STATS) */}
          {activeTab === 'stats' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <StatCard title="Utilizadores" value={loading ? '...' : stats.users} icon={<Users className="text-blue-400" />} />
              <StatCard title="Tickets Abertos" value={loading ? '...' : stats.tickets} icon={<Ticket className="text-amber-400" />} />
              <StatCard title="Campanhas Ativas" value={campanhas.filter(c => c.ativa).length} icon={<Megaphone className="text-indigo-400" />} />
            </div>
          )}

          {/* GESTÃO DE CUPÕES */}
          {activeTab === 'cupons' && (
            <div className="bg-[#16162d] rounded-3xl border border-white/5 overflow-hidden shadow-2xl animate-in fade-in duration-500">
              <div className="p-8 border-b border-white/5 flex justify-between items-center">
                <h2 className="text-xl font-bold flex items-center gap-2"><Tag className="text-indigo-400" /> Gestão de Cupões</h2>
                <button onClick={() => setShowModal(true)} className="bg-indigo-600 hover:bg-indigo-700 px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-indigo-500/20"><Plus size={16} /> Novo Cupão</button>
              </div>
              <table className="w-full text-left border-collapse">
                <thead className="bg-black/20 text-indigo-300 text-[10px] uppercase font-black tracking-widest">
                  <tr><th className="p-5">Código</th><th className="p-5">Desconto</th><th className="p-5">Usos</th><th className="p-5 text-right">Ações</th></tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {cupons.map((c) => (
                    <tr key={c.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-5 font-mono text-indigo-400 font-bold">{c.codigo}</td>
                      <td className="p-5 font-bold">{c.desconto_percent}%</td>
                      <td className="p-5 text-gray-400 text-sm">{c.usos_atuais} / {c.max_usos}</td>
                      <td className="p-5 text-right"><button onClick={() => deleteCoupon(c.id)} className="text-gray-500 hover:text-red-500 font-bold text-xs uppercase">Eliminar</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* GESTÃO DE CAMPANHAS (O Gráfico está aqui!) */}
          {activeTab === 'campanhas' && (
            <div className="space-y-10 animate-in fade-in duration-500">
              {/* 1. Formulário */}
              <div className="bg-[#16162d] p-8 rounded-3xl border border-white/5 shadow-2xl">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-3">Criar Nova Campanha</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Título</label>
                    <input type="text" placeholder="Ex: Promoção Flash" className="bg-white border border-white/10 p-4 rounded-xl text-white placeholder-gray-600 focus:border-indigo-500 outline-none transition-all w-full" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Canal</label>
                    <select className="bg-white border border-white/10 p-4 rounded-xl text-white focus:border-indigo-500 outline-none">
                      <option className="bg-white">Feed da App</option>
                      <option className="bg-white">Banner Principal</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-2 md:col-span-2">
                    <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Conteúdo da Mensagem</label>
                    <textarea placeholder="Escreve aqui..." className="bg-white border border-white/10 p-4 rounded-xl text-white h-32 resize-none focus:border-indigo-500 outline-none transition-all"></textarea>
                  </div>
                 <button 
                  type="button" // IMPORTANTE: evita o refresh automático
                  onClick={() => {
                    console.log("TESTE: O botão funciona!");
                    handleCriar();
                  }}
                  className="..."
                >
                  Confirmar e Publicar
                </button>
                </div>
              </div>

              {/* 2. Gráfico */}
              <div className="bg-[#16162d] p-8 rounded-3xl border border-white/5 shadow-xl">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="font-bold text-white text-lg tracking-tight">Impacto de Performance</h3>
                  <div className="flex gap-4 text-[10px] font-black uppercase tracking-widest text-gray-500">
                    <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-indigo-500"></span> Cliques</span>
                    <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-green-500"></span> Novos Users</span>
                  </div>
                </div>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                      <XAxis dataKey="name" stroke="#4b5563" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#4b5563" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#16162d', border: '1px solid #ffffff10', borderRadius: '12px' }} />
                      <Area type="monotone" dataKey="cliques" stroke="#6366f1" fill="url(#grad)" strokeWidth={3} />
                      <Area type="monotone" dataKey="users" stroke="#10b981" fill="transparent" strokeWidth={2} strokeDasharray="5 5" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 3. Tabela */}
              <div className="bg-[#16162d] rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-black/20 text-indigo-300 text-[10px] font-black uppercase tracking-widest">
                    <tr><th className="p-5">Campanha</th><th className="p-5 text-center">Interações</th><th className="p-5 text-center">Ações</th><th className="p-5 text-center">Status</th></tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {campanhas.map((camp) => (
                      <tr key={camp.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-5"><div className="font-bold text-gray-200">{camp.titulo}</div><div className="text-[9px] text-gray-500 uppercase">{camp.tipo}</div></td>
                        <td className="p-5 text-center font-mono text-indigo-400 font-bold">{camp.cliques} <span className="text-[10px] text-gray-600 block">cliques</span></td>
                        <td className="p-5"><div className="flex justify-center gap-4 text-gray-500"><button onClick={() => shareCampaign('wa', camp)} className="hover:text-green-500 transition-colors"><MessageCircle size={18}/></button><button onClick={() => shareCampaign('tw', camp)} className="hover:text-blue-400 transition-colors"><Twitter size={18}/></button></div></td>
                        <td className="p-5 text-center"><span className={`h-2.5 w-2.5 rounded-full inline-block ${camp.ativa ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-red-500'}`}></span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TICKETS DE SUPORTE */}
          {activeTab === 'tickets' && (
            <div className="space-y-4 animate-in fade-in duration-500">
              <h2 className="text-xl font-bold mb-6">Suporte ao Cliente</h2>
              {tickets.length > 0 ? tickets.map((t) => (
                <div key={t.id} className="bg-[#16162d] p-6 rounded-3xl border border-white/5 flex justify-between items-center group hover:border-indigo-500/20 transition-all shadow-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${t.prioridade === 'alta' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>{t.prioridade}</span>
                      <span className="text-[10px] text-gray-500 font-mono tracking-tighter">{new Date(t.created_at).toLocaleString()}</span>
                    </div>
                    <h4 className="font-bold text-lg text-gray-100">{t.assunto}</h4>
                    <p className="text-xs text-gray-400">{t.user_email}</p>
                  </div>
                  <button onClick={() => toggleTicketStatus(t.id, t.status)} className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${t.status === 'aberto' ? 'bg-amber-500 text-black hover:bg-amber-400 shadow-lg shadow-amber-500/10' : 'bg-white/5 text-gray-500 hover:bg-white/10'}`}>
                    {t.status === 'aberto' ? 'Resolver' : 'Reabrir'}
                  </button>
                </div>
              )) : (
                <div className="py-20 text-center text-gray-500 italic">Sem tickets pendentes.</div>
              )}
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

// --- COMPONENTES AUXILIARES ---
function MenuButton({ active, onClick, icon, label }: any) {
  return (
    <button onClick={onClick} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all w-full text-sm font-bold ${active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
      {icon} {label}
    </button>
  );
}

function StatCard({ title, value, icon }: any) {
  return (
    <div className="bg-[#16162d] p-8 rounded-3xl border border-white/5 shadow-xl flex flex-col items-center text-center group hover:border-indigo-500/20 transition-all">
      <div className="p-4 bg-black/20 rounded-2xl mb-4 group-hover:scale-110 transition-transform">{icon}</div>
      <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">{title}</p>
      <h3 className="text-4xl font-black text-white tracking-tighter">{value}</h3>
    </div>
  );
}