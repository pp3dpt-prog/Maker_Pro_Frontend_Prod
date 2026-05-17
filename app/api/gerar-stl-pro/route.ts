import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const BUCKET = 'makers_pro_stl_prod';
const SIGNED_URL_EXPIRY = 3600; // 1 hora

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// Substitui valores que sejam storage paths (ex: "uploads/...") por URLs assinadas
async function resolveStoragePaths(params: Record<string, any>): Promise<Record<string, any>> {
  const supabase = supabaseAdmin();
  const resolved: Record<string, any> = {};

  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string' && value.startsWith('uploads/')) {
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(value, SIGNED_URL_EXPIRY);
      resolved[key] = error ? value : data.signedUrl;
    } else {
      resolved[key] = value;
    }
  }

  return resolved;
}

export function GET() {
  return new Response('This endpoint requires POST', { status: 405 });
}

export async function POST(req: NextRequest) {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  if (!backendUrl) {
    return new Response('NEXT_PUBLIC_BACKEND_URL not configured', { status: 500 });
  }

  const body = await req.json();
  const designId = body.design_id ?? body.id;
  const params = body.params;
  const system = body.system ?? 'legacy'; // 'legacy' = pet tags, 'scad' = novos produtos

  if (!designId || !params) {
    return new Response('INVALID_REQUEST', { status: 400 });
  }

  // ── SISTEMA NOVO: produtos com scad_template (copo, etiquetas, etc.) ──
  if (system === 'scad') {
    const auth = req.headers.get('authorization');
    const resolvedParams = await resolveStoragePaths(params);

    const backendRes = await fetch(`${backendUrl}/gerar-stl-pro`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(auth ? { Authorization: auth } : {}),
      },
      body: JSON.stringify({
        id: designId,
        mode: 'preview',
        ...resolvedParams, // storage paths já substituídos por URLs assinadas
      }),
    });

    if (!backendRes.ok) {
      const text = await backendRes.text();
      return new Response(text, { status: backendRes.status });
    }

    // Backend devolve { success, url, storagePath, cached, mode }
    const data = await backendRes.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // ── SISTEMA LEGADO: pet tags com base_geometry estático ──
  const backendRes = await fetch(`${backendUrl}/api/preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ design_id: designId, params }),
  });

  if (!backendRes.ok) {
    const text = await backendRes.text();
    return new Response(text, { status: backendRes.status });
  }

  const buffer = await backendRes.arrayBuffer();
  return new Response(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'model/stl',
      'Cache-Control': 'no-store',
    },
  });
}
