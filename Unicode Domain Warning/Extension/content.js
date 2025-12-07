// content.js

(function () {
    // 1. Basic Exclusions
    // Skip iframes (only run on top-level window)
    if (window.self !== window.top) return;

    const hostname = window.location.hostname;
    if (hostname.toLowerCase() === 'localhost') return;

    // 2. Check for IDN (Non-ASCII characters OR Punycode prefix)
    const isIDN = (/[^\u0000-\u007f]/.test(hostname) || hostname.toLowerCase().includes('xn--'));

    if (isIDN) {
        // 3. Check Whitelists
        // Content scripts are ISOLATED. The web page cannot modify chrome.storage.
        chrome.storage.sync.get(['whitelist', 'allowedChars'], (syncData) => {
            const whitelist = syncData.whitelist || [];
            const allowedChars = syncData.allowedChars || '';

            // A. Permanent Whitelist Check
            if (whitelist.includes(hostname)) return;

            // B. Allowed Characters Check
            if (allowedChars) {
                // We can access 'punycode' because it was loaded in manifest before this script
                const unicodeHostname = window.punycode ? window.punycode.toUnicode(hostname) : hostname;

                const isAllowed = [...unicodeHostname].every(char => {
                    return char.codePointAt(0) <= 127 || allowedChars.includes(char);
                });

                if (isAllowed) return;
            }

            // C. Temporary "Proceed" Check
            // We use 'local' storage for the "session" list because content scripts 
            // cannot access 'chrome.storage.session' directly without a background worker.
            chrome.storage.local.get(['tempDismissed'], (localData) => {
                const dismissed = localData.tempDismissed || [];

                // If the domain is in the temp dismissed list, we allow it.
                // (Optional: You could add timestamp logic here to expire it after X hours)
                if (dismissed.includes(hostname)) return;

                // 4. Redirect to Warning Page
                // window.location.replace() prevents the user from getting stuck in a back-button loop
                const warningUrl = chrome.runtime.getURL('warning.html') + `?target=${encodeURIComponent(window.location.href)}`;
                window.location.replace(warningUrl);
            });
        });
    }
})();