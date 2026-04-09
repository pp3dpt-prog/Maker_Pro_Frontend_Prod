const express = require('express');
const { exec } = require('child_process');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// CONFIGURAÇÃO SUPABASE
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Caminhos para pastas temporárias
const tmpDir = path.join(__dirname, 'tmp');
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);

app.post('/gerar-stl-pro', async (req, res) => {
    const d = req.body;
    const userId = d.user_id;
    const produtoId = d.id;
    const custo = d.custo || 1;
    
    // Identificadores de ficheiro
    const timestamp = Date.now();
    const outputFileName = `${produtoId}_${timestamp}.stl`;
    const outputPath = path.join(tmpDir, outputFileName);
    const scadPath = path.join(__dirname, 'scads', `${produtoId}.scad`);

    console.log(`>>> Iniciando processo para User: ${userId} | Ficheiro: ${outputFileName}`);

    try {
        // 1. VALIDAÇÃO DE UTILIZADOR E SALDO
        if (!userId) return res.status(400).json({ error: "ID de utilizador ausente." });

        const { data: perfil, error: perfilErr } = await supabase
            .from('prod_perfis')
            .select('creditos_disponiveis')
            .eq('id', userId)
            .single();

        if (perfilErr || !perfil) return res.status(404).json({ error: "Perfil não encontrado." });
        if (perfil.creditos_disponiveis < custo) return res.status(400).json({ error: "Saldo insuficiente." });

        // 2. CONSTRUÇÃO DOS PARÂMETROS OPENSCAD
        // Transforma o objeto localValores em strings de argumentos -D para o OpenSCAD
        let params = "";
        Object.keys(d).forEach(key => {
            if (key !== 'id' && key !== 'user_id' && key !== 'custo' && key !== 'nome_personalizado') {
                const val = d[key];
                if (typeof val === 'string') {
                    params += ` -D '${key}="${val}"'`;
                } else {
                    params += ` -D '${key}=${val}'`;
                }
            }
        });

        const command = `openscad -o "${outputPath}" ${params} "${scadPath}"`;
        console.log("Executando:", command);

        // 3. EXECUÇÃO DO OPENSCAD
        exec(command, async (error, stdout, stderr) => {
            if (error) {
                console.error(`Erro OpenSCAD: ${error.message}`);
                return res.status(500).json({ error: "Falha na renderização 3D." });
            }

            try {
                // 4. UPLOAD PARA SUPABASE STORAGE
                const fileBuffer = fs.readFileSync(outputPath);
                const vaultPath = `users/${userId}/${outputFileName}`;

                const { data: uploadData, error: uploadErr } = await supabase.storage
                    .from('designs-vault')
                    .upload(vaultPath, fileBuffer, { contentType: 'application/sla', upsert: true });

                if (uploadErr) throw uploadErr;

                const { data: urlData } = supabase.storage.from('designs-vault').getPublicUrl(vaultPath);
                const publicUrl = urlData.publicUrl;

                // 5. DEDUÇÃO DE CRÉDITOS E REGISTO
                const novoSaldo = perfil.creditos_disponiveis - custo;
                await supabase.from('prod_perfis').update({ creditos_disponiveis: novoSaldo }).eq('id', userId);

                await supabase.from('prod_user_assets').insert([{
                    user_id: userId,
                    design_id: produtoId,
                    nome_personalizado: d.nome_personalizado || outputFileName,
                    stl_url: publicUrl,
                    custo_pago: custo,
                    last_rendered_at: new Date().toISOString()
                }]);

                // 6. LIMPEZA E RESPOSTA
                fs.unlinkSync(outputPath); // Remove ficheiro local
                res.json({ success: true, url: publicUrl, novoSaldo: novoSaldo });

            } catch (innerErr) {
                console.error("Erro Pós-Renderização:", innerErr.message);
                res.status(500).json({ error: innerErr.message });
            }
        });

    } catch (err) {
        console.error("Erro Geral:", err.message);
        res.status(500).json({ error: "Erro interno no servidor." });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log(`Servidor completo na porta ${PORT}`));