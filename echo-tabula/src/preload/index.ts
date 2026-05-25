import { contextBridge, ipcRenderer } from 'electron'

const api = {
  selectFile: () => ipcRenderer.invoke('dialog:openFile'),
  chooseSavePath: () => ipcRenderer.invoke('dialog:saveFile'),

  readFile: (path: string) =>
    ipcRenderer.invoke('fs:readFile', path),

  saveFile: (path: string, content: string) =>
    ipcRenderer.invoke('fs:saveFile', { path, content }),

  importAsset: () => ipcRenderer.invoke('fs:importAsset'),
  importPdf: () => ipcRenderer.invoke('fs:importPdf'),
  importImage: () => ipcRenderer.invoke('fs:importImage'),

  selectFromVault: () => ipcRenderer.invoke('fs:selectFromVault'),

  listCampaigns: () => ipcRenderer.invoke('fs:listCampaigns'),

  saveCampaign: (fileName: string, content: string) =>
    ipcRenderer.invoke('fs:saveCampaign', { fileName, content }),

  loadCampaign: (fileName: string) =>
    ipcRenderer.invoke('fs:loadCampaign', fileName),

  deleteCampaign: (fileName: string) =>
    ipcRenderer.invoke('fs:deleteCampaign', fileName),

  renameCampaign: (oldName: string, newName: string) =>
    ipcRenderer.invoke('fs:renameCampaign', { oldName, newName }),

  exportCampaign: (fileName: string, tree: unknown) =>
    ipcRenderer.invoke('fs:exportCampaign', fileName, tree),

  importCampaign: () => ipcRenderer.invoke('fs:importCampaign')
}

contextBridge.exposeInMainWorld('api', api)