// Pedido de proposta do Parceiro/Revendedor (tipo_utilizador='revendedor'): personaliza a peça
// mas não compra nem descarrega — isto envia um email a pedir uma proposta comercial, com a
// peça tal como foi configurada (incluindo as cores escolhidas) e os dados da empresa.
// Usa a mesma tabela do fluxo "Encomendar peça impressa" (prod_pedidos_orcamento), distinguida
// por tipo_pedido='proposta', para aparecer no mesmo admin/pedidos.
import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdmin } from '@supabase/supabase-js';

const BUCKET = 'loja_produtos';
const MAX_IMAGEM_BYTES = 6 * 1024 * 1024;

type Contacto = { nome: string; email: string; telefone: string };
type ParamRow = { key: string; label: string; value: string };

interface Body {
  design_id: string;
  design_nome: string;
  familia: string;
  params: Record<string, any>;
  params_resumo: ParamRow[];
  contacto: Contacto;
  empresa: string;
  morada: string;
  notas: string;
  imagem_base64?: string | null;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function POST(request: NextRequest) {
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 });
  }

  const { design_id, design_nome, familia, params, params_resumo, contacto, empresa, morada, notas, imagem_base64 } =
    body || ({} as Body);

  if (!design_id || !empresa?.trim() || !contacto?.nome || !contacto?.email || !contacto?.telefone || !morada?.trim()) {
    return NextResponse.json({ error: 'Preenche empresa, nome, contacto e morada.' }, { status: 400 });
  }
  if (!/\S+@\S+\.\S+/.test(contacto.email)) {
    return NextResponse.json({ error: 'Email inválido.' }, { status: 400 });
  }

  // Autenticação obrigatória + perfil parceiro/revendedor
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Tens de iniciar sessão para pedir uma proposta.' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Serviço temporariamente indisponível. Por favor tenta mais tarde.' }, { status: 503 });
  }
  const admin = createAdmin(supabaseUrl, serviceKey);

  const { data: perfil } = await admin
    .from('prod_perfis')
    .select('tipo_utilizador, role')
    .eq('id', user.id)
    .maybeSingle();

  if (perfil?.tipo_utilizador !== 'revendedor' && perfil?.role !== 'admin') {
    return NextResponse.json(
      { error: 'Apenas contas de Parceiro/Revendedor podem pedir uma proposta.' },
      { status: 403 }
    );
  }

  // Imagem da peça (screenshot do preview 3D com as cores escolhidas) — opcional mas recomendada.
  let imagemUrl: string | null = null;
  let imagemBuffer: Buffer | null = null;
  if (imagem_base64 && imagem_base64.startsWith('data:image/')) {
    try {
      const base64Data = imagem_base64.split(',')[1] ?? '';
      imagemBuffer = Buffer.from(base64Data, 'base64');
      if (imagemBuffer.length > MAX_IMAGEM_BYTES) {
        imagemBuffer = null;
      }
    } catch {
      imagemBuffer = null;
    }
  }

  // Inserir em Supabase usando sempre service role para contornar RLS
  let pedidoId: string | null = null;
  let dbError: string | null = null;
  try {
    const result = await admin
      .from('prod_pedidos_orcamento')
      .insert({
        user_id: user.id,
        design_id,
        design_nome,
        familia,
        params,
        tipo_pedido: 'proposta',
        empresa: empresa.trim(),
        contacto_nome: contacto.nome,
        contacto_email: contacto.email,
        contacto_telefone: contacto.telefone,
        morada_faturacao: morada.trim(),
        morada_envio: morada.trim(),
        mesma_morada: true,
        notas: notas || null,
        estado: 'pendente_orcamento',
      })
      .select('id')
      .maybeSingle();

    if (!result.error && result.data?.id) {
      pedidoId = result.data.id;
    } else if (result.error) {
      dbError = result.error.message || JSON.stringify(result.error);
      console.error('[pedido-proposta] insert falhou:', result.error);
    }
  } catch (e) {
    dbError = e instanceof Error ? e.message : String(e);
    console.error('[pedido-proposta] erro DB:', e);
  }

  // Upload da imagem para storage (best-effort — guarda a URL no pedido para consulta futura no admin)
  if (pedidoId && imagemBuffer) {
    try {
      const path = `propostas/${pedidoId}.jpg`;
      const { error: uploadError } = await admin.storage
        .from(BUCKET)
        .upload(path, imagemBuffer, { contentType: 'image/jpeg', upsert: true });
      if (!uploadError) {
        imagemUrl = admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
        await admin.from('prod_pedidos_orcamento').update({ imagem_url: imagemUrl }).eq('id', pedidoId);
      }
    } catch (e) {
      console.error('[pedido-proposta] erro upload imagem:', e);
    }
  }

  // Enviar email para admin via Resend, com a peça (imagem embutida) e os dados da empresa
  const resendKey = process.env.RESEND_API_KEY;
  const adminEmail = process.env.PEDIDOS_ADMIN_EMAIL || process.env.RESEND_FROM_EMAIL_REPLY || 'pp3d.pt@gmail.com';
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'PP3D <onboarding@resend.dev>';

  if (resendKey) {
    try {
      const resend = new Resend(resendKey);

      const paramsRowsHtml = (params_resumo || [])
        .map(r => `<tr><td style="padding:4px 12px;color:#64748b">${escapeHtml(r.label)}</td><td style="padding:4px 12px;color:#0f172a;font-weight:600">${escapeHtml(r.value)}</td></tr>`)
        .join('');

      const html = `
        <div style="font-family:Inter,Arial,sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#0f172a">
          <h2 style="margin:0 0 4px">🤝 Pedido de proposta — Parceiro/Revendedor</h2>
          <p style="margin:0 0 ${dbError ? '8px' : '20px'};color:#64748b">${pedidoId ? `ID: ${escapeHtml(pedidoId)}` : '(sem ID — falhou gravação na BD)'}</p>
          ${dbError ? `<p style="margin:0 0 20px;padding:8px 12px;background:#fef2f2;border-left:3px solid #ef4444;border-radius:4px;font-size:12px;color:#b91c1c;font-family:monospace"><strong>Erro BD:</strong> ${escapeHtml(dbError)}</p>` : ''}

          <h3 style="margin:16px 0 8px">Peça configurada</h3>
          <p style="margin:0 0 12px"><strong>${escapeHtml(design_nome)}</strong> <span style="color:#64748b">(${escapeHtml(familia)})</span></p>
          ${imagemBuffer ? `<img src="${imagem_base64}" alt="Peça configurada" style="max-width:100%;border-radius:12px;border:1px solid #e2e8f0;margin-bottom:16px" />` : '<p style="margin:0 0 16px;color:#b45309;font-size:13px">⚠️ Sem imagem da peça.</p>'}
          <table style="border-collapse:collapse;font-size:13px;width:100%;background:#f8fafc;border-radius:8px">
            ${paramsRowsHtml || '<tr><td style="padding:8px 12px;color:#64748b">Sem parâmetros</td></tr>'}
          </table>

          <h3 style="margin:24px 0 8px">Empresa</h3>
          <p style="margin:0 0 8px"><strong>${escapeHtml(empresa)}</strong></p>
          <p style="margin:0;white-space:pre-wrap;line-height:1.6">${escapeHtml(morada)}</p>

          <h3 style="margin:24px 0 8px">Contacto</h3>
          <p style="margin:0;line-height:1.7">
            <strong>${escapeHtml(contacto.nome)}</strong><br/>
            Email: <a href="mailto:${escapeHtml(contacto.email)}">${escapeHtml(contacto.email)}</a><br/>
            Telefone: ${escapeHtml(contacto.telefone)}
          </p>

          <h3 style="margin:24px 0 8px">Notas</h3>
          <p style="margin:0;white-space:pre-wrap;line-height:1.6">${notas ? escapeHtml(notas) : '<em style="color:#64748b">Sem notas</em>'}</p>

          <hr style="margin:24px 0;border:none;border-top:1px solid #e2e8f0"/>
          <p style="margin:0;font-size:12px;color:#94a3b8">design_id: ${escapeHtml(design_id)} • user_id: ${escapeHtml(user.id)}</p>
          ${pedidoId ? `<a href="https://pp3d.pt/admin/pedidos/${escapeHtml(pedidoId)}" style="display:inline-block;margin-top:16px;padding:10px 20px;background:#1d4ed8;color:#fff;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px">Ver no admin →</a>` : ''}
        </div>
      `;

      await resend.emails.send({
        from: fromEmail,
        to: adminEmail,
        replyTo: contacto.email,
        subject: `Pedido de proposta — ${escapeHtml(design_nome)} (${empresa})`,
        html,
      });
    } catch (e) {
      console.error('[pedido-proposta] erro Resend:', e);
    }
  }

  if (!pedidoId && !resendKey) {
    return NextResponse.json(
      { error: 'Serviço temporariamente indisponível. Por favor tenta mais tarde.' },
      { status: 503 }
    );
  }

  return NextResponse.json({ ok: true, id: pedidoId });
}
