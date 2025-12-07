// background.js
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // Only run when the URL is explicitly loading/changed
    if (changeInfo.status !== 'loading' || !changeInfo.url) return;

    // Skip internal browser pages
    if (changeInfo.url.startsWith('chrome://') || changeInfo.url.startsWith('about:')) return;

    try {
        const url = new URL(changeInfo.url);
        const hostname = url.hostname;

        // 1. Basic Exclusions
        if (hostname.toLowerCase() === 'localhost') return;

        // 2. Check for IDN (Non-ASCII characters OR Punycode prefix)
        const isIDN = (/[^\u0000-\u007f]/.test(hostname) || hostname.toLowerCase().includes('xn--'));

        if (isIDN) {
            // 3. Check Whitelist (Permanent) and Session List (Temporary)
            chrome.storage.sync.get(['whitelist'], (syncData) => {
                const whitelist = syncData.whitelist || [];
                if (whitelist.includes(hostname)) return; // Allowed permanently

                chrome.storage.session.get(['dismissedDomains'], (sessionData) => {
                    const dismissed = sessionData.dismissedDomains || [];
                    if (dismissed.includes(hostname)) return; // Allowed for this session

                    // 4. Redirect to Warning Page
                    // We encode the original URL so we can redirect back to it later
                    const warningUrl = chrome.runtime.getURL('warning.html') + `?target=${encodeURIComponent(changeInfo.url)}`;
                    chrome.tabs.update(tabId, { url: warningUrl });
                });
            });
        }
    } catch (error) {
        // Ignore invalid URLs
        console.error('Error parsing URL:', error);
    }
});