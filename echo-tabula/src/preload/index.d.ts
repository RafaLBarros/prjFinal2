
declare global {
  interface Window {
    api: {
      selectFile: () => Promise<{ success: boolean; path?: string }>
      chooseSavePath: () => Promise<{ success: boolean; path?: string }>
      readFile: (path: string) => Promise<{ success: boolean; content?: string; error?: string }>
      saveFile: (path: string, content: string) => Promise<{ success: boolean; error?: string }>
      importAsset: () => Promise<{ success: boolean; fileName?: string; error?: string }>
      importPdf: () => Promise<{ success: boolean; fileName?: string; error?: string }>;
      importImage: () => Promise<{ success: boolean; fileName?: string; error?: string }>;
      selectFromVault: () => Promise<{
        success: boolean
        fileName?: string
        error?: string
      }>

      //Funções de gerenciamento de campanha.
      listCampaigns: () => Promise<{ success: boolean; files: string[]; error?: string }>;
      saveCampaign: (fileName: string, content: string) => Promise<{ success: boolean; fileName?: string; error?: string }>;
      loadCampaign: (fileName: string) => Promise<{ success: boolean; content?: string; error?: string }>;
      deleteCampaign: (fileName: string) => Promise<{ success: boolean; error?: string }>;
      renameCampaign: (oldName: string, newName: string) => Promise<{ success: boolean; fileName?: string; error?: string }>;

      //Funções de exportação e importação de campanha.
      exportCampaign: (fileName: string, tree: any) => Promise<{ success: boolean; error?: string }>;
      importCampaign: () => Promise<{ success: boolean; fileName?: string; error?: string }>;
    }
  }
}

export {}
