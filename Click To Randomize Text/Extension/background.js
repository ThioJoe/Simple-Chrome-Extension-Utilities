browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Listen for the message from content.js when the Escape key is pressed
    if (request.action === "deactivated_by_escape" && sender.tab) {
        const tabId = sender.tab.id;
        // Update the state in session storage to reflect that the randomizer is off
        browser.storage.local.set({ [tabId]: false });
    }
});

browser.tabs.onUpdated.addListener((tabId, changeInfo) => {
    // When a tab is reloaded or its URL changes, reset its "active" state.
    // This prevents the toggle from appearing "on" for a page where the script isn't running.
    if (changeInfo.status === 'loading') {
        browser.storage.local.remove(tabId.toString());
    }
});