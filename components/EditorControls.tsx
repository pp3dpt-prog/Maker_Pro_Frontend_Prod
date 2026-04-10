'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Inicialização segura do cliente Supabase para evitar erros de Build no Vercel
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

interface EditorControlsProps {
  produto: any;
  perfil: any;
  onUpdate: (valores: any) => void;
  onGerarSucesso: (url: string) => void;
  stlUrl: string | null;
}

export default function EditorControls({ 
  produto, 
  perfil, 
  onUpdate, 
  onGerarSucesso, 
  stlUrl 
}: EditorControlsProps) {
  
  const [loading, setLoading] = useState(false);
  const [pagando, setPagando] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [localValores, setLocalValores] = useState<any>({});
  const [saldoAtual, setSaldoAtual] = useState(perfil?.creditos_disponiveis ?? 0);

  const custo = produto?.custo_creditos ?? 1;

  // Sincroniza o saldo inicial quando o perfil é carregado
  useEffect(() => {
    if (perfil?.creditos_disponiveis !== undefined) {
      setSaldoAtual(perfil.creditos_disponiveis);
    }
  }, [perfil]);

  // Inicializa os parâmetros do OpenSCAD baseados no produto selecionado
  useEffect(() => {
    if (produto) {
      const iniciais = { ...(produto.parametros_default || {}) };
      if (produto.ui_schema) {
        produto.ui_schema.forEach((c: any) => {
          iniciais[c.name] = (c.value !== undefined) ? c.value : c.default;
        });
      }
      setLocalValores(iniciais);
      onUpdate(iniciais);
    }
  }, [produto?.id]);

  // Função para Gerar o STL no Docker (Sem custos aqui)
  const handleGerarSTL = async () => {
    if (!perfil?.id) return alert("Utilizador não identificado.");
    
    setLoading(true);
    setProgresso(20);

    try {
      const res = await fetch("https://maker-pro-docker-prod.onrender.com/gerar-stl-pro", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...localValores, 
          id: produto.id, 
          user_id: perfil.id 
        }),
      });

      const data = await res.json();

      if (res.ok && data.url) {
        setProgresso(100);
        onGerarSucesso(data.url);
      } else {
        alert(data.error || "Erro ao gerar ficheiro.");
      }
    } catch (e) {
      console.error(e);
      alert("Erro de ligação ao servidor de renderização.");
    } finally {
      setLoading(false);
      setTimeout(() => setProgresso(0), 2000);
    }
  };

  // Função para Descontar Créditos e Iniciar Download
  const handleDownloadComPagamento = async () => {
    if (!supabase) return alert("Configuração do Supabase em falta.");
    if (saldoAtual < custo) return alert("Saldo insuficiente para descarregar.");
    if (!stlUrl) return alert("Gere o ficheiro primeiro.");

    setPagando(true);

    try {
      const novoSaldo = saldoAtual - custo;

      // 1. Atualiza créditos na tabela prod_perfis
      const { error: upErr } = await supabase
        .from('prod_perfis')
        .update({ creditos_disponiveis: novoSaldo })
        .eq('id', perfil.id);

      if (upErr) throw upErr;

      // 2. Regista a geração na tabela de assets do utilizador
      const { error: assetErr } = await supabase
        .from('prod_user_assets')
        .insert([{
          user_id: perfil.id,
          design_id: produto.id,
          stl_url: stlUrl,
          nome_personalizado: localValores.nome_pet || localValores.texto || 'meu_design_3d'