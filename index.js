const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const { execFile, spawn } = require('child_process');
const fs = require('fs');

// Store API token globally
global.apiToken = '';

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'renderer.js'),
      nodeIntegration: true,
      contextIsolation: false,
    },
  });  mainWindow.loadFile('index.html');
  
  // Uncomment the following lines to open DevTools during development
  // if (!app.isPackaged) {
  //   mainWindow.webContents.openDevTools();
  // }
  
  // Listen for when the window is ready
  mainWindow.webContents.on('did-finish-load', () => {
    // Request API token from renderer
    mainWindow.webContents.send('get-api-token');
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Handle file selection dialog
let isDialogOpen = false;  // Flag to prevent multiple dialogs
ipcMain.handle('select-pdf', async (event) => {
  // Prevent multiple dialogs from opening simultaneously
  if (isDialogOpen) return null;
  
  isDialogOpen = true;
  try {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
    });
    
    if (canceled || filePaths.length === 0) {
      return null;
    }
    
    return filePaths[0];
  } finally {
    isDialogOpen = false;
  }
});

// Open the output directory
ipcMain.handle('open-output-dir', async (event) => {
  const outputDir = path.join(__dirname, 'output');
  shell.openPath(outputDir);
  return true;
});

// Open the result file
ipcMain.handle('open-result', async (event, filePath) => {
  shell.openPath(filePath);  return true;
});

// Set the API token
ipcMain.on('set-api-token', (event, token) => {
  global.apiToken = token;
  console.log('API token updated');
});

ipcMain.on('process-pdf', (event, pdfPath) => {
  // Get the base filename without extension
  const inputFilename = path.basename(pdfPath, path.extname(pdfPath));
  const outputPath = path.join(__dirname, 'output', `${inputFilename}.xlsx`);
  
  // Ensure output directory exists
  if (!fs.existsSync(path.join(__dirname, 'output'))) {
    fs.mkdirSync(path.join(__dirname, 'output'), { recursive: true });
  }
  
  // Handle path differences between development and production
  let pythonScriptPath;
  if (app.isPackaged) {
    // In production - use the resources folder
    pythonScriptPath = path.join(process.resourcesPath, 'python', 'extract_tables.py');
  } else {
    // In development
    pythonScriptPath = path.join(__dirname, 'python', 'extract_tables.py');
  }

  // Get the appropriate python executable based on platform
  // Use the appropriate python executable
  let pythonCommand;
  if (app.isPackaged) {
    // In production, use the bundled Python
    pythonCommand = path.join(__dirname, 'venv', 'Scripts', 'python.exe');
  } else {
    // In development, use system Python based on platform
    pythonCommand = process.platform === 'win32' ? 'python' : 'python3';
  }

  console.log(`Using Python: ${pythonCommand}`);
  console.log(`Script path: ${pythonScriptPath}`);
  console.log(`PDF path: ${pdfPath}`);
  console.log(`Output path: ${outputPath}`);
  // Set environment variables to increase verbosity if needed
  const env = Object.assign({}, process.env);
  env.PYTHONUNBUFFERED = '1';  // Force unbuffered stdout/stderr
  
  // Add API token to environment if available
  if (global.apiToken) {
    env.API_KEY = global.apiToken;
  }

  // Use spawn instead of execFile for better output handling
  const pythonProcess = spawn(
    pythonCommand, 
    [pythonScriptPath, pdfPath, outputPath],
    { env: env }
  );

  let stdoutData = '';
  let stderrData = '';

  // Capture stdout data
  pythonProcess.stdout.on('data', (data) => {
    const output = data.toString();
    console.log(`Python stdout: ${output}`);
    stdoutData += output;
    
    // Send real-time updates to the renderer
    mainWindow.webContents.send('process-update', { message: output });
  });

  // Capture stderr data
  pythonProcess.stderr.on('data', (data) => {
    const output = data.toString();
    console.log(`Python stderr: ${output}`);
    stderrData += output;
    
    // Send real-time updates to the renderer
    mainWindow.webContents.send('process-update', { message: output, isError: true });
  });

  // Process completion
  pythonProcess.on('close', (code) => {
    console.log(`Python process exited with code ${code}`);
    
    if (code === 0) {
      event.reply('process-done', { 
        success: true, 
        filePath: outputPath,
        message: stdoutData
      });
    } else if (code === 2) {
      // Special handling for OCR dependency issues (exit code 2)
      event.reply('process-done', { 
        success: false, 
        requiresOCR: true,
        message: stdoutData || "This PDF requires OCR processing, but OCR dependencies are missing."
      });
    } else {
      event.reply('process-done', { 
        success: false, 
        message: stderrData || stdoutData || "An unknown error occurred"
      });
    }
  });

  // Handle process errors (e.g., executable not found)
  pythonProcess.on('error', (err) => {
    console.log(`Python process error: ${err.message}`);
    event.reply('process-done', { 
      success: false, 
      message: `Error executing Python script: ${err.message}`
    });
  });
});

// Show installation instructions for OCR
ipcMain.handle('show-ocr-instructions', async (event) => {
  const options = {
    type: 'info',
    title: 'OCR Dependencies Required',
    message: 'This PDF requires OCR processing. Please install the required dependencies.',
    detail: 'For Windows:\n1. pip install pdf2image paddleocr paddlepaddle paddlex\n2. Install Poppler from https://github.com/oschwartz10612/poppler-windows/releases\n3. Add Poppler\'s bin folder to your PATH environment variable\n4. Restart your computer after updating PATH\n\nFor macOS:\n1. pip install pdf2image paddleocr paddlepaddle paddlex\n2. brew install poppler\n\nFor Linux:\n1. pip install pdf2image paddleocr paddlepaddle paddlex\n2. sudo apt-get install poppler-utils',
    buttons: ['OK', 'Test OCR Installation']
  };
  
  const { response } = await dialog.showMessageBox(mainWindow, options);
  
  // If user clicked "Test OCR Installation" button
  if (response === 1) {
    testOcrDependencies();
  }
  
  return true;
});

// Function to test OCR dependencies
function testOcrDependencies() {
  // Handle path differences between development and production
  let pythonScriptPath;
  if (app.isPackaged) {
    // In production - use the resources folder
    pythonScriptPath = path.join(process.resourcesPath, 'python', 'extract_tables.py');
  } else {
    // In development
    pythonScriptPath = path.join(__dirname, 'python', 'extract_tables.py');
  }

  // Get the appropriate python executable
  let pythonCommand;
  if (app.isPackaged) {
    // In production, use the bundled Python
    pythonCommand = path.join(__dirname, 'venv', 'Scripts', 'python.exe');
  } else {
    // In development, use system Python based on platform
    pythonCommand = process.platform === 'win32' ? 'python' : 'python3';
  }
  
  mainWindow.webContents.send('test-ocr-start');
  
  // Use spawn for better output handling
  const pythonProcess = spawn(
    pythonCommand, 
    [pythonScriptPath, '--test-ocr'],
    { env: { PYTHONUNBUFFERED: '1' } }
  );
  
  let stdoutData = '';
  let stderrData = '';
  
  pythonProcess.stdout.on('data', (data) => {
    const output = data.toString();
    console.log(`OCR test stdout: ${output}`);
    stdoutData += output;
    mainWindow.webContents.send('test-ocr-update', { message: output });
  });
  
  pythonProcess.stderr.on('data', (data) => {
    const output = data.toString();
    console.log(`OCR test stderr: ${output}`);
    stderrData += output;
    mainWindow.webContents.send('test-ocr-update', { message: output, isError: true });
  });
  
  pythonProcess.on('close', (code) => {
    console.log(`OCR test process exited with code ${code}`);
    
    if (code === 0) {
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'OCR Test Results',
        message: 'OCR Dependency Test Results',
        detail: stdoutData
      });
      mainWindow.webContents.send('test-ocr-complete', { success: true, message: stdoutData });
    } else {
      dialog.showMessageBox(mainWindow, {
        type: 'error',
        title: 'OCR Test Failed',
        message: 'OCR dependency test failed',
        detail: stderrData || stdoutData || "Unknown error"
      });
      mainWindow.webContents.send('test-ocr-complete', { success: false, message: stderrData || stdoutData });
    }
  });
  
  pythonProcess.on('error', (err) => {
    dialog.showMessageBox(mainWindow, {
      type: 'error',
      title: 'OCR Test Error',
      message: 'Could not execute Python script',
      detail: err.message
    });
    mainWindow.webContents.send('test-ocr-complete', { success: false, message: err.message });
  });
}

// Add a handler for testing OCR dependencies
ipcMain.handle('test-ocr-dependencies', async (event) => {
  testOcrDependencies();
  return true;
});