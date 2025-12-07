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
        chrome.storage.sync.get(['whitelist', 'allowedChars'], (syncData) => {
            const whitelist = syncData.whitelist || [];
            const allowedChars = syncData.allowedChars || '';

            // A. Permanent Whitelist Check
            if (whitelist.includes(hostname)) return;

            // B. Allowed Characters Check
            if (allowedChars) {
                // accessing the global punycode object loaded by punycode.js
                const unicodeHostname = window.punycode ? window.punycode.toUnicode(hostname) : hostname;

                const isAllowed = [...unicodeHostname].every(char => {
                    return char.codePointAt(0) <= 127 || allowedChars.includes(char);
                });

                if (isAllowed) return;
            }

            // C. Temporary "Proceed" Check (Session Logic)
            chrome.storage.local.get(['tempDismissed', 'sessionToken'], (localData) => {
                // Get the base URL for the warning page to extract the Dynamic ID
                const warningPageUrl = chrome.runtime.getURL('warning.html');
                const currentSessionToken = warningPageUrl;

                const storedToken = localData.sessionToken;
                let dismissed = localData.tempDismissed || [];

                // If the tokens don't match, the browser restarted. Wipe the session list.
                if (storedToken !== currentSessionToken) {
                    dismissed = [];
                }

                // If currently dismissed for this valid session, stop here.
                if (dismissed.includes(hostname)) return;

                // 4. Redirect to Warning Page
                // We use the base URL we already grabbed and append the target
                const finalRedirectUrl = warningPageUrl + `?target=${encodeURIComponent(window.location.href)}`;
                window.location.replace(finalRedirectUrl);
            });
        });
    }
})();