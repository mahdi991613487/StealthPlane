import { app, BrowserWindow, ipcMain, Tray, Menu, globalShortcut, dialog,clipboard} from 'electron';
import electronContextMenu from 'electron-context-menu';
import { desktopCapturer, screen , nativeImage} from 'electron';
import path from 'path';
import fs from 'fs';

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.js
// │
process.env.DIST = path.join(__dirname, '../dist');
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(process.env.DIST, '../public');

const imagePath = path.join(__dirname, '..', 'src', 'assets');
const userDataPath = app.getPath('userData');
const shortcutsFilePath = path.join(userDataPath, 'shortcuts.json');
const shortcuts: Record<string, string> = {
  'increase-opacity': 'Control+Shift+Right',
  'decrease-opacity': 'Control+Shift+Left',
  'increase-window-size': 'Control+Shift+Up',
  'decrease-window-size': 'Control+Shift+Down',
  'set-min-opacity': 'Control+Shift+Z',
  'set-max-opacity': 'Control+Shift+X',
  'quit-app': 'Control+Shift+Q',
  'toggle-window': 'Control+Shift+W',
  'toggle-controls': 'Control+Shift+H',
  'snipping-tool': 'Control+Shift+S',
  'toggle-frame': 'Control+Shift+F',
};

// Global variables
let colorMode = 'dark';
let windowPosition = { x: 0, y: 0 };
let mainWindow: BrowserWindow | null;
let tray: Tray | null = null;
let isFrameDisabled = false;
let mainWindowSize = { width: 750, height: 650 };

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];

// Helper functions
function loadShortcuts(): Record<string, string> {
  try {
    if (fs.existsSync(shortcutsFilePath)) {
      const data = fs.readFileSync(shortcutsFilePath, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading shortcuts:', error);
  }
  return shortcuts;
}

function saveShortcuts(shortcuts: Record<string, string>): void {
  try {
    fs.writeFileSync(shortcutsFilePath, JSON.stringify(shortcuts));
  } catch (error) {
    console.error('Error saving shortcuts:', error);
  }
}

// Window creation and management
function createWindow(): void {
  mainWindow = new BrowserWindow({
    title: 'Floating Browser',
    width: mainWindowSize.width,
    height: mainWindowSize.height,
    x: windowPosition.x,
    y: windowPosition.y,
    autoHideMenuBar: true,
    backgroundColor: '#16171a',
    show: false,
    icon: path.join(imagePath, 'StealthPlane.png'),
    frame: !isFrameDisabled,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(process.env.DIST as string, 'index.html'));
  }

  electronContextMenu({
    window: mainWindow,
    showInspectElement: true,
  });

  mainWindow.on('ready-to-show', () => {
    app.dock && app.dock.hide();
    mainWindow?.show();
    app.dock && app.dock.show();

    mainWindow?.setAlwaysOnTop(true, 'screen-saver');
    mainWindow?.setVisibleOnAllWorkspaces(true);
    mainWindow?.setFullScreenable(false);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  createTrayIcon();
}

function createTrayIcon(): void {
  tray = new Tray(path.join(imagePath, 'StealthPlane.png'));

  const trayContextMenu = Menu.buildFromTemplate([
    {
      label: 'Open',
      icon: path.join(imagePath, 'StealthPlaneSmall.png'),
      click: () => mainWindow?.show(),
    },
    {
      label: 'Exit',
      icon: path.join(imagePath, 'StealthPlaneSmall.png'),
      click: () => app.quit(),
    },
  ]);

  tray.setToolTip('Floating Browser');
  tray.setContextMenu(trayContextMenu);

  tray.on('click', () => {
    mainWindow?.show();
  });
}

// Snipping Tool
class SnippingTool {
  private snipWindow: BrowserWindow | null;
  private fullScreenshot: Electron.NativeImage | null;

  constructor() {
    this.snipWindow = null;
    this.fullScreenshot = null;
    this.attachEventListeners();
  }

  public publicCloseSnipWindow(): void {
    this.closeSnipWindow();
  }

  private attachEventListeners(): void {
    ipcMain.on('start-snipping', this.startSnipping.bind(this));
    ipcMain.on('capture-portion', this.capturePortion.bind(this));
    ipcMain.on('cancel-snipping', this.closeSnipWindow.bind(this));
  }

  private async captureScreen(): Promise<Electron.NativeImage | null> {
    const primaryDisplayBounds = screen.getPrimaryDisplay().bounds;
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: primaryDisplayBounds,
    });

    if (sources && sources[0]?.thumbnail) {
      return nativeImage.createFromDataURL(sources[0].thumbnail.toDataURL());
    }

    console.error('Failed to capture the screen');
    dialog.showErrorBox('Error', 'Failed to capture the screen.');
    return null;
  }

  public async startSnipping(): Promise<void> {
    if (this.snipWindow) {
      console.log('Snipping window already open.');
        snippingTool.publicCloseSnipWindow();

      return;
    }

    this.fullScreenshot = await this.captureScreen();
    this.openSnipWindow();
  }

  private openSnipWindow(): void {
    const primaryDisplayBounds = screen.getPrimaryDisplay().bounds;

    this.snipWindow = new BrowserWindow({
      
      ...primaryDisplayBounds,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      fullscreen: true,
      skipTaskbar: true,
      resizable: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
      },
      
      
    });

    if (process.env.VITE_DEV_SERVER_URL) {
      this.snipWindow.loadURL(`${process.env.VITE_DEV_SERVER_URL}#/snipping-tool`);
    } else {
      this.snipWindow.loadFile(path.join(process.env.DIST as string, 'index.html'), {
        hash: '/snipping-tool',
      });
    }
  }

  private capturePortion(_: Electron.IpcMainEvent, coords: { x: number; y: number; width: number; height: number }): void {
    if (!this.fullScreenshot) 
    
    return;

    const snippedImage = this.fullScreenshot.crop(coords);
    clipboard.writeImage(snippedImage);
    this.closeSnipWindow();
  }

  private closeSnipWindow(): void {
    if (this.snipWindow) {
      this.snipWindow.close();
      this.snipWindow = null;
      this.fullScreenshot = null;
    }
  }
}

let snippingTool = new SnippingTool();

// IPC event listeners
ipcMain.on('cancel-snipping', () => {
  snippingTool.publicCloseSnipWindow();
});

const MIN_WIDTH = 500;
const MIN_HEIGHT = 300;
const MAX_WIDTH = 2560;
const MAX_HEIGHT = 1440;

function keepWindowOnScreen(window: BrowserWindow): void {
  const { x, y, width, height } = window.getBounds();
  const { workArea } = screen.getDisplayMatching(window.getBounds());

  let newX = x;
  let newY = y;

  if (x < workArea.x) {
    newX = workArea.x;
  } else if (x + width > workArea.x + workArea.width) {
    newX = workArea.x + workArea.width - width;
  }

  if (y < workArea.y) {
    newY = workArea.y;
  } else if (y + height > workArea.y + workArea.height) {
    newY = workArea.y + workArea.height - height;
  }

  if (newX !== x || newY !== y) {
    window.setPosition(newX, newY);
  }
}

ipcMain.on('increase-window-size', () => {
  if (!mainWindow) return;

  let { width, height, x, y } = mainWindow.getBounds();
  const newWidth = Math.min(width + 100, MAX_WIDTH);
  const newHeight = Math.min(height + 100, MAX_HEIGHT);
  const deltaWidth = newWidth - width;
  const deltaHeight = newHeight - height;
  const newX = x - deltaWidth / 2;
  const newY = y - deltaHeight / 2;
  mainWindow.setBounds({
    width: newWidth,
    height: newHeight,
    x: newX,
    y: newY,
  });
  keepWindowOnScreen(mainWindow);
});

ipcMain.on('decrease-window-size', () => {
  if (!mainWindow) return;

  let { width, height, x, y } = mainWindow.getBounds();
  const newWidth = Math.max(width - 100, MIN_WIDTH);
  const newHeight = Math.max(height - 100, MIN_HEIGHT);
  const deltaWidth = width - newWidth;
  const deltaHeight = height - newHeight;
  const newX = x + deltaWidth / 2;
  const newY = y + deltaHeight / 2;
  mainWindow.setBounds({
    width: newWidth,
    height: newHeight,
    x: newX,
    y: newY,
  });
  keepWindowOnScreen(mainWindow);
});
ipcMain.on('snipping-tool', () => {
  snippingTool.startSnipping();
});

ipcMain.on('toggle-frame', () => {
  if (!mainWindow) return;

  isFrameDisabled = !isFrameDisabled;
  saveSettings();

  const wasVisible = mainWindow.isVisible();
  const [width, height] = mainWindow.getSize();
  const [x, y] = mainWindow.getPosition();
  windowPosition = { x, y };
  
  const newWindow = new BrowserWindow({
    title: 'Floating Browser',
    width: width,
    height: height,
    x: windowPosition.x,
    y: windowPosition.y,
    autoHideMenuBar: true,
    backgroundColor: '#16171a',
    show: false,
    icon: path.join(imagePath, 'StealthPlane.png'),
    frame: !isFrameDisabled,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (VITE_DEV_SERVER_URL) {
    newWindow.loadURL(VITE_DEV_SERVER_URL);
  } else {
    newWindow.loadFile(path.join(process.env.DIST as string, 'index.html'));
  }

  newWindow.once('ready-to-show', () => {
    mainWindow?.destroy();
    mainWindow = newWindow;
    mainWindow.setAlwaysOnTop(true, 'screen-saver');
    mainWindow.setVisibleOnAllWorkspaces(true);
    mainWindow.setFullScreenable(false);
    if (wasVisible) {
      mainWindow.show();
    }
  });
});



ipcMain.on('quit-app', () => {
  app.quit();
});

ipcMain.on('toggle-window', () => {
  if (mainWindow?.isVisible()) {
    mainWindow.hide();
  } else {
    mainWindow?.show();
  }
});

ipcMain.on('start-navigation', (_event, urlOrQuery) => {
  if (VITE_DEV_SERVER_URL) {
    mainWindow?.loadURL(`${VITE_DEV_SERVER_URL}#/main`);
  } else {
    mainWindow?.loadFile(path.join(process.env.DIST as string, 'index.html'), { hash: '/main' });
  }
  mainWindow?.webContents.once('did-finish-load', () => {
    mainWindow?.webContents.send('navigate-from-cover', urlOrQuery);
  });
});

ipcMain.on('navigate', (event, url) => {
  event.sender.send('load-webview', url);
});

ipcMain.on('set-opacity', (_event, value) => {
  mainWindow?.setOpacity(value);
});

ipcMain.on('get-shortcuts', (event) => {
  event.returnValue = loadShortcuts();
});

ipcMain.on('update-shortcuts', (event, updatedShortcuts) => {
  Object.values(shortcuts).forEach((shortcut) => {
    globalShortcut.unregister(shortcut);
  });

  Object.entries(updatedShortcuts).forEach(([action, shortcut]) => {
    const registrationSuccess = globalShortcut.register(shortcut as string, () => {
      console.log(`${action} shortcut registered successfully.`);
    });

    if (!registrationSuccess) {
      console.error(`Failed to register shortcut for ${action}`);
      return; 
    }
  });

  Object.assign(shortcuts, updatedShortcuts);
  saveShortcuts(shortcuts);

  Object.values(shortcuts).forEach((shortcut) => {
    globalShortcut.unregister(shortcut);
  });

  Object.entries(shortcuts).forEach(([action, shortcut]) => {
    globalShortcut.register(shortcut, () => {
      mainWindow?.webContents.send(action);
    });
  });

  event.sender.send('update-shortcuts-success');
});


ipcMain.on('set-frame-disabled', (_event, disabled) => {
isFrameDisabled = disabled;
saveSettings();

if (!mainWindow) return;

const wasVisible = mainWindow.isVisible();
const [width, height] = mainWindow.getSize();
const [x, y] = mainWindow.getPosition();
windowPosition = { x, y };

const newWindow = new BrowserWindow({
  title: 'Floating Browser',
  width: width,
  height: height,
  x: windowPosition.x,
  y: windowPosition.y,
  autoHideMenuBar: true,
  backgroundColor: '#16171a',
  show: false,
  icon: path.join(imagePath, 'StealthPlane.png'),
  frame: !isFrameDisabled,
  webPreferences: {
    nodeIntegration: false,
    contextIsolation: true,
    webviewTag: true,
    preload: path.join(__dirname, 'preload.js'),
  },
});

if (VITE_DEV_SERVER_URL) {
  newWindow.loadURL(VITE_DEV_SERVER_URL);
} else {
  newWindow.loadFile(path.join(process.env.DIST as string, 'index.html'));
}

newWindow.once('ready-to-show', () => {
  mainWindow?.destroy();
  mainWindow = newWindow;
  mainWindow.setAlwaysOnTop(true, 'screen-saver');
  mainWindow.setVisibleOnAllWorkspaces(true);
  mainWindow.setFullScreenable(false);
  if (wasVisible) {
    mainWindow.show();
  }
});
});

ipcMain.on('set-color-mode', (_event, mode) => {
colorMode = mode;
saveSettings();
});

ipcMain.on('get-color-mode', (event) => {
event.reply('color-mode', colorMode);
});
ipcMain.handle('get-shortcuts', () => {
  return loadShortcuts();
});
ipcMain.on('get-frame-disabled', (event) => {
event.reply('frame-disabled', isFrameDisabled);
});
ipcMain.handle('get-frame-disabled', () => {
  return isFrameDisabled;
});

ipcMain.handle('get-color-mode', () => {
  return colorMode;
});
function saveSettings(): void {
const settings = {
  isFrameDisabled: isFrameDisabled,
  colorMode: colorMode,
  windowPosition: windowPosition,
};
fs.writeFileSync(path.join(userDataPath, 'settings.json'), JSON.stringify(settings));
}

function loadSettings(): void {
try {
  const settingsPath = path.join(userDataPath, 'settings.json');
  if (fs.existsSync(settingsPath)) {
    const settingsData = fs.readFileSync(settingsPath, 'utf8');
    const settings = JSON.parse(settingsData);
    isFrameDisabled = settings.isFrameDisabled || false;
    colorMode = settings.colorMode || 'dark';
    windowPosition = settings.windowPosition || { x: 0, y: 0 };
  }
} catch (error) {
  console.error('Error loading settings:', error);
}
}

app.whenReady().then(() => {
loadSettings();
const loadedShortcuts = loadShortcuts();
Object.assign(shortcuts, loadedShortcuts);
createWindow();

Object.entries(shortcuts).forEach(([action, shortcut]) => {
  globalShortcut.register(shortcut, () => {
    mainWindow?.webContents.send(action);
  });
});
});

app.on('window-all-closed', () => {
app.quit();
});

app.on('activate', () => {
if (!mainWindow) {
  createWindow();
}
});

app.on('will-quit', () => {
globalShortcut.unregisterAll();
});