'use client';

import { useState } from 'react';
import { Mail, Lock, User, Ticket, X } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

type RegisterModalProps = {
  isOpen: boolean;
  onClose: () => void;
  /**
   * Callback opcional (por exemplo, para desbloquear download após registo)
   */
  onSuccess?: () => void;
};

export default function RegisterModal({ isOpen, onClose, onSuccess }: RegisterModalProps) {
  if (!isOpen) return null;

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    promoCode: '',
  });

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          full_name: formData.name,
          applied_promo: formData.promoCode,
        },
      },
    });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    alert('Conta criada! Verifica o teu email.');

    // ✅ Só chama se existir
    if (onSuccess) onSuccess();

    setLoading(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        zIndex: 9999,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 520,
          background: '#0f172a',
          border: '1px solid #334155',
          borderRadius: 14,
          padding: 18,
          color: 'white',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <h3 style={{ margin: 0 }}>Quase lá! 🚀</h3>
            <p style={{ marginTop: 6, marginBottom: 0, color: '#cbd5e1', fontSize: 13 }}>
              Cria uma conta gratuita para descarregar o teu STL personalizado.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#cbd5e1',
              cursor: 'pointer',
              height: 36,
              width: 36,
              borderRadius: 10,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleRegister} style={{ marginTop: 16, display: 'grid', gap: 10 }}>
          {/* Nome */}
          <label style={{ display: 'grid', gap: 6, fontSize: 12, color: '#cbd5e1' }}>
            Nome
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <User size={16} color="#94a3b8" />
              <input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="O teu nome"
                autoComplete="name"
                style={{
                  flex: 1,
                  padding: 10,
                  borderRadius: 10,
                  border: '1px solid #475569',
                  background: '#1e293b',
                  color: 'white',
                  outline: 'none',
                }}
              />
            </div>
          </label>

          {/* Email */}
          <label style={{ display: 'grid', gap: 6, fontSize: 12, color: '#cbd5e1' }}>
            Email
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Mail size={16} color="#94a3b8" />
              <input
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@exemplo.com"
                type="email"
                required
                autoComplete="email"
                style={{
                  flex: 1,
                  padding: 10,
                  borderRadius: 10,
                  border: '1px solid #475569',
                  background: '#1e293b',
                  color: 'white',
                  outline: 'none',
                }}
              />
            </div>
          </label>

          {/* Password */}
          <label style={{ display: 'grid', gap: 6, fontSize: 12, color: '#cbd5e1' }}>
            Palavra-passe
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Lock size={16} color="#94a3b8" />
              <input
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Mínimo 8 caracteres"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                style={{
                  flex: 1,
                  padding: 10,
                  borderRadius: 10,
                  border: '1px solid #475569',
                  background: '#1e293b',
                  color: 'white',
                  outline: 'none',
                }}
              />
            </div>
          </label>

          {/* Promo code */}
          <label style={{ display: 'grid', gap: 6, fontSize: 12, color: '#cbd5e1' }}>
            Código Promocional (opcional)
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Ticket size={16} color="#94a3b8" />
              <input
                value={formData.promoCode}
                onChange={(e) => setFormData({ ...formData, promoCode: e.target.value })}
                placeholder="PROMO2026"
                autoComplete="off"
                style={{
                  flex: 1,
                  padding: 10,
                  borderRadius: 10,
                  border: '1px solid #475569',
                  background: '#1e293b',
                  color: 'white',
                  outline: 'none',
                }}
              />
            </div>
          </label>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 8,
              padding: 12,
              borderRadius: 10,
              border: 'none',
              background: loading ? '#475569' : '#3b82f6',
              color: 'white',
              fontWeight: 900,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'A criar conta...' : 'Criar Conta e Baixar STL'}
          </button>
        </form>
      </div>
    </div>
  );
}