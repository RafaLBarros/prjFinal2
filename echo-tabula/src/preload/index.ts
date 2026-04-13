import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  selectFile: () => ipcRenderer.invoke('dialog:openFile'),
  chooseSavePath: () => ipcRenderer.invoke('dialog:saveFile'),
  readFile: (path: string) => ipcRenderer.invoke('fs:readFile', path),
  saveFile: (path: string, content: string) => ipcRenderer.invoke('fs:saveFile', { path, content }),
  importAsset: () => ipcRenderer.invoke('fs:importAsset'),
  importPdf: () => ipcRenderer.invoke('fs:importPdf'),
  // NOVAS FUNÇÕES DO COFRE DE CAMPANHAS:
  listCampaigns: () => ipcRenderer.invoke('fs:listCampaigns'),
  saveCampaign: (fileName: string, content: string) => ipcRenderer.invoke('fs:saveCampaign', { fileName, content }),
  loadCampaign: (fileName: string) => ipcRenderer.invoke('fs:loadCampaign', fileName),
  deleteCampaign: (fileName: string) => ipcRenderer.invoke('fs:deleteCampaign', fileName),
  renameCampaign: (oldName: string, newName: string) => ipcRenderer.invoke('fs:renameCampaign', { oldName, newName })
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
