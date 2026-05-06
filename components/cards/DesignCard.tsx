export default function DesignCard({ design }: { design: any }) {
  return (
    <div className="group relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700/50 rounded-lg overflow-hidden hover:border-blue-500/80 transition-all duration-300 shadow-lg hover:shadow-blue-500/20 hover:shadow-2xl">
      {/* Imagem/Thumbnail */}
      <div className="aspect-square bg-slate-900 relative overflow-hidden">
        <img 
          src={design.thumbnail_url || 'https://via.placeholder.com/400?text=Design'} 
          className="w-full h-full object-cover opacity-85 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300"
          alt={design.nome}
        />
        
        {/* Overlay gradient no hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
        
        {/* Tags */}
        {design.tags && design.tags.length > 0 && (
          <div className="absolute top-2 left-2 right-2 flex flex-wrap gap-1">
            {design.tags.slice(0, 3).map((tag: string) => (
              <span 
                key={tag} 
                className="text-[9px] bg-blue-600/30 backdrop-blur-sm text-blue-300 border border-blue-400/50 px-2 py-1 rounded-full font-medium"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Conteúdo */}
      <div className="p-4">
        <h3 className="text-white font-bold text-base truncate group-hover:text-blue-300 transition-colors">
          {design.nome}
        </h3>
        <p className="text-slate-400 text-xs mt-2 line-clamp-2 leading-relaxed">
          {design.descricao}
        </p>
        
        {/* Footer com preço */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-700/50">
          <span className="text-xs text-slate-500 font-medium">Customize</span>
          <span className="text-sm font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
            {design.preco_creditos} ₡
          </span>
        </div>
      </div>

      {/* Efeito de hover brilho */}
      <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-500/0 via-blue-400/0 to-blue-500/0 opacity-0 group-hover:opacity-20 group-hover:animate-pulse transition-opacity pointer-events-none" />
    </div>
  );
}