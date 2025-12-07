// warning.js

// --- Helper: Check if we are inside an iframe ---
function isFramed() {
    try {
        return window.self !== window.top;
    } catch (e) {
        return true; // Assume framed if we can't check
    }
}

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
            const domainBox = document.getElementById('domain-box');

            // Convert xn-- format to Unicode string
            const decoded = window.punycode.toUnicode(hostname);

            // Only show the box if decoding actually changed something (it was punycode)
            // or if we detect non-ascii characters directly.
            if (decoded !== hostname || /[^\u0000-\u007f]/.test(decoded)) {
                // Clear any existing content
                unicodeDisplay.textContent = '';

                // Iterate through the string by code point to handle surrogate pairs correctly
                for (const char of decoded) {
                    // Check if code point is outside ASCII range (0-127)
                    if (char.codePointAt(0) > 127) {
                        const span = document.createElement('span');
                        span.className = 'unicode-char';
                        span.title = `U+${char.codePointAt(0).toString(16).toUpperCase()}`;
                        span.textContent = char;
                        unicodeDisplay.appendChild(span);
                    } else {
                        unicodeDisplay.appendChild(document.createTextNode(char));
                    }
                }

                unicodeBox.style.display = 'block';
                
                // Make punycode box collapsible since unicode is available
                domainBox.classList.add('collapsible');
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
if (window.history.length <= 2) {
    goBackBtn.classList.add('disabled');
    goBackBtn.disabled = true;
    goBackBtn.title = "No previous page to go back to";
} else {
    goBackBtn.onclick = () => {
        window.history.go(-2);
    };
}

// 2. Whitelist (Permanent)
document.getElementById('whitelist-btn').onclick = () => {
    // --- SAFE MODE CHECK ---
    if (isFramed()) {
        const userConfirmed = confirm(
            "Security Warning:\n\n" +
            "You are clicking 'Whitelist' from within a frame/embedded window.\n" +
            "If you did not intend to whitelist this domain, click Cancel.\n\n" +
            "Click OK to confirm whitelisting: " + hostname
        );
        if (!userConfirmed) return;
    }
    // -----------------------

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
                window.location.href = targetUrl;
            });
        } else {
            window.location.href = targetUrl;
        }
    });
};

// 3. Proceed (Temporary / Session Only)
document.getElementById('proceed-btn').onclick = () => {
    // --- SAFE MODE CHECK ---
    if (isFramed()) {
        const userConfirmed = confirm(
            "Security Warning:\n\n" +
            "You are clicking 'Continue' from within a frame/embedded window.\n" +
            "If you did not intend to bypass this warning, click Cancel.\n\n" +
            "Click OK to proceed to: " + hostname
        );
        if (!userConfirmed) return;
    }
    // -----------------------

    chrome.storage.local.get(['tempDismissed', 'sessionToken'], (data) => {
        // Since we are ON the warning page, our own hostname IS the dynamic ID
        const currentSessionToken = chrome.runtime.getURL('warning.html');

        let dismissed = data.tempDismissed || [];
        let storedToken = data.sessionToken;

        // Check if session is stale
        if (storedToken !== currentSessionToken) {
            dismissed = [];
            storedToken = currentSessionToken;
        }

        if (!dismissed.includes(hostname)) {
            dismissed.push(hostname);

            chrome.storage.local.set({
                tempDismissed: dismissed,
                sessionToken: storedToken
            }, () => {
                window.location.href = targetUrl;
            });
        } else {
            window.location.href = targetUrl;
        }
    });
};

// 4. "Why am I seeing this?" tooltip toggle
const whyLink = document.getElementById('why-link');
const whyTooltip = document.getElementById('why-tooltip');

if (whyLink && whyTooltip) {
    whyLink.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        whyTooltip.classList.toggle('visible');
    });

    // Close tooltip when clicking outside
    document.addEventListener('click', function(e) {
        if (!whyTooltip.contains(e.target) && e.target !== whyLink) {
            whyTooltip.classList.remove('visible');
        }
    });
}

// 5. Tips toggle
const tipsToggle = document.getElementById('tips-toggle');
const tipsContent = document.getElementById('tips-content');

if (tipsToggle && tipsContent) {
    tipsToggle.addEventListener('click', function() {
        tipsContent.classList.toggle('visible');
        tipsToggle.classList.toggle('expanded');
        tipsToggle.innerHTML = tipsContent.classList.contains('visible') 
            ? 'Hide Tips'
            : 'Not Sure?';
    });
}

// 6. Punycode toggle (when unicode is available)
const punycodeToggle = document.getElementById('punycode-toggle');
const domainBox = document.getElementById('domain-box');

if (punycodeToggle && domainBox) {
    punycodeToggle.addEventListener('click', function() {
        domainBox.classList.add('visible');
        punycodeToggle.style.display = 'none';
    });
}