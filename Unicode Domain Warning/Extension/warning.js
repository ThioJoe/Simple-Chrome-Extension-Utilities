// warning.js
const params = new URLSearchParams(window.location.search);
const targetUrl = params.get('target');
let hostname = '';

try {
    // Parse the hostname to display it and use it for keys
    hostname = new URL(targetUrl).hostname;
    document.getElementById('domain-display').innerText = hostname;
} catch (e) {
    document.getElementById('domain-display').innerText = 'Unknown Domain';
}

// 1. Go Back
// Uses window.close() as a fallback if history.back() fails (common in redirects)
document.getElementById('go-back-btn').onclick = () => {
    if (window.history.length > 1) {
        window.history.back();
    } else {
        window.close(); // Close the tab if there is nowhere to go back to
    }
};

// 2. Whitelist (Permanent)
// Stored in chrome.storage.sync (Persists across restarts and devices)
document.getElementById('whitelist-btn').onclick = () => {
    chrome.storage.sync.get(['whitelist', 'whitelistMetadata'], (data) => {
        const whitelist = data.whitelist || [];
        const metadata = data.whitelistMetadata || {};

        if (!whitelist.includes(hostname)) {
            whitelist.push(hostname);
            metadata[hostname] = {
                added: new Date().toISOString().split('T')[0],
                title: 'Whitelisted via Warning'
            };

            chrome.storage.sync.set({ whitelist, whitelistMetadata: metadata }, () => {
                window.location.href = targetUrl; // Redirect back to original site
            });
        } else {
            window.location.href = targetUrl;
        }
    });
};

// 3. Proceed (Temporary / Session Only)
// Stored in chrome.storage.session (Wiped when browser closes)
document.getElementById('proceed-btn').onclick = () => {
    chrome.storage.session.get(['dismissedDomains'], (data) => {
        const dismissed = data.dismissedDomains || [];

        if (!dismissed.includes(hostname)) {
            dismissed.push(hostname);

            chrome.storage.session.set({ dismissedDomains: dismissed }, () => {
                window.location.href = targetUrl; // Redirect back to original site
            });
        } else {
            window.location.href = targetUrl;
        }
    });
};