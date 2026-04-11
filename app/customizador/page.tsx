'use client';

import { useEffect, useState, Suspense } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import STLViewer from '@/components/STLViewer';
import EditorControls from '@/components/EditorControls';

/**
 * Tipagem mínima e segura do produto
 * (não inventa campos, só os usados aqui)
 */
type ProdutoAtual = {
  id: string | number;
  nome?: string;
  familia?: string;
  ui_schema?: any[];
  stl_file_path?: string;
};

function CustomizadorConteudo() {
  const searchParams = useSearchParams();

  const id = searchParams.get('id');
  const familiaURL = searchParams.get('familia');

  const [loading, setLoading] = useState(true);
  const [mostrarPreview, setMostrarPreview] = useState(false);

  const [produtoAtual, setProdutoAtual] = useState<ProdutoAtual | null>(null);
  const [modelos, setModelos] = useState<any[]>([]);
  const [valores, setValores] = useState<Record<string, any>>({
    fonte: 'Open Sans',
  });

  const [perfil, setPerfil] = useState<any>(null);

  const textoForma = familiaURL?.toLowerCase().includes('caixa')
    ? 'FORMA DA CAIXA'
    : 'FORMA DA MEDALHA';

  const mostrarBotaoPreview =
    produtoAtual?.ui_schema?.some(
      (c: any) => c.name === 'show_preview_button' && c.value === true
    ) ?? false;

  useEffect(() => {
    async function fetchData() {
      if (!familiaURL) {
        setLoading(false);
        return;
      }

      // 1️⃣ Buscar designs da família
      const { data: lista, error } = await supabase
        .from('prod_designs')
        .select('*')
        .eq('familia', familiaURL);

      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }

      if (lista && lista.length > 0) {
        setModelos(lista);

        const selecionado = id
          ? lista.find((m) => String(m.id) === String(id))
          : lista[0];

        setProdutoAtual(selecionado ?? lista[0]);
      }

      // 2️⃣ Perfil do utilizador (se autenticado)
      const {
