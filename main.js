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

// Snip

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

    this.snipWindow.loadFile('snip.html');


    }

    capturePortion(_, coords) {
    if (!this.fullScreenshot) return;
    
    // Validate and log coords
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




// Url nav

ipcMain.on('navigate', (event, url) => {
  event.sender.send('load-webview', url);
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
	globalShortcut.register('Control+Shift+Q', () => {
        app.quit();
    });
	 globalShortcut.register('Control+Shift+W', () => {
        if (mainWindow.isMinimized()) {
            mainWindow.restore();
        } else {
            mainWindow.focus();
        }
    });
	 globalShortcut.register('Control+Shift+S', () => {
        snippingTool.publicCloseSnipWindow();
    });
	globalShortcut.register('Control+Shift+H', () => {
  mainWindow.webContents.send('toggle-controls');
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
