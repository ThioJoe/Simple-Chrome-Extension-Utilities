// warning.js
const params = new URLSearchParams(window.location.search);
const targetUrl = params.get('target');
let hostname = '';

try {
    // Parse the hostname to display it and use it for keys
    // NOTE: 'new URL(...).hostname' usually returns the Punycode (xn--) version automatically in browsers.
    hostname = new URL(targetUrl).hostname;
    document.getElementById('domain-display').innerText = hostname;

    // --- Unicode Highlighting Logic ---
    // We try to show the "visual" version and highlight the unicode characters
    try {
        if (window.punycode) {
            const unicodeBox = document.getElementById('unicode-box');
            const unicodeDisplay = document.getElementById('unicode-domain');

            // Convert xn-- format to Unicode string
            const decoded = window.punycode.toUnicode(hostname);

            // Only show the box if decoding actually changed something (it was punycode)
            // or if we detect non-ascii characters directly.
            if (decoded !== hostname || /[^\u0000-\u007f]/.test(decoded)) {
                let htmlBuilder = '';

                // Iterate through the string by code point to handle surrogate pairs correctly
                for (const char of decoded) {
                    // Check if code point is outside ASCII range (0-127)
                    if (char.codePointAt(0) > 127) {
                        htmlBuilder += `<span class="unicode-char" title="U+${char.codePointAt(0).toString(16).toUpperCase()}">${char}</span>`;
                    } else {
                        htmlBuilder += char;
                    }
                }

                unicodeDisplay.innerHTML = htmlBuilder;
                unicodeBox.style.display = 'block';
            }
        } else {
            console.warn("Punycode library not found; skipping unicode preview.");
        }
    } catch (err) {
        // Silently fail the unicode box if library missing or parsing fails
        console.error("Unicode preview failed:", err);
    }
    // ---------------------------------------

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