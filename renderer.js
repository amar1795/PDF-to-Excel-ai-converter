const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', () => {
  const selectButton = document.getElementById('select-button');
  const filePathDisplay = document.getElementById('file-path');
  const processButton = document.getElementById('process-button');
  const resultSection = document.getElementById('result-section');
  const resultMessage = document.getElementById('result-message');
  const openResultButton = document.getElementById('open-result');
  const openFolderButton = document.getElementById('open-folder');
  const ocrInstructionsButton = document.getElementById('ocr-instructions');
  const testOcrButton = document.getElementById('test-ocr');
  const loadingIndicator = document.getElementById('loading');
    let selectedFile = null;
  let resultFile = null;
  let isSelectingFile = false; // Flag to prevent multiple dialogs
  
  // Hide result section initially
  resultSection.style.display = 'none';
  loadingIndicator.style.display = 'none';
  
  selectButton.addEventListener('click', async () => {
    // Prevent multiple dialogs from opening
    if (isSelectingFile) return;
    
    isSelectingFile = true;
    try {
      const filePath = await ipcRenderer.invoke('select-pdf');
      if (filePath) {
        selectedFile = filePath;
        filePathDisplay.textContent = filePath;
        processButton.disabled = false;
      }
    } finally {
      isSelectingFile = false;
    }
  });
  
  processButton.addEventListener('click', () => {
    if (!selectedFile) return;
    
    // Show loading indicator
    loadingIndicator.style.display = 'block';
    resultSection.style.display = 'none';
    processButton.disabled = true;
    
    // Process the PDF
    ipcRenderer.send('process-pdf', selectedFile);
  });
  
  openResultButton.addEventListener('click', () => {
    if (resultFile) {
      ipcRenderer.invoke('open-result', resultFile);
    }
  });
  
  openFolderButton.addEventListener('click', () => {
    ipcRenderer.invoke('open-output-dir');
  });
  
  ocrInstructionsButton.addEventListener('click', () => {
    ipcRenderer.invoke('show-ocr-instructions');
  });
  
  testOcrButton.addEventListener('click', () => {
    // Show loading indicator
    loadingIndicator.style.display = 'block';
    testOcrButton.disabled = true;
    testOcrButton.textContent = 'Testing OCR...';
    
    ipcRenderer.invoke('test-ocr-dependencies');
  });
  
  // Handle OCR test events
  ipcRenderer.on('test-ocr-start', () => {
    loadingIndicator.style.display = 'block';
    testOcrButton.disabled = true;
    testOcrButton.textContent = 'Testing OCR...';
  });
  
  ipcRenderer.on('test-ocr-complete', (event, result) => {
    loadingIndicator.style.display = 'none';
    testOcrButton.disabled = false;
    testOcrButton.textContent = 'Test OCR Installation';
  });
  
  // Handle processing result
  ipcRenderer.on('process-done', (event, result) => {
    loadingIndicator.style.display = 'none';
    resultSection.style.display = 'block';
    processButton.disabled = false;
    
    if (result.success) {
      resultFile = result.filePath;
      resultMessage.innerHTML = `<span class="success">✓ Tables extracted successfully!</span><br>File saved at: ${result.filePath}`;
      openResultButton.style.display = 'inline-block';
      openFolderButton.style.display = 'inline-block';
      ocrInstructionsButton.style.display = 'none';
    } else {
      resultMessage.innerHTML = `<span class="error">✗ Error:</span><br>${result.message}`;
      openResultButton.style.display = 'none';
      
      if (result.requiresOCR) {
        ocrInstructionsButton.style.display = 'inline-block';
      } else {
        ocrInstructionsButton.style.display = 'none';
      }
    }
  });
});