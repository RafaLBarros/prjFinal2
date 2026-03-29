// ---------------------------------------------------------
// 1. A BASE (A "Classe Pai")
// Todos os módulos, não importa quais sejam, SEMPRE terão essas propriedades.
// ---------------------------------------------------------
export interface BaseModule {
  id: string;          // Um código único (ex: "mod-123") para o React não se perder
  name: string;        // O nome que o usuário dá (ex: "Música de Tensão", "Ficha do Boss")
  isActive: boolean;   // O botão principal: se false, a música não toca, o texto não aparece.
  isMinimized?: boolean; // <-- ADICIONE ESTA LINHA (A interrogação significa que é opcional, para não quebrar campanhas antigas)
}

// ---------------------------------------------------------
// 2. OS MÓDULOS ESPECÍFICOS (As "Classes Filhas")
// Aqui usamos o conceito de "Herança" (extends). 
// Eles herdam a base e adicionam seus dados específicos.
// ---------------------------------------------------------

export interface TextModule extends BaseModule {
  type: 'text';        // O identificador fixo deste módulo
  data: {
    content: string;   // O texto real salvo (pode ser Markdown)
  };
}

export interface AudioModule extends BaseModule {
  type: 'audio';       // O identificador fixo deste módulo
  data: {
    urlOrPath: string; // Pode ser 'https://youtube...' ou 'C:/Audios/chuva.mp3'
    volume: number;    // Um valor de 0.0 a 1.0
    loop: boolean;     // Se deve repetir infinitamente
  };
}

export interface PdfCropModule extends BaseModule {
  type: 'pdf_crop';
  data: {
    filePath: string;
    page: number;
    // NOSSO NOVO SISTEMA DE MARCA-PÁGINAS
    bookmarks?: { id: string; name: string; page: number }[];
  };
}

// --- SISTEMA DE COMBATE (ENCOUNTER) ---

export interface CombatantEffect {
  id: string;
  name: string;
  duration: number; // Quantas rodadas faltam para acabar
}

export interface Combatant {
  id: string;
  name: string;
  initiative: number;
  hp?: number; 
  maxHp?: number; 
  faction: 'enemy' | 'ally' | 'player'; // <-- Sem interrogação, agora é a lei!
  isDefeated: boolean; 
  effects: CombatantEffect[]; 
}

export interface EncounterModule extends BaseModule {
  type: 'encounter';
  data: {
    round: number; // Rodada global do combate
    currentTurnId: string | null; // Quem está jogando AGORA
    combatants: Combatant[];
  };
}

// ---------------------------------------------------------
// 3. A UNIÃO (O Segredo da Escalabilidade)
// Isso cria um tipo único que aceita QUALQUER um dos módulos listados.
// ---------------------------------------------------------
export type RpgModule = TextModule | AudioModule | PdfCropModule | EncounterModule; 


// ---------------------------------------------------------
// 4. A CENA (O Arquivo JSON final)
// É este formato exato que será salvo no arquivo "taverna.json"
// ---------------------------------------------------------
export interface Scene {
  id: string;
  title: string;       // Ex: "A Taverna do Javali"
  description: string; // Ex: "Cena inicial da campanha"
  
  // Aqui está a mágica: um array que aceita qualquer módulo misturado!
  modules: RpgModule[]; 
}

export type NodeType = 'folder' | 'scene';

// Essa é a interface mágica da Árvore. Uma pasta pode conter outras pastas ou cenas dentro de 'children'.
export interface CampaignNode {
  id: string;
  type: NodeType;
  name: string;
  isOpen?: boolean;
  children?: CampaignNode[];
  // NOVA PROPRIEDADE (Opcional, pois Pastas não têm módulos, só Cenas)
  modules?: RpgModule[]; 
}