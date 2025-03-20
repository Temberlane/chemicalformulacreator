let apiKey = '';

// Listen for messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'startSelection') {
    // Inject the selector script when the user clicks the extension button
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || !tabs[0] || !tabs[0].id) {
        sendResponse({ success: false, error: "No active tab found" });
        return;
      }
      
      // Send a message to the content script to start selection
      chrome.tabs.sendMessage(tabs[0].id, { action: 'selectionStarted' }, 
        (response) => {
          // If there's no response, the content script might not be loaded
          if (chrome.runtime.lastError) {
            // Inject the content script first, then send the message
            chrome.scripting.executeScript({
              target: { tabId: tabs[0].id },
              files: ["content-scripts/selector.js"]
            }).then(() => {
              // Now that the script is injected, send the message again
              setTimeout(() => {
                chrome.tabs.sendMessage(tabs[0].id, { action: 'selectionStarted' });
              }, 100);
            }).catch(err => {
              console.error("Failed to inject script:", err);
            });
          }
        });
    });
    return true;
  }
  
  if (message.action === 'captureVisibleTab') {
    chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ success: true, dataUrl: dataUrl });
      }
    });
    return true; // Keep the messaging channel open for async response
  }
  
  if (message.action === 'processImage') {
    processImageWithOpenAI(message.imageData)
      .then(result => {
        sendResponse({ success: true, result: result });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    return true; // Required for async sendResponse
  }
  
  if (message.action === 'saveApiKey') {
    apiKey = message.apiKey;
    chrome.storage.local.set({ openaiApiKey: apiKey });
    sendResponse({ success: true });
    return true;
  }
});

// Initialize API key from storage
chrome.storage.local.get(['openaiApiKey'], (result) => {
  if (result.openaiApiKey) {
    apiKey = result.openaiApiKey;
  }
});

async function processImageWithOpenAI(imageData) {
  if (!apiKey) {
    throw new Error('OpenAI API key is not set. Please set it in the extension options.');
  }
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract any mathematical expressions, chemical formula or text from this image and convert it to LaTeX. Return only the LaTeX code without any explanations. Format the LaTeX such that it is inline (meaning it is surrounded by $ symbols). Use inbuilt symbols as nessesary, for example using \rightarrow and not \\rightarrow. IF NO FORMULA OR ANYTHING IS DETECTED, RETURN SOLELY THE TEXT."
              },
              {
                type: "image_url",
                image_url: {
                  url: imageData
                }
              }
            ]
          }
        ],
        max_tokens: 500
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
    }
    
    const data = await response.json();
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error processing image with OpenAI:', error);
    throw error;
  }
}