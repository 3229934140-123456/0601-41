import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import { createWindowManager } from './windowManager';

let windowManager: ReturnType<typeof createWindowManager>;

function createMainWindow() {
  windowManager = createWindowManager();
  windowManager.registerIpcHandlers();
  windowManager.createLobbyWindow();
}

app.whenReady().then(() => {
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('open-window', async (_event, windowName: string, data?: any) => {
  switch (windowName) {
    case 'lobby':
      windowManager.createLobbyWindow();
      break;
    case 'room':
      windowManager.createRoomWindow(data);
      break;
    case 'character':
      windowManager.createCharacterWindow();
      break;
    case 'whiteboard':
      windowManager.createWhiteboardWindow();
      break;
    case 'activity':
      windowManager.createActivityWindow();
      break;
    case 'recording':
      windowManager.createRecordingWindow();
      break;
    case 'management':
      windowManager.createManagementWindow();
      break;
  }
});

ipcMain.handle('close-window', (_event, windowName: string) => {
  windowManager.closeWindow(windowName);
});

ipcMain.handle('get-data', (_event, key: string) => {
  return windowManager.getState()[key];
});

ipcMain.handle('set-data', (_event, key: string, value: any) => {
  const state = windowManager.getState();
  (state as any)[key] = value;
  windowManager.broadcastState();
  return true;
});

ipcMain.handle('show-save-dialog', async (_event, options: any) => {
  const result = await dialog.showSaveDialog(options);
  return result;
});

ipcMain.handle('show-open-dialog', async (_event, options: any) => {
  const result = await dialog.showOpenDialog(options);
  return result;
});

export { windowManager };
