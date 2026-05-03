import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import archiver from 'archiver';
import { NextRequest } from 'next/server';
import { v4 as uuid } from 'uuid';
import { createClient } from '@supabase/supabase-js';
import { PassThrough } from 'stream';

export const runtime = 'nodejs';

// ============================
// Config
// ============================
const OPENSCAD_BIN = 'openscad';
const TMP_DIR = path.join(process.cwd(), 'tmp');
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

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

async function gerarSTL({ scadTemplate, params, moduleCall, outFile }: any) {
  const scadFile = outFile.replace('.stl', '.scad');
  const vars = Object.entries(params)
    .map(([k, v]) => `${k} = ${typeof v === 'string' ? `"${v}"` : v};`)
    .join('\n');

  fs.writeFileSync(
    scadFile,
    `${vars}\n\n${scadTemplate}\n\n${moduleCall}`
  );

  await new Promise<void>((resolve, reject) => {
    const p = spawn(OPENSCAD_BIN, ['-o', outFile, scadFile]);
    p.on('close', c => (c === 0 ? resolve() : reject(new Error('OpenSCAD failed'))));
    p.on('error', reject);
  });
}

// ============================
// Route
// ============================
export async function POST(req: NextRequest) {
  console.log('DOWNLOAD STL — START');

  const supabase = getSupabaseServerClient();

  try {
    const user = await getUser(req, supabase);
    const { design_id, params } = await req.json();

    const { data: design } = await supabase
      .from('prod_designs')
      .select('scad_template, credit_cost')
      .eq('id', design_id)
      .single();

    const jobId = uuid();
    const base = path.join(TMP_DIR, jobId);
    const files: any[] = [];

    
    const { data: design, error: designError } = await supabase
      .from('prod_designs')
      .select('scad_template, credit_cost')
      .eq('id', design_id)
      .single();

    if (designError || !design) {
      return new Response('DESIGN_NOT_FOUND', { status: 404 });
    }


    // ============================
    // DOWNLOAD
    // ============================

    if (files.length === 1) {
      console.log('DOWNLOAD STL SINGLE');
      return new Response(fs.createReadStream(files[0].path) as any, {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${files[0].name}"`,
        },
      });
    }

    console.log('DOWNLOAD ZIP');

    const archive = archiver('zip', { zlib: { level: 9 } });
    const stream = new PassThrough();

    archive.pipe(stream);

    for (const f of files) {
      archive.file(f.path, { name: f.name });
    }

    archive.finalize();

    return new Response(stream as any, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${design_id}.zip"`,
      },
    });
  } catch (err) {
    console.error('DOWNLOAD FAILED', err);
    return new Response('DOWNLOAD_FAILED', { status: 500 });
  }
}