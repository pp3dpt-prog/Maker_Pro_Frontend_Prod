export default function DesignDetailView({ design }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 h-screen bg-[#0a0a0a]">
      
      {/* 1. Área de Visualização (2/3 do espaço) */}
      <div className="lg:col-span-2 bg-[#050505] relative border-r border-gray-800">
        <div className="w-full h-full flex items-center justify-center">
          {/* Aqui entrará o teu Visualizador WebGL/Three.js */}
          <div className="text-gray-600">Visualizador 3D Carregado</div>
        </div>
      </div>

      {/* 2. Painel de Controlo (1/3 do espaço) */}
      <div className="bg-[#111] p-6 border-l border-gray-800 overflow-y-auto">
        <h1 className="text-2xl font-bold text-white mb-2">{design?.nome}</h1>
        <p className="text-gray-400 text-sm mb-8">{design.descricao}</p>

        {/* Form de Parametrização */}
        <div className="space-y-6">
          {Object.entries(design.parametros_default).map(([key, value]) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-blue-400 uppercase mb-2">{key}</label>
              <input 
                type="number" 
                defaultValue={value as number}
                className="w-full bg-[#0a0a0a] border border-gray-700 rounded p-2 text-white outline-none focus:border-blue-500"
              />
            </div>
          ))}
        </div>

        {/* Área Comercial/Ação */}
        <div className="mt-10 pt-6 border-t border-gray-800 space-y-3">
          <button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded transition-all">
            Gerar Ficheiro STL
          </button>
          {design.permite_venda_comercial && (
             <button className="w-full bg-transparent border border-blue-600 text-blue-400 py-3 rounded hover:bg-blue-600/10">
               Comprar Licença Comercial
             </button>
          )}
        </div>
      </div>
    </div>
  );
}