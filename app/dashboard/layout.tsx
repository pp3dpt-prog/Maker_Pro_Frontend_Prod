import Sidebar from '../../components/Sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-[#0f0f1e]">
      {/* Barra Lateral fixa */}
      <Sidebar />
      
      {/* Conteúdo da Página */}
      <main className="flex-1 overflow-auto p-6">
        {children}
      </main>
    </div>
  );
}