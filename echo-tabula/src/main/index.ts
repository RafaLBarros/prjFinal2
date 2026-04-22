import { app, shell, BrowserWindow, ipcMain, dialog, protocol, net } from 'electron'
import { join, basename } from 'path'
import { pathToFileURL } from 'url'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { autoUpdater } from 'electron-updater'
import log from "electron-log/main"
import icon from '../../resources/icon.png?asset'
import fs from 'fs/promises'

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
    filters: [{ name: 'Arquivos de Áudio', extensions: ['mp3', 'wav', 'ogg'] }] // Focado em áudio agora!
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
    // O filtro mudou para PDF!
    filters: [{ name: 'Arquivos PDF', extensions: ['pdf'] }] 
  })

  if (canceled || filePaths.length === 0) return { success: false }

  const sourcePath = filePaths[0]
  const fileName = basename(sourcePath)
  const userDataPath = app.getPath('userData')
  
  // Vamos salvar os PDFs na mesma pasta "assets" do cofre
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

// OUVINTE: IMPORTAR IMAGEM (para futuras cenas ou fichas de personagem)
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

  // NOVO OUVINTE: ESCOLHER ARQUIVO DIRETAMENTE DO COFRE
  ipcMain.handle('fs:selectFromVault', async () => {
    const assetsVaultPath = join(app.getPath('userData'), 'assets')
    
    // Garante que a pasta existe
    await fs.mkdir(assetsVaultPath, { recursive: true }).catch(() => {})

    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Escolher Áudio do Cofre',
      defaultPath: assetsVaultPath, // O explorador já abre direto dentro do Cofre!
      properties: ['openFile'],
      filters: [{ name: 'Arquivos de Áudio', extensions: ['mp3', 'wav', 'ogg'] }]
    })

    if (canceled || filePaths.length === 0) return { success: false }

    const sourcePath = filePaths[0]
    const fileName = basename(sourcePath)
    const destPath = join(assetsVaultPath, fileName)

    // Tratamento à prova de balas: se o usuário navegou pra fora do cofre sem querer 
    // e escolheu um arquivo de outra pasta, nós importamos ele automaticamente.
    if (sourcePath !== destPath) {
      try {
        await fs.copyFile(sourcePath, destPath)
      } catch (error) {
        console.error("Erro ao copiar arquivo errante para o cofre:", error)
      }
    }

    // Devolve só o nome do arquivo para o React montar o rpg://
    return { success: true, fileName: fileName }
  })

  // --- MOTOR DE REDE: ARQUIVOS LOCAIS (rpg://) ---
  const userDataPath = app.getPath('userData')
  const assetsVaultPath = join(userDataPath, 'assets')
  await fs.mkdir(assetsVaultPath, { recursive: true }).catch(() => {})

  protocol.handle('rpg', (request) => {
    let rawString = request.url.replace('rpg://', '')
    if (rawString.endsWith('/')) rawString = rawString.slice(0, -1)
    const fileName = decodeURIComponent(rawString)
    const absolutePath = join(assetsVaultPath, fileName)
    const fileUrl = pathToFileURL(absolutePath).toString()
    return net.fetch(fileUrl)
  })

   app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })

  // --- EVENTOS VISUAIS DO UPDATER ---
  autoUpdater.logger = log;
  autoUpdater.on('checking-for-update', () => log.info("🔍 Checking for update..."));
  autoUpdater.on('update-available', () => {
    log.info("✅ Update available!");
    dialog.showMessageBox({ type: 'info', title: 'Atualização Encontrada', message: 'Nova versão em download...' });
  });
  autoUpdater.on('update-not-available', () => log.info("❌ No update available"));
  autoUpdater.on('error', (err) => {
    log.error("💥 Update error:", err);
    dialog.showErrorBox('Erro na Atualização', err == null ? "Erro desconhecido" : (err.stack || err).toString());
  });
  autoUpdater.on('download-progress', (progress) => log.info(`📦 Downloading: ${progress.percent}%`));
  autoUpdater.on('update-downloaded', () => {
    log.info("🎉 Update downloaded!");
    dialog.showMessageBox({ type: 'info', title: 'Atualização Pronta', message: 'Download concluído!' });
  });

  autoUpdater.checkForUpdates();
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})