// =============================================================
//  Main process — point d'entrée Electron.
//  Crée la fenêtre, branche le preload, charge l'app Angular
//  buildée, et enregistre les handlers IPC.
// =============================================================
import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import { registerIpcHandlers } from './ipc-handlers';
import { prisma } from './prisma-client';

// Mode --serve : on charge le dev server Angular (ng serve)
const isServe = process.argv.includes('--serve');

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'MyCollection',
    webPreferences: {
      // Sécurité : isolation du contexte + pas de Node dans le renderer.
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isServe) {
    mainWindow.loadURL('http://localhost:4200');
    mainWindow.webContents.openDevTools();
  } else {
    // Angular buildé dans dist/mycollection/browser
    const indexPath = path.join(
      __dirname,
      '..',
      'dist',
      'mycollection',
      'browser',
      'index.html'
    );
    mainWindow.loadFile(indexPath);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// On ferme proprement la connexion Prisma à la sortie.
app.on('before-quit', async () => {
  await prisma.$disconnect();
});
