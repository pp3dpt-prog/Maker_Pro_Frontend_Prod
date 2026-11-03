// Converte um clip qualquer (ex.: o do Wan 2.2 — ~480p, 16 fps, sem som) para o formato
// que o Instagram e o Facebook aceitam em Reels: 720x1280 (9:16), 30 fps, H.264 + AAC,
// moov no início. Imagens que não sejam verticais ficam centradas sobre um fundo desfocado
// da própria imagem, em vez de barras pretas.
import { execFile } from 'child_process';
import { promisify } from 'util';
import { mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';
import ffmpegPath from 'ffmpeg-static';

const run = promisify(execFile);

export const REEL_LARGURA = 720;
export const REEL_ALTURA = 1280;

// Tamanho da imagem enviada ao Wan: 480x832 é o formato vertical que o Space usa sem cortar
// (MIN_DIM x MAX_DIM no app.py). Uma imagem mais pequena também baixa o tempo de GPU que a
// ZeroGPU reserva por vídeo (~70 s para 5 s de vídeo, contra ~100 s numa foto 3:4).
export const WAN_LARGURA = 480;
export const WAN_ALTURA = 832;

/**
 * Prepara a imagem de partida para o Wan: vertical 480x832, produto inteiro ao centro sobre
 * um fundo desfocado da própria imagem (nada é cortado). Devolve um JPEG.
 */
export async function prepararImagemParaWan(entrada: Buffer): Promise<Buffer> {
  if (!ffmpegPath) throw new Error('ffmpeg não disponível neste servidor.');
  const dir = await mkdtemp(path.join(tmpdir(), 'wanimg-'));
  const origem = path.join(dir, 'origem');
  const destino = path.join(dir, 'vertical.jpg');
  try {
    await writeFile(origem, entrada);
    const W = WAN_LARGURA, H = WAN_ALTURA;
    const filtro = [
      `[0:v]split=2[a][b]`,
      `[a]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},boxblur=20:2[fundo]`,
      `[b]scale=${W}:${H}:force_original_aspect_ratio=decrease[frente]`,
      `[fundo][frente]overlay=(W-w)/2:(H-h)/2,setsar=1[v]`,
    ].join(';');
    await run(ffmpegPath, [
      '-y', '-hide_banner', '-loglevel', 'error',
      '-i', origem,
      '-filter_complex', filtro, '-map', '[v]',
      '-frames:v', '1', '-q:v', '2',
      destino,
    ], { timeout: 30_000, maxBuffer: 10 * 1024 * 1024 });
    return await readFile(destino);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export async function converterParaReel(entrada: Buffer): Promise<Buffer> {
  if (!ffmpegPath) throw new Error('ffmpeg não disponível neste servidor.');

  const dir = await mkdtemp(path.join(tmpdir(), 'reel-'));
  const origem = path.join(dir, 'origem.mp4');
  const destino = path.join(dir, 'reel.mp4');
  try {
    await writeFile(origem, entrada);

    const W = REEL_LARGURA, H = REEL_ALTURA;
    const filtro = [
      `[0:v]fps=30,split=2[a][b]`,
      `[a]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},boxblur=20:2[fundo]`,
      `[b]scale=${W}:${H}:force_original_aspect_ratio=decrease[frente]`,
      `[fundo][frente]overlay=(W-w)/2:(H-h)/2,setsar=1,format=yuv420p[v]`,
    ].join(';');

    await run(ffmpegPath, [
      '-y', '-hide_banner', '-loglevel', 'error',
      '-i', origem,
      // Faixa de áudio silenciosa: alguns leitores/validações da Meta preferem vídeo com áudio.
      '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000',
      '-filter_complex', filtro,
      '-map', '[v]', '-map', '1:a',
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-profile:v', 'high', '-r', '30',
      // Facebook Reels pede GOP fechado de 2-5 s: keyframe fixo a cada 2 s (60 frames).
      '-g', '60', '-keyint_min', '60', '-sc_threshold', '0', '-flags', '+cgop',
      '-c:a', 'aac', '-b:a', '128k',
      '-shortest',
      '-movflags', '+faststart',
      destino,
    ], { timeout: 120_000, maxBuffer: 10 * 1024 * 1024 });

    return await readFile(destino);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
