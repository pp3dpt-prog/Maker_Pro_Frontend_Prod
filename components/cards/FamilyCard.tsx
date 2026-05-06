type FamilyCardProps = {
  familia: string;
  modelCount: number;
  thumbnail_url?: string;
  descricao?: string;
};

export default function FamilyCard({ familia, modelCount, thumbnail_url, descricao }: FamilyCardProps) {
  // Descrição por defeito para cada família
  const familyDescriptions: Record<string, string> = {
    'Pet Tags': 'Identificadores personalizados para animais de estimação com design único',
    'Caixas': 'Caixas paramétricos personalizáveis para organização e armazenamento',
    'Peças Mecânicas': 'Componentes e engrenagens para projetos mecânicos e robótica',
    'Hueforge / Artístico': 'Peças decorativas e artísticas para impressão 3D',
    'Vasos': 'Vasos e recipientes personalizáveis com diversos designs',
    'geral': 'Diversos designs para explorar',
  };

  // Cores por família para um design mais atrativo
  const familyColors: Record<string, { gradient: string; accent: string }> = {
    'Pet Tags': {
      gradient: 'from-pink-900 via-rose-800 to-pink-900',
      accent: 'from-pink-400 to-rose-500',
    },
    'Caixas': {
      gradient: 'from-amber-900 via-yellow-800 to-amber-900',
      accent: 'from-amber-400 to-yellow-500',
    },
    'Peças Mecânicas': {
      gradient: 'from-slate-900 via-gray-800 to-slate-900',
      accent: 'from-slate-400 to-gray-500',
    },
    'Hueforge / Artístico': {
      gradient: 'from-purple-900 via-indigo-800 to-purple-900',
      accent: 'from-purple-400 to-indigo-500',
    },
    'Vasos': {
      gradient: 'from-green-900 via-emerald-800 to-green-900',
      accent: 'from-green-400 to-emerald-500',
    },
    'geral': {
      gradient: 'from-blue-900 via-slate-800 to-blue-900',
      accent: 'from-blue-400 to-slate-500',
    },
  };

  const colors = familyColors[familia] || familyColors['geral'];
  const description = descricao || familyDescriptions[familia] || familyDescriptions['geral'];

  return (
    <div className={`group relative bg-gradient-to-br ${colors.gradient} border border-slate-700/50 rounded-xl overflow-hidden hover:border-blue-500/80 transition-all duration-300 shadow-lg hover:shadow-2xl cursor-pointer`}>
      {/* Imagem/Thumbnail com overlay */}
      <div className="aspect-square bg-gradient-to-br from-slate-900 to-slate-800 relative overflow-hidden">
        {thumbnail_url ? (
          <img 
            src={thumbnail_url}
            className="w-full h-full object-cover opacity-60 group-hover:opacity-80 group-hover:scale-110 transition-all duration-300"
            alt={familia}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg 
              className="w-24 h-24 text-slate-600 group-hover:text-slate-500 transition-colors"
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={1.5} 
                d="M19.5 12c0-1.657-.895-3.11-2.225-3.897M9.75 17.25c.75 1.27 2.118 2.25 3.75 2.25s3-1.98 3.75-2.25m0-5.25c0 1.657-.895 3.11-2.225 3.897M15 12a3 3 0 11-6 0 3 3 0 016 0z" 
              />
            </svg>
          </div>
        )}
        
        {/* Overlay gradient */}
        <div className={`absolute inset-0 bg-gradient-to-t ${colors.gradient} opacity-40 group-hover:opacity-30 transition-opacity`} />
        
        {/* Contador de modelos */}
        <div className="absolute top-3 right-3">
          <div className={`bg-gradient-to-r ${colors.accent} text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg`}>
            {modelCount} modelo{modelCount !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="p-5">
        <h3 className="text-white font-bold text-lg group-hover:text-blue-300 transition-colors truncate">
          {familia}
        </h3>
        
        <p className="text-slate-300 text-sm mt-2 line-clamp-2 leading-relaxed">
          {description}
        </p>
        
        {/* Footer com CTA */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-700/50">
          <span className="text-xs text-slate-400 font-medium uppercase tracking-wide">Explorar</span>
          <svg 
            className="w-5 h-5 text-slate-400 group-hover:text-blue-400 group-hover:translate-x-1 transition-all"
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M13 7l5 5m0 0l-5 5m5-5H6"
            />
          </svg>
        </div>
      </div>

      {/* Efeito de brilho no hover */}
      <div className={`absolute inset-0 rounded-xl bg-gradient-to-r ${colors.accent}/0 opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none`} />
    </div>
  );
}
