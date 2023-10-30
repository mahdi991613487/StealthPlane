const { app, BrowserWindow, ipcMain, Tray, Menu, globalShortcut } = require('electron');
const electronContextMenu = require('electron-context-menu');
const { desktopCapturer, nativeImage, screen } = require('electron');

let mainWindow;
let tray = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    title: 'Floating Browser',
    width: 700,
    height: 600,
    autoHideMenuBar: true,
    backgroundColor: '#16171a',
    show: false,
    icon: __dirname + '/images/blackman.ico',
    webPreferences: {      
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      webviewTag: true
    },
  });

  mainWindow.loadFile('index.html');

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
  tray = new Tray(__dirname + '/images/blackman.ico');
  
  const trayContextMenu = Menu.buildFromTemplate([
    {
      label: 'Open',
      icon: __dirname + '/images/blackman_small.png',
      click: () => mainWindow.show()
    },
    {
      label: 'Exit',
      icon: __dirname + '/images/blackman_small.png',
      click: () => app.quit()
    }
  ]);
  
  tray.setToolTip('Floating Browser');
  tray.setContextMenu(trayContextMenu);

  tray.on('click', () => {
    mainWindow.show();
  });
}
ipcMain.handle('request-screenshot', async () => {
    const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: screen.width, height: screen.height } });
    const screenSource = sources[0];

    if (!screenSource) {
        throw new Error("Unable to capture screen.");
    }

    return screenSource.thumbnail.toDataURL();
});

ipcMain.on('navigate', (event, url) => {
  event.sender.send('load-webview', url);
});
ipcMain.on('capture-screen', async (event) => {
    try {
        const { width, height } = screen.getPrimaryDisplay().size;
        const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width, height } });
        const screenSource = sources[0];
        
        if (!screenSource) {
            event.reply('capture-screen-response', { error: "Unable to capture screen." });
            return;
        }
        
        const screenImage = nativeImage.createFromDataURL(screenSource.thumbnail.toDataURL());
        event.reply('capture-screen-response', { data: screenImage.toDataURL() });
    } catch (err) {
        event.reply('capture-screen-response', { error: err.message });
    }
});


ipcMain.on('set-opacity', (event, value) => {
  mainWindow.setOpacity(value);
});

app.on('ready', () => {
  createWindow();

  // Registering global shortcuts
  globalShortcut.register('Control+Shift+Up', () => {
    mainWindow.webContents.send('increase-opacity');
  });
  globalShortcut.register('Control+Shift+Down', () => {
    mainWindow.webContents.send('decrease-opacity');
  });
  globalShortcut.register('Control+Shift+Z', () => {
        mainWindow.webContents.send('set-min-opacity');
    });
  globalShortcut.register('Control+Shift+X', () => {
        mainWindow.webContents.send('set-max-opacity');
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
  // Unregister all shortcuts.
  globalShortcut.unregisterAll();
});
