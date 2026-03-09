import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      selectFile: () => Promise<{ success: boolean; path?: string }>
      chooseSavePath: () => Promise<{ success: boolean; path?: string }>
      readFile: (path: string) => Promise<{ success: boolean; content?: string; error?: string }>
      saveFile: (path: string, content: string) => Promise<{ success: boolean; error?: string }>
    }
  }
}
