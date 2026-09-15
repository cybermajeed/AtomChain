const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

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
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

function startPythonBackend() {
  const backendPath = path.join(__dirname, '../../backend');
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
    pythonProcess.kill();
  }
});
