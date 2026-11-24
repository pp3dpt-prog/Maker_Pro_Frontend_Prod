// Notificações de email da Loja (via Resend). Segue o padrão do projeto:
// envia para o admin com remetente onboarding@resend.dev (domínio ainda não verificado).
import { Resend } from 'resend';

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
const eur = (c?: number | null) => (c == null ? 'a orçamentar' : (c / 100).toFixed(2) + ' €');

export interface ItemEmail { nome: string; quantidade: number; label?: string | null; preco_cents?: number | null; personalizacao?: any; }

// Linhas legíveis da personalização (parâmetros do customizador + link do STL)
function personalizacaoHtml(p: any): string {
  if (!p || typeof p !== 'object') return '';
  const linhas: string[] = [];
  const params = p.params && typeof p.params === 'object' ? p.params : null;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v == null || v === '' || typeof v === 'object') continue;
      linhas.push(`<span style="color:#64748b">${escapeHtml(k)}:</span> ${escapeHtml(String(v))}`);
    }
  }
  if (typeof p.stl_url === 'string' && /^https?:\/\//.test(p.stl_url)) {
    linhas.push(`<a href="${escapeHtml(p.stl_url)}" style="color:#60a5fa">Descarregar STL</a>`);
  }
  if (!linhas.length) return '';
  return `<tr><td colspan="2" style="padding:2px 0 8px 12px;color:#94a3b8;font-size:12px;line-height:1.6">${linhas.join('<br>')}</td></tr>`;
}

export async function notificarAdminEncomenda(opts: {
  numero: number;
  tipo: 'orcamento' | 'pago' | 'codigo';
  entrega?: string | null;
  clienteEmail?: string | null;
  clienteNome?: string | null;
  telefone?: string | null;
  morada?: { morada?: string; codigo_postal?: string; cidade?: string } | null;
  codigo?: string | null;
  descontoCents?: number;
  totalCents: number;
  itens?: ItemEmail[];
}): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  const adminEmail = process.env.PEDIDOS_ADMIN_EMAIL || 'pp3d.pt@gmail.com';

  try {
    const resend = new Resend(key);
    const titulo = opts.tipo === 'pago' ? '✅ Nova encomenda paga'
      : opts.tipo === 'codigo' ? '🎟️ Nova encomenda com código (sem pagamento)'
      : '📝 Novo pedido de orçamento';
    const moradaTxt = opts.morada?.morada
      ? [opts.morada.morada, [opts.morada.codigo_postal, opts.morada.cidade].filter(Boolean).join(' ')].filter(Boolean).join(', ')
      : '';
    const entregaTxt = opts.entrega === 'maos' ? 'Entrega em mãos (Oeiras / Carnaxide / Linda-a-Velha)' : 'Envio';

    const itensHtml = (opts.itens ?? []).map(i =>
      `<tr><td style="padding:4px 0;color:#cbd5e1;font-size:14px">${i.quantidade}× ${escapeHtml(i.nome)}${i.label ? ` (${escapeHtml(i.label)})` : ''}</td>` +
      `<td style="padding:4px 0;color:#cbd5e1;font-size:14px;text-align:right">${eur(i.preco_cents != null ? i.preco_cents * i.quantidade : null)}</td></tr>` +
      personalizacaoHtml(i.personalizacao)
    ).join('');

    const html = `
      <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;background:#080c10;border-radius:14px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#1d4ed8,#7c3aed);padding:28px 24px">
          <h1 style="margin:0;color:#fff;font-size:20px;font-weight:800">${titulo} — #${opts.numero}</h1>
        </div>
        <div style="padding:24px">
          <p style="color:#94a3b8;font-size:14px;margin:0 0 6px">Cliente: <strong style="color:#f1f5f9">${escapeHtml(opts.clienteNome ?? '—')}</strong>${opts.clienteEmail ? ` (${escapeHtml(opts.clienteEmail)})` : ''}</p>
          ${opts.telefone ? `<p style="color:#94a3b8;font-size:14px;margin:0 0 6px">Telefone: <strong style="color:#f1f5f9">${escapeHtml(opts.telefone)}</strong></p>` : ''}
          <p style="color:#94a3b8;font-size:14px;margin:0 0 6px">Entrega: <strong style="color:#f1f5f9">${entregaTxt}</strong></p>
          ${moradaTxt ? `<p style="color:#94a3b8;font-size:14px;margin:0 0 6px">Morada: <strong style="color:#f1f5f9">${escapeHtml(moradaTxt)}</strong></p>` : ''}
          ${opts.codigo ? `<p style="color:#94a3b8;font-size:14px;margin:0 0 6px">Código: <strong style="color:#fbbf24">${escapeHtml(opts.codigo)}</strong>${opts.descontoCents ? ` (−${eur(opts.descontoCents)})` : ''}</p>` : ''}
          <div style="height:10px"></div>
          <table style="width:100%;border-collapse:collapse;border-top:1px solid #1e293b;border-bottom:1px solid #1e293b;margin-bottom:12px">${itensHtml}</table>
          <p style="color:#f1f5f9;font-size:16px;font-weight:800;margin:0;text-align:right">${opts.tipo === 'orcamento' ? 'Estimativa' : 'Total'}: ${opts.tipo === 'codigo' ? 'sem pagamento' : eur(opts.totalCents)}</p>
          <p style="color:#475569;font-size:12px;margin:18px 0 0">Gere esta encomenda em pp3d.pt/admin/loja/encomendas</p>
        </div>
      </div>`;

    await resend.emails.send({
      from: 'PP3D <onboarding@resend.dev>',
      to: adminEmail,
      replyTo: opts.clienteEmail ?? undefined,
      subject: `[Loja] ${opts.tipo === 'pago' ? 'Encomenda paga' : opts.tipo === 'codigo' ? `Encomenda com código ${opts.codigo ?? ''}` : 'Pedido de orçamento'} #${opts.numero}`,
      html,
    });
  } catch (e) {
    console.error('[loja-email] erro:', e);
  }
}
