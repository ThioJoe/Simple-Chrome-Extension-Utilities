// background.js

let isDebugMode = false;

// Initialize debug mode state
chrome.storage.local.get('debugMode', (data) => {
    isDebugMode = !!data.debugMode;
});

// Custom logger for background.js
function debugLog(...args) {
    if (isDebugMode) {
        console.log('[Userscript Manager]', ...args);
    }
}

function wildcardToRegex(pattern) {
    const regexString = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
    return new RegExp(`^${regexString}$`);
}

function getScriptWorld(code) {
    const match = code.match(/\/\/\s*@inject-into\s+(content|page)/i);
    const mode = match ? match[1].toLowerCase() : 'page';
    return mode === 'content' ? 'USER_SCRIPT' : 'MAIN';
}

async function updateRegisteredScripts() {
    try {
        if (chrome.userScripts.configureWorld) {
            chrome.userScripts.configureWorld({
                csp: "script-src 'self' 'unsafe-eval' 'unsafe-inline'; object-src 'self'"
            });
        }

        const { scripts = [] } = await chrome.storage.local.get('scripts');
        const enabledScripts = scripts.filter(s => s.enabled);

        await chrome.userScripts.unregister();

        const scriptsToRegister = enabledScripts.map(script => {
            let combinedCode = "";

            // --- DEBUG INJECTION ---
            // If debug mode is on, inject a console.log into the webpage so you know the script ran.
            if (isDebugMode) {
                combinedCode += `console.log("[Userscript Manager] Running script: ${script.name.replace(/"/g, '\\"')}");\n\n`;
            }

            if (script.requireCodes && script.requireCodes.length > 0) {
                script.requireCodes.forEach(reqCode => {
                    combinedCode += reqCode + "\n\n";
                });
            }

            if (script.grants && script.grants.length > 0 && !script.grants.includes('none')) {
                combinedCode += `
                    window.GM_addStyle = function(css) {
                        const style = document.createElement('style');
                        style.textContent = css;
                        (document.head || document.documentElement).appendChild(style);
                    };
                    window.GM_info = { script: { name: "${script.name.replace(/"/g, '\\"')}" } };
                \n\n`;
            }

            combinedCode += script.code;

            return {
                id: script.id,
                matches: script.matches,
                js: [{ code: combinedCode }],
                world: getScriptWorld(script.code),
                runAt: script.runAt || 'document_idle'
            };
        });

        if (scriptsToRegister.length > 0) {
            await chrome.userScripts.register(scriptsToRegister);
        }
        
        // Log to extension background console
        debugLog(`Registered ${scriptsToRegister.length} scripts.`);
    } catch (error) {
        console.error('[Userscript Manager] Error updating scripts:', error);
    }
}

// Listen for changes to scripts OR the debugMode toggle
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
        if (changes.debugMode !== undefined) {
            isDebugMode = changes.debugMode.newValue;
            // Re-register scripts to add/remove the in-page debug console.log
            updateRegisteredScripts();
        }
        if (changes.scripts) {
            updateRegisteredScripts();
        }
    }
});

chrome.runtime.onInstalled.addListener(updateRegisteredScripts);
chrome.runtime.onStartup.addListener(updateRegisteredScripts);