# Chemical Formula Creator

**YMSS Image Recognition** is a Firefox extension using Manifest V3 that captures mathematical equations and chemical formulas from your screen and converts them to LaTeX using OpenAI's vision models.

---

## Features

- **Screen Capture**: Select any part of your screen containing chemical formulas or mathematical equations.
- **AI-Powered Recognition**: Uses OpenAI's GPT-4o mini model to recognize and interpret complex notations.
- **LaTeX Conversion**: Automatically converts recognized content to properly formatted LaTeX code.
- **Easy Copy/Paste**: One-click copying of generated LaTeX for use in documents and presentations.
- **Visual Preview**: Renders the LaTeX output directly in the browser for verification.
- **Works Everywhere**: Functions on any webpage, even those with strict Content Security Policies.

---

## Installation

1. Download the extension from the [Firefox Add-ons store](https://addons.mozilla.org/).
2. Open Firefox and navigate to `about:addons`.
3. Click the settings gear and select **"Install Add-on From File..."**.
4. Browse to the downloaded `.xpi` file and open it.
5. Follow the prompts to complete installation.

---

## Usage

1. Click the extension icon in your toolbar to activate.
2. Enter your OpenAI API key in the settings panel (required for OCR functionality).
3. Use the keyboard shortcut (default: `Alt+Shift+C`) or click **"Capture"** in the popup.
4. Select the area containing the formula or equation you want to capture.
5. Wait for the OCR processing to complete.
6. Review the generated LaTeX code and rendered preview.
7. Click **"Copy LaTeX"** to copy the code to your clipboard.

---

## How It Works

The extension uses a combination of browser APIs and OpenAI's vision capabilities:

1. The screenshot is captured using the browser's `captureVisibleTab` API.
2. The image data is sent securely to OpenAI's API with the user's API key.
3. GPT-4o mini analyzes the image and extracts mathematical notation.
4. The extracted content is converted to properly formatted LaTeX.
5. Results are displayed in a user-friendly popup with a live preview.

---

## Privacy & Security

- Your API key is stored locally in your browser's storage.
- Images are processed securely and are not stored by the extension.
- No data is collected about your browsing activity.
- The extension requires minimal permissions (`activeTab`, `scripting`, `storage`).

---

## Requirements

- **Firefox browser** (version 109 or later).
- **OpenAI API key** with access to GPT-4o mini model.
- **Active internet connection** for OCR processing.

---

## Acknowledgments

- Thanks to **OpenAI** for providing the vision API capabilities.
- Built with **Firefox's WebExtension API**.
- Inspired by the needs of students, researchers, and professionals working with chemical and mathematical notations.

---

For issues, feedback, or contributions, please visit our [GitHub repository](https://github.com/yourusername/chemicalformulacreator).
