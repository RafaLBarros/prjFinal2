// src/main/index.ts
import { app, shell, BrowserWindow, ipcMain, dialog, protocol, net } from 'electron'
import { join, basename } from 'path'
import { pathToFileURL } from 'url'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { autoUpdater } from 'electron-updater'
import log from "electron-log/main"
import icon from '../../resources/icon.png?asset'
import fs from 'fs/promises'
import AdmZip from 'adm-zip';

// 1. ELEVAÇÃO DE PRIVILÉGIOS (Apenas o protocolo local do cofre)
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'rpg',
    privileges: { 
      standard: true, 
      secure: true, 
      supportFetchAPI: true, 
      corsEnabled: true, 
      bypassCSP: true, 
      stream: true 
    }
  }
])

// --- INÍCIO DA NOSSA API DE ARQUIVOS ---
ipcMain.handle('dialog:openFile', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'Textos/JSON', extensions: ['txt', 'json', 'md'] }]
  })
  if (canceled) return { success: false }
  return { success: true, path: filePaths[0] }
})

ipcMain.handle('fs:readFile', async (_, path) => {
  try {
    const content = await fs.readFile(path, 'utf-8')
    return { success: true, content }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('fs:saveFile', async (_, { path, content }) => {
  try {
    await fs.writeFile(path, content, 'utf-8')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('dialog:saveFile', async () => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Salvar Cena do RPG',
    defaultPath: 'nova-cena.json',
    filters: [{ name: 'JSON RPG', extensions: ['json'] }]
  })
  if (canceled) return { success: false }
  return { success: true, path: filePath }
})

ipcMain.handle('fs:importAsset', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Importar Mídia para a Campanha',
    properties: ['openFile'],
    filters: [{ name: 'Arquivos de Áudio', extensions: ['mp3', 'wav', 'ogg'] }]
  })

  if (canceled || filePaths.length === 0) return { success: false }

  const sourcePath = filePaths[0]
  const fileName = basename(sourcePath)
  const userDataPath = app.getPath('userData')
  const assetsVaultPath = join(userDataPath, 'assets')
  const destPath = join(assetsVaultPath, fileName)

  try {
    await fs.copyFile(sourcePath, destPath)
    return { success: true, fileName: fileName }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

// NOVO OUVINTE: IMPORTAR PDF
ipcMain.handle('fs:importPdf', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Importar Livro/PDF',
    properties: ['openFile'],
    filters: [{ name: 'Arquivos PDF', extensions: ['pdf'] }] 
  })

  if (canceled || filePaths.length === 0) return { success: false }

  const sourcePath = filePaths[0]
  const fileName = basename(sourcePath)
  const userDataPath = app.getPath('userData')
  
  const assetsVaultPath = join(userDataPath, 'assets')
  await fs.mkdir(assetsVaultPath, { recursive: true }).catch(() => {})
  
  const destPath = join(assetsVaultPath, fileName)

  try {
    await fs.copyFile(sourcePath, destPath)
    return { success: true, fileName: fileName }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

// OUVINTE: IMPORTAR IMAGEM
ipcMain.handle('fs:importImage', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Importar Imagem',
    properties: ['openFile'],
    filters: [{ name: 'Imagens', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] }] 
  })

  if (canceled || filePaths.length === 0) return { success: false }

  const sourcePath = filePaths[0]
  const fileName = basename(sourcePath)
  const userDataPath = app.getPath('userData')
  
  const assetsVaultPath = join(userDataPath, 'assets')
  await fs.mkdir(assetsVaultPath, { recursive: true }).catch(() => {})
  
  const destPath = join(assetsVaultPath, fileName)

  try {
    await fs.copyFile(sourcePath, destPath)
    return { success: true, fileName: fileName }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

// --- FIM DA NOSSA API DE ARQUIVOS ---

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    title: 'Echo Tabula',
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      webSecurity: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.maximize()
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.electron')

  // COFRE: Campanhas
  ipcMain.handle('fs:listCampaigns', async () => {
    try {
      const campaignsPath = join(app.getPath('userData'), 'campaigns')
      await fs.mkdir(campaignsPath, { recursive: true }).catch(() => {})
      const files = await fs.readdir(campaignsPath)
      return { success: true, files: files.filter(f => f.endsWith('.json')) }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('fs:saveCampaign', async (_, { fileName, content }) => {
    try {
      const campaignsPath = join(app.getPath('userData'), 'campaigns')
      await fs.mkdir(campaignsPath, { recursive: true }).catch(() => {})
      const safeName = fileName.endsWith('.json') ? fileName : `${fileName}.json`
      const fullPath = join(campaignsPath, safeName)
      await fs.writeFile(fullPath, content, 'utf-8')
      return { success: true, fileName: safeName }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('fs:loadCampaign', async (_, fileName) => {
    try {
      const fullPath = join(app.getPath('userData'), 'campaigns', fileName)
      const content = await fs.readFile(fullPath, 'utf-8')
      return { success: true, content }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('fs:deleteCampaign', async (_, fileName) => {
    try {
      const fullPath = join(app.getPath('userData'), 'campaigns', fileName)
      await fs.rm(fullPath)
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('fs:renameCampaign', async (_, { oldName, newName }) => {
    try {
      const dir = join(app.getPath('userData'), 'campaigns')
      const oldPath = join(dir, oldName)
      const safeNewName = newName.endsWith('.json') ? newName : `${newName}.json`
      const newPath = join(dir, safeNewName)

      const files = await fs.readdir(dir)
      if (files.includes(safeNewName) && safeNewName !== oldName) {
         return { success: false, error: '⚠️ Já existe outra campanha com este nome.' }
      }

      await fs.rename(oldPath, newPath)
      return { success: true, fileName: safeNewName }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('fs:selectFromVault', async () => {
    const assetsVaultPath = join(app.getPath('userData'), 'assets')
    await fs.mkdir(assetsVaultPath, { recursive: true }).catch(() => {})

    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Escolher Arquivo do Cofre',
      defaultPath: assetsVaultPath, 
      properties: ['openFile']
    })

    if (canceled || filePaths.length === 0) return { success: false }

    const sourcePath = filePaths[0]
    const fileName = basename(sourcePath)
    const destPath = join(assetsVaultPath, fileName)

    if (sourcePath !== destPath) {
      try {
        await fs.copyFile(sourcePath, destPath)
      } catch (error) {
        console.error("Erro ao copiar arquivo errante para o cofre:", error)
      }
    }
    return { success: true, fileName: fileName }
  })

  // =========================================================================
  // 👇 A EXPORTAÇÃO (COM O DEEP SCANNER CORRIGIDO) 👇
  // =========================================================================

  ipcMain.handle('fs:exportCampaign', async (_, fileName: string, tree: any[]) => {
    try {
      const { canceled, filePath } = await dialog.showSaveDialog({
        title: 'Exportar Campanha',
        defaultPath: fileName.replace('.json', '.tabula'),
        filters: [{ name: 'Echo Tabula Backup', extensions: ['tabula'] }]
      })
  
      if (canceled || !filePath) return { success: false, error: 'Cancelado pelo usuário' }
  
      const zip = new AdmZip()
      const jsonContent = JSON.stringify(tree, null, 2)
      zip.addFile(fileName, Buffer.from(jsonContent, 'utf8'))
  
      const assetsToExport = new Set<string>()
      
      const findAssetsDeep = (obj: any) => {
        if (typeof obj === 'string') {
          // Captura links rpg:// perdidos no meio de anotações e descrições
          const matches = obj.match(/rpg:\/\/([^"'\s]+)/g)
          if (matches) {
            matches.forEach((m: string) => {
              let rawName = m.replace(/^rpg:\/\//i, '');
              rawName = rawName.replace(/\/+$/, ''); // Remove a barra do final
              assetsToExport.add(decodeURIComponent(rawName));
            })
          }
        } else if (Array.isArray(obj)) {
          obj.forEach(findAssetsDeep)
        } else if (obj !== null && typeof obj === 'object') {
          // 👇 A MÁGICA: Olha direto nas chaves, ignorando se tem rpg:// ou não!
          const keysToCheck = ['filePath', 'urlOrPath', 'url'];
          for (const key of keysToCheck) {
            if (typeof obj[key] === 'string' && obj[key].length > 0) {
              const val = obj[key];
              if (!val.startsWith('http')) {
                // Remove rpg:// se existir, remove barras residuais e decodifica.
                let rawName = val.replace(/^rpg:\/\//i, '');
                rawName = rawName.replace(/\/+$/, '');
                assetsToExport.add(decodeURIComponent(rawName));
              }
            }
          }
          // Desce mais um nível na árvore
          Object.values(obj).forEach(findAssetsDeep)
        }
      }
      
      findAssetsDeep(tree)
  
      const userDataPath = app.getPath('userData')
      const vaultPath = join(userDataPath, 'assets')
  
      for (const assetName of assetsToExport) {
        const decodedPath = join(vaultPath, assetName)
        
        try {
          const fileBuffer = await fs.readFile(decodedPath)
          zip.addFile(`assets/${assetName}`, fileBuffer)
        } catch (e) {
          console.warn(`[Exportação] Mídia não encontrada no disco e não foi incluída: ${decodedPath}`)
        }
      }
  
      zip.writeZip(filePath)
      return { success: true }
  
    } catch (error: any) {
      console.error("Erro ao exportar:", error)
      return { success: false, error: error.message }
    }
  })
  
  ipcMain.handle('fs:importCampaign', async () => {
    try {
      const { canceled, filePaths } = await dialog.showOpenDialog({
        title: 'Importar Campanha',
        properties: ['openFile'],
        filters: [{ name: 'Echo Tabula Backup', extensions: ['tabula', 'zip'] }]
      })
  
      if (canceled || filePaths.length === 0) return { success: false, error: 'Cancelado pelo usuário' }
  
      const zipPath = filePaths[0]
      const zip = new AdmZip(zipPath)
      const zipEntries = zip.getEntries()
  
      let jsonFileName = ''
      const campaignsPath = join(app.getPath('userData'), 'campaigns')
      const vaultPath = join(app.getPath('userData'), 'assets')
  
      await fs.mkdir(campaignsPath, { recursive: true }).catch(() => {})
      await fs.mkdir(vaultPath, { recursive: true }).catch(() => {})
  
      for (const zipEntry of zipEntries) {
        if (!zipEntry.isDirectory) {
          if (zipEntry.entryName.endsWith('.json') && !zipEntry.entryName.includes('/')) {
            jsonFileName = basename(zipEntry.entryName) 
            const jsonContent = zipEntry.getData().toString('utf8')
            await fs.writeFile(join(campaignsPath, jsonFileName), jsonContent, 'utf-8')
          } else if (zipEntry.entryName.startsWith('assets/')) {
            const mediaName = basename(zipEntry.entryName)
            const mediaContent = zipEntry.getData()
            await fs.writeFile(join(vaultPath, mediaName), mediaContent)
          }
        }
      }
  
      if (!jsonFileName) throw new Error("Arquivo de campanha (.json) não encontrado no pacote.")
  
      return { success: true, fileName: jsonFileName }
  
    } catch (error: any) {
      console.error("Erro ao importar:", error)
      return { success: false, error: error.message }
    }
  })

  // =========================================================================
  // 👇 A BLINDAGEM DO PROTOCOLO (O 404 DO REACT-PDF) 👇
  // =========================================================================

  const userDataPath = app.getPath('userData')
  const assetsVaultPath = join(userDataPath, 'assets')
  await fs.mkdir(assetsVaultPath, { recursive: true }).catch(() => {})

  protocol.handle('rpg', async (request) => {
    try {
      // Limpa os parâmetros estranhos do final da URL
      const rawUrl = request.url.replace(/^rpg:\/\//i, '');
      const cleanPath = rawUrl.split('?')[0].split('#')[0];
      const finalString = cleanPath.replace(/^\/+|\/+$/g, '');
      
      const fileName = decodeURIComponent(finalString);
      const absolutePath = join(assetsVaultPath, fileName);

      try {
        await fs.stat(absolutePath);
      } catch (err) {
        console.error(`[Protocolo RPG] Arquivo não encontrado: ${absolutePath}`);
        return new Response('File not found', { status: 404 });
      }

      const fileUrl = pathToFileURL(absolutePath).toString();
      return net.fetch(fileUrl);
      
    } catch (error) {
      console.error(`[Protocolo RPG] Erro fatal na URL ${request.url}:`, error);
      return new Response('Internal Error', { status: 500 });
    }
  });

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })

  // --- EVENTOS VISUAIS DO UPDATER ---
  autoUpdater.logger = log;
  
  // 👇 AS DUAS REGRAS DE OURO 👇
  autoUpdater.autoDownload = true; // Permite baixar nos bastidores para não travar a internet
  autoUpdater.autoInstallOnAppQuit = false; // Proíbe o aplicativo de atualizar escondido quando for fechado!

  autoUpdater.on('checking-for-update', () => log.info("🔍 Checking for update..."));
  
  autoUpdater.on('update-available', () => {
    log.info("✅ Update available! Downloading in background...");
    // Removido o dialog.showMessageBox daqui para não interromper o usuário à toa.
  });
  
  autoUpdater.on('update-not-available', () => log.info("❌ No update available"));
  
  autoUpdater.on('error', (err) => {
    log.error("💥 Update error:", err);
    // Erros silenciosos de rede são comuns, evitamos mostrar popup a menos que seja crítico
  });
  
  autoUpdater.on('download-progress', (progress) => log.info(`📦 Downloading: ${Math.round(progress.percent)}%`));
  
  // 👇 A NOVA LÓGICA DE INSTALAÇÃO CONSCIENTE 👇
  autoUpdater.on('update-downloaded', async (info) => {
    log.info("🎉 Update downloaded!");
    
    const result = await dialog.showMessageBox({
      type: 'info',
      title: 'Echo Tabula - Atualização Pronta',
      message: `Uma nova versão (${info.version}) está pronta para instalação!`,
      detail: 'Deseja instalar a atualização agora? O aplicativo será reiniciado.\n\nSe escolher "Mais Tarde", você continuará usando a versão atual com segurança.',
      buttons: ['Instalar e Reiniciar', 'Mais Tarde'],
      defaultId: 0, // Destaca o botão de instalar
      cancelId: 1   // Se o usuário apertar ESC ou fechar a janela, assume "Mais Tarde"
    });

    if (result.response === 0) {
      log.info("Iniciando instalação visual...");
      // quitAndInstall(isSilent, isForceRunAfter)
      // Passando "false" no primeiro argumento, nós forçamos o Windows a mostrar a barrinha verde de progresso!
      autoUpdater.quitAndInstall(false, true);
    } else {
      log.info("Usuário escolheu adiar a atualização.");
    }
  });

  autoUpdater.checkForUpdates();

})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})