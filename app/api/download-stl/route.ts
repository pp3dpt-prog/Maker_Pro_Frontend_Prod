import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import archiver from 'archiver';
import { NextRequest } from 'next/server';
import { v4 as uuid } from 'uuid';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

// ============================
// Config
// ============================
const OPENSCAD_BIN = 'openscad';
const TMP_DIR = path.join(process.cwd(), 'tmp');

if (!fs.existsSync(TMP_DIR)) {
  fs.mkdirSync(TMP_DIR, { recursive: true });
}

// ============================
// Helpers
// ============================
function getSupabaseServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function getUser(req: NextRequest, supabase: any) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) throw new Error('UNAUTHORIZED');

  const token = authHeader.replace('Bearer ', '');
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data?.user) throw new Error('UNAUTHORIZED');
  return data.user;
}

async function gerarSTL({
  scadTemplate,
  params,
  moduleCall,
  outFile,
}: {
  scadTemplate: string;
  params: Record<string, any>;
  moduleCall: string;
  outFile: string;
}) {
  const scadFile = outFile.replace('.stl', '.scad');

  const vars = Object.entries(params)
    .map(([k, v]) =>
      `${k} = ${typeof v === 'string' ? `"${v}"` : v};`
    )
    .join('\n');

  const scadContent = `
${vars}

${scadTemplate}

${moduleCall}
`;

  fs.writeFileSync(scadFile, scadContent);

  await new Promise<void>((resolve, reject) => {
    const p = spawn(OPENSCAD_BIN, ['-o', outFile, scadFile]);
    p.on('close', code => (code === 0 ? resolve() : reject()));
    p.on('error', reject);
  });
}

// ============================
// Route
// ============================
export async function POST(req: NextRequest) {
  const supabase = getSupabaseServerClient();

  try {
    const user = await getUser(req, supabase);
    const body = await req.json();

    const { design_id, params } = body;
    if (!design_id || !params) {
      return new Response('INVALID_REQUEST', { status: 400 });
    }

    // ============================
    // Fetch design + cost
    // ============================
    const { data: design, error: designError } = await supabase
      .from('prod_designs')
      .select('scad_template, credit_cost')
      .eq('id', design_id)
      .single();

    if (designError || !design) {
      return new Response('DESIGN_NOT_FOUND', { status: 404 });
    }

    const cost = design.credit_cost ?? 1;

    // ============================
    // Check credits
    // ============================
    const { data: perfil, error: perfilError } = await supabase
      .from('prod_perfis')
      .select('creditos_disponiveis')
      .eq('id', user.id)
      .single();

    if (
      perfilError ||
      !perfil ||
      perfil.creditos_disponiveis < cost
    ) {
      return new Response('INSUFFICIENT_CREDITS', { status: 402 });
    }

    // ============================
    // Generate STL(s)
    // ============================
    const jobId = uuid();
    const base = path.join(TMP_DIR, jobId);
    const files: { name: string; path: string }[] = [];

    // --- Caixa (sempre)
    const caixaPath = `${base}_caixa.stl`;
    await gerarSTL({
      scadTemplate: design.scad_template,
      params,
      moduleCall: 'corpo_caixa();',
      outFile: caixaPath,
    });
    files.push({ name: 'caixa.stl', path: caixaPath });

    // --- Tampa (opcional, BOOLEAN CORRETO)
    if (params.tem_tampa === true) {
      const tampaPath = `${base}_tampa.stl`;
      await gerarSTL({
        scadTemplate: design.scad_template,
        params,
        moduleCall: 'tampa_caixa();',
        outFile: tampaPath,
      });
      files.push({ name: 'tampa.stl', path: tampaPath });
    }

    // ============================
    // Debit credits
    // ============================
    await supabase.from('prod_transacoes').insert({
      user_id: user.id,
      descricao: `Download STL (${design_id})`,
      creditos_alterados: -cost,
    });

    await supabase
      .from('prod_perfis')
      .update({
        creditos_disponiveis: perfil.creditos_disponiveis - cost,
      })
      .eq('id', user.id);

    // ============================
    // Respond download
    // ============================
    // Case 1: single STL
    if (files.length === 1) {
      const stream = fs.createReadStream(files[0].path);

      return new Response(stream as any, {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${files[0].name}"`,
        },
      });
    }

    // Case 2: ZIP with multiple STLs (NODE STREAM – CORRETO)
    const archive = archiver('zip', { zlib: { level: 9 } });

    for (const f of files) {
      archive.file(f.path, { name: f.name });
    }

    archive.finalize();

    return new Response(archive as any, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${design_id}.zip"`,
      },
    });
  } catch (err) {
    console.error('DOWNLOAD FAILED:', err);
    return new Response('DOWNLOAD_FAILED', { status: 500 });
  }
}
