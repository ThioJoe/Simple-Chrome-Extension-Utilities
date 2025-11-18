// background.js

/**
 * Converts a wildcard/glob pattern to a regular expression.
 */
function wildcardToRegex(pattern) {
    const regexString = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
    return new RegExp(`^${regexString}$`);
}

function getScriptWorld(code) {
    const match = code.match(/\/\/\s*@inject-into\s+(content|page)/i);
    const mode = match ? match[1].toLowerCase() : 'page';
    return mode === 'content' ? 'USER_SCRIPT' : 'MAIN';
}

/**
 * Syncs scripts to the Chrome User Scripts API (Declarative).
 * Also configures the world to allow eval, enabling dynamic re-injection.
 */
async function updateRegisteredScripts() {
    try {
        // 1. Configure the User Script world to allow 'eval'.
        if (chrome.userScripts.configureWorld) {
             chrome.userScripts.configureWorld({
                csp: "script-src 'self' 'unsafe-eval' 'unsafe-inline'; object-src 'self'"
            });
        }

        const { scripts = [] } = await chrome.storage.local.get('scripts');
        const enabledScripts = scripts.filter(s => s.enabled);

        await chrome.userScripts.unregister();

        const scriptsToRegister = enabledScripts.map(script => ({
            id: script.id,
            matches: script.matches,
            js: [{ code: script.code }],
            world: getScriptWorld(script.code),
            runAt: 'document_idle'
        }));

        if (scriptsToRegister.length > 0) {
            await chrome.userScripts.register(scriptsToRegister);
        }
        console.log(`UserScripts Manager: Registered ${scriptsToRegister.length} scripts.`);
    } catch (error) {
        console.error('UserScripts Manager: Error updating scripts:', error);
    }
}

chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.scripts) {
        updateRegisteredScripts();
    }
});

chrome.runtime.onInstalled.addListener(updateRegisteredScripts);
chrome.runtime.onStartup.addListener(updateRegisteredScripts);