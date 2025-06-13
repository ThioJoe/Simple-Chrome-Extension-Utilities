# Simple Chrome Extension Utilities
A collection of simple, single-purpose Chrome Extensions.

---

## How to Install
Each utility is a separate, unpacked Chrome Extension.

1. Navigate to `chrome://extensions` in your Chrome browser.
2. Enable **Developer mode** using the toggle in the top-right corner.
3. Click the **Load unpacked** button.
4. Select the specific extension's sub-folder (e.g., `Gemini Code Block Bottom Copy Button/Extension`).

---

## [Gemini Code Block Bottom Copy Button](Gemini%20Code%20Block%20Bottom%20Copy%20Button/)
**Purpose:** Adds a "Copy" button to the bottom of code blocks on the Gemini AI website (`gemini.google.com`), so you don't have to scroll up to copy long code snippets.

### Usage
- Once installed, the extension works automatically. When you visit `gemini.google.com`, any code block in a response will have a header with a copy button at both the top and the bottom.

## [Click To Randomize Text](Click%20To%20Randomize%20Text/)
**Purpose:** Allows you to temporarily replace or blur text on any webpage. This is useful for testing layouts or creating screenshots without revealing sensitive information.

### Usage & Features
- Click the extension icon in the toolbar to open a popup where you can enable or disable the randomizer for the current tab.
- The popup also includes an option to automatically apply a blur effect after randomizing text.

### Controls
- **Enable/Disable:** Use the toggle switch in the extension popup.
- **Undo:** Press `Ctrl + Z` to undo the most recent text modification.
- **Deactivate:** Press the `Escape` key to quickly deactivate the tool on the current page.

### Click Modes
- **Alt + Click:** Replaces the text content of the clicked element with a randomized string of characters and words.
- **Ctrl + Click:** Applies or increases a blur effect on an already randomized element.
- **Ctrl + Alt + Click:** Clears the text content of the clicked element, replacing it with blank space.
