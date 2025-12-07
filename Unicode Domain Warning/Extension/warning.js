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

// 1. Go Back Logic
const goBackBtn = document.getElementById('go-back-btn');

// Check if there is history to go back to.
// length <= 2 covers:
// 1. New Tab (Length 1)
// 2. Open link in New Tab (Length 2: Bad Site -> Warning).
//    In this case, 'back' would just loop back to the bad site/redirector.
//    So closing the tab is the only way to escape the loop.
if (window.history.length <= 2) {
    // Instead of disabling, we change the function to explicitly close the tab
    goBackBtn.innerText = "Close Tab";
    goBackBtn.onclick = () => {
        window.close();
    };
} else {
    goBackBtn.onclick = () => {
        // We know length > 2 here, so we assume the entry immediately behind us (-1)
        // is the 'Bad Domain' that caused the redirect.
        // We jump back 2 steps to skip it and return to the safe page before it.
        window.history.go(-2);
    };
}

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