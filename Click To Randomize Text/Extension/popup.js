const toggleSwitch = document.getElementById('toggleSwitch');
const blurToggle = document.getElementById('blurToggle');

// Load saved blur state from sync storage (persists across sessions)
chrome.storage.sync.get('blurEnabled', (data) => {
    blurToggle.checked = !!data.blurEnabled;
});

// Listen for changes on the blur toggle
blurToggle.addEventListener('change', () => {
    const isEnabled = blurToggle.checked;
    // Save to sync storage
    chrome.storage.sync.set({ blurEnabled: isEnabled });
});


// Get the current active tab to manage its state
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentTab = tabs[0];
    if (!currentTab || !currentTab.id) return;
    const tabId = currentTab.id;

    // Disable the toggle on non-web pages (e.g., chrome://extensions)
    if (!currentTab.url?.startsWith('http')) {
        toggleSwitch.disabled = true;
        blurToggle.disabled = true;
        return;
    }

    // Load the saved state for this tab and set the toggle accordingly
    chrome.storage.session.get([tabId.toString()], (result) => {
        toggleSwitch.checked = !!result[tabId];
    });

    // Listen for changes on the toggle switch
    toggleSwitch.addEventListener('change', () => {
        const isEnabled = toggleSwitch.checked;

        // Save the new state to session storage for this tab
        chrome.storage.session.set({ [tabId]: isEnabled });

        // Ensure the content script is injected before sending a message
        chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['content.js']
        }).then(() => {
            // Send a message to the content script to activate or deactivate
            const message = { action: isEnabled ? "activate" : "deactivate" };
            chrome.tabs.sendMessage(tabId, message);
        }).catch(err => console.error("Script injection failed:", err));
    });
});