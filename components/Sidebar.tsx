'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Dog, Key, QrCode, MessageSquare, History, User } from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
    { name: 'Pet Tags', icon: Dog, href: '/dashboard/pet-tags' },
    { name: 'Keychains', icon: Key, href: '/dashboard/keychains', pro: true },
    { name: 'QR Codes', icon: QrCode, href: '/dashboard/qr-codes', pro: true },
    { name: 'Histórico', icon: History, href: '/dashboard/projects' },
    { name: 'Suporte', icon: MessageSquare, href: '/dashboard/support' },
  ];

  return (
    <aside className="w-64 bg-[#1a1a2e] border-r border-indigo-500/10 flex flex-col">
      <div className="p-6">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-500 bg-clip-text text-transparent">
          Maker Studio
        </h2>
      </div>

      <nav className="flex-1 px-4 space-y-2">
        {menuItems.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className={`flex items-center justify-between p-3 rounded-lg transition-all ${
              pathname === item.href 
                ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' 
                : 'text-gray-400 hover:bg-[#0f0f1e] hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <item.icon size={20} />
              <span>{item.name}</span>
            </div>
            {item.pro && (
              <span className="text-[10px] font-bold bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded border border-amber-500/30">
                PRO
              </span>
            )}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-800">
        <Link href="/dashboard/profile" className="flex items-center gap-3 p-3 text-gray-400 hover:text-white transition">
          <User size={20} />
          <span>O meu Perfil</span>
        </Link>
      </div>
    </aside>
  );
}