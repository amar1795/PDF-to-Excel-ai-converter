const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', () => {  const selectButton = document.getElementById('select-button');
  const filePathDisplay = document.getElementById('file-path');
  const processButton = document.getElementById('process-button');
  const resultSection = document.getElementById('result-section');
  const resultMessage = document.getElementById('result-message');
  const openResultButton = document.getElementById('open-result');
  const openFolderButton = document.getElementById('open-folder');
  const ocrInstructionsButton = document.getElementById('ocr-instructions');
  const loadingIndicator = document.getElementById('loading');
  const timerDisplay = document.getElementById('timer-display');
  
  let selectedFile = null;
  let resultFile = null;
  let isSelectingFile = false; // Flag to prevent multiple dialogs
  let timerInterval = null;
  let startTime = null;
  let elapsedTime = 0;
  
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
    
    // Start the timer
    startTimer();
    
    // Process the PDF
    ipcRenderer.send('process-pdf', selectedFile);
  });
    // Timer functions
  function startTimer() {
    // Reset timer
    elapsedTime = 0;
    startTime = Date.now();
    timerDisplay.textContent = 'Time elapsed: 0s';
    
    // Start interval
    timerInterval = setInterval(() => {
      elapsedTime = Math.floor((Date.now() - startTime) / 1000);
      timerDisplay.textContent = `Time elapsed: ${formatTime(elapsedTime)}`;
    }, 1000);
  }
  
  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    return elapsedTime;
  }
  
  function formatTime(seconds) {
    if (seconds < 60) {
      return `${seconds}s`;
    } else if (seconds < 3600) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
  }
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
  // Handle processing result
  ipcRenderer.on('process-done', (event, result) => {
    loadingIndicator.style.display = 'none';
    resultSection.style.display = 'block';
    processButton.disabled = false;
    
    // Stop the timer and get total time
    const totalTime = stopTimer();
    const timeMessage = `<br>Completed in ${formatTime(totalTime)}`;
    
    if (result.success) {
      resultFile = result.filePath;
      resultMessage.innerHTML = `<span class="success">✓ Tables extracted successfully!</span>${timeMessage}<br>File saved at: ${result.filePath}`;
      openResultButton.style.display = 'inline-block';
      openFolderButton.style.display = 'inline-block';
      ocrInstructionsButton.style.display = 'none';
    } else {
      resultMessage.innerHTML = `<span class="error">✗ Error:</span>${timeMessage}<br>${result.message}`;
      openResultButton.style.display = 'none';
      
      if (result.requiresOCR) {
        ocrInstructionsButton.style.display = 'inline-block';
      } else {
        ocrInstructionsButton.style.display = 'none';
      }
    }
  });
});