'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function PricingPage() {
  const router = useRouter();
  const [planos, setPlanos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    async function carregarPlanos() {
      try {
        setLoading(true);
        // Tenta ler os planos da tua tabela
        const { data, error } = await supabase
          .from('prod_planos')
          .select('*')
          .order('preco', { ascending: true });

        if (error) throw error;

        if (data && data.length > 0) {
          setPlanos(data);
        } else {
          setErro("A tabela 'prod_planos' está vazia ou sem permissão de leitura.");
        }
      } catch (err: any) {
        console.error("Erro ao carregar base de dados:", err.message);
        setErro(err.message);
      } finally {
        setLoading(false);
      }
    }
    carregarPlanos();
  }, []);

  if (loading) return <div style={{ background: '#0f172a', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white' }}>A ligar à base de dados...</div>;

  if (erro) return (
    <div style={{ background: '#0f172a', height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: '#f87171', padding: '20px', textAlign: 'center' }}>
      <h2 style={{ marginBottom: '10px' }}>⚠️ Erro de Ligação</h2>
      <p style={{ color: '#94a3b8', fontSize: '14px' }}>{erro}</p>
      <button onClick={() => window.location.reload()} style={{ marginTop: '20px', padding: '10px 20px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Tentar Novamente</button>
    </div>
  );

  // Determinar o plano mais popular (exemplo: o do meio ou aquele com melhor custo-benefício)
  const getPopularPlanId = () => {
    if (!planos || planos.length === 0) return null;
    // Se tiver 3+ planos, retorna o do meio; senão, o primeiro
    if (planos.length >= 3) return planos[Math.floor(planos.length / 2)].id;
    return planos[0]?.id || null;
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: 'white', padding: '80px 20px', fontFamily: 'sans-serif' }}>
      <div style={{ textAlign: 'center', marginBottom: '60px' }}>
        <h1 style={{
          fontSize: '36px',
          fontWeight: '900',
          marginBottom: '15px',
          background: 'linear-gradient(to right, #3b82f6, #8b5cf6)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          Planos de Assinatura
        </h1>
        <p style={{
          color: '#94a3b8',
          fontSize: '18px',
          maxWidth: '600px',
          margin: '0 auto'
        }}>
          Escolha o plano ideal para acessar nosso configurador 3D e obter créditos para downloads de arquivos STL.
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '24px',
        maxWidth: '1200px',
        margin: '0 auto 60px'
      }}>
        {planos.map((plano, index) => {
          const isPopular = plano.id === getPopularPlanId();

          return (
            <div
              key={plano.id}
              style={{
                background: '#1e293b',
                borderRadius: '24px',
                padding: '40px',
                border: `1px solid ${isPopular ? '#3b82f6' : '#334155'}`,
                position: 'relative',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              {/* Selos de destaque */}
              {isPopular && (
                <div style={{
                  position: 'absolute',
                  top: '-12px',
                  left: '24px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: '600',
                  padding: '4px 12px',
                  borderRadius: '12px'
                }}>Mais Popular</div>
              )}

              {/* Cabeçalho do plano */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '24px'
              }}>
                <h2 style={{
                  fontSize: '20px',
                  color: isPopular ? '#3b82f6' : '#f1f5f9',
                  fontWeight: 'bold',
                  margin: '0',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  {plano.nome}
                </h2>
                {plano.permite_venda_comercial && (
                  <div style={{
                    backgroundColor: '#10b98120',
                    color: '#10b981',
                    fontSize: '12px',
                    fontWeight: '600',
                    padding: '4px 10px',
                    borderRadius: '14px',
                    border: '1px solid #10b98130'
                  }}>
                    Licença Comercial Incluída
                  </div>
                )}
              </div>

              {/* Preço da assinatura */}
              <div style={{
                textAlign: 'center',
                marginBottom: '24px'
              }}>
                <p style={{
                  fontSize: '16px',
                  color: '#64748b',
                  marginBottom: '8px'
                }}>Assinatura Mensal</p>
                <p style={{
                  fontSize: '32px',
                  fontWeight: '800',
                  color: 'white',
                  margin: '0'
                }}>{plano.preco}€</p>
                <p style={{
                  fontSize: '14px',
                  color: '#94a3b8',
                  marginTop: '4px'
                }}>{plano.validade_dias} dias de acesso</p>
              </div>

              {/* Créditos incluídos */}
              <div style={{
                background: '#0f172a',
                borderRadius: '16px',
                padding: '20px',
                marginBottom: '24px',
                border: '1px solid #334155',
                textAlign: 'center'
              }}>
                <p style={{
                  fontSize: '16px',
                  color: '#64748b',
                  marginBottom: '8px'
                }}>Créditos para Downloads</p>
                <p style={{
                  fontSize: '36px',
                  fontWeight: '900',
                  color: '#4ade80',
                  margin: '0'
                }}>{plano.limite_downloads} créditos</p>
                <p style={{
                  fontSize: '13px',
                  color: '#94a3b8',
                  marginTop: '4px'
                }}>
                  Cada crédito = 1 download de arquivo STL
                </p>
              </div>

              {/* Vantagens do plano */}
              <div style={{
                flexGrow: 1,
                marginBottom: '24px'
              }}>
                <h3 style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#f1f5f9',
                  marginBottom: '16px'
                }}>O que está incluído:</h3>
                <ul style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}>
                  {/* Vantagens dinâmicas da nova coluna ou padrão */}
                  {plano.vantagens && plano.vantagens.length > 0 ? (
                    plano.vantagens.map((v: string, i: number) => (
                      <li
                        key={i}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '14px',
                          color: '#e2e8f0'
                        }}
                      >
                        <span style={{ color: '#3b82f6' }}>✓</span> {v}
                      </li>
                    ))
                  ) : (
                    <>
                      <li style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '14px',
                        color: '#e2e8f0'
                      }}>
                        <span style={{ color: '#3b82f6' }}>✓</span>
                        {plano.permite_venda_comercial ? 'Licença Comercial' : 'Uso Pessoal'}
                      </li>
                      <li style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '14px',
                        color: '#e2e8f0'
                      }}>
                        <span style={{ color: '#3b82f6' }}>✓</span>
                        Download STL em Alta Qualidade
                      </li>
                      <li style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '14px',
                        color: '#e2e8f0'
                      }}>
                        <span style={{ color: '#3b82f6' }}>✓</span>
                        Acesso ao Configurador 3D Completo
                      </li>
                    </>
                  )}
                </ul>
              </div>

              {/* Botão de seleção */}
              <button
                onClick={() => router.push(`/checkout?plan=${plano.id}`)}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '12px',
                  background: isPopular ? '#3b82f6' : '#1e293b',
                  color: isPopular ? 'white' : '#94a3b8',
                  fontWeight: '600',
                  fontSize: '16px',
                  textDecoration: 'none',
                  border: isPopular ? 'none' : '1px solid #334155',
                  transition: 'all 0.2s',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {isPopular ? 'Começar Agora' : 'Selecionar Plano'}
                {!isPopular && (
                  <span style={{
                    marginLeft: '8px',
                    fontSize: '14px',
                    opacity: 0.7
                  }}>→</span>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Seção de explicação sobre créditos e downloads */}
      <section style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '0 20px 60px'
      }}>
        <h2 style={{
          fontSize: '24px',
          fontWeight: '700',
          textAlign: 'center',
          marginBottom: '24px'
        }}>Como funcionam os créditos e downloads?</h2>

        <div style={{
          display: 'grid',
          gap: '20px',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))'
        }}>
          <div style={{
            background: '#1e293b',
            borderRadius: '16px',
            padding: '20px',
            border: '1px solid #334155'
          }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#f1f5f9',
              marginBottom: '12px'
            }}>Downloads de Arquivos Digitais</h3>
            <p style={{
              color: '#94a3b8',
              fontSize: '15px',
              lineHeight: '1.6'
            }}>
              Cada crédito permite o download de um arquivo STL otimizado para impressão 3D.
              Os arquivos são gerados com base nas suas personalizações no configurador.
            </p>
          </div>

          <div style={{
            background: '#1e293b',
            borderRadius: '16px',
            padding: '20px',
            border: '1px solid #334155'
          }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#f1f5f9',
              marginBottom: '12px'
            }}>Licença Comercial</h3>
            <p style={{
              color: '#94a3b8',
              fontSize: '15px',
              lineHeight: '1.6'
            }}>
              Planos com licença comercial permitem vender peças físicas impressas a partir
              dos modelos downloadados. Não inclui redistribuição dos arquivos digitais.
            </p>
          </div>

          <div style={{
            background: '#1e293b',
            borderRadius: '16px',
            padding: '20px',
            border: '1px solid #334155'
          }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#f1f5f9',
              marginBottom: '12px'
            }}>Créditos Adicionais</h3>
            <p style={{
              color: '#94a3b8',
              fontSize: '15px',
              lineHeight: '1.6'
            }}>
              Precisa de mais créditos? Pode comprar pacotes adicionais a qualquer momento
              através do seu painel de controle.
            </p>
          </div>
        </div>
      </section>

      {/* Chamada para ação final */}
      <section style={{
        textAlign: 'center',
        padding: '60px 20px',
        backgroundColor: '#1e293b',
        borderRadius: '24px',
        border: '1px solid #334155',
        maxWidth: '600px',
        margin: '0 auto 40px'
      }}>
        <h2 style={{
          fontSize: '24px',
          fontWeight: '700',
          marginBottom: '20px'
        }}>Pronto para começar a criar?</h2>
        <p style={{
          color: '#94a3b8',
          fontSize: '16px',
          marginBottom: '24px'
        }}>
          Selecione um plano acima e comece a personalizar seus primeiros modelos 3D hoje mesmo.
        </p>
        <Link href="/produtos" style={{
          display: 'inline-block',
          backgroundColor: '#3b82f6',
          color: 'white',
          padding: '14px 28px',
          borderRadius: '12px',
          fontWeight: '600',
          fontSize: '16px',
          textDecoration: 'none',
          boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.3)',
          transition: 'background-color 0.2s'
        }}>
          Explorar catálogo →
        </Link>
      </section>

      {/* Rodapé simples */}
      <footer style={{
        textAlign: 'center',
        color: '#64748b',
        fontSize: '14px',
        paddingBottom: '40px'
      }}>
        © 2026 MakerPro de PP3D.PT. Todos os direitos reservados.
      </footer>
    </div>
  );
}