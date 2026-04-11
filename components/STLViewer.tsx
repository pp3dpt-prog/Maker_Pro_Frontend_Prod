'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { gerarStl } from '@/lib/api';

type ValoresProduto = Record<string, string | number | boolean>;

/**
 * MODO 1 (novo): gerar STL a partir de produto + valores
 */
type STLViewerProdutoMode = {
  mode: 'produto';
  produto: { id: string; nome?: string };
  valores: ValoresProduto;
  storagePath?: never;
  url?: never;
};

/**
 * MODO 2 (novo): descarregar STL a partir de storagePath (bucket privado)
 */
type STLViewerStorageMode = {
  mode: 'storage';
  storagePath: string;
  valores?: ValoresProduto;
  produto?: never;
  url?: never;
};

/**
 * MODO 3 (legado): descarregar STL a partir de URL
 * - `mode` é opcional para não obrigar a mexer já nos ficheiros antigos
 * - `url` é OBRIGATÓRIO (evita string|undefined que faz o TS sublinhar)
 */
type STLViewerLegacyUrlMode = {
  url: string;
  mode?: 'url';
  valores?: ValoresProduto;
  produto?: never;
  storagePath?: never;
};

type STLViewerProps =
  | STLViewerProdutoMode
  | STLViewerStorageMode
  | STLViewerLegacyUrlMode;

/** Heurística simples para distinguir storagePath vs URL */
function isProbablyStoragePath(s: string) {
  return s.startsWith('users/') || (!s.startsWith('http') && s.includes('/'));
}

/** Type guard explícito para o TS “fechar” o tipo e não sublinhar `url` */
function hasUrl(p: STLViewerProps): p is STLViewerLegacyUrlMode {
  return typeof (p as STLViewerLegacyUrlMode).url === 'string' && (p as STLViewerLegacyUrlMode).url.length > 0;
}

export default function STLViewer(props: STLViewerProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function downloadBlob(blob: Blob, filename: string) {
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
  }

  async function downloadFromStorage(storagePath: string, filename: string) {
    const { data, error } = await supabase.storage
      .from('designs-vault')
      .download(storagePath);

    if (error) throw error;
    if (!data) throw new Error('Download vazio (storagePath).');

    await downloadBlob(data, filename);
  }

  async function downloadFromUrl(url: string, filename: string) {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Falha ao descarregar STL (url).');
    const blob = await response.blob();
    await downloadBlob(blob, filename);
  }

  async function handleClick() {
    setLoading(true);
    setError(null);

    try {
      /**
       * ─────────────────────────────
       * MODO LEGADO: <STLViewer url="..."/>
       * ─────────────────────────────
       */
      if (hasUrl(props)) {
        const url = props.url;

        // Se alguém passar acidentalmente um storagePath no campo url, tratamos como storage
        if (isProbablyStoragePath(url)) {
          await downloadFromStorage(url, 'modelo.stl');
          return;
        }

        // URL HTTP normal
        await downloadFromUrl(url, 'modelo.stl');
        return;
      }

      /**
       * ─────────────────────────────
       * MODO STORAGE: <STLViewer mode="storage" storagePath="..."/>
       * ─────────────────────────────
       */
      if (props.mode === 'storage') {
        await downloadFromStorage(props.storagePath, 'modelo.stl');
        return;
      }

      /**
       * ─────────────────────────────
       * MODO PRODUTO: <STLViewer mode="produto" produto=... valores=.../>
       * ─────────────────────────────
       */
      const result = await gerarStl(props.produto.id, props.valores);

      // Preferência: storagePath, mas mantém fallback para `url`/`path`
      const storagePathOrUrl: string | undefined =
        result?.storagePath ?? result?.path ?? result?.url;

      if (!storagePathOrUrl) {
        throw new Error('Backend não devolveu storagePath/url.');
      }

      // Se for URL HTTP, faz fetch
      if (!isProbablyStoragePath(storagePathOrUrl) && storagePathOrUrl.startsWith('http')) {
        await downloadFromUrl(storagePathOrUrl, `${props.produto.id}.stl`);
        return;
      }

      // Caso contrário, trata como storagePath
      await downloadFromStorage(storagePathOrUrl, `${props.produto.id}.stl`);
    } catch (e: any) {
      setError(e?.message || 'Erro ao obter STL');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button onClick={handleClick} disabled={loading}>
        {loading ? 'A processar…' : 'Obter STL'}
      </button>

      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}