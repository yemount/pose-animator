const child_process = require('child_process')
const { app, BrowserWindow, ipcMain } = require('electron')
const pathToFfmpeg = require('ffmpeg-static')

let ffmpeg = null
const serverPort = 1935

function startFfmpeg() {
  const serverUrl = `rtmp://localhost:${serverPort}/`
  console.log('starting ffmpeg: ' + pathToFfmpeg)
  console.log(`ffmpeg server: ${serverUrl}`)
  // TODO latency still too high
  ffmpeg = child_process.spawn(pathToFfmpeg, [
    '-loglevel', 'info',
    // input
    '-f', 'image2pipe',
    '-vsync', 'vfr',
    '-c:v', 'png',
    '-i', 'pipe:',
    // output
    '-f', 'flv',
    '-vcodec', 'libx264',
    '-preset', 'superfast',
    '-tune', 'zerolatency',
    '-vsync', 'vfr',
    '-b:v', '50M',
    '-vf', 'scale=320:240',
    '-listen', '1',
    serverUrl,
  ], {
    windowsHide: true
  });
  
  ffmpeg.stdout.on('data', function (data) {
    console.log('ffmpeg stdout: ' + data);
  });
  
  ffmpeg.stderr.on('data', function (data) {
    console.log('ffmpeg stderr: ' + data);
  });
  
  ffmpeg.on('error', (err) => {
    console.log('ffmpeg error: ' + err.message);
  });
  
  ffmpeg.on('exit', (code, signal) => {
    ffmpeg = null
    console.log(`ffmpeg exited with code ${code}, restarting...`);
    startFfmpeg()
  });
}

function stopFfmpeg() {
  ffmpeg.kill()
}

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

    startFfmpeg()

    ipcMain.on('frame', (event, arg) => {
      if (!arg.data) {
        console.error('null frame received')
        return
      }
      if (arg.data.length === 0) {
        console.error('0-byte frame received')
        return
      }
      if (!ffmpeg) {
        console.log('ignoring frame (ffmpeg not running)')
        return
      }
      console.log(`frame received (${arg.data.length} bytes)`)
      ffmpeg.stdin.write(arg.data);
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



