'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Dog, Key, QrCode, MessageSquare, History, User } from 'lucide-react';

// components/Sidebar.tsx
export default function Sidebar() {
  return (
    <aside className="w-[280px] bg-[#0f172a] border-r border-[#1e293b] flex flex-col p-6 h-screen">
      <div className="text-xl font-bold text-white mb-10">
        Maker<span className="text-blue-500">Pro</span>
      </div>
      
      <nav className="flex flex-col gap-2">
        {['Dashboard', 'Pet Tags', 'Keychains', 'QR Codes', 'Histórico', 'Suporte'].map((item) => (
          <a key={item} href="#" className="text-slate-400 hover:text-white hover:bg-[#1e293b] px-4 py-3 rounded-lg transition-all">
            {item}
          </a>
        ))}
      </nav>
    </aside>
  );
}