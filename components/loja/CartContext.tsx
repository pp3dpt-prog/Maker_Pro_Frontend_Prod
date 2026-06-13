'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';

const STORAGE_KEY = 'pp3d_carrinho_v1';

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
  count: number;
  totalFixoCents: number;            // soma só dos itens com preço fixo
  temOrcamento: boolean;             // algum item requer orçamento
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
  const [ready, setReady] = useState(false);

  // Hidratar do localStorage (evita mismatch SSR)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch { /* ignora */ }
    setReady(true);
  }, []);

  // Persistir
  useEffect(() => {
    if (ready) localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, ready]);

  const addItem = useCallback((novo: NovoItem) => {
    const key = makeKey(novo);
    const qtd = novo.quantidade ?? 1;
    setItems(prev => {
      const existente = prev.find(i => i.key === key);
      if (existente) return prev.map(i => i.key === key ? { ...i, quantidade: i.quantidade + qtd } : i);
      return [...prev, { ...novo, key, quantidade: qtd }];
    });
  }, []);

  const setQty = useCallback((key: string, q: number) => {
    setItems(prev => q <= 0 ? prev.filter(i => i.key !== key) : prev.map(i => i.key === key ? { ...i, quantidade: q } : i));
  }, []);

  const removeItem = useCallback((key: string) => setItems(prev => prev.filter(i => i.key !== key)), []);
  const clear = useCallback(() => setItems([]), []);

  const count = items.reduce((a, i) => a + i.quantidade, 0);
  const totalFixoCents = items.reduce((a, i) => a + (i.preco_cents != null ? i.preco_cents * i.quantidade : 0), 0);
  const temOrcamento = items.some(i => i.requer_orcamento || i.preco_cents == null);

  return (
    <Ctx.Provider value={{ items, ready, count, totalFixoCents, temOrcamento, addItem, setQty, removeItem, clear }}>
      {children}
    </Ctx.Provider>
  );
}

export function useCart(): CartCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCart fora do CartProvider');
  return ctx;
}
