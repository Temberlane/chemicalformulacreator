document.addEventListener('DOMContentLoaded', () => {
  const apiKeyInput = document.getElementById('api-key');
  const saveApiKeyButton = document.getElementById('save-api-key');
  const apiKeyStatus = document.getElementById('api-key-status');
  const startCaptureButton = document.getElementById('start-capture');
  const toggleVisibilityButton = document.getElementById('toggle-visibility');
  
  // Load saved API key if available
  chrome.storage.local.get(['openaiApiKey'], (result) => {
    if (result.openaiApiKey) {
      apiKeyInput.value = result.openaiApiKey;
      apiKeyStatus.textContent = 'API key is set';
      apiKeyStatus.className = 'success';
    }
  });
  
  // Toggle API key visibility
  toggleVisibilityButton.addEventListener('click', () => {
    if (apiKeyInput.type === 'password') {
      apiKeyInput.type = 'text';
      toggleVisibilityButton.textContent = '🔒';
    } else {
      apiKeyInput.type = 'password';
      toggleVisibilityButton.textContent = '👁️';
    }
  });
  
  // Save API key
  saveApiKeyButton.addEventListener('click', () => {
    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
      apiKeyStatus.textContent = 'API key cannot be empty';
      apiKeyStatus.className = 'error';
      return;
    }
    
    chrome.runtime.sendMessage({ 
      action: 'saveApiKey', 
      apiKey: apiKey 
    }, (response) => {
      if (response && response.success) {
        apiKeyStatus.textContent = 'API key saved successfully';
        apiKeyStatus.className = 'success';
      } else {
        apiKeyStatus.textContent = 'Failed to save API key';
        apiKeyStatus.className = 'error';
      }
    });
  });
  
  // Start screen capture
  startCaptureButton.addEventListener('click', () => {
    console.log("Starting capture process...");
    chrome.runtime.sendMessage({ action: 'startSelection' }, (response) => {
      if (response && response.error) {
        console.error("Error starting selection:", response.error);
      } else {
        console.log("Selection process started");
      }
    });
    window.close(); // Close the popup
  });
});