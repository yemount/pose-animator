const { app, BrowserWindow, ipcMain } = require('electron')
const virtualcam = require('node-virtualcam')

function createWindow () {
    let win = new BrowserWindow({
      width: 1280,
      height: 720,
      autoHideMenuBar: true,
      webPreferences: {
        nodeIntegration: true,
        // TODO not working, see https://github.com/electron/electron/issues/9567
        backgroundThrottling: false
      }
    })
  
    win.loadFile('dist/camera.html')

    const fps = 30
    const delay = 0
    let width = 0
    let height = 0
    let i = 0

    ipcMain.on('frame', (event, arg) => {
      if (!arg.data) {
        console.error('null frame received')
        return
      }
      if (arg.data.length === 0) {
        console.error('0-byte frame received')
        return
      }
      console.log(`frame received (${arg.data.length} bytes, ${arg.width}x${arg.height})`)
      if (width === 0) {
        width = arg.width
        height = arg.height
        virtualcam.start(width, height, fps, delay)
        console.log(`virtual cam output started (${width}x${height} @ ${fps}fps)`);
        return;
      } 
      if (width != arg.width || height != arg.height) {
        console.error(`received frame with mismatching size: ${arg.width}x${arg.height}`)
      }
      virtualcam.send(i, arg.data)
      i += 1
    })
}
  
app.whenReady().then(createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', () => {
    // On macOS it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
      app.quit()
    }
})

app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
})



