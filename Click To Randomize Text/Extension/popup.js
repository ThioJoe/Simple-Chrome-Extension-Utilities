const toggleSwitch = document.getElementById('toggleSwitch');
const blurToggle = document.getElementById('blurToggle');

// Load saved blur state from sync storage (persists across sessions)
browser.storage.sync.get('blurEnabled').then((data) => {
    blurToggle.checked = !!data.blurEnabled;
});

// Listen for changes on the blur toggle
blurToggle.addEventListener('change', () => {
    const isEnabled = blurToggle.checked;
    // Save to sync storage
    browser.storage.sync.set({ blurEnabled: isEnabled });
});

// Get the current active tab to manage its state
browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
    const currentTab = tabs[0];
    if (!currentTab || !currentTab.id) return;
    const tabId = currentTab.id;

    // Disable the toggle on non-web pages (e.g., about:addons)
    if (!currentTab.url?.startsWith('http')) {
        toggleSwitch.disabled = true;
        blurToggle.disabled = true;
        return;
    }

    // Load the saved state for this tab and set the toggle accordingly
    browser.storage.local.get([tabId.toString()]).then((result) => {
        toggleSwitch.checked = !!result[tabId];
    });

    // Listen for changes on the toggle switch
    toggleSwitch.addEventListener('change', () => {
        const isEnabled = toggleSwitch.checked;

        // Save the new state to local storage for this tab
        browser.storage.local.set({ [tabId]: isEnabled });

        // Send a message to the content script to activate or deactivate
        const message = { action: isEnabled ? "activate" : "deactivate" };
        browser.tabs.sendMessage(tabId, message).catch(err => 
            console.error("Message sending failed:", err)
        );
    });
});