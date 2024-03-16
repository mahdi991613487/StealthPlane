const { app, BrowserWindow, ipcMain, Tray, Menu, globalShortcut } = require('electron');
const electronContextMenu = require('electron-context-menu');
const { desktopCapturer, nativeImage, screen } = require('electron');
const path = require('path');
const fs = require('fs');

const imagePath = path.join(__dirname, '..', 'assets', 'img');
const userDataPath = app.getPath('userData');
const shortcutsFilePath = path.join(userDataPath, 'shortcuts.json');
const shortcuts = {
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
let mainWindow;
let tray = null;
let isFrameDisabled = false;
let mainWindowSize = { width: 750, height: 650 };

// Helper functions
function loadShortcuts() {
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

function saveShortcuts(shortcuts) {
  try {
    fs.writeFileSync(shortcutsFilePath, JSON.stringify(shortcuts));
  } catch (error) {
    console.error('Error saving shortcuts:', error);
  }
}

// Window creation and management
function createWindow() {
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
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      webviewTag: true
    },
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'html', 'coverpage.html'));

  electronContextMenu({
    window: mainWindow,
    showInspectElement: true,
  });

  mainWindow.on('ready-to-show', () => {
    app.dock && app.dock.hide();
    mainWindow.show();
    app.dock && app.dock.show();

    mainWindow.setAlwaysOnTop(true, 'screen-saver');
    mainWindow.setVisibleOnAllWorkspaces(true);
    mainWindow.setFullScreenable(false);
  });

  mainWindow.on('closed', function () {
    mainWindow = null;
  });

  createTrayIcon();
}

function createTrayIcon() {
  tray = new Tray(path.join(imagePath, 'StealthPlane.png'));

  const trayContextMenu = Menu.buildFromTemplate([
    {
      label: 'Open',
      icon: path.join(imagePath, 'StealthPlaneSmall.png'),
      click: () => mainWindow.show()
    },
    {
      label: 'Exit',
      icon: path.join(imagePath, 'StealthPlaneSmall.png'),
      click: () => app.quit()
    }
  ]);

  tray.setToolTip('Floating Browser');
  tray.setContextMenu(trayContextMenu);

  tray.on('click', () => {
    mainWindow.show();
  });
}

// Snipping Tool
class SnippingTool {
  constructor() {
    this.snipWindow = null;
    this.fullScreenshot = null;
    this.attachEventListeners();
  }

  publicCloseSnipWindow() {
    this.closeSnipWindow();
  }

  attachEventListeners() {
    ipcMain.on('start-snipping', this.startSnipping.bind(this));
    ipcMain.on('capture-portion', this.capturePortion.bind(this));
    ipcMain.on('capture-screen', this.captureEntireScreen.bind(this));
  }

  async captureScreen() {
    const primaryDisplayBounds = screen.getPrimaryDisplay().bounds;
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: primaryDisplayBounds
    });

    if (sources && sources[0]?.thumbnail) {
      return nativeImage.createFromDataURL(sources[0].thumbnail.toDataURL());
    }

    console.error('Failed to capture the screen');
    dialog.showErrorBox('Error', 'Failed to capture the screen.');
    return null;
  }

  async startSnipping() {
    if (this.snipWindow) {
      console.log('Snipping window already open.');
      return;
    }

    this.fullScreenshot = await this.captureScreen();
    this.openSnipWindow();
  }

  openSnipWindow() {
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
        nodeIntegration: true,
        contextIsolation: false
      }
    });

    this.snipWindow.once('ready-to-show', () => {
      this.snipWindow.focus();
      this.snipWindow.maximize();
      this.snipWindow.setAlwaysOnTop(true, 'screen-saver', 1);
      this.snipWindow.setFullScreen(true);
    });

    this.snipWindow.loadFile(path.join(__dirname, '..', 'html', 'snip.html'));
  }

  capturePortion(_, coords) {
    if (!this.fullScreenshot) return;

    if (typeof coords.x !== 'number' || typeof coords.y !== 'number' || typeof coords.width !== 'number' || typeof coords.height !== 'number') {
      console.error('Invalid coordinates:', coords);
      return;
    }

    const snippedImage = this.fullScreenshot.crop(coords);
    require('electron').clipboard.writeImage(snippedImage);

    this.closeSnipWindow();
    this.fullScreenshot = null;
  }

  closeSnipWindow() {
    if (this.snipWindow) {
      this.snipWindow.close();
      this.snipWindow = null;
    }
  }

  async captureEntireScreen() {
    this.fullScreenshot = await this.captureScreen();
    if (!this.fullScreenshot) {
      console.error('Error capturing screen');
    }
  }
}

let snippingTool = new SnippingTool();

// IPC event listeners
const MIN_WIDTH = 500;
const MIN_HEIGHT = 300;
const MAX_WIDTH = 2560;
const MAX_HEIGHT = 1440;

function keepWindowOnScreen(window) {
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


ipcMain.on('toggle-frame', () => {
  isFrameDisabled = !isFrameDisabled;
  saveSettings();

  const wasVisible = mainWindow.isVisible();
  const [width, height] = mainWindow.getSize();
  windowPosition = mainWindow.getPosition();

  const newWindow = new BrowserWindow({
    title: 'Floating Browser',
    width: width,
    height: height,
    x: windowPosition[0],
    y: windowPosition[1],
    autoHideMenuBar: true,
    backgroundColor: '#16171a',
    show: false,
    icon: path.join(imagePath, 'StealthPlane.png'),
    frame: !isFrameDisabled,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      webviewTag: true
    },
  });

  newWindow.loadFile(path.join(__dirname, '..', 'html', 'coverpage.html'));

  newWindow.once('ready-to-show', () => {
    mainWindow.destroy();
    mainWindow = newWindow;
    mainWindow.setAlwaysOnTop(true, 'screen-saver');
    mainWindow.setVisibleOnAllWorkspaces(true);
    mainWindow.setFullScreenable(false);
    if (wasVisible) {
      mainWindow.show();
    }
  });
});

ipcMain.on('snipping-tool', () => {
  snippingTool.startSnipping();
});

ipcMain.on('quit-app', () => {
  app.quit();
});

ipcMain.on('toggle-window', () => {
  if (mainWindow.isVisible()) {
    mainWindow.hide();
  } else {
    mainWindow.show();
  }
});

ipcMain.on('start-navigation', (event, urlOrQuery) => {
  mainWindow.loadFile(path.join(__dirname, '..', 'html', 'index.html'));
  mainWindow.webContents.once('did-finish-load', () => {
    mainWindow.webContents.send('navigate-from-cover', urlOrQuery);
  });
});

ipcMain.on('navigate', (event, url) => {
  event.sender.send('load-webview', url);
});

ipcMain.on('set-opacity', (event, value) => {
  mainWindow.setOpacity(value);
});

ipcMain.on('get-shortcuts', (event) => {
  event.returnValue = loadShortcuts();
});

ipcMain.on('update-shortcuts', (event, updatedShortcuts) => {
  try {
    Object.values(shortcuts).forEach((shortcut) => {
      globalShortcut.unregister(shortcut);
    });

    Object.entries(updatedShortcuts).forEach(([action, shortcut]) => {
      const registrationSuccess = globalShortcut.register(shortcut, () => {
        console.log(`${action} shortcut registered successfully.`);
      });

      if (!registrationSuccess) {
        throw new Error(`Failed to register shortcut for ${action}`);
      }
    });

    Object.assign(shortcuts, updatedShortcuts);
    saveShortcuts(shortcuts);

    Object.values(shortcuts).forEach((shortcut) => {
      globalShortcut.unregister(shortcut);
    });
    Object.entries(shortcuts).forEach(([action, shortcut]) => {
      globalShortcut.register(shortcut, () => {
        mainWindow.webContents.send(action);
      });
    });

    event.sender.send('update-shortcuts-success');
  } catch (error) {
    console.error(`Error updating shortcuts: ${error.message}`);
    event.sender.send('update-shortcuts-error', error.message);
    Object.entries(shortcuts).forEach(([action, shortcut]) => {
      globalShortcut.register(shortcut, () => {
        mainWindow.webContents.send(action);
      });
    });
  }
});

ipcMain.on('set-frame-disabled', (event, disabled) => {
  isFrameDisabled = disabled;
  saveSettings();

  const wasVisible = mainWindow.isVisible();
  const [width, height] = mainWindow.getSize();
  windowPosition = mainWindow.getPosition();

  const newWindow = new BrowserWindow({
    title: 'Floating Browser',
    width: width,
    height: height,
    x: windowPosition[0],
    y: windowPosition[1],
    autoHideMenuBar: true,
    backgroundColor: '#16171a',
    show: false,
    icon: path.join(imagePath, 'StealthPlane.png'),
    frame: !isFrameDisabled,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      webviewTag: true
    },
  });

  newWindow.loadFile(path.join(__dirname, '..', 'html', 'coverpage.html'));

  newWindow.once('ready-to-show', () => {
    mainWindow.destroy();
    mainWindow = newWindow;
    mainWindow.setAlwaysOnTop(true, 'screen-saver');
    mainWindow.setVisibleOnAllWorkspaces(true);
    mainWindow.setFullScreenable(false);
    if (wasVisible) {
      mainWindow.show();
    }
  });
});

ipcMain.on('set-color-mode', (event, mode) => {
  colorMode = mode;
  saveSettings();
});

ipcMain.on('get-color-mode', (event) => {
  event.reply('color-mode', colorMode);
});

ipcMain.on('get-frame-disabled', (event) => {
  event.reply('frame-disabled', isFrameDisabled);
});

function saveSettings() {
  const settings = {
    isFrameDisabled: isFrameDisabled,
    colorMode: colorMode,
    windowPosition: windowPosition,
  };
  fs.writeFileSync(path.join(userDataPath, 'settings.json'), JSON.stringify(settings));
}

function loadSettings() {
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

app.on('ready', () => {
  loadSettings();
  const loadedShortcuts = loadShortcuts();
  Object.assign(shortcuts, loadedShortcuts);
  createWindow();

  Object.entries(shortcuts).forEach(([action, shortcut]) => {
    globalShortcut.register(shortcut, () => {
      mainWindow.webContents.send(action);
    });
  });
});

app.on('window-all-closed', function () {
  app.quit();
});

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});