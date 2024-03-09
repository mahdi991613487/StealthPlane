const { app, BrowserWindow, ipcMain, Tray, Menu, globalShortcut } = require('electron');
const electronContextMenu = require('electron-context-menu');
const { desktopCapturer, nativeImage, screen } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let tray = null;
const imagePath = path.join(__dirname, '..', 'assets', 'img');
const userDataPath = app.getPath('userData');
const shortcutsFilePath = path.join(userDataPath, 'shortcuts.json');
const shortcuts = {
  'increase-opacity': 'Control+Shift+Up',
  'decrease-opacity': 'Control+Shift+Down',
  'set-min-opacity': 'Control+Shift+Z',
  'set-max-opacity': 'Control+Shift+X',
  'quit-app': 'Control+Shift+Q',
  'toggle-window': 'Control+Shift+W',
  'close-snipping': 'Control+Shift+S',
  'toggle-controls': 'Control+Shift+H',
  'increase-window-size': 'Control+Shift+=',
  'decrease-window-size': 'Control+Shift+-'
};

let isFrameDisabled = false;

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

function createWindow() {
  mainWindow = new BrowserWindow({
    title: 'Floating Browser',
    width: 750,
    height: 650,
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

  mainWindow.loadFile(path.join(__dirname, '..', 'html', 'index.html'));

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

// Toggle Frame Function 

ipcMain.on('set-frame-disabled', (event, disabled) => {
  isFrameDisabled = disabled;
  saveSettings();

  const wasVisible = mainWindow.isVisible();
  const newWindow = new BrowserWindow({
    title: 'Floating Browser',
    width: mainWindow.getSize()[0],
    height: mainWindow.getSize()[1],
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

  newWindow.loadFile(path.join(__dirname, '..', 'html', 'index.html'));

  newWindow.once('ready-to-show', () => {
    mainWindow.destroy();
    mainWindow = newWindow;

    if (wasVisible) {
      mainWindow.show();
    }
  });
});


ipcMain.on('get-frame-disabled', (event) => {
  event.reply('frame-disabled', isFrameDisabled);
});

function saveSettings() {
  const settings = {
    isFrameDisabled: isFrameDisabled,
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