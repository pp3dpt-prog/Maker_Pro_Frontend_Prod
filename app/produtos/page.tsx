import Link from 'next/link';

function FamilyCard({ familia, produtos }) {
  const principal = produtos[0];

  const href = `/customizador?id=${encodeURIComponent(
    String(principal.id)
  )}&familia=${encodeURIComponent(familia)}`;

  return (
    <Link href={href} className="block">
      <div className="rounded-xl border p-6 hover:bg-neutral-900 transition">
        <div className="text-sm opacity-80">✨ Coleção Premium</div>
        <div className="text-xs opacity-60">{produtos.length} Opções</div>

        <h5 className="mt-2 font-semibold">
          {familia.replace(/-/g, ' ')}
        </h5>

        <p className="text-sm opacity-70 mt-1">
          Modelos de {familia.toLowerCase()} configuráveis em tempo real.
        </p>

        <span className="mt-4 inline-block text-blue-400 font-medium">
          PERSONALIZAR →
        </span>
      </div>
    </Link>
  );
}