'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { supabase } from '@/lib/supabaseClient';

const STORAGE_KEY = 'pp3d_carrinho_v1';
const ENTREGA_KEY = 'pp3d_entrega_v1';

export type MetodoEntrega = 'envio' | 'maos';

export interface CartItem {
  key: string;                       // único: produto+variante+personalização
  produto_id: string;
  slug: string;
  nome: string;
  foto: string | null;
  variante_id: string | null;
  variante_label: string | null;
  preco_cents: number | null;        // null => a orçamentar
  requer_orcamento: boolean;
  quantidade: number;
  personalizacao: Record<string, unknown> | null;
  personalizacao_label: string | null;
}

export type NovoItem = Omit<CartItem, 'key' | 'quantidade'> & { quantidade?: number };

interface CartCtx {
  items: CartItem[];
  ready: boolean;
  isLogged: boolean;                 // carrinho só existe com sessão iniciada
  count: number;
  totalFixoCents: number;            // soma só dos itens com preço fixo
  temOrcamento: boolean;             // algum item requer orçamento
  entrega: MetodoEntrega;            // envio | maos
  setEntrega: (m: MetodoEntrega) => void;
  addItem: (item: NovoItem) => void;
  setQty: (key: string, q: number) => void;
  removeItem: (key: string) => void;
  clear: () => void;
}

const Ctx = createContext<CartCtx | null>(null);

function makeKey(i: NovoItem): string {
  return [i.produto_id, i.variante_id ?? '', i.personalizacao ? JSON.stringify(i.personalizacao) : ''].join('::');
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [entrega, setEntregaState] = useState<MetodoEntrega>('envio');
  const [ready, setReady] = useState(false);
  const [isLogged, setIsLogged] = useState(false);

  // O carrinho só existe com sessão. Hidrata do localStorage se logado; limpa ao terminar sessão.
  useEffect(() => {
    let mounted = true;
    const hidratar = () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) setItems(JSON.parse(raw));
        const e = localStorage.getItem(ENTREGA_KEY);
        if (e === 'envio' || e === 'maos') setEntregaState(e);
      } catch { /* ignora */ }
    };

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!mounted) return;
      if (user) { setIsLogged(true); hidratar(); }
      else { setIsLogged(false); setItems([]); try { localStorage.removeItem(STORAGE_KEY); } catch {} }
      setReady(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) { setIsLogged(true); }
      else { setIsLogged(false); setItems([]); try { localStorage.removeItem(STORAGE_KEY); } catch {} }
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  // Persistir só com sessão
  useEffect(() => {
    if (ready && isLogged) localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, ready, isLogged]);
  useEffect(() => {
    if (ready) localStorage.setItem(ENTREGA_KEY, entrega);
  }, [entrega, ready]);

  const setEntrega = useCallback((m: MetodoEntrega) => setEntregaState(m), []);

  const addItem = useCallback((novo: NovoItem) => {
    if (!isLogged) return;            // sem sessão não há carrinho (UI deve redirecionar para login)
    const key = makeKey(novo);
    const qtd = novo.quantidade ?? 1;
    setItems(prev => {
      const existente = prev.find(i => i.key === key);
      if (existente) return prev.map(i => i.key === key ? { ...i, quantidade: i.quantidade + qtd } : i);
      return [...prev, { ...novo, key, quantidade: qtd }];
    });
  }, [isLogged]);

  const setQty = useCallback((key: string, q: number) => {
    setItems(prev => q <= 0 ? prev.filter(i => i.key !== key) : prev.map(i => i.key === key ? { ...i, quantidade: q } : i));
  }, []);

  const removeItem = useCallback((key: string) => setItems(prev => prev.filter(i => i.key !== key)), []);
  const clear = useCallback(() => setItems([]), []);

  const count = items.reduce((a, i) => a + i.quantidade, 0);
  const totalFixoCents = items.reduce((a, i) => a + (i.preco_cents != null ? i.preco_cents * i.quantidade : 0), 0);
  const temOrcamento = items.some(i => i.requer_orcamento || i.preco_cents == null);

  return (
    <Ctx.Provider value={{ items, ready, isLogged, count, totalFixoCents, temOrcamento, entrega, setEntrega, addItem, setQty, removeItem, clear }}>
      {children}
    </Ctx.Provider>
  );
}

export function useCart(): CartCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCart fora do CartProvider');
  return ctx;
}
