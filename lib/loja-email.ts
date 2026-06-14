// Notificações de email da Loja (via Resend). Segue o padrão do projeto:
// envia para o admin com remetente onboarding@resend.dev (domínio ainda não verificado).
import { Resend } from 'resend';

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
const eur = (c?: number | null) => (c == null ? 'a orçamentar' : (c / 100).toFixed(2) + ' €');

export interface ItemEmail { nome: string; quantidade: number; label?: string | null; preco_cents?: number | null; }

export async function notificarAdminEncomenda(opts: {
  numero: number;
  tipo: 'orcamento' | 'pago';
  entrega?: string | null;
  clienteEmail?: string | null;
  clienteNome?: string | null;
  totalCents: number;
  itens?: ItemEmail[];
}): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  const adminEmail = process.env.PEDIDOS_ADMIN_EMAIL || 'pp3d.pt@gmail.com';

  try {
    const resend = new Resend(key);
    const titulo = opts.tipo === 'pago' ? '✅ Nova encomenda paga' : '📝 Novo pedido de orçamento';
    const entregaTxt = opts.entrega === 'maos' ? 'Entrega em mãos (Oeiras / Carnaxide / Linda-a-Velha)' : 'Envio';

    const itensHtml = (opts.itens ?? []).map(i =>
      `<tr><td style="padding:4px 0;color:#cbd5e1;font-size:14px">${i.quantidade}× ${escapeHtml(i.nome)}${i.label ? ` (${escapeHtml(i.label)})` : ''}</td>` +
      `<td style="padding:4px 0;color:#cbd5e1;font-size:14px;text-align:right">${eur(i.preco_cents != null ? i.preco_cents * i.quantidade : null)}</td></tr>`
    ).join('');

    const html = `
      <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;background:#080c10;border-radius:14px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#1d4ed8,#7c3aed);padding:28px 24px">
          <h1 style="margin:0;color:#fff;font-size:20px;font-weight:800">${titulo} — #${opts.numero}</h1>
        </div>
        <div style="padding:24px">
          <p style="color:#94a3b8;font-size:14px;margin:0 0 6px">Cliente: <strong style="color:#f1f5f9">${escapeHtml(opts.clienteNome ?? '—')}</strong>${opts.clienteEmail ? ` (${escapeHtml(opts.clienteEmail)})` : ''}</p>
          <p style="color:#94a3b8;font-size:14px;margin:0 0 16px">Entrega: <strong style="color:#f1f5f9">${entregaTxt}</strong></p>
          <table style="width:100%;border-collapse:collapse;border-top:1px solid #1e293b;border-bottom:1px solid #1e293b;margin-bottom:12px">${itensHtml}</table>
          <p style="color:#f1f5f9;font-size:16px;font-weight:800;margin:0;text-align:right">${opts.tipo === 'orcamento' ? 'Estimativa' : 'Total'}: ${eur(opts.totalCents)}</p>
          <p style="color:#475569;font-size:12px;margin:18px 0 0">Gere esta encomenda em pp3d.pt/admin/loja/encomendas</p>
        </div>
      </div>`;

    await resend.emails.send({
      from: 'PP3D <onboarding@resend.dev>',
      to: adminEmail,
      replyTo: opts.clienteEmail ?? undefined,
      subject: `[Loja] ${opts.tipo === 'pago' ? 'Encomenda paga' : 'Pedido de orçamento'} #${opts.numero}`,
      html,
    });
  } catch (e) {
    console.error('[loja-email] erro:', e);
  }
}
