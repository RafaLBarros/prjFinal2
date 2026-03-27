import { app, shell, BrowserWindow, ipcMain, dialog, protocol, net } from 'electron'
import { join, basename } from 'path' // basename foi adicionado aqui
import { pathToFileURL } from 'url'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

import fs from 'fs/promises'

// 1. ELEVAÇÃO DE PRIVILÉGIOS (Antes do app.whenReady)
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'rpg',
    privileges: { 
      standard: true, 
      secure: true, 
      supportFetchAPI: true, 
      corsEnabled: true,
      bypassCSP: true, // <-- Adicionado
      stream: true     // <-- Adicionado
    }
  }
])

// --- INÍCIO DA NOSSA API DE ARQUIVOS ---

// 1. Ouvinte para SELECIONAR arquivo (Textos)
ipcMain.handle('dialog:openFile', async () => { /* ... mantido igual ... */
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'Textos/JSON', extensions: ['txt', 'json', 'md'] }]
  })
  if (canceled) return { success: false }
  return { success: true, path: filePaths[0] }
})

// 2. Ouvinte para LER arquivo (Textos)
ipcMain.handle('fs:readFile', async (_, path) => { /* ... mantido igual ... */
  try {
    const content = await fs.readFile(path, 'utf-8')
    return { success: true, content }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

// 3. Ouvinte para SALVAR arquivo
ipcMain.handle('fs:saveFile', async (_, { path, content }) => { /* ... mantido igual ... */
  try {
    await fs.writeFile(path, content, 'utf-8')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

// 4. Ouvinte para ESCOLHER ONDE SALVAR (Save As...)
ipcMain.handle('dialog:saveFile', async () => { /* ... mantido igual ... */
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Salvar Cena do RPG',
    defaultPath: 'nova-cena.json',
    filters: [{ name: 'JSON RPG', extensions: ['json'] }]
  });
  
  if (canceled) return { success: false };
  return { success: true, path: filePath };
});

// 5. NOVO OUVINTE: IMPORTAR ARQUIVO PARA O COFRE (Assets)
// Fica organizado aqui fora junto com os outros!
ipcMain.handle('fs:importAsset', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Importar Mídia para a Campanha',
    properties: ['openFile'],
    filters: [{ name: 'Arquivos RPG', extensions: ['pdf', 'mp3', 'wav'] }]
  })

  if (canceled || filePaths.length === 0) return { success: false }

  const sourcePath = filePaths[0]
  const fileName = basename(sourcePath)
  
  // Pegamos o caminho do Cofre na hora que o usuário clica em importar
  const userDataPath = app.getPath('userData')
  const assetsVaultPath = join(userDataPath, 'assets')
  const destPath = join(assetsVaultPath, fileName)

  try {
    // Faz a cópia do arquivo selecionado para dentro da pasta do aplicativo
    await fs.copyFile(sourcePath, destPath)
    return { success: true, fileName: fileName } // Devolve só o nome pro React!
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

// PODE APAGAR O 'fs:readPdf' (Base64). Não vamos mais usá-lo, o protocolo RPG fará esse trabalho.

// --- FIM DA NOSSA API DE ARQUIVOS ---

function createWindow(): void {
  // ... (mantido igualzinho o seu original) ...
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// O APLICATIVO ACORDOU
app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.on('ping', () => console.log('pong'))

  // --- PREPARAÇÃO DO COFRE E PROTOCOLO ---
  
  // 1. Garante que a pasta "assets" exista no AppData do Windows
  const userDataPath = app.getPath('userData')
  const assetsVaultPath = join(userDataPath, 'assets')
  await fs.mkdir(assetsVaultPath, { recursive: true }).catch(() => {})

  // 2. Ensina o motor de rede a responder quando o React pedir um "rpg://"
  protocol.handle('rpg', (request) => {
    // 1. Tira o "rpg://" da frente
    let rawString = request.url.replace('rpg://', '');
    
    // 2. Remove a barra "/" fantasma do final (se o navegador tiver colocado)
    if (rawString.endsWith('/')) {
      rawString = rawString.slice(0, -1);
    }

    // 3. Conserta espaços no nome (ex: %20 vira espaço normal)
    const fileName = decodeURIComponent(rawString);
    
    // 4. Junta o caminho absoluto do Windows e converte para URL nativa
    const absolutePath = join(assetsVaultPath, fileName);
    const fileUrl = pathToFileURL(absolutePath).toString();
    
    return net.fetch(fileUrl);
  });

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})