let isSelecting = false;
let startX, startY;
let selectionBox = null;
let resultsActive = false; // Add this flag to track if results are being displayed

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'selectionStarted') {
    // Only allow starting a new selection if no results are currently displayed
    if (!resultsActive) {
      startSelection();
      sendResponse({ success: true }); // Acknowledge receipt
    } else {
      sendResponse({ success: false, error: "Results already displayed" });
    }
  }
  return true;
});

function startSelection() {
  console.log("Starting selection...");
  // Set cursor to crosshair to indicate selection mode
  document.body.style.cursor = 'crosshair';
  
  // Create an overlay to display instructions and intercept clicks
  const overlay = document.createElement('div');
  overlay.id = 'latex-ocr-overlay';
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100%';
  overlay.style.height = '100%';
  overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.1)';
  overlay.style.zIndex = '99999';
  overlay.style.cursor = 'crosshair';
  overlay.style.pointerEvents = 'all'; // Important: make overlay intercept all mouse events
  
  // Add instruction text
  const overlayText = document.createElement('p');
  overlayText.textContent = 'Click and drag to select an area for OCR';
  overlayText.style.color = 'white';
  overlayText.style.textAlign = 'center';
  overlayText.style.marginTop = '20px';
  overlayText.style.fontSize = '20px';
  overlayText.style.textShadow = '0 0 3px black';
  overlay.appendChild(overlayText);
  
  document.body.appendChild(overlay);
  
  // Create the selection box
  selectionBox = document.createElement('div');
  selectionBox.id = 'latex-ocr-selection';
  selectionBox.style.position = 'fixed';
  selectionBox.style.border = '2px dashed rgba(66, 133, 244, 0.8)';
  selectionBox.style.backgroundColor = 'rgba(66, 133, 244, 0.1)';
  selectionBox.style.zIndex = '100000';
  selectionBox.style.boxSizing = 'border-box';
  selectionBox.style.pointerEvents = 'none'; // So it doesn't interfere with mouse events
  
  // Add mousedown event listener to the overlay
  overlay.addEventListener('mousedown', handleMouseDown);
  
  function handleMouseDown(e) {
    // Prevent default behaviors
    e.preventDefault();
    e.stopPropagation();
    
    console.log("Mouse down detected at:", e.clientX, e.clientY);
    
    isSelecting = true;
    startX = e.clientX;
    startY = e.clientY;
    
    // Add the selection box to the DOM with initial position and size
    selectionBox.style.left = `${startX}px`;
    selectionBox.style.top = `${startY}px`;
    selectionBox.style.width = '0';
    selectionBox.style.height = '0';
    document.body.appendChild(selectionBox);
    
    // Add mousemove and mouseup event listeners to the overlay
    overlay.addEventListener('mousemove', handleMouseMove);
    overlay.addEventListener('mouseup', handleMouseUp);
    
    // Hide instruction text during selection
    overlayText.style.display = 'none';
  }
  
  function handleMouseMove(e) {
    if (!isSelecting) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const currentX = e.clientX;
    const currentY = e.clientY;
    
    // Calculate dimensions for the selection box
    const left = Math.min(startX, currentX);
    const top = Math.min(startY, currentY);
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);
    
    // Update selection box position and size
    selectionBox.style.left = `${left}px`;
    selectionBox.style.top = `${top}px`;
    selectionBox.style.width = `${width}px`;
    selectionBox.style.height = `${height}px`;
    
    console.log("Selection box updated:", left, top, width, height);
  }
  
  function handleMouseUp(e) {
    if (!isSelecting) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    console.log("Mouse up detected, ending selection");
    
    isSelecting = false;
    
    const endX = e.clientX;
    const endY = e.clientY;
    
    // Remove event listeners
    overlay.removeEventListener('mousemove', handleMouseMove);
    overlay.removeEventListener('mouseup', handleMouseUp);
    overlay.removeEventListener('mousedown', handleMouseDown);
    
    // Remove the overlay
    document.body.removeChild(overlay);
    
    // Reset cursor
    document.body.style.cursor = 'default';
    
    // Calculate the selection area
    const left = Math.min(startX, endX);
    const top = Math.min(startY, endY);
    const width = Math.abs(endX - startX);
    const height = Math.abs(endY - startY);
    
    console.log("Final selection dimensions:", left, top, width, height);
    
    // If selection is too small, ignore
    if (width < 10 || height < 10) {
      console.log("Selection too small, ignoring");
      cleanupSelection();
      resultsActive = false; // Reset flag if selection is canceled
      return;
    }
    
    // Capture the selection
    captureSelection(left, top, width, height);
  }
}

// Remove or comment out this function since it's not being used and might cause conflicts
// function onMouseMove(e) {
//   if (!isSelecting) return;
//   
//   e.preventDefault();
//   e.stopPropagation();
//   
//   const currentX = e.clientX;
//   const currentY = e.clientY;
//   
//   // Calculate dimensions for the selection box
//   const left = Math.min(startX, currentX);
//   const top = Math.min(startY, currentY);
//   const width = Math.abs(currentX - startX);
//   const height = Math.abs(currentY - startY);
//   
//   // Update selection box position and size
//   selectionBox.style.left = `${left}px`;
//   selectionBox.style.top = `${top}px`;
//   selectionBox.style.width = `${width}px`;
//   selectionBox.style.height = `${height}px`;
// }

function cleanupSelection() {
  if (selectionBox) {
    selectionBox.remove();
    selectionBox = null;
  }
}

function captureSelection(left, top, width, height) {
  // Create a canvas element to draw the selected area
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  // Indicate that capture is in progress
  selectionBox.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
  
  // Create and append the loader
  const loader = document.createElement('div');
  loader.className = 'latex-ocr-loader';
  selectionBox.appendChild(loader);
  
  // Use browser's screenshot API to capture visible tab
  chrome.runtime.sendMessage({ 
    action: 'captureVisibleTab' 
  }, (response) => {
    // Check if screenshot was successful
    if (!response || !response.success) {
      showError(response?.error || 'Failed to capture screenshot');
      cleanupSelection();
      return;
    }

    const screenshotUrl = response.dataUrl;
    const img = new Image();
    
    img.onload = function() {
      // Calculate scale factor for retina displays
      const devicePixelRatio = window.devicePixelRatio || 1;
      
      try {
        // Draw the selected portion of the screenshot to the canvas
        ctx.drawImage(
          img, 
          left * devicePixelRatio, 
          top * devicePixelRatio, 
          width * devicePixelRatio, 
          height * devicePixelRatio, 
          0, 0, width, height
        );
        
        // Convert canvas to base64 image data
        const imageData = canvas.toDataURL('image/png');
        
        // Send the image to background script for OCR processing
        chrome.runtime.sendMessage({
          action: 'processImage',
          imageData: imageData
        }, (response) => {
          if (response && response.success) {
            displayResult(response.result);
          } else {
            showError((response && response.error) || 'Failed to process image');
          }
          cleanupSelection();
        });
      } catch (err) {
        console.error("Error drawing image:", err);
        showError('Error processing the screenshot');
        cleanupSelection();
      }
    };
    
    img.onerror = function() {
      showError('Failed to load screenshot');
      cleanupSelection();
    };
    
    img.src = screenshotUrl;
  });
}

// In the displayResult function, set the resultsActive flag to true
function displayResult(latexCode) {
    resultsActive = true; // Mark that results are now active
    console.log("Displaying result with LaTeX:", latexCode);
    
    // Create result display
    const resultDiv = document.createElement('div');
    resultDiv.id = 'latex-ocr-result';
    
    // Create close button
    const closeButton = document.createElement('button');
    closeButton.textContent = '×';
    closeButton.className = 'latex-ocr-close';
    closeButton.addEventListener('click', function() {
      resultDiv.remove();
      resultsActive = false; // Reset the flag when results are closed
    });
    
    // Create raw LaTeX display
    const rawLatex = document.createElement('pre');
    rawLatex.textContent = latexCode;
    rawLatex.className = 'latex-ocr-raw';
    
    // Create copy button
    const copyButton = document.createElement('button');
    copyButton.textContent = 'Copy LaTeX';
    copyButton.className = 'latex-ocr-copy';
    copyButton.addEventListener('click', function() {
      navigator.clipboard.writeText(latexCode)
        .then(() => {
          copyButton.textContent = 'Copied!';
          setTimeout(() => {
            copyButton.textContent = 'Copy LaTeX';
          }, 2000);
        })
        .catch(() => {
          // Fallback for clipboard API failures
          const textarea = document.createElement('textarea');
          textarea.value = latexCode;
          textarea.style.position = 'fixed';
          textarea.style.opacity = '0';
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);
          
          copyButton.textContent = 'Copied!';
          setTimeout(() => {
            copyButton.textContent = 'Copy LaTeX';
          }, 2000);
        });
    });
    
    // Create rendered LaTeX container
    const renderedLatex = document.createElement('div');
    renderedLatex.className = 'latex-ocr-rendered';
    
    // Assemble the result display
    resultDiv.appendChild(closeButton);
    resultDiv.appendChild(renderedLatex);
    resultDiv.appendChild(rawLatex);
    resultDiv.appendChild(copyButton);
    document.body.appendChild(resultDiv);
    
    // Add a loading indicator
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'latex-ocr-loader';
    loadingIndicator.style.margin = '20px auto';
    renderedLatex.appendChild(loadingIndicator);
    
    // Try to render LaTeX 
    loadKaTeX(() => {
      // Remove loading indicator
      loadingIndicator.remove();
      
      try {
        renderLatexSafely(latexCode, renderedLatex);
      } catch (e) {
        console.error('KaTeX rendering error:', e);
        renderBasicChemicalFormula(latexCode, renderedLatex);
      }
    });
  }

function tryMathJaxFallback(latexCode, container) {
  console.log("Trying MathJax fallback...");
  
  // Add a notice about fallback
  const fallbackNotice = document.createElement('p');
  fallbackNotice.textContent = 'Rendering with MathJax fallback...';
  fallbackNotice.style.color = '#666';
  fallbackNotice.style.fontStyle = 'italic';
  container.appendChild(fallbackNotice);
  
  // If MathJax is not already loaded, load it
  if (!window.MathJax) {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js';
    script.async = true;
    
    script.onload = function() {
      // Configure MathJax
      window.MathJax = {
        tex: {
          inlineMath: [['$', '$'], ['\\(', '\\)']],
          displayMath: [['$$', '$$'], ['\\[', '\\]']]
        },
        options: {
          renderActions: {
            addMenu: [0, '', '']
          }
        }
      };
      
      // Render the LaTeX with MathJax
      const mathDiv = document.createElement('div');
      mathDiv.textContent = '$$' + latexCode + '$$';
      container.appendChild(mathDiv);
      
      // Process the math
      window.MathJax.typeset([mathDiv]);
    };
    
    script.onerror = function() {
      fallbackNotice.textContent = 'Failed to load LaTeX renderers';
      fallbackNotice.style.color = 'red';
    };
    
    document.head.appendChild(script);
  } else {
    // MathJax is already loaded
    const mathDiv = document.createElement('div');
    mathDiv.textContent = '$$' + latexCode + '$$';
    container.appendChild(mathDiv);
    
    // Process the math
    window.MathJax.typeset([mathDiv]);
  }
}

// Function to render LaTeX safely with KaTeX
function renderLatexSafely(latexCode, container) {
  console.log("Rendering LaTeX with basic renderer:", latexCode);
  
  // Handle the case where the formula is surrounded by $ 
  let cleanLatex = latexCode.trim();
  if (cleanLatex.startsWith('$') && cleanLatex.endsWith('$')) {
    cleanLatex = cleanLatex.substring(1, cleanLatex.length - 1);
  }
  
  // Due to CSP restrictions, we'll just use our basic renderer
  renderBasicChemicalFormula(cleanLatex, container);
}

// Specialized renderer for chemical formulas
function renderBasicChemicalFormula(formula, container) {
  container.innerHTML = '';
  
  const formulaDiv = document.createElement('div');
  formulaDiv.className = 'chemical-formula';
  formulaDiv.style.fontFamily = '"Times New Roman", Times, serif';
  formulaDiv.style.color = 'black';
  formulaDiv.style.fontSize = '20px';
  formulaDiv.style.lineHeight = '1.5';
  formulaDiv.style.textAlign = 'center';
  formulaDiv.style.padding = '15px';
  formulaDiv.style.backgroundColor = '#f8f8f8';
  formulaDiv.style.border = '1px solid #ddd';
  formulaDiv.style.borderRadius = '4px';
  
  // Special handling for chemical formulas and math expressions
  let processedFormula = formula
    // Handle fractions
    .replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '<div style="display:inline-block;text-align:center;vertical-align:middle;"><div style="border-bottom:1px solid;padding:0 3px;">$1</div><div style="padding:0 3px;">$2</div></div>')
    
    // Handle subscripts - e.g., O_2 becomes O<sub>2</sub>
    .replace(/\_(\d+)/g, '<sub>$1</sub>')
    .replace(/\_\{([^{}]+)\}/g, '<sub>$1</sub>')
    
    // Handle superscripts - e.g., ^+ becomes <sup>+</sup>
    .replace(/\^(\d+|\+|\-)/g, '<sup>$1</sup>')
    .replace(/\^\{([^{}]+)\}/g, '<sup>$1</sup>')
    
    // Handle integrals and other symbols
    .replace(/\\int/g, '∫')
    .replace(/\\sum/g, '∑')
    .replace(/\\prod/g, '∏')
    .replace(/\\infty/g, '∞')
    .replace(/\\times/g, '×')
    .replace(/\\div/g, '÷')
    .replace(/\\pm/g, '±')
    .replace(/\\cdot/g, '·')
    
    // Handle arrows
    .replace(/\\rightarrow/g, ' → ')
    .replace(/\\leftarrow/g, ' ← ')
    .replace(/\\leftrightarrow/g, ' ↔ ')
    .replace(/\\Rightarrow/g, ' ⇒ ')
    .replace(/\\Leftarrow/g, ' ⇐ ')
    .replace(/\\Leftrightarrow/g, ' ⇔ ')
    
    // Handle comparison operators
    .replace(/\\leq/g, '≤')
    .replace(/\\geq/g, '≥')
    .replace(/\\neq/g, '≠')
    .replace(/\\approx/g, '≈')
    .replace(/\\sim/g, '∼')
    .replace(/\\cong/g, '≅')
    .replace(/\\propto/g, '∝')
    
    // Square root
    .replace(/\\sqrt\{([^{}]+)\}/g, '√($1)')
    
    // Handle common brackets
    .replace(/\\{/g, '{')
    .replace(/\\}/g, '}')
    .replace(/\\left\(/g, '(')
    .replace(/\\right\)/g, ')')
    .replace(/\\left\[/g, '[')
    .replace(/\\right\]/g, ']')
    
    // Add spaces around plus and minus signs
    .replace(/([^\s])\+([^\s])/g, '$1 + $2')
    .replace(/([^\s])\-([^\s])/g, '$1 - $2')
    
    // Greek letters (lowercase)
    .replace(/\\alpha/g, 'α')
    .replace(/\\beta/g, 'β')
    .replace(/\\gamma/g, 'γ')
    .replace(/\\delta/g, 'δ')
    .replace(/\\epsilon/g, 'ε')
    .replace(/\\varepsilon/g, 'ε')
    .replace(/\\zeta/g, 'ζ')
    .replace(/\\eta/g, 'η')
    .replace(/\\theta/g, 'θ')
    .replace(/\\vartheta/g, 'ϑ')
    .replace(/\\iota/g, 'ι')
    .replace(/\\kappa/g, 'κ')
    .replace(/\\lambda/g, 'λ')
    .replace(/\\mu/g, 'μ')
    .replace(/\\nu/g, 'ν')
    .replace(/\\xi/g, 'ξ')
    .replace(/\\pi/g, 'π')
    .replace(/\\varpi/g, 'ϖ')
    .replace(/\\rho/g, 'ρ')
    .replace(/\\varrho/g, 'ϱ')
    .replace(/\\sigma/g, 'σ')
    .replace(/\\varsigma/g, 'ς')
    .replace(/\\tau/g, 'τ')
    .replace(/\\upsilon/g, 'υ')
    .replace(/\\phi/g, 'φ')
    .replace(/\\varphi/g, 'φ')
    .replace(/\\chi/g, 'χ')
    .replace(/\\psi/g, 'ψ')
    .replace(/\\omega/g, 'ω')
    
    // Greek letters (uppercase)
    .replace(/\\Gamma/g, 'Γ')
    .replace(/\\Delta/g, 'Δ')
    .replace(/\\Theta/g, 'Θ')
    .replace(/\\Lambda/g, 'Λ')
    .replace(/\\Xi/g, 'Ξ')
    .replace(/\\Pi/g, 'Π')
    .replace(/\\Sigma/g, 'Σ')
    .replace(/\\Upsilon/g, 'Υ')
    .replace(/\\Phi/g, 'Φ')
    .replace(/\\Psi/g, 'Ψ')
    .replace(/\\Omega/g, 'Ω')
    
    // Remove remaining LaTeX commands that we don't specifically handle
    .replace(/\\[a-zA-Z]+/g, '');
  
  formulaDiv.innerHTML = processedFormula;
  container.appendChild(formulaDiv);
  
  // Add a disclaimer only in very complex formulas
  if (formula.includes('\\int') || formula.includes('\\sum') || formula.includes('\\frac')) {
    const notice = document.createElement('p');
    notice.textContent = 'Basic rendering for complex formula (some elements may not display correctly due to browser security restrictions)';
    notice.style.color = '#666';
    notice.style.fontStyle = 'italic';
    notice.style.marginTop = '10px';
    notice.style.fontSize = '12px';
    container.appendChild(notice);
  }
}

// Simple text-based renderer as ultimate fallback
function renderAsFormattedText(latexCode, container) {
  container.innerHTML = '';
  
  const notice = document.createElement('p');
  notice.textContent = 'Displaying formatted LaTeX code:';
  notice.style.color = '#666';
  notice.style.fontStyle = 'italic';
  notice.style.marginBottom = '10px';
  container.appendChild(notice);
  
  const formattedDiv = document.createElement('div');
  formattedDiv.className = 'latex-formatted-text';
  formattedDiv.style.fontFamily = 'monospace';
  formattedDiv.style.whiteSpace = 'pre-wrap';
  formattedDiv.style.wordBreak = 'break-word';
  formattedDiv.style.padding = '10px';
  formattedDiv.style.border = '1px solid #eee';
  formattedDiv.style.borderRadius = '4px';
  formattedDiv.style.backgroundColor = '#f9f9f9';
  
  const formatted = latexCode
    .replace(/\\/g, '\\<span style="color:#0066cc;">\\</span>')
    .replace(/\\{/g, '<span style="color:#cc0000;">{</span>')
    .replace(/\\}/g, '<span style="color:#cc0000;">}</span>')
    .replace(/\_/g, '<span style="color:#cc6600;">_</span>')
    .replace(/\^/g, '<span style="color:#cc6600;">^</span>');
  
  formattedDiv.innerHTML = formatted;
  container.appendChild(formattedDiv);
}

function loadKaTeX(callback) {
  // Given the CSP restrictions, we're going to skip KaTeX loading entirely
  // and go straight to our basic chemical formula renderer
  console.log("Using basic renderer due to Content Security Policy restrictions");
  callback();
}

// Also update showError to reset the flag if there's an error
function showError(message) {
  resultsActive = false; // Reset flag on error
  
  const errorDiv = document.createElement('div');
  errorDiv.id = 'latex-ocr-error';
  errorDiv.style.position = 'fixed';
  errorDiv.style.top = '20px';
  errorDiv.style.left = '50%';
  errorDiv.style.transform = 'translateX(-50%)';
  errorDiv.style.backgroundColor = '#f44336';
  errorDiv.style.color = 'white';
  errorDiv.style.padding = '15px 20px';
  errorDiv.style.borderRadius = '4px';
  errorDiv.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.2)';
  errorDiv.style.zIndex = '100001';
  errorDiv.style.display = 'flex';
  errorDiv.style.justifyContent = 'space-between';
  errorDiv.style.alignItems = 'center';
  errorDiv.style.minWidth = '300px';
  errorDiv.style.maxWidth = '80%';
  
  const messageEl = document.createElement('span');
  messageEl.textContent = message;
  messageEl.style.flex = '1';
  messageEl.style.marginRight = '15px';
  errorDiv.appendChild(messageEl);
  
  const closeButton = document.createElement('button');
  closeButton.textContent = '×';
  closeButton.className = 'latex-ocr-close';
  closeButton.style.background = 'none';
  closeButton.style.border = 'none';
  closeButton.style.color = 'white';
  closeButton.style.fontSize = '24px';
  closeButton.style.cursor = 'pointer';
  closeButton.style.padding = '0';
  closeButton.style.lineHeight = '24px';
  closeButton.style.height = '24px';
  closeButton.style.width = '24px';
  closeButton.style.display = 'flex';
  closeButton.style.justifyContent = 'center';
  closeButton.style.alignItems = 'center';
  closeButton.style.marginLeft = 'auto';
  
  closeButton.addEventListener('click', function() {
    errorDiv.remove();
  });
  
  errorDiv.appendChild(closeButton);
  document.body.appendChild(errorDiv);
  
  setTimeout(() => {
    if (document.body.contains(errorDiv)) {
      errorDiv.remove();
    }
  }, 5000);
}

// Add this at the end of your file
window.addEventListener('beforeunload', function() {
  cleanupSelection();
  resultsActive = false;
  const resultDiv = document.getElementById('latex-ocr-result');
  if (resultDiv) resultDiv.remove();
});