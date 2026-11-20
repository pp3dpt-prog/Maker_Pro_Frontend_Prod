'use client';

import { usePathname } from 'next/navigation';

// Páginas onde o botão não deve aparecer (admin + ecrãs-cheio sem chrome do site)
const HIDDEN_PATHS = ['/admin', '/customizador', '/personalizar-imagem'];

const WHATSAPP_NUMBER = '351961028106';
const WHATSAPP_MESSAGE = 'Olá! Gostava de saber mais sobre os produtos da PP3D.pt';

export default function WhatsAppButton() {
  const pathname = usePathname();
  const hide = HIDDEN_PATHS.some(p => pathname.startsWith(p));
  if (hide) return null;

  const href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Enviar mensagem no WhatsApp"
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        width: 56,
        height: 56,
        borderRadius: '50%',
        background: '#25D366',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
        zIndex: 80,
        transition: 'transform 0.15s ease',
      }}
      onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.08)')}
      onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
    >
      <svg viewBox="0 0 24 24" width={30} height={30} fill="#ffffff" aria-hidden="true">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.145-.145.33-.378.495-.567.165-.19.219-.325.33-.544.11-.22.055-.411-.025-.56-.08-.149-.72-1.732-.99-2.37-.264-.624-.53-.539-.728-.547-.197-.008-.42-.01-.646-.01-.223 0-.587.082-.906.411-.318.33-1.216 1.185-1.216 2.89 0 1.705 1.239 3.355 1.41 3.587.173.231 2.388 3.643 5.783 4.96 2.887 1.117 3.483.895 4.112.84.63-.055 2.03-.83 2.317-1.634.287-.804.287-1.49.202-1.634-.085-.145-.297-.231-.594-.38z" />
        <path d="M12.02 2C6.5 2 2 6.46 2 11.93c0 1.97.577 3.81 1.67 5.4L2 22l4.85-1.6a10.07 10.07 0 0 0 5.17 1.4h.004c5.52 0 10.02-4.46 10.02-9.93C22.04 6.46 17.54 2 12.02 2zm0 18.1h-.003a8.1 8.1 0 0 1-4.13-1.13l-.296-.176-3.057 1.01 1.023-2.983-.192-.306a8.16 8.16 0 0 1-1.265-4.39c0-4.5 3.657-8.15 8.17-8.15 2.18 0 4.23.85 5.773 2.394a8.07 8.07 0 0 1 2.4 5.76c0 4.5-3.657 8.17-8.17 8.17z" />
      </svg>
    </a>
  );
}
