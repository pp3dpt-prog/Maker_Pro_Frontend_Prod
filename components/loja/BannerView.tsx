'use client';

import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { Banner } from '@/lib/loja-server';

// Mostra um banner da loja e regista impressão (1x por página) e cliques.
export default function BannerView({ banner, compacto = false }: { banner: Banner; compacto?: boolean }) {
  const registado = useRef(false);

  useEffect(() => {
    if (registado.current) return;
    registado.current = true;
    supabase.rpc('registar_banner_evento', { p_banner: banner.id, p_evento: 'impressao' }).then(() => {}, () => {});
  }, [banner.id]);

  function clique() {
    supabase.rpc('registar_banner_evento', { p_banner: banner.id, p_evento: 'clique' }).then(() => {}, () => {});
  }

  const externo = !!banner.link && /^https?:\/\//i.test(banner.link) && !banner.link.includes('pp3d.pt');

  const conteudo = (
    <div style={{
      position: 'relative', overflow: 'hidden', borderRadius: 18, border: '1px solid #1e293b',
      background: '#0f172a', minHeight: compacto ? 140 : 180, display: 'flex', alignItems: 'flex-end',
    }}>
      <picture style={{ position: 'absolute', inset: 0 }}>
        {banner.imagem_mobile_url && <source media="(max-width: 640px)" srcSet={banner.imagem_mobile_url} />}
        <img src={banner.imagem_url} alt={banner.titulo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </picture>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(8,12,16,0.85) 0%, rgba(8,12,16,0.35) 60%, rgba(8,12,16,0) 100%)' }} />
      <div style={{ position: 'relative', padding: compacto ? '18px 20px' : '26px 30px', maxWidth: 560 }}>
        <p style={{ fontSize: compacto ? 18 : 24, fontWeight: 900, color: '#f1f5f9', margin: 0, letterSpacing: '-0.02em', lineHeight: 1.2 }}>{banner.titulo}</p>
        {banner.subtitulo && <p style={{ fontSize: 14, color: '#cbd5e1', margin: '6px 0 0', lineHeight: 1.5 }}>{banner.subtitulo}</p>}
        {banner.link && banner.texto_botao && (
          <span style={{ display: 'inline-block', marginTop: 14, padding: '9px 18px', background: '#2563eb', color: '#fff', borderRadius: 10, fontSize: 13, fontWeight: 700 }}>
            {banner.texto_botao}
          </span>
        )}
      </div>
    </div>
  );

  if (!banner.link) return conteudo;
  return (
    <a href={banner.link} onClick={clique} style={{ textDecoration: 'none', display: 'block' }}
      {...(externo ? { target: '_blank', rel: 'noopener noreferrer sponsored' } : {})}>
      {conteudo}
    </a>
  );
}
