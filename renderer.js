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
  const loadingIndicator = document.getElementById('loading');
  const timerDisplay = document.getElementById('timer-display');
  
  // API Token elements
  const apiTokenInput = document.getElementById('api-token-input');
  const addTokenButton = document.getElementById('add-token-button');
  const editTokenButton = document.getElementById('edit-token-button');
  const removeTokenButton = document.getElementById('remove-token-button');
  const tokenStatusText = document.getElementById('token-status-text');
  const tokenAddedIcon = document.getElementById('token-added-icon');
  const tokenInputContainer = document.getElementById('token-input-container');
  const tokenActionsContainer = document.getElementById('token-actions-container');
  
  let selectedFile = null;
  let resultFile = null;
  let isSelectingFile = false; // Flag to prevent multiple dialogs
  let timerInterval = null;
  let startTime = null;
  let elapsedTime = 0;
  let apiToken = localStorage.getItem('googleApiToken') || '';
  
  // Hide result section initially
  resultSection.style.display = 'none';
  loadingIndicator.style.display = 'none';
    // Initialize API token UI based on stored value
  updateTokenUI();
    // API Token handling functions
  function updateTokenUI() {
    if (apiToken) {
      // Token exists
      tokenStatusText.textContent = 'Token added';
      tokenAddedIcon.classList.remove('hidden');
      tokenInputContainer.classList.add('hidden');
      tokenActionsContainer.classList.remove('hidden');
      processButton.disabled = !selectedFile; // Enable process button if file is selected
    } else {
      // No token
      tokenStatusText.textContent = 'Please add token';
      tokenAddedIcon.classList.add('hidden');
      tokenInputContainer.classList.remove('hidden');
      tokenActionsContainer.classList.add('hidden');
      processButton.disabled = true; // Disable process button until token is added
    }
  }
  
  // Listen for get-api-token request from main process
  ipcRenderer.on('get-api-token', () => {
    const savedToken = localStorage.getItem('googleApiToken');
    if (savedToken) {
      apiToken = savedToken;
      ipcRenderer.send('set-api-token', savedToken);
      updateTokenUI();
    }
  });
    // Add token button
  addTokenButton.addEventListener('click', () => {
    const token = apiTokenInput.value.trim();
    if (token) {
      // Show loading state
      tokenStatusText.textContent = 'Validating...';
      addTokenButton.disabled = true;
        // Send token to main process for validation
      ipcRenderer.invoke('validate-api-key', token)
        .then(result => {
          if (result.isValid) {
            // Token is valid
            apiToken = token;
            localStorage.setItem('googleApiToken', token);
            // Send token to main process
            ipcRenderer.send('set-api-token', token);
            apiTokenInput.value = '';
            updateTokenUI();
          } else {
            // Token is invalid
            apiTokenInput.classList.add('invalid-input');
            tokenStatusText.textContent = 'Invalid API key';
            tokenStatusText.classList.add('error');
            console.error('API Key validation error:', result.message);
            
            // Display the actual error in a tooltip or as a visible message
            const errorMsg = document.createElement('div');
            errorMsg.textContent = result.message.slice(0, 150) + (result.message.length > 150 ? '...' : '');
            errorMsg.className = 'api-error-message';
            errorMsg.style.position = 'absolute';
            errorMsg.style.top = '100%';
            errorMsg.style.left = '0';
            errorMsg.style.backgroundColor = '#fceae9';
            errorMsg.style.padding = '5px';
            errorMsg.style.borderRadius = '3px';
            errorMsg.style.border = '1px solid #e74c3c';
            errorMsg.style.zIndex = '100';
            errorMsg.style.color = '#e74c3c';
            errorMsg.style.fontSize = '12px';
            errorMsg.style.maxWidth = '300px';
            
            // Add the error message to the DOM
            const tokenContainer = document.getElementById('token-input-container');
            tokenContainer.style.position = 'relative';
            tokenContainer.appendChild(errorMsg);
            
            // Remove the error message after some time
            setTimeout(() => {
              tokenStatusText.classList.remove('error');
              apiTokenInput.classList.remove('invalid-input');
              tokenStatusText.textContent = 'Please add token';
              tokenContainer.removeChild(errorMsg);
            }, 5000);
          }
        })
        .catch(error => {
          console.error('Error validating API key:', error);
          tokenStatusText.textContent = 'Validation error';
          tokenStatusText.classList.add('error');
          setTimeout(() => {
            tokenStatusText.classList.remove('error');
            tokenStatusText.textContent = 'Please add token';
          }, 3000);
        })
        .finally(() => {
          addTokenButton.disabled = false;
        });
    }
  });
  
  // Edit token button
  editTokenButton.addEventListener('click', () => {
    // Show input with current token
    apiTokenInput.value = apiToken;
    tokenInputContainer.classList.remove('hidden');
    tokenActionsContainer.classList.add('hidden');
  });
  
  // Remove token button
  removeTokenButton.addEventListener('click', () => {
    apiToken = '';
    localStorage.removeItem('googleApiToken');
    // Notify main process
    ipcRenderer.send('set-api-token', '');
    updateTokenUI();
  });
  
  selectButton.addEventListener('click', async () => {
    // Prevent multiple dialogs from opening
    if (isSelectingFile) return;
    
    isSelectingFile = true;    try {
      const filePath = await ipcRenderer.invoke('select-pdf');
      if (filePath) {
        selectedFile = filePath;
        filePathDisplay.textContent = filePath;
        // Enable process button only if we have both file and API token
        processButton.disabled = !apiToken;
      }
    } finally {
      isSelectingFile = false;
    }
  });
  processButton.addEventListener('click', () => {
    if (!selectedFile || !apiToken) return;
    
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