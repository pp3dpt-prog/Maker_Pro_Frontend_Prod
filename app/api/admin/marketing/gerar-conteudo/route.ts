// Gera textos de marketing (Instagram, Facebook, guião TikTok/Reels) e um prompt
// de imagem para um produto. Usa o Gemini (tier gratuito), como o assistente.
import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { assertAdmin } from '@/lib/assertAdmin';

export const runtime = 'nodejs';

const SISTEMA = `És o copywriter da pp3d.pt, uma loja portuguesa (Quarteira, Algarve) de produtos
impressos em 3D e personalizáveis. Escreves em português de Portugal, tom próximo e entusiasta,
sem exageros nem claims que não possas sustentar (nada de preços, prazos ou descontos inventados).
Responde APENAS com JSON com estas chaves:
- instagram: legenda curta (máx. 600 caracteres) com 1-3 emojis e call-to-action para pp3d.pt
- facebook: texto um pouco mais longo e conversacional (máx. 900 caracteres)
- tiktok_guiao: guião de vídeo de 15-20 s, em 4-5 linhas "Cena: ... | Texto no ecrã: ..."
- hashtags: array de 8 a 12 hashtags sem espaços, começadas por #
- prompt_imagem: prompt em INGLÊS para um gerador de imagens: fotografia de produto lifestyle, luz natural, fundo desfocado, sem texto nem logótipos na imagem`;

export async function POST(request: Request) {
  const guard = await assertAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { nome, descricao, angulo } = await request.json() as { nome?: string; descricao?: string; angulo?: string };
  if (!nome?.trim()) return NextResponse.json({ error: 'nome do produto em falta.' }, { status: 400 });
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY não configurada.' }, { status: 500 });
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  try {
    const r = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: [{
        role: 'user',
        parts: [{ text: `Produto: ${nome}\nDescrição: ${descricao ?? '(sem descrição)'}\nÂngulo pretendido: ${angulo || 'apresentação do produto'}` }],
      }],
      config: { systemInstruction: SISTEMA, responseMimeType: 'application/json' },
    });
    // Tolera resposta embrulhada em ```json … ```
    const bruto = (r.text ?? '').replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
    const dados = JSON.parse(bruto);
    return NextResponse.json({ ok: true, conteudo: dados });
  } catch (e) {
    console.error('[marketing/gerar-conteudo]', e);
    const detalhe = e instanceof Error ? e.message.slice(0, 200) : String(e).slice(0, 200);
    return NextResponse.json({ error: `Erro ao gerar o conteúdo: ${detalhe}` }, { status: 502 });
  }
}
