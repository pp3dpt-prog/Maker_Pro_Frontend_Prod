// Layout partilhado de /admin/** — mantém o assistente de IA sempre visível,
// independentemente do separador em que o admin está.
import AdminAssistant from '@/components/admin/AdminAssistant';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <AdminAssistant />
    </>
  );
}
