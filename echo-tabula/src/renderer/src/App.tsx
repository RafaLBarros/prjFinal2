// src/renderer/src/App.tsx
import { useState } from 'react';
import { Scene, TextModule, RpgModule } from './types/rpg';
import { SceneRenderer } from './components/SceneRenderer';

const cenaInicial: Scene = {
  id: "cena-001",
  title: "A Taverna do Javali",
  description: "A festa começa aqui.",
  modules: [] // Começamos vazio para ficar mais limpo
};

function App() {
  // 1. Colocamos a cena no Estado! Agora ela pode ser alterada e a tela vai reagir.
  const [activeScene, setActiveScene] = useState<Scene>(cenaInicial);

  // NOVO: Controle de Arquivo e Status
  const [currentFilePath, setCurrentFilePath] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState('Cena não salva.');

  // 2. A Função Criadora (O Construtor de Módulos)
  const handleAddTextModule = () => {
    // Criamos um "Módulo Vazio" com um ID aleatório
    const newTextModule: TextModule = {
      id: `mod-texto-${Date.now()}`, // Garante um ID único usando o timestamp
      name: "Nova Nota",
      type: "text",
      isActive: true,
      data: {
        content: ""
      }
    };

    // Atualizamos o estado da cena, copiando tudo que ela já tinha,
    // e adicionando o módulo novo no final do array.
    setActiveScene((cenaAnterior) => ({
      ...cenaAnterior,
      modules: [...cenaAnterior.modules, newTextModule]
    }));
  };

  // 1. A Função que atualiza qualquer módulo
  const handleUpdateModule = (moduleId: string, updatedFields: Partial<RpgModule>) => {
    setActiveScene((cenaAnterior) => ({
      ...cenaAnterior,
      modules: cenaAnterior.modules.map((mod) => 
        // Procuramos o módulo pelo ID. Se achou, mescla os dados novos. Se não, deixa como está.
        mod.id === moduleId ? { ...mod, ...updatedFields } as RpgModule : mod
      )
    }));
  };

  // A GRANDE FUNÇÃO DE SALVAR
  const handleSaveScene = async () => {
    setStatusMsg('Salvando...');
    
    // 1. Onde vamos salvar? Se for a primeira vez, pergunta ao usuário.
    let pathToSave = currentFilePath;
    if (!pathToSave) {
      const dialogResult = await window.api.chooseSavePath();
      if (!dialogResult.success || !dialogResult.path) {
        setStatusMsg('Salvamento cancelado.');
        return;
      }
      pathToSave = dialogResult.path;
      setCurrentFilePath(pathToSave);
    }

    // 2. A Mágica da Serialização: Transforma o objeto em texto JSON bonito (2 espaços)
    const jsonString = JSON.stringify(activeScene, null, 2);

    // 3. Manda para o HD!
    const saveResult = await window.api.saveFile(pathToSave, jsonString);

    if (saveResult.success) {
      setStatusMsg('Cena salva com sucesso!');
      setTimeout(() => setStatusMsg(`Pronto. Editando: ${pathToSave}`), 3000);
    } else {
      setStatusMsg('Erro ao salvar a cena.');
    }
  };

  return (
    
    <div className="min-h-screen bg-slate-900 text-slate-100 p-8 flex flex-col items-center">
      
      {/* NOVO: Barra Superior do Aplicativo */}
      <div className="w-full max-w-3xl flex justify-between items-center mb-4 bg-slate-800 p-2 rounded border border-slate-700">
        <span className="text-xs text-slate-400 ml-2">{statusMsg}</span>
        <button 
          onClick={handleSaveScene}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-1 px-4 rounded shadow transition text-sm"
        >
          💾 Salvar Cena
        </button>
      </div>
      
      {/* Cabeçalho da Cena */}
      <header className="mb-8 border-b border-slate-700 pb-4 w-full max-w-3xl flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-amber-500">{activeScene.title}</h1>
          <p className="text-slate-400 mt-2">{activeScene.description}</p>
        </div>
        
        {/* O Botão Mágico */}
        <button 
          onClick={handleAddTextModule}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-4 rounded shadow transition"
        >
          + Adicionar Texto
        </button>
      </header>

      {/* O Renderizador recebe o array dinâmico agora */}
      <main className="w-full max-w-3xl">
        {/* 2. Passamos a função como 'prop' para o Renderizador */}
        <SceneRenderer 
           modules={activeScene.modules} 
           onUpdateModule={handleUpdateModule} 
        />
      </main>

    </div>
  );
}

export default App;