const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog(BrowserWindow.getAllWindows()[0], {
    properties: ['openDirectory']
  });
  if (result.canceled) return null;
  return result.filePaths[0];
});

let mainWindow;
let pythonProcess;
const PYTHON_PORT = 8000;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // Check if we are in dev mode
  const isDev = !app.isPackaged;
  
  if (isDev) {
    // We assume Vite is running on 5173
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

function startPythonBackend() {
  const isDev = !app.isPackaged;
  let backendPath;
  
  if (isDev) {
    backendPath = path.join(__dirname, '../../backend');
  } else {
    backendPath = path.join(process.resourcesPath, 'backend');
  }
  
  const pythonExecutable = path.join(backendPath, 'venv/Scripts/python.exe');
  const mainScript = path.join(backendPath, 'main.py');
  
  console.log(`Starting Python backend on port ${PYTHON_PORT}...`);
  
  pythonProcess = spawn(pythonExecutable, [mainScript, PYTHON_PORT.toString()], {
    cwd: backendPath,
    stdio: 'pipe'
  });

  pythonProcess.stdout.on('data', (data) => {
    console.log(`[Python]: ${data.toString()}`);
  });

  pythonProcess.stderr.on('data', (data) => {
    console.error(`[Python Error]: ${data.toString()}`);
  });

  pythonProcess.on('error', (err) => {
    console.error('Failed to start python backend:', err);
  });
  
  pythonProcess.on('close', (code) => {
    console.log(`Python process exited with code ${code}`);
  });
}

app.whenReady().then(() => {
  startPythonBackend();
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  if (pythonProcess) {
    console.log('Killing python backend...');
    if (process.platform === 'win32') {
      const { spawn } = require('child_process');
      spawn('taskkill', ['/pid', pythonProcess.pid, '/f', '/t']);
    } else {
      pythonProcess.kill();
    }
  }
});
