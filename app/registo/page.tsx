import { permanentRedirect } from 'next/navigation';

// Compatibilidade: a página de registo é /register. Links antigos para /registo
// (navbar de versões anteriores) são reencaminhados em vez de darem ecrã em branco.
export default function RegistoRedirect() {
  permanentRedirect('/register');
}
