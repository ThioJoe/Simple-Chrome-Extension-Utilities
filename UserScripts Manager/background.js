// background.js
/**
 * Converts a wildcard/glob pattern to a regular expression.
 * @param {string} pattern - The wildcard pattern from @match.
 * @returns {RegExp} - A regular expression.
 */
function wildcardToRegex(pattern) {
    // Escape special regex characters, then replace wildcard * with .*
    const regexString = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
    return new RegExp(`^${regexString}$`);
}

/**
 * Injects and executes a script in a given tab.
 * @param {number} tabId - The ID of the tab to inject the script into.
 * @param {string} scriptCode - The JavaScript code to execute.
 */
function executeScriptInTab(tabId, scriptCode) {
    chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: (code) => {
            try {
                const script = document.createElement('script');
                script.textContent = code;
                (document.head || document.documentElement).appendChild(script);
                script.remove();
            } catch (e) {
                console.error('Userscript execution failed:', e);
            }
        },
        args: [scriptCode],
        world: 'MAIN' // Execute in the page's own context
    });
}

/**
 * Main function to check and inject scripts when a tab is updated.
 * @param {number} tabId - ID of the updated tab.
 * @param {object} changeInfo - Object describing the change.
 * @param {object} tab - The state of the tab that was updated.
 */
async function handleTabUpdate(tabId, changeInfo, tab) {
    // Inject scripts only when the page is fully loaded and has a URL.
    if (changeInfo.status !== 'complete' || !tab.url || !tab.url.startsWith('http')) {
        return;
    }

    try {
        const { scripts = [] } = await chrome.storage.local.get('scripts');
        const enabledScripts = scripts.filter(s => s.enabled);

        for (const script of enabledScripts) {
            for (const matchPattern of script.matches) {
                const regex = wildcardToRegex(matchPattern);
                if (regex.test(tab.url)) {
                    console.log(`Injecting script "${script.name}" into ${tab.url}`);
                    executeScriptInTab(tabId, script.code);
                    // Break from inner loop once a match is found for this script
                    break;
                }
            }
        }
    } catch (error) {
        console.error('Error retrieving or injecting scripts:', error);
    }
}

// Listen for updates to any tab.
chrome.tabs.onUpdated.addListener(handleTabUpdate);
