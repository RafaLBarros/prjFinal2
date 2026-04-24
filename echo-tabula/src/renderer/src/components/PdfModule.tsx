// src/renderer/src/components/PdfModule.tsx
import { PdfCropModule as PdfModuleType, RpgModule } from '../types/rpg';
import { useState, useEffect, useRef, useCallback } from 'react';
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

// --- FUNÇÃO AUXILIAR: Regex Inteligente que ignora acentos ---
const createAccentInsensitiveRegex = (searchTerm: string) => {
  const normalizedSearch = searchTerm.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  
  const regexString = normalizedSearch.split('').map(char => {
    if (char === 'a') return '[aáàãâäAÁÀÃÂÄ]';
    if (char === 'e') return '[eéèêëEÉÈÊË]';
    if (char === 'i') return '[iíìîïIÍÌÎÏ]';
    if (char === 'o') return '[oóòõôöOÓÒÕÔÖ]';
    if (char === 'u') return '[uúùûüUÚÙÛÜ]';
    if (char === 'c') return '[cçCÇ]';
    return char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }).join('');
  
  return new RegExp(`(${regexString})`, 'gi');
};

export function PdfModule({ moduleData, onUpdate }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [numPages, setNumPages] = useState<number>();
  const [inputPage, setInputPage] = useState(moduleData.data.page.toString());
  const [isAddingBookmark, setIsAddingBookmark] = useState(false);
  const [newBookmarkName, setNewBookmarkName] = useState('');
  const [pendingAutoScroll, setPendingAutoScroll] = useState(false);

  // --- ESTADOS DO MOTOR DE BUSCA ---
  const [searchText, setSearchText] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState(''); // 👈 O NOVO ESTADO: Salva a palavra só quando dá Enter
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchResults, setSearchResults] = useState<number[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const pdfDocRef = useRef<any>(null);

  const bookmarks: { id: string, name: string, page: number }[] = moduleData.data.bookmarks || [];

  // --- MOTOR DE BUSCA GLOBAL ---
  const executeGlobalSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    // Se a busca estiver vazia, limpa tudo
    if (!searchText.trim() || !pdfDocRef.current || !numPages) {
      setSubmittedSearch('');
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    setIsSearching(true);
    setHasSearched(true);
    setSubmittedSearch(searchText); // 👈 Grava a palavra final para o renderizador de texto usar
    setSearchResults([]);
    setCurrentSearchIndex(0);

    const normalizedQuery = searchText.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const foundPages: number[] = [];

    try {
      for (let i = 1; i <= numPages; i++) {
        const page = await pdfDocRef.current.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');

        const normalizedPageText = pageText.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

        if (normalizedPageText.includes(normalizedQuery)) {
          foundPages.push(i);
        }

        if (i % 20 === 0) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }
    } catch (error) {
      console.error("Erro na busca:", error);
    }

    setSearchResults(foundPages);
    setIsSearching(false);

    if (foundPages.length > 0) {
       jumpToPage(foundPages[0]);
    }
  };

  const nextSearchResult = () => {
    if (searchResults.length === 0) return;
    const nextIndex = (currentSearchIndex + 1) % searchResults.length;
    setCurrentSearchIndex(nextIndex);
    jumpToPage(searchResults[nextIndex]);
  };

  const prevSearchResult = () => {
    if (searchResults.length === 0) return;
    const prevIndex = (currentSearchIndex - 1 + searchResults.length) % searchResults.length;
    setCurrentSearchIndex(prevIndex);
    jumpToPage(searchResults[prevIndex]);
  };

  // --- RENDERIZADOR DE TEXTO (MARCA-TEXTO TRANSLÚCIDO) ---
  const textRenderer = useCallback((textItem: any) => {
    // Se não tem busca, devolve a string normal
    if (!submittedSearch || searchResults.length === 0) return textItem.str;
    
    // Cria a nossa Regex mágica
    const regex = createAccentInsensitiveRegex(submittedSearch);
    
    // Testa se a palavra existe nessa linha
    if (!textItem.str.match(regex)) return textItem.str;

    // A MÁGICA DA TRANSPARÊNCIA: 
    // background-color em rgba com 40% de opacidade (0.4)
    // color: transparent (para o texto original do PDF aparecer liso no fundo)
    return textItem.str.replace(regex, (match: string) => 
      `<mark style="background-color: rgba(251, 191, 36, 0.4); color: transparent; border-radius: 3px; padding: 2px 0;">${match}</mark>`
    );
  }, [submittedSearch, searchResults]);

  // --- FUNÇÕES NORMAIS DO MÓDULO ---
  const jumpToPage = (pageNumber: number) => {
    setInputPage(pageNumber.toString());
    onUpdate(moduleData.id, { data: { ...moduleData.data, page: pageNumber } });
  };

  const goToPrevPage = () => {
    if (moduleData.data.page > 1) jumpToPage(moduleData.data.page - 1);
  };

  const goToNextPage = () => {
    if (numPages && moduleData.data.page < numPages) jumpToPage(moduleData.data.page + 1);
  };

  const handleAddBookmark = () => {
    if (!newBookmarkName.trim()) return;
    const newBookmark = { id: crypto.randomUUID(), name: newBookmarkName.trim(), page: moduleData.data.page };
    onUpdate(moduleData.id, { data: { ...moduleData.data, bookmarks: [...bookmarks, newBookmark] } });
    setNewBookmarkName('');
    setIsAddingBookmark(false);
  };

  const handleRemoveBookmark = (idToRemove: string) => {
    onUpdate(moduleData.id, { data: { ...moduleData.data, bookmarks: bookmarks.filter(b => b.id !== idToRemove) } });
  };

  useEffect(() => {
    setInputPage(moduleData.data.page.toString());
  }, [moduleData.data.page]);

  const handlePageSubmit = () => {
    let newPage = parseInt(inputPage, 10);
    if (isNaN(newPage) || newPage < 1) newPage = 1;
    else if (numPages && newPage > numPages) newPage = numPages;
    jumpToPage(newPage);
  };

  const getPdfSource = () => {
    const url = moduleData.data.filePath;
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `rpg://${url}`;
  };

  const pdfSource = getPdfSource();

  useEffect(() => {
    const handleModuleAction = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { targetId, action, payload } = customEvent.detail;
      
      if (targetId !== moduleData.id) return;
      
      if (action === 'openBookmark' && payload?.bookmarkId) {
        const targetBookmark = bookmarks.find(b => b.id === payload.bookmarkId);
        
        if (targetBookmark) {
          // Atualiza a caixinha de texto local e avisa que vai precisar scrollar a tela
          setInputPage(targetBookmark.page.toString());
          setPendingAutoScroll(true);
          
          // O SEGREDO ESTÁ AQUI:
          // Em vez de chamar o onUpdate duas vezes (o que faz o React cancelar a primeira),
          // enviamos TUDO em um único pacote! Abre o módulo E muda a página de uma vez só.
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

  const handleImportPdf = async () => {
    const result = await window.api.importPdf();
    if (result.success && result.fileName) {
      onUpdate(moduleData.id, { data: { ...moduleData.data, filePath: result.fileName, page: 1 } });
    }
  };

  function onDocumentLoadSuccess(pdf: any) {
    setNumPages(pdf.numPages);
    pdfDocRef.current = pdf;
  }

  if (!moduleData.isActive) return null;

  return (
    <div id={`module-${moduleData.id}`} className="border border-slate-700 bg-slate-800 rounded-md shadow-md mb-4 flex flex-col transition-all focus-within:border-emerald-500">
      
      {/* --- CABEÇALHO --- */}
      <div className="flex justify-between items-center p-3 border-b border-slate-700/50 bg-slate-800/50">
        <div className="flex items-center gap-2 flex-1">
          <span className="text-red-400">📕</span>
          <input 
            type="text"
            value={moduleData.name}
            onChange={(e) => onUpdate(moduleData.id, { name: e.target.value })}
            className="bg-transparent text-red-400 font-bold focus:outline-none px-2 py-1 rounded w-full transition placeholder:text-red-800"
            placeholder="Nome do Livro"
          />
        </div>
        
        <button onClick={() => onUpdate(moduleData.id, { isMinimized: !moduleData.isMinimized })} className="text-slate-500 hover:text-red-400 px-2 py-1 rounded transition text-sm font-bold">
          {moduleData.isMinimized ? '▼' : '▲'}
        </button>
        
        <button onClick={() => setIsEditing(!isEditing)} className="text-slate-400 hover:text-white text-sm bg-slate-700 px-2 py-1 rounded ml-2">
          {isEditing ? 'Ocultar Config' : '⚙️ Configurar'}
        </button>
      </div>

      {!moduleData.isMinimized && (
        <>
          {/* --- CONFIGURAÇÕES --- */}
          {isEditing && (
            <div className="bg-slate-900 p-4 border-b border-slate-700 flex flex-col items-start gap-2">
              <label className="block text-xs text-slate-400 mb-1">Arquivo atual: <span className="text-emerald-400 font-mono">{moduleData.data.filePath || 'Nenhum'}</span></label>
              <div className="flex gap-2 w-full">
                <button onClick={handleImportPdf} className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2 px-4 rounded transition text-sm flex-1 flex items-center justify-center gap-2">
                  📥 Importar PDF
                </button>
                <input type="text" value={moduleData.data.filePath} onChange={(e) => onUpdate(moduleData.id, { data: { ...moduleData.data, filePath: e.target.value } })} className="flex-1 bg-slate-800 text-slate-200 text-sm p-2 rounded border border-slate-600 focus:border-red-500 focus:outline-none placeholder:text-slate-600" placeholder="Link da web (opcional)" />
              </div>
            </div>
          )}

          <div className="p-4 flex flex-col items-center bg-slate-950 overflow-hidden relative">
            
            {moduleData.data.filePath && (
              <div className="flex flex-col items-center w-full max-w-2xl mb-4 gap-3 z-10">
                
                {/* --- BARRA DE BUSCA FUZZY --- */}
                <div className="w-full bg-slate-900 border border-slate-700 p-2 rounded-lg flex items-center gap-2 shadow-inner focus-within:border-red-500 transition-colors">
                  <span className="text-slate-400 ml-2">🔍</span>
                  <form onSubmit={executeGlobalSearch} className="flex-1 flex gap-2">
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Buscar no livro (ignora acentos)..."
                      value={searchText}
                      onChange={e => {
                        setSearchText(e.target.value);
                        setHasSearched(false);
                      }}
                      className="flex-1 bg-transparent text-slate-200 text-sm p-1.5 focus:outline-none"
                    />
                    <button type="submit" disabled={isSearching || !searchText} className="bg-slate-700 hover:bg-red-600 text-white px-4 py-1.5 rounded text-sm font-bold transition disabled:opacity-50">
                      {isSearching ? 'Buscando...' : 'Buscar'}
                    </button>
                  </form>
                  
                  {searchResults.length > 0 && (
                    <div className="flex items-center gap-2 border-l border-slate-700 pl-3">
                      <span className="text-xs text-slate-400 font-mono">
                        {currentSearchIndex + 1} de {searchResults.length}
                      </span>
                      <button onClick={prevSearchResult} className="w-7 h-7 bg-slate-800 hover:bg-slate-700 rounded flex items-center justify-center text-slate-300">▲</button>
                      <button onClick={nextSearchResult} className="w-7 h-7 bg-slate-800 hover:bg-slate-700 rounded flex items-center justify-center text-slate-300">▼</button>
                    </div>
                  )}
                  
                  {searchResults.length === 0 && searchText && hasSearched && !isSearching && (
                    <span className="text-xs text-red-400 font-bold px-2 whitespace-nowrap">Não encontrado</span>
                  )}
                </div>

                {/* --- CONTROLES DE PÁGINA --- */}
                <div className="flex items-center gap-3 bg-slate-800 p-2 rounded-full border border-slate-700 shadow-md">
                  <button onClick={goToPrevPage} disabled={moduleData.data.page <= 1} className="w-8 h-8 bg-slate-700 hover:bg-slate-600 rounded-full disabled:opacity-50 flex items-center justify-center">◀</button>
                  <div className="flex items-center gap-2 text-sm text-slate-300 font-mono">
                    <span>Pág</span>
                    <input type="text" value={inputPage} onChange={(e) => setInputPage(e.target.value)} onBlur={handlePageSubmit} onKeyDown={(e) => e.key === 'Enter' && handlePageSubmit()} className="w-12 bg-slate-900 border border-slate-600 rounded text-center focus:outline-none focus:border-red-500 text-emerald-400 font-bold" />
                    <span>de {numPages || '?'}</span>
                  </div>
                  <button onClick={goToNextPage} disabled={!numPages || moduleData.data.page >= numPages} className="w-8 h-8 bg-slate-700 hover:bg-slate-600 rounded-full disabled:opacity-50 flex items-center justify-center">▶</button>
                  <div className="w-px h-6 bg-slate-600 mx-1"></div>
                  <button onClick={() => setIsAddingBookmark(!isAddingBookmark)} className={`px-3 py-1 rounded-full text-sm font-medium transition ${isAddingBookmark ? 'bg-amber-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>🔖 Salvar</button>
                </div>
                
                {isAddingBookmark && (
                  <div className="flex gap-2 bg-slate-800 p-2 rounded-lg border border-amber-600/50 shadow-lg animate-in fade-in">
                    <input autoFocus type="text" value={newBookmarkName} onChange={(e) => setNewBookmarkName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddBookmark()} placeholder="Nome do Atalho" className="bg-slate-900 text-sm text-slate-200 px-3 py-1.5 rounded focus:outline-none border border-slate-600" />
                    <button onClick={handleAddBookmark} className="bg-amber-600 hover:bg-amber-500 text-white px-3 py-1.5 rounded text-sm font-bold">OK</button>
                  </div>
                )}

                {/* PRATELEIRA DE ATALHOS */}
                {bookmarks.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-2 w-full px-4">
                    {bookmarks.map(bm => (
                      <div key={bm.id} className="flex items-center bg-slate-800 border border-slate-600 rounded-md overflow-hidden group hover:border-amber-500 transition-colors">
                        <button onClick={() => jumpToPage(bm.page)} className="px-3 py-1.5 text-xs text-slate-300 hover:text-amber-400 hover:bg-slate-700">
                          <span className="text-amber-500">🔖</span> {bm.name} <span className="opacity-50 font-mono text-[10px] ml-1">(p.{bm.page})</span>
                        </button>
                        <button onClick={() => handleRemoveBookmark(bm.id)} className="px-2 py-1.5 bg-slate-800 hover:bg-red-900/80 text-slate-500 hover:text-red-400 transition">✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* O Motor React-PDF desenhando na tela */}
            {pdfSource ? (
              <div className="border border-slate-800 shadow-2xl relative bg-white"> 
                <Document file={pdfSource} onLoadSuccess={onDocumentLoadSuccess}>
                  <Page 
                    // 👇 O SEGREDO DO CACHE ESTÁ NESTA KEY DINÂMICA 👇
                    key={`page-${moduleData.data.page}-search-${submittedSearch}`}
                    pageNumber={moduleData.data.page} 
                    renderTextLayer={true} 
                    renderAnnotationLayer={false} 
                    customTextRenderer={textRenderer}
                    width={600} 
                    onRenderSuccess={() => {
                      if (pendingAutoScroll) {
                        setTimeout(() => {
                          document.getElementById(`module-${moduleData.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          setPendingAutoScroll(false);
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