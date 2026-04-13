// src/renderer/src/components/PdfModule.tsx
import { PdfCropModule as PdfModuleType, RpgModule } from '../types/rpg';
import { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

interface Props {
  moduleData: PdfModuleType;
  onUpdate: (id: string, updatedFields: Partial<RpgModule>) => void;
}

export function PdfModule({ moduleData, onUpdate }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [numPages, setNumPages] = useState<number>();

  // NOVO: Estado temporário para o campo de digitação
  const [inputPage, setInputPage] = useState(moduleData.data.page.toString());

  // NOVOS ESTADOS: Controle de Marca-páginas
  const [isAddingBookmark, setIsAddingBookmark] = useState(false);
  const [newBookmarkName, setNewBookmarkName] = useState('');

  // 👇 NOVO ESTADO: A bandeira da câmera dinâmica 👇
  const [pendingAutoScroll, setPendingAutoScroll] = useState(false);

  // Puxa os marca-páginas salvos (ou inicia um array vazio se for um PDF novo)
  const bookmarks: { id: string, name: string, page: number }[] = moduleData.data.bookmarks || [];

  // FUNÇÕES DO MARCA-PÁGINA
  const handleAddBookmark = () => {
    if (!newBookmarkName.trim()) return;
    
    const newBookmark = {
      id: crypto.randomUUID(),
      name: newBookmarkName.trim(),
      page: moduleData.data.page // Salva a página que o cara tá olhando AGORA
    };

    onUpdate(moduleData.id, {
      data: { ...moduleData.data, bookmarks: [...bookmarks, newBookmark] }
    });

    setNewBookmarkName('');
    setIsAddingBookmark(false);
  };

  const handleRemoveBookmark = (idToRemove: string) => {
    onUpdate(moduleData.id, {
      data: { ...moduleData.data, bookmarks: bookmarks.filter(b => b.id !== idToRemove) }
    });
  };

  const jumpToBookmark = (pageNumber: number) => {
    setInputPage(pageNumber.toString()); // Atualiza o input visual
    onUpdate(moduleData.id, { data: { ...moduleData.data, page: pageNumber } });
  };

  // NOVO: Mantém o campo de texto sincronizado caso você use as setinhas
  useEffect(() => {
    setInputPage(moduleData.data.page.toString());
  }, [moduleData.data.page]);

  // NOVO: Função que valida o número e manda o PDF mudar de página
  const handlePageSubmit = () => {
    let newPage = parseInt(inputPage, 10);

    // Se o usuário digitou besteira ou número menor que 1, vai pra pág 1
    if (isNaN(newPage) || newPage < 1) {
      newPage = 1;
    } 
    // Se digitou um número maior que o livro, vai pra última
    else if (numPages && newPage > numPages) {
      newPage = numPages;
    }

    setInputPage(newPage.toString()); // Atualiza o texto na tela

    // Só envia pro banco de dados se a página realmente mudou
    if (newPage !== moduleData.data.page) {
      onUpdate(moduleData.id, { data: { ...moduleData.data, page: newPage } });
    }
  };

  // NOVO: Derivamos a fonte do PDF diretamente do filePath salvo no JSON.
  // Sem useEffect, sem estado Base64 pesado. O React-PDF já entende o rpg://!
  const getPdfSource = () => {
    const url = moduleData.data.filePath;
    if (!url) return null;
    if (url.startsWith('http')) return url; // Se for web, deixa normal
    // Senão, é arquivo do Cofre, bota o protocolo mágico na frente!
    return `rpg://${url}`;
  };

  const pdfSource = getPdfSource();

  // --- O OUVIDO BIÔNICO (Barramento de Eventos) ---
  useEffect(() => {
    const handleModuleAction = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { targetId, action, payload } = customEvent.detail;

      // Se o grito não for pra esse PDF, ignora
      if (targetId !== moduleData.id) return;

      // Se a ação for "abrir marca página"
      if (action === 'openBookmark' && payload?.bookmarkId) {
        const targetBookmark = bookmarks.find(b => b.id === payload.bookmarkId);
        
        if (targetBookmark) {
          // 1. Atualiza o input visual
          setInputPage(targetBookmark.page.toString());
          
          // 🎥 2. Levanta a bandeira: Avisa o PDF para centralizar a tela quando terminar de carregar!
          setPendingAutoScroll(true);
          
          // 3. Avisa o Pai para mudar a página E expandir o módulo
          onUpdate(moduleData.id, {
            isMinimized: false,
            data: { ...moduleData.data, page: targetBookmark.page }
          });
        }
      }
    };

    window.addEventListener('rpg-module-action', handleModuleAction);
    return () => window.removeEventListener('rpg-module-action', handleModuleAction);
  }, [moduleData.id, moduleData.data, bookmarks, onUpdate]);

  // NOVO: A Lógica de Cópia (Upload)
  const handleImportPdf = async () => {
    // 1. Pede pro Mestre abrir a janela e copiar o arquivo
    const result = await window.api.importPdf();
    
    // 2. Se deu certo, o Mestre nos devolve apenas o NOME do arquivo copiando (ex: livro.pdf)
    if (result.success && result.fileName) {
      // 3. Atualizamos o JSON da Cena com esse nome simples
      onUpdate(moduleData.id, { 
        data: { ...moduleData.data, filePath: result.fileName, page: 1 } // Reseta pra pág 1 se trocar de livro
      });
    } else if (result.error) {
      console.error("Erro ao importar PDF:", result.error);
    }
  };

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  // --- CONTROLES DE PÁGINA ---
  const goToPrevPage = () => {
    if (moduleData.data.page > 1) {
      onUpdate(moduleData.id, { data: { ...moduleData.data, page: moduleData.data.page - 1 } });
    }
  };

  const goToNextPage = () => {
    if (numPages && moduleData.data.page < numPages) {
      onUpdate(moduleData.id, { data: { ...moduleData.data, page: moduleData.data.page + 1 } });
    }
  };

  if (!moduleData.isActive) return null;

  return (
    <div id={`module-${moduleData.id}`} className="border border-slate-700 bg-slate-800 rounded-md shadow-md mb-4 flex flex-col transition-all focus-within:border-emerald-500">
      
      {/* --- CABEÇALHO ATUALIZADO --- */}
      <div className="flex justify-between items-center p-3 border-b border-slate-700/50 bg-slate-800/50">
        <div className="flex items-center gap-2 flex-1">
          <span className="text-red-400">📕</span>
          <input 
            type="text"
            value={moduleData.name}
            onChange={(e) => onUpdate(moduleData.id, { name: e.target.value })}
            className="bg-transparent text-red-400 font-bold focus:outline-none px-2 py-1 rounded w-full transition placeholder:text-red-800"
            placeholder="Nome do Livro (Ex: Bestiário)"
          />
        </div>
        
        {/* NOVO: BOTÃO DE MINIMIZAR AQUI */}
        <button onClick={() => onUpdate(moduleData.id, { isMinimized: !moduleData.isMinimized })} className="text-slate-500 hover:text-red-400 px-2 py-1 rounded transition text-sm font-bold">
          {moduleData.isMinimized ? '▼' : '▲'}
        </button>
        
        <button 
          onClick={() => setIsEditing(!isEditing)}
          className="text-slate-400 hover:text-white text-sm bg-slate-700 px-2 py-1 rounded ml-2"
        >
          {isEditing ? 'Ocultar Config' : '⚙️ Configurar'}
        </button>
      </div>

      {/* --- TODO O RESTO DO MÓDULO FICA ESCONDIDO SE MINIMIZADO --- */}
      {!moduleData.isMinimized && (
        <>
          {/* --- ÁREA DE CONFIGURAÇÃO --- */}
          {isEditing && (
            <div className="bg-slate-900 p-4 border-b border-slate-700 flex flex-col items-start gap-2">
              <label className="block text-xs text-slate-400 mb-1">
                Arquivo atual: <span className="text-emerald-400 font-mono">{moduleData.data.filePath || 'Nenhum'}</span>
              </label>
              <div className="flex gap-2 w-full">
                <button 
                  onClick={handleImportPdf}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2 px-4 rounded transition text-sm flex-1 flex items-center justify-center gap-2"
                >
                  📥 Importar PDF do Computador
                </button>
                <input 
                  type="text"
                  value={moduleData.data.filePath}
                  onChange={(e) => onUpdate(moduleData.id, { data: { ...moduleData.data, filePath: e.target.value } })}
                  className="flex-1 bg-slate-800 text-slate-200 text-sm p-2 rounded border border-slate-600 focus:border-red-500 focus:outline-none placeholder:text-slate-600"
                  placeholder="Ou cole um link da Internet (http...)"
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Arquivos importados são copiados com segurança para o cofre da campanha.
              </p>
            </div>
          )}

          {/* --- O VISUALIZADOR DE PDF --- */}
          <div className="p-4 flex flex-col items-center bg-slate-950 overflow-hidden">
            
            {/* --- ÁREA DE NAVEGAÇÃO E MARCA-PÁGINAS --- */}
            {moduleData.data.filePath && (
              <div className="flex flex-col items-center w-full max-w-2xl mb-4 gap-3">
                
                {/* 1. BARRA DE PAGINAÇÃO (Atualizada com botão de Salvar) */}
                <div className="flex items-center gap-3 bg-slate-800 p-2 rounded-full border border-slate-700 shadow-md">
                  <button 
                    onClick={goToPrevPage} disabled={moduleData.data.page <= 1}
                    className="w-8 h-8 flex items-center justify-center bg-slate-700 hover:bg-slate-600 rounded-full disabled:opacity-50 transition"
                  >◀</button>
                  
                  <div className="flex items-center gap-2 text-sm text-slate-300 font-mono">
                    <span>Pág</span>
                    <input
                      type="text"
                      value={inputPage}
                      onChange={(e) => setInputPage(e.target.value)}
                      onBlur={handlePageSubmit}
                      onKeyDown={(e) => e.key === 'Enter' && handlePageSubmit()}
                      className="w-12 bg-slate-900 border border-slate-600 rounded text-center focus:outline-none focus:border-red-500 text-emerald-400 font-bold transition-colors"
                    />
                    <span>de {numPages || '?'}</span>
                  </div>

                  <button 
                    onClick={goToNextPage} disabled={!numPages || moduleData.data.page >= numPages}
                    className="w-8 h-8 flex items-center justify-center bg-slate-700 hover:bg-slate-600 rounded-full disabled:opacity-50 transition"
                  >▶</button>

                  {/* O BOTÃO MÁGICO DE SALVAR A PÁGINA */}
                  <div className="w-px h-6 bg-slate-600 mx-1"></div> {/* Linha divisória */}
                  <button 
                    onClick={() => setIsAddingBookmark(!isAddingBookmark)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition flex items-center gap-1 ${isAddingBookmark ? 'bg-amber-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-amber-500 hover:text-white'}`}
                    title="Salvar esta página como atalho"
                  >
                    🔖 {isAddingBookmark ? 'Cancelar' : 'Salvar'}
                  </button>
                </div>

                {/* 2. CAIXINHA PARA DIGITAR O NOME DO MARCA-PÁGINA */}
                {isAddingBookmark && (
                  <div className="flex gap-2 bg-slate-800 p-2 rounded-lg border border-amber-600/50 shadow-lg animate-in fade-in slide-in-from-top-2">
                    <input 
                      autoFocus
                      type="text" 
                      value={newBookmarkName}
                      onChange={(e) => setNewBookmarkName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddBookmark()}
                      placeholder="Ex: Ficha do Dragão"
                      className="bg-slate-900 text-sm text-slate-200 px-3 py-1.5 rounded focus:outline-none focus:border-amber-500 border border-slate-600"
                    />
                    <button onClick={handleAddBookmark} className="bg-amber-600 hover:bg-amber-500 text-white px-3 py-1.5 rounded text-sm font-bold transition">
                      OK
                    </button>
                  </div>
                )}

                {/* 3. A PRATELEIRA DE ATALHOS SALVOS */}
                {bookmarks.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-2 w-full px-4">
                    {bookmarks.map(bm => (
                      <div key={bm.id} className="flex items-center bg-slate-800 border border-slate-600 rounded-md overflow-hidden shadow-sm group hover:border-amber-500 transition-colors">
                        <button 
                          onClick={() => jumpToBookmark(bm.page)}
                          className="px-3 py-1.5 text-xs text-slate-300 hover:text-amber-400 hover:bg-slate-700 flex items-center gap-2 transition"
                        >
                          <span className="text-amber-500">🔖</span>
                          {bm.name} <span className="opacity-50 font-mono text-[10px] ml-1">(p.{bm.page})</span>
                        </button>
                        <button 
                          onClick={() => handleRemoveBookmark(bm.id)}
                          className="px-2 py-1.5 bg-slate-800 hover:bg-red-900/80 text-slate-500 hover:text-red-400 transition"
                          title="Remover atalho"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

              </div>
            )}

            {/* O Motor React-PDF desenhando na tela */}
            {pdfSource ? (
              <div className="border border-slate-800 shadow-2xl">
                <Document 
                  file={pdfSource}
                  onLoadSuccess={onDocumentLoadSuccess}
                  loading={<p className="text-slate-500 py-10">Lendo os arquivos secretos...</p>}
                  error={<p className="text-red-500 py-10">Erro ao renderizar o PDF.</p>}
                >
                  <Page 
                  pageNumber={moduleData.data.page} 
                  renderTextLayer={false} 
                  renderAnnotationLayer={false}
                  width={600} 
                  // 👇 A MÁGICA ACONTECE AQUI 👇
                  onRenderSuccess={() => {
                    if (pendingAutoScroll) {
                      // Dá um micro-atraso de 50ms só para o navegador recalcular a altura da <div>
                      setTimeout(() => {
                        document.getElementById(`module-${moduleData.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        setPendingAutoScroll(false); // Abaixa a bandeira
                      }, 50);
                    }
                  }}
                />
                </Document>
              </div>
            ) : (
              <p className="text-slate-600 italic py-10">Nenhum PDF importado.</p>
            )}

          </div>
        </>
      )}
    </div>
  );
}