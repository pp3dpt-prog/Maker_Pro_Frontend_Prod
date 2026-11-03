// Para o mesmo produto, imagem e texto, o Gemini propõe 2 (ou mais) ABORDAGENS de vídeo
// diferentes — cada uma é um prompt de movimento/câmara para o Wan 2.2 (image-to-video).
// Assim saem Reels distintos do mesmo modelo para publicar em dias diferentes.
import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { assertAdmin } from '@/lib/assertAdmin';
import { CONTEXTO_PUBLICO, type Publico } from '@/lib/marketingPublico';

export const runtime = 'nodejs';

const SISTEMA = `És o diretor de vídeo da pp3d.pt (produtos impressos em 3D e personalizáveis).
Vais escrever prompts para um modelo de IA image-to-video (Wan 2.2) que anima UMA fotografia de
produto durante ~5 segundos. O modelo NÃO sabe escrever texto e deforma o produto se lhe pedires
mudanças grandes, por isso:
- descreve sobretudo MOVIMENTO DE CÂMARA e AMBIENTE (luz, partículas, reflexos), não mudes o produto;
- o produto deve manter forma, cor e texto gravado; nada de mãos a escrever nem texto novo;
- movimentos suaves e realistas: push-in lento, órbita parcial, parallax, rack focus, luz a varrer, etc.;
- cada abordagem tem de ser claramente DIFERENTE das outras (câmara, ritmo e ambiente distintos).
Responde APENAS com JSON: array de objetos {titulo, prompt}
- titulo: 2-5 palavras em português, para o admin identificar a abordagem (ex.: "Aproximação ao detalhe")
- prompt: em INGLÊS, 1-3 frases, máx. 60 palavras, terminando com "product stays unchanged, sharp details".`;

export async function POST(request: Request) {
  const guard = await assertAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { nome, descricao, legenda, publico, n } = await request.json() as {
    nome?: string; descricao?: string; legenda?: string; publico?: Publico; n?: number;
  };
  if (!nome?.trim()) return NextResponse.json({ error: 'nome do produto em falta.' }, { status: 400 });
  if (!process.env.GEMINI_API_KEY) return NextResponse.json({ error: 'GEMINI_API_KEY não configurada.' }, { status: 500 });
  const total = Math.min(4, Math.max(2, Math.round(n ?? 2)));

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  try {
    const r = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: [{ role: 'user', parts: [{ text:
        `Produto: ${nome}\nDescrição: ${descricao || '(sem descrição)'}\nTexto da publicação: ${legenda || '(sem texto)'}\nNúmero de abordagens: ${total}` }] }],
      config: { systemInstruction: `${SISTEMA}\n\n${CONTEXTO_PUBLICO[publico === 'makers' ? 'makers' : 'clientes']}`, responseMimeType: 'application/json' },
    });
    const bruto = (r.text ?? '').replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
    const lista = JSON.parse(bruto) as { titulo?: string; prompt?: string }[];
    const abordagens = (Array.isArray(lista) ? lista : [])
      .filter(a => a?.prompt?.trim())
      .slice(0, total)
      .map((a, i) => ({ titulo: a.titulo?.trim() || `Abordagem ${String.fromCharCode(65 + i)}`, prompt: a.prompt!.trim() }));
    if (abordagens.length < 2) throw new Error('resposta com menos de 2 abordagens');
    return NextResponse.json({ ok: true, abordagens });
  } catch (e) {
    console.error('[marketing/gerar-abordagens]', e);
    const detalhe = e instanceof Error ? e.message.slice(0, 200) : String(e).slice(0, 200);
    return NextResponse.json({ error: `Erro ao gerar as abordagens: ${detalhe}` }, { status: 502 });
  }
}
