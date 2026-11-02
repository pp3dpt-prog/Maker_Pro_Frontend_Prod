// Gera uma série de publicações (legenda + prompt de imagem) com ângulos diferentes
// para o mesmo produto, para publicar em dias distintos. Usa o Gemini (tier gratuito).
import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { assertAdmin } from '@/lib/assertAdmin';
import { CONTEXTO_PUBLICO, type Publico } from '@/lib/marketingPublico';

export const runtime = 'nodejs';

const SISTEMA = `És o copywriter da pp3d.pt, loja portuguesa (Quarteira, Algarve) de produtos impressos
em 3D e personalizáveis. Português de Portugal, tom próximo, sem preços, prazos ou descontos inventados.
Cria uma SÉRIE de publicações para o mesmo produto, cada uma com um ângulo diferente (ex.: apresentação,
personalização, presente, uso no dia a dia, bastidores da impressão 3D, pergunta aos seguidores).
Responde APENAS com JSON: um array de objetos {angulo, legenda, prompt_imagem}.
- legenda: máx. 500 caracteres, 1-3 emojis, call-to-action para pp3d.pt, termina com 5-8 hashtags
- prompt_imagem: em INGLÊS, fotografia de produto lifestyle com cena DIFERENTE em cada item, luz natural, sem texto nem logótipos`;

export async function POST(request: Request) {
  const guard = await assertAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { nome, descricao, angulo, n, publico } = await request.json() as { nome?: string; descricao?: string; angulo?: string; publico?: Publico; n?: number };
  if (!nome?.trim()) return NextResponse.json({ error: 'nome do produto em falta.' }, { status: 400 });
  if (!process.env.GEMINI_API_KEY) return NextResponse.json({ error: 'GEMINI_API_KEY não configurada.' }, { status: 500 });
  const total = Math.min(6, Math.max(2, Math.round(n ?? 4)));

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  try {
    const r = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: [{ role: 'user', parts: [{ text: `Produto: ${nome}\nDescrição: ${descricao || '(sem descrição)'}\nTema geral: ${angulo || 'sem tema'}\nNúmero de publicações: ${total}` }] }],
      config: { systemInstruction: `${SISTEMA}\n\n${CONTEXTO_PUBLICO[publico === 'makers' ? 'makers' : 'clientes']}`, responseMimeType: 'application/json' },
    });
    const bruto = (r.text ?? '').replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
    const lista = JSON.parse(bruto);
    if (!Array.isArray(lista) || lista.length === 0) throw new Error('resposta sem lista');
    return NextResponse.json({ ok: true, posts: lista.slice(0, total) });
  } catch (e) {
    console.error('[marketing/gerar-serie]', e);
    const detalhe = e instanceof Error ? e.message.slice(0, 200) : String(e).slice(0, 200);
    return NextResponse.json({ error: `Erro ao gerar a série: ${detalhe}` }, { status: 502 });
  }
}
