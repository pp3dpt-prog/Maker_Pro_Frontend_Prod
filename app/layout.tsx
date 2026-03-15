import Navbar from '@/components/layout/Navbar';
import './globals.css';


export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <body className="bg-[#0a0a0a] text-white">
        <Navbar />
        {children}
      </body>
    </html>
  );
}