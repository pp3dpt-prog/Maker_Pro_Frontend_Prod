// Gera um clip de vídeo a partir de uma imagem com o Wan 2.2 (14B, image-to-video, Lightning)
// que corre num Space do Hugging Face com ZeroGPU (GPU gratuita, quota diária por conta).
// Fala com a API HTTP do Gradio diretamente (sem dependências):
//   POST {space}/gradio_api/call/generate_video  → { event_id }
//   GET  {space}/gradio_api/call/generate_video/{event_id}  → stream SSE com o resultado
// O pedido leva o HF_TOKEN, por isso a GPU gasta a quota da conta da pp3d (≈5 min/dia grátis).
//
// Env vars:
//   HF_TOKEN       — token "Read" da conta Hugging Face (obrigatório)
//   HF_WAN_SPACE   — opcional; por omissão o Space original zerogpu-aoti/wan2-2-fp8da-aoti-faster
//                    (uma cópia duplicada deu só ruído — ver docs/plano-marketing.md)

const SPACE_POR_OMISSAO = 'zerogpu-aoti/wan2-2-fp8da-aoti-faster';

// Negative prompt por omissão do próprio Space (Wan foi treinado com prompts negativos em chinês).
const NEGATIVO =
  '色调艳丽, 过曝, 静态, 细节模糊不清, 字幕, 风格, 作品, 画作, 画面, 静止, 整体发灰, 最差质量, 低质量, JPEG压缩残留, 丑陋的, 残缺的, 多余的手指, 画得不好的手部, 画得不好的脸部, 畸形的, 毁容的, 形态畸形的肢体, 手指融合, 静止不动的画面, 杂乱的背景, 三条腿, 背景人很多, 倒着走';

export class WanError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WanError';
  }
}

function urlDoSpace(): string {
  const id = (process.env.HF_WAN_SPACE || SPACE_POR_OMISSAO).trim();
  if (id.startsWith('http')) return id.replace(/\/+$/, '');
  // "dono/nome" → https://dono-nome.hf.space
  return `https://${id.toLowerCase().replace(/[/_.]/g, '-')}.hf.space`;
}

function cabecalhos(): Record<string, string> {
  const token = process.env.HF_TOKEN;
  if (!token) throw new WanError('HF_TOKEN não configurado (token "Read" da conta Hugging Face).');
  return { Authorization: `Bearer ${token}` };
}

// Lê o stream SSE do Gradio até ao evento final ('complete' ou 'error').
async function lerResultado(res: Response): Promise<unknown[]> {
  if (!res.body) throw new WanError('Resposta do Space sem conteúdo.');
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let evento = '';

  for (;;) {
    const { value, done } = await reader.read();
    if (value) buffer += decoder.decode(value, { stream: true });

    let fim: number;
    while ((fim = buffer.indexOf('\n')) >= 0) {
      const linha = buffer.slice(0, fim).replace(/\r$/, '');
      buffer = buffer.slice(fim + 1);
      if (linha.startsWith('event:')) {
        evento = linha.slice(6).trim();
      } else if (linha.startsWith('data:')) {
        const dados = linha.slice(5).trim();
        if (evento === 'complete') {
          reader.cancel().catch(() => {});
          return JSON.parse(dados) as unknown[];
        }
        if (evento === 'error') {
          reader.cancel().catch(() => {});
          let msg = dados;
          try { const j = JSON.parse(dados); msg = typeof j === 'string' ? j : j?.message ?? j?.error ?? dados; } catch { /* texto simples */ }
          if (!msg || msg === 'null') msg = 'o Space devolveu um erro sem mensagem (pode ser a quota diária de GPU esgotada ou o Space a reiniciar).';
          throw new WanError(`Wan: ${msg}`);
        }
      }
    }
    if (done) break;
  }
  throw new WanError('O Space terminou a ligação sem devolver o vídeo.');
}

export interface OpcoesWan {
  imagemUrl: string;   // URL público da imagem de partida (ex.: Supabase Storage)
  prompt: string;      // movimento/câmara pretendidos, em inglês
  duracaoSeg?: number; // 0.5–5 (limite do Space); por omissão 5
  passos?: number;     // 1–30; o Space usa 6 (Lightning)
  seed?: number;       // fixa → reprodutível; omissa → aleatória
}

/** Gera o clip e devolve o MP4 original do Space (ainda não no formato Reels). */
export async function gerarClipWan(op: OpcoesWan): Promise<Buffer> {
  const base = urlDoSpace();
  const headers = cabecalhos();

  const imagem = {
    path: op.imagemUrl,
    url: op.imagemUrl,
    orig_name: 'imagem.jpg',
    meta: { _type: 'gradio.FileData' },
  };
  const duracao = Math.min(5, Math.max(1, op.duracaoSeg ?? 5));
  const data = [
    imagem,
    op.prompt,
    op.passos ?? 6,
    NEGATIVO,
    duracao,
    1,                         // guidance_scale (fase high noise)
    1,                         // guidance_scale_2 (fase low noise)
    op.seed ?? 42,
    op.seed === undefined,     // randomize_seed
  ];

  const inicio = await fetch(`${base}/gradio_api/call/generate_video`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ data }),
  });
  if (!inicio.ok) {
    const txt = (await inicio.text().catch(() => '')).slice(0, 300);
    throw new WanError(`Space indisponível (HTTP ${inicio.status}). ${txt}`.trim());
  }
  const { event_id } = (await inicio.json()) as { event_id?: string };
  if (!event_id) throw new WanError('O Space não devolveu event_id.');

  const stream = await fetch(`${base}/gradio_api/call/generate_video/${event_id}`, { headers });
  if (!stream.ok) throw new WanError(`Erro ao esperar pelo vídeo (HTTP ${stream.status}).`);
  const resultado = await lerResultado(stream);

  const video = resultado?.[0] as { url?: string; path?: string; video?: { url?: string } } | undefined;
  const urlVideo = video?.url ?? video?.video?.url
    ?? (video?.path ? `${base}/gradio_api/file=${video.path}` : undefined);
  if (!urlVideo) throw new WanError('O Space terminou mas não devolveu nenhum vídeo.');

  const ficheiro = await fetch(urlVideo, { headers });
  if (!ficheiro.ok) throw new WanError(`Não foi possível descarregar o vídeo gerado (HTTP ${ficheiro.status}).`);
  return Buffer.from(await ficheiro.arrayBuffer());
}
