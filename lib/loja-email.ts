// Notificações de email da Loja (via Resend). Segue o padrão do projeto:
// envia para o admin; remetente em RESEND_FROM_EMAIL (fallback onboarding@resend.dev).
import { Resend } from 'resend';

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
const eur = (c?: number | null) => (c == null ? 'a orçamentar' : (c / 100).toFixed(2) + ' €');

export interface ItemEmail { nome: string; quantidade: number; label?: string | null; preco_cents?: number | null; personalizacao?: any; }

// Linhas legíveis da personalização (parâmetros do customizador + link do STL)
function personalizacaoHtml(p: any, nomesCores?: Record<string, string>): string {
  if (!p || typeof p !== 'object') return '';
  const linhas: string[] = [];
  const params = p.params && typeof p.params === 'object' ? p.params : null;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v == null || v === '' || typeof v === 'object') continue;
      const txt = String(v);
      const amostra = /^#[0-9a-f]{6}$/i.test(txt)
        ? `<span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${txt};border:1px solid #475569;vertical-align:middle;margin-right:4px"></span>${escapeHtml(nomesCores?.[txt.toUpperCase()] ?? txt.toUpperCase())}`
        : escapeHtml(txt);
      linhas.push(`<span style="color:#64748b">${escapeHtml(k)}:</span> ${amostra}`);
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

  // Nomes das cores (/admin/cores) para o email mostrar "Azul" em vez de #1E3A8A
  let nomesCores: Record<string, string> = {};
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const { data } = await sb.from('prod_cores').select('nome, hex');
    nomesCores = Object.fromEntries((data ?? []).map((c: any) => [String(c.hex).toUpperCase(), c.nome]));
  } catch { /* sem nomes — mostra o hex */ }

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
      personalizacaoHtml(i.personalizacao, nomesCores)
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
      from: process.env.RESEND_FROM_EMAIL || 'PP3D <onboarding@resend.dev>',
      to: adminEmail,
      replyTo: opts.clienteEmail ?? undefined,
      subject: `[Loja] ${opts.tipo === 'pago' ? 'Encomenda paga' : opts.tipo === 'codigo' ? `Encomenda com código ${opts.codigo ?? ''}` : 'Pedido de orçamento'} #${opts.numero}`,
      html,
    });
  } catch (e) {
    console.error('[loja-email] erro:', e);
  }
}

// Confirmação para o cliente. Só envia quando RESEND_FROM_EMAIL usa um domínio verificado
// (com onboarding@resend.dev o Resend só entrega ao dono da conta).
export async function confirmarClienteEncomenda(opts: {
  numero: number;
  tipo: 'orcamento' | 'pago' | 'codigo';
  clienteEmail?: string | null;
  clienteNome?: string | null;
  totalCents: number;
  itens?: ItemEmail[];
}): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!key || !from || from.includes('resend.dev') || !opts.clienteEmail) return;
  try {
    const resend = new Resend(key);
    const titulo = opts.tipo === 'pago' ? 'Obrigado pela tua compra!'
      : opts.tipo === 'codigo' ? 'Recebemos a tua encomenda!'
      : 'Recebemos o teu pedido de orçamento';
    const texto = opts.tipo === 'pago' ? 'O pagamento foi confirmado. Vamos produzir a tua peça e avisamos quando for enviada.'
      : opts.tipo === 'codigo' ? 'Não há nada a pagar. Vamos produzir a tua peça e contactamos-te para a entrega.'
      : 'Vamos confirmar o valor final e enviamos-te os detalhes para pagamento.';
    const itensHtml = (opts.itens ?? []).map(i =>
      `<tr><td style="padding:4px 0;color:#cbd5e1;font-size:14px">${i.quantidade}× ${escapeHtml(i.nome)}${i.label ? ` (${escapeHtml(i.label)})` : ''}</td></tr>`
    ).join('');
    const html = `
      <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;background:#080c10;border-radius:14px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#1d4ed8,#7c3aed);padding:28px 24px">
          <h1 style="margin:0;color:#fff;font-size:20px;font-weight:800">${titulo}</h1>
          <p style="margin:6px 0 0;color:#dbeafe;font-size:14px">Encomenda nº ${opts.numero}</p>
        </div>
        <div style="padding:24px">
          <p style="color:#cbd5e1;font-size:15px;margin:0 0 16px">Olá ${escapeHtml(opts.clienteNome ?? '')}, ${texto}</p>
          <table style="width:100%;border-collapse:collapse;border-top:1px solid #1e293b;border-bottom:1px solid #1e293b;margin-bottom:12px">${itensHtml}</table>
          ${opts.tipo === 'pago' ? `<p style="color:#f1f5f9;font-size:16px;font-weight:800;margin:0;text-align:right">Total: ${eur(opts.totalCents)}</p>` : ''}
          <p style="color:#64748b;font-size:12px;margin:18px 0 0">Dúvidas? Responde a este email. — PP3D · pp3d.pt</p>
        </div>
      </div>`;
    await resend.emails.send({
      from,
      to: opts.clienteEmail,
      replyTo: process.env.PEDIDOS_ADMIN_EMAIL || 'pp3d.pt@gmail.com',
      subject: `PP3D — ${titulo} (nº ${opts.numero})`,
      html,
    });
  } catch (e) {
    console.error('[loja-email] erro confirmação cliente:', e);
  }
}
