const { app, BrowserWindow } = require('electron')
const path = require('path')

let mainWindow

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1024,
        minHeight: 700,
        icon: path.join(__dirname, 'images/eplus-icon.ico'), // ← غيّر لأيقونتك
        title: 'Education Plus Center',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    })

    mainWindow.loadFile('index.html') // ← غيّرناها من admin.html
    mainWindow.setMenuBarVisibility(false)
    mainWindow.maximize()
}

app.whenReady().then(createWindow)
app.on('window-all-closed', () => app.quit())