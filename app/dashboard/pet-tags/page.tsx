'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Perfil = {
  id: string;
  email: string;
  creditos: number;
  creditos_disponiveis: number;
  acesso_comercial_ativo: boolean;
  prod_planos?: {
    nome: string;
  } | null;
};

type Transacao = {
  criado_em: string;
  descricao: string;
  creditos_alterados: number;
};

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'conta' | 'faturacao' | 'projetos'>('conta');
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [loading, setLoading] = useState(true);

  const isMaker = perfil?.acesso_comercial_ativo === true;

  useEffect(() => {
    async function carregarDados() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setLoading(false);
        return;
      }

      // Perfil
      const { data: perfilData } = await supabase
        .from('prod_perfis')
        .select('*, prod_planos(nome)')
        .eq('id', session.user.id)
        .maybeSingle();

      if (perfilData) {
        setPerfil(perfilData as Perfil);
      }

      // Transações
      const { data: transData } = await supabase
        .from('prod_transacoes')
        .select('*')
        .eq('user_id', session.user.id)
        .order('criado_em', { ascending: false });

      if (transData) {
        setTransacoes(transData as Transacao[]);
      }

      setLoading(false);
    }

    carregarDados();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <p>A carregar o seu Painel Maker…</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: 24 }}>
      {/* SIDEBAR */}
      <aside style={{ width: 260 }}>
        <h3>Menu Maker</h3>

        <button onClick={() => setActiveTab('conta')}>👤 Resumo da Conta</button>
        <button onClick={() => setActiveTab('faturacao')}>💳 Compras e Créditos</button>
        <button onClick={() => setActiveTab('projetos')}>📂 Meus Ficheiros STL</button>

        <button
          onClick={() =>
            supabase.auth.signOut().then(() => {
              window.location.href = '/';
            })
          }
          style={{ marginTop: 20, color: '#f87171' }}
        >
          Sair
        </button>
      </aside>

      {/* CONTEÚDO */}
      <main style={{ flex: 1 }}>
        {activeTab === 'conta' && (
          <>
            <h2>Olá, {perfil?.email?.split('@')[0]}</h2>

            <h4>PLANO ATIVO</h4>
            <p>{perfil?.prod_planos?.nome ?? 'Uso Pessoal'}</p>

            <h4>CRÉDITOS DISPONÍVEIS</h4>
            <p>{perfil?.creditos_disponiveis ?? 0}</p>

            <h4>TOTAL USADO</h4>
            <p>{perfil?.creditos ?? 0}</p>

            <h5>🛡️ Estado da Licença</h5>
            <p>
              {isMaker
                ? '✅ Licença Comercial Ativa: Pode vender as peças impressas.'
                : '❌ Apenas Uso Pessoal: Atualize para um plano Maker.'}
            </p>
          </>
        )}

        {activeTab === 'faturacao' && (
          <>
            <h2>Histórico de Compras e Créditos</h2>

            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Conceito</th>
                  <th>Movimento</th>
                </tr>
              </thead>
              <tbody>
                {transacoes.length > 0 ? (
                  transacoes.map((t, i) => (
                    <tr key={i}>
                      <td>{new Date(t.criado_em).toLocaleDateString()}</td>
                      <td>{t.descricao}</td>
                      <td
                        style={{
                          color: t.creditos_alterados > 0 ? '#4ade80' : '#f87171',
                        }}
                      >
                        {t.creditos_alterados > 0
                          ? `+${t.creditos_alterados}`
                          : t.creditos_alterados}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3}>Não existem registos.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </>
        )}

        {activeTab === 'projetos' && (
          <>
            <h2>📁 Os seus ficheiros STL</h2>
            <p>Cada exportação utiliza 1 crédito.</p>
          </>
        )}
      </main>
    </div>
  );
}