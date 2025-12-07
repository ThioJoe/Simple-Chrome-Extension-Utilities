// warning.js
const params = new URLSearchParams(window.location.search);
const targetUrl = params.get('target');
let hostname = '';

try {
    hostname = new URL(targetUrl).hostname;
    document.getElementById('domain-display').innerText = hostname;
} catch (e) {
    document.getElementById('domain-display').innerText = 'Unknown Domain';
}

// 1. Go Back
document.getElementById('go-back-btn').onclick = () => {
    window.history.go(-1);
    // Fallback if no history
    setTimeout(() => window.close(), 500);
};

// 2. Whitelist (Permanent)
document.getElementById('whitelist-btn').onclick = () => {
    chrome.storage.sync.get(['whitelist', 'whitelistMetadata'], (data) => {
        const whitelist = data.whitelist || [];
        const metadata = data.whitelistMetadata || {};

        if (!whitelist.includes(hostname)) {
            whitelist.push(hostname);
            metadata[hostname] = {
                added: new Date().toISOString().split('T')[0],
                title: 'Whitelisted via Warning' // We can't safely get the title of a blocked page
            };

            chrome.storage.sync.set({ whitelist, whitelistMetadata: metadata }, () => {
                window.location.href = targetUrl;
            });
        } else {
            window.location.href = targetUrl;
        }
    });
};

// 3. Proceed (Temporary / Session Only)
document.getElementById('proceed-btn').onclick = () => {
    chrome.storage.session.get(['dismissedDomains'], (data) => {
        const dismissed = data.dismissedDomains || [];
        if (!dismissed.includes(hostname)) {
            dismissed.push(hostname);
            chrome.storage.session.set({ dismissedDomains: dismissed }, () => {
                window.location.href = targetUrl;
            });
        } else {
            window.location.href = targetUrl;
        }
    });
};