import { app, BrowserWindow } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { registerConfigHandlers } from './handlers/config.js'
import { registerPdfHandlers } from './handlers/pdf.js'
import { registerProfileHandlers } from './handlers/profile.js'
import { registerJobHandlers } from './handlers/jobs.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.DIST_ELECTRON = path.join(__dirname)
process.env.DIST = path.join(__dirname, '../dist')
process.env.VITE_PUBLIC = process.env.VITE_DEV_SERVER_URL
  ? path.join(__dirname, '../../public')
  : process.env.DIST

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    title: 'The Jobify Portal',
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  mainWindow.setMenuBarVisibility(false)

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(path.join(process.env.DIST!, 'index.html'))
  }
}

registerConfigHandlers()
registerPdfHandlers()
registerProfileHandlers()
registerJobHandlers()

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    mainWindow = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
