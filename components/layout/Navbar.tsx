import Link from 'next/link';

export default function Navbar() {
  return (
    <nav className="border-b border-gray-800 bg-[#0a0a0a] py-4">
      <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
        {/* Logo */}
        <Link href="/" className="text-white font-bold text-lg tracking-tight">
          Maker<span className="text-blue-500">Pro</span>
        </Link>

        {/* Links */}
        <div className="flex gap-8 text-sm text-gray-400">
          <Link href="/" className="hover:text-blue-500 transition-colors">Home</Link>
          <Link href="/explore" className="hover:text-blue-500 transition-colors">Explore</Link>
          <Link href="/pricing" className="hover:text-blue-500 transition-colors">Pricing</Link>
        </div>

        {/* Ação */}
        <Link 
          href="/dashboard" 
          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm transition-all"
        >
          My Dashboard
        </Link>
      </div>
    </nav>
  );
}