// Assistente de IA do painel admin — chat com contexto real da loja (vendas,
// campanhas, publicações). Usa o Gemini (tier gratuito da Google, sem cartão de
// crédito) para que o assistente não tenha custo. Streaming de texto simples
// (sem formato SSE) para o widget em components/admin/AdminAssistant.tsx.
import { createClient as createAdmin, SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export const runtime = 'nodejs';

async function assertAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, status: 401, error: 'Não autenticado.' };

  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail && user.email?.toLowerCase().trim() === adminEmail.toLowerCase().trim()) {
    return { ok: true as const };
  }
  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data: perfil } = await admin.from('prod_perfis').select('role').eq('id', user.id).maybeSingle();
  if (perfil?.role === 'admin') return { ok: true as const };
  return { ok: false as const, status: 403, error: 'Sem permissão.' };
}

const SYSTEM_BASE = `És o assistente de marketing e análise de negócio da pp3d.pt (Maker Pro),
uma loja de impressão 3D (brincos, miniaturas, Pops, figuras de ação, utilitários e serviços
de impressão sob encomenda). Falas português de Portugal, és direto e prático.

Usa SEMPRE os dados reais fornecidos abaixo para fundamentar as tuas respostas — nunca inventes
números. Se não houver dados suficientes para responder com confiança, diz isso claramente em vez
de especular. Quando sugerires ações de marketing (publicações, promoções, impulsionar um produto),
lembra que qualquer campanha paga fica sempre pausada até o próprio utilizador a ativar manualmente
no painel — nunca prometas publicar ou gastar dinheiro por ele.`;

interface ItemVendido { nome: string | null; quantidade: number | null; preco_cents: number | null }
interface Campanha { titulo: string; tipo: string; cliques: number | null; vistas: number | null }
interface PostMarketing { legenda: string; canal: string; estado: string }

async function construirContexto(admin: SupabaseClient): Promise<string> {
  const desde = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: itens }, { data: campanhas }, { data: posts }] = await Promise.all([
    admin
      .from('prod_loja_encomenda_itens')
      .select('nome, quantidade, preco_cents, prod_loja_encomendas!inner(created_at, estado)')
      .gte('prod_loja_encomendas.created_at', desde)
      .eq('prod_loja_encomendas.estado', 'pago'),
    admin.from('prod_campanhas').select('titulo, tipo, cliques, vistas').order('created_at', { ascending: false }).limit(10),
    admin.from('prod_marketing_posts').select('legenda, canal, estado').order('created_at', { ascending: false }).limit(10),
  ]);

  const porProduto = new Map<string, { qtd: number; receitaCents: number }>();
  for (const item of (itens ?? []) as unknown as ItemVendido[]) {
    if (!item.nome) continue;
    const atual = porProduto.get(item.nome) ?? { qtd: 0, receitaCents: 0 };
    atual.qtd += item.quantidade ?? 0;
    atual.receitaCents += (item.preco_cents ?? 0) * (item.quantidade ?? 0);
    porProduto.set(item.nome, atual);
  }
  const topProdutos = [...porProduto.entries()].sort((a, b) => b[1].receitaCents - a[1].receitaCents).slice(0, 10);

  const linhasProdutos = topProdutos.length
    ? topProdutos.map(([nome, v]) => `- ${nome}: ${v.qtd} vendidos, €${(v.receitaCents / 100).toFixed(2)} de receita`).join('\n')
    : 'Sem vendas confirmadas nos últimos 30 dias.';

  const linhasCampanhas = (campanhas as Campanha[] | null ?? []).length
    ? (campanhas as Campanha[]).map(c => `- "${c.titulo}" (${c.tipo}): ${c.vistas ?? 0} vistas, ${c.cliques ?? 0} cliques`).join('\n')
    : 'Sem campanhas internas registadas.';

  const linhasPosts = (posts as PostMarketing[] | null ?? []).length
    ? (posts as PostMarketing[]).map(p => `- [${p.canal} · ${p.estado}] "${p.legenda.slice(0, 60)}${p.legenda.length > 60 ? '…' : ''}"`).join('\n')
    : 'Sem publicações no Instagram/Facebook registadas ainda.';

  return [
    'DADOS REAIS DA LOJA (últimos 30 dias, ou mais recentes disponíveis):',
    '',
    'Produtos mais vendidos:',
    linhasProdutos,
    '',
    'Campanhas internas (feed/banner/email/promo):',
    linhasCampanhas,
    '',
    'Publicações de marketing (Instagram/Facebook):',
    linhasPosts,
  ].join('\n');
}

export async function POST(request: Request) {
  const guard = await assertAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { mensagem, historico } = await request.json() as {
    mensagem: string;
    historico?: { role: 'user' | 'assistant'; content: string }[];
  };
  if (!mensagem?.trim()) return NextResponse.json({ error: 'mensagem em falta.' }, { status: 400 });

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY não configurada — vê docs/plano-marketing.md.' }, { status: 500 });
  }

  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const contexto = await construirContexto(admin);

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  // Gemini usa role 'model' em vez de 'assistant', e cada turno é { role, parts: [{ text }] }.
  const contents = [
    ...(historico ?? []).map(h => ({ role: h.role === 'assistant' ? 'model' : 'user', parts: [{ text: h.content }] })),
    { role: 'user', parts: [{ text: mensagem }] },
  ];

  let geminiStream;
  try {
    geminiStream = await ai.models.generateContentStream({
      model: 'gemini-2.5-flash',
      contents,
      config: { systemInstruction: `${SYSTEM_BASE}\n\n${contexto}` },
    });
  } catch {
    return NextResponse.json({ error: 'Erro ao contactar o assistente.' }, { status: 502 });
  }

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of geminiStream) {
          if (chunk.text) controller.enqueue(encoder.encode(chunk.text));
        }
      } catch {
        controller.enqueue(encoder.encode('\n\n[Erro a meio da resposta — tenta novamente.]'));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
