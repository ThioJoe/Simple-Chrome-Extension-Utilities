// background.js
importScripts('punycode.js');

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
            // 3. Check Permanent Whitelist & Allowed Characters
            chrome.storage.sync.get(['whitelist', 'allowedChars'], (syncData) => {
                const whitelist = syncData.whitelist || [];
                const allowedChars = syncData.allowedChars || '';

                if (whitelist.includes(hostname)) return; // Allowed permanently

                // Check if all non-ASCII characters in the domain are in the allowedChars list
                if (allowedChars) {
                    const unicodeHostname = punycode.toUnicode(hostname);
                    // Check if every non-ASCII char is in allowedChars
                    const isAllowed = [...unicodeHostname].every(char => {
                        // If ASCII, it's fine. If non-ASCII, it must be in allowedChars.
                        return char.codePointAt(0) <= 127 || allowedChars.includes(char);
                    });

                    if (isAllowed) return; // Domain only contains allowed special characters
                }

                // 4. Check Session List (Secure In-Memory Storage)
                chrome.storage.session.get(['dismissedDomains'], (sessionData) => {
                    const dismissed = sessionData.dismissedDomains || [];
                    if (dismissed.includes(hostname)) return; // Allowed for this session

                    // 5. Redirect to Warning Page
                    // We pass the full original URL so the warning page knows where to send us back
                    const warningUrl = chrome.runtime.getURL('warning.html') + `?target=${encodeURIComponent(changeInfo.url)}`;
                    chrome.tabs.update(tabId, { url: warningUrl });
                });
            });
        }
    } catch (error) {
        console.error('Error parsing URL:', error);
    }
});