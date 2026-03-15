export default function DesignCard({ design }: { design: any }) {
  return (
    <div className="group bg-[#111] border border-gray-800 rounded-xl overflow-hidden hover:border-blue-500/50 transition-all cursor-pointer">
      <div className="aspect-square bg-gray-900 relative">
        <img 
          src={design.thumbnail_url || 'https://via.placeholder.com/400?text=No+Preview'} 
          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
          alt={design.nome}
        />
        <div className="absolute bottom-2 left-2 flex gap-1">
           {design.tags?.slice(0, 2).map((tag: string) => (
             <span key={tag} className="text-[9px] bg-blue-600/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded shadow-lg">
               {tag}
             </span>
           ))}
        </div>
      </div>
      <div className="p-4">
        <h3 className="text-white font-semibold text-sm truncate group-hover:text-blue-400 transition-colors">
          {design.nome}
        </h3>
        <p className="text-gray-500 text-xs mt-1 line-clamp-1">{design.descricao}</p>
        
        <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-800/50">
          <span className="text-[10px] text-gray-400">Por @Admin</span>
          <span className="text-[10px] font-bold text-blue-500">{design.preco_creditos} CRÉDITOS</span>
        </div>
      </div>
    </div>
  );
}