export default function DesignDetailView({ design }) {
  // 1. Verificação de segurança inicial: se não houver design, mostra um loading
  // Isto evita que o código abaixo tente ler propriedades de algo que não existe
  if (!design) {
    return <div className="h-screen bg-[#0a0a0a] flex items-center justify-center text-white">Carregando design...</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 h-screen bg-[#0a0a0a]">
      
      {/* 1. Área de Visualização */}
      <div className="lg:col-span-2 bg-[#050505] relative border-r border-gray-800">
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-gray-600">Visualizador 3D Carregado</div>
        </div>
      </div>

      {/* 2. Painel de Controlo */}
      <div className="bg-[#111] p-6 border-l border-gray-800 overflow-y-auto">
        {/* Adicionado ? em design?.nome */}
        <h1 className="text-2xl font-bold text-white mb-2">{design?.nome || 'Design sem nome'}</h1>
        
        {/* Adicionado ? em design?.descricao */}
        <p className="text-gray-400 text-sm mb-8">{design?.descricao || 'Sem descrição disponível.'}</p>

        {/* Form de Parametrização */}
        <div className="space-y-6">
          {/* Adicionada verificação extra antes do map para parâmetros */}
          {design?.parametros_default && Object.entries(design.parametros_default).map(([key, value]) => (
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
          
          {/* Adicionado ? em permite_venda_comercial */}
          {design?.permite_venda_comercial && (
             <button className="w-full bg-transparent border border-blue-600 text-blue-400 py-3 rounded hover:bg-blue-600/10">
               Comprar Licença Comercial
             </button>
          )}
        </div>
      </div>
    </div>
  );
}