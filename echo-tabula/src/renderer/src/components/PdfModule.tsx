// src/renderer/src/components/PdfModule.tsx
import { PdfCropModule as PdfModuleType, RpgModule } from '../types/rpg';
import { useState, useEffect } from 'react'; // <-- Importe o useEffect
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
  
  // NOVO: Estado para guardar o arquivo binário do PDF
  const [pdfSource, setPdfSource] = useState<string | null>(null);

  // NOVO: A Lógica Inteligente de Leitura
  useEffect(() => {
    const loadPdf = async () => {
      const url = moduleData.data.filePath;
      if (!url) {
        setPdfSource(null);
        return;
      }

      // Se for um link da web (como aquele da Mozilla), joga direto pro React-PDF
      if (url.startsWith('http')) {
        setPdfSource(url);
      } 
      // Se for um arquivo local do seu PC...
      else {
        // Pede pro Backend ler o arquivo (Ignora CORS completamente)
        const result = await window.api.readPdf(url);
        if (result.success && result.data) {
          // Transforma a string Base64 em um formato de arquivo que o React-PDF entende
          setPdfSource(`data:application/pdf;base64,${result.data}`);
        } else {
          console.error("Erro ao ler PDF local:", result.error);
          setPdfSource(null);
        }
      }
    };

    loadPdf();
  }, [moduleData.data.filePath]); // Executa sempre que o caminho mudar

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

  // Formata o caminho do arquivo para burlar a restrição do navegador
const getSafeUrl = (url: string) => {
     if (!url) return '';
     if (url.startsWith('http')) return url;
     
     const cleanPath = url.replace(/\\/g, '/');
     // ATUALIZAÇÃO: Adicionamos mais uma barra após o rpg:// para isolar a letra do disco (C:)
     // Se a URL original já começar com /, não adicionamos outra.
     const prefix = cleanPath.startsWith('/') ? 'rpg://' : 'rpg:///';
     return `${prefix}${cleanPath}`;
   };

const safePdfPath = getSafeUrl(moduleData.data.filePath);

  return (
    <div className="border border-slate-700 bg-slate-800 rounded-md shadow-md mb-4 flex flex-col transition-all focus-within:border-emerald-500">
      
      {/* --- CABEÇALHO --- */}
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
        <button 
          onClick={() => setIsEditing(!isEditing)}
          className="text-slate-400 hover:text-white text-sm bg-slate-700 px-2 py-1 rounded ml-2"
        >
          {isEditing ? 'Ocultar Config' : '⚙️ Configurar'}
        </button>
      </div>

      {/* --- ÁREA DE CONFIGURAÇÃO --- */}
      {isEditing && (
        <div className="bg-slate-900 p-3 border-b border-slate-700">
          <label className="block text-xs text-slate-400 mb-1">Caminho ou Link do PDF</label>
          <input 
            type="text"
            value={moduleData.data.filePath}
            onChange={(e) => onUpdate(moduleData.id, { 
              data: { ...moduleData.data, filePath: e.target.value, page: 1 } // Reseta para a pág 1 se trocar de arquivo
            })}
            className="w-full bg-slate-800 text-slate-200 text-sm p-2 rounded border border-slate-600 focus:border-red-500 focus:outline-none"
            placeholder="Ex: C:/RPG/Livro.pdf ou https://..."
          />
        </div>
      )}

      {/* --- O VISUALIZADOR DE PDF --- */}
      <div className="p-4 flex flex-col items-center bg-slate-950 overflow-hidden">
        
        {/* Barra de Paginação */}
        {moduleData.data.filePath && (
          <div className="flex items-center gap-4 mb-4 bg-slate-800 p-2 rounded-full border border-slate-700">
            <button 
              onClick={goToPrevPage} disabled={moduleData.data.page <= 1}
              className="w-8 h-8 flex items-center justify-center bg-slate-700 hover:bg-slate-600 rounded-full disabled:opacity-50 transition"
            >
              ◀
            </button>
            <span className="text-sm text-slate-300 font-mono w-24 text-center">
              Pág {moduleData.data.page} de {numPages || '?'}
            </span>
            <button 
              onClick={goToNextPage} disabled={!numPages || moduleData.data.page >= numPages}
              className="w-8 h-8 flex items-center justify-center bg-slate-700 hover:bg-slate-600 rounded-full disabled:opacity-50 transition"
            >
              ▶
            </button>
          </div>
        )}

        {/* O Motor React-PDF desenhando na tela */}
        {moduleData.data.filePath ? (
          <div className="border border-slate-800 shadow-2xl">
            <Document 
              file={pdfSource} 
              onLoadSuccess={onDocumentLoadSuccess}
              loading={<p className="text-slate-500 py-10">Carregando manuscrito...</p>}
              error={<p className="text-red-500 py-10">Erro ao carregar o PDF.</p>}
            >
              <Page 
                pageNumber={moduleData.data.page} 
                renderTextLayer={false} 
                renderAnnotationLayer={false}
                width={600} // Limita a largura para não quebrar nosso layout
              />
            </Document>
          </div>
        ) : (
          <p className="text-slate-600 italic py-10">Nenhum PDF selecionado.</p>
        )}

      </div>
    </div>
  );
}