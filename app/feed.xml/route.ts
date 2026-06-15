// Feed de produtos para Google Merchant Center / Shopping (RSS 2.0 + namespace g:).
// Inclui produtos ativos com preço fixo e pelo menos uma imagem.
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const SITE = 'https://pp3d.pt';

function esc(s: string): string {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]!));
}
const eur = (cents: number) => `${(cents / 100).toFixed(2)} EUR`;

interface Prod {
  slug: string; nome: string; descricao: string | null;
  preco_cents: number; preco_promo_cents: number | null;
  stock: number; sob_encomenda: boolean; requer_orcamento: boolean;
  prod_loja_categorias: { nome: string } | null;
  prod_loja_imagens: { url: string; ordem: number }[];
  prod_loja_variantes: { stock: number }[];
}

function stockTotal(p: Prod): number {
  if (p.prod_loja_variantes?.length) return p.prod_loja_variantes.reduce((s, v) => s + (v.stock ?? 0), 0);
  return p.stock ?? 0;
}

export async function GET() {
  let items = '';
  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const { data } = await supabase
      .from('prod_loja_produtos')
      .select('slug, nome, descricao, preco_cents, preco_promo_cents, stock, sob_encomenda, requer_orcamento, prod_loja_categorias(nome), prod_loja_imagens(url, ordem), prod_loja_variantes(stock)')
      .eq('estado', 'ativo');

    const produtos = ((data ?? []) as unknown as Prod[])
      .filter(p => !p.requer_orcamento && p.prod_loja_imagens?.length);

    items = produtos.map(p => {
      const foto = [...p.prod_loja_imagens].sort((a, b) => a.ordem - b.ordem)[0].url;
      const st = stockTotal(p);
      const availability = st > 0 ? 'in_stock' : p.sob_encomenda ? 'backorder' : 'out_of_stock';
      const temPromo = p.preco_promo_cents != null;
      const descricao = (p.descricao ?? p.nome).slice(0, 4500);
      return `
    <item>
      <g:id>${esc(p.slug)}</g:id>
      <g:title>${esc(p.nome)}</g:title>
      <g:description>${esc(descricao)}</g:description>
      <g:link>${SITE}/produto/${esc(p.slug)}</g:link>
      <g:image_link>${esc(foto)}</g:image_link>
      <g:availability>${availability}</g:availability>
      <g:price>${eur(p.preco_cents)}</g:price>${temPromo ? `
      <g:sale_price>${eur(p.preco_promo_cents!)}</g:sale_price>` : ''}
      <g:brand>PP3D.pt</g:brand>
      <g:condition>new</g:condition>
      <g:identifier_exists>no</g:identifier_exists>${p.prod_loja_categorias ? `
      <g:product_type>${esc(p.prod_loja_categorias.nome)}</g:product_type>` : ''}
    </item>`;
    }).join('');
  } catch (e) {
    console.error('[feed.xml] erro:', e);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>PP3D.pt — Loja</title>
    <link>${SITE}/loja</link>
    <description>Produtos impressos em 3D, prontos e personalizáveis.</description>${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  });
}
