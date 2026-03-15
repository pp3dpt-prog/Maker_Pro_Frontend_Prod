// app/dashboard/layout.tsx
'use client';

import Sidebar from '../../components/Sidebar';
import { usePathname } from 'next/navigation';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Vamos imprimir isto e ver o que acontece exatamente
  console.log("Pathname atual:", pathname); 
  
  // Vamos usar uma verificação mais robusta
  const isDashboardRoot = pathname === '/dashboard';

  return (
    <div className="flex h-screen bg-[#0f0f1e]">
      {/* A Sidebar só aparece se NÃO estivermos no root do dashboard */}
      {!isDashboardRoot && <Sidebar />}
      
      <main className="flex-1 overflow-auto p-6">
        {children}
      </main>
    </div>
  );
}