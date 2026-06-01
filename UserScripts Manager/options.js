document.addEventListener('DOMContentLoaded', async () => {
    // Elements
    const debugToggle = document.getElementById('debug-toggle');
    const exportBtn = document.getElementById('export-btn');
    const importBtn = document.getElementById('import-btn');
    const importFile = document.getElementById('import-file');
    const statusMessage = document.getElementById('status-message');

    // --- Utility to show messages ---
    function showStatus(text, isError = false) {
        statusMessage.classList.toggle('status-error', isError);
        statusMessage.textContent = text;
        // Auto-clear message after 8 seconds
        setTimeout(() => {
            if (statusMessage.textContent === text) {
                statusMessage.textContent = '';
            }
        }, 8000);
    }

    // --- 1. Debug Mode Setup ---
    const { debugMode = false } = await chrome.storage.local.get('debugMode');
    debugToggle.checked = debugMode;

    debugToggle.addEventListener('change', async (e) => {
        await chrome.storage.local.set({ debugMode: e.target.checked });
    });

    // --- 2. Export Setup ---
    exportBtn.addEventListener('click', async () => {
        const { scripts = [] } = await chrome.storage.local.get('scripts');
        
        if (scripts.length === 0) {
            showStatus('No scripts found to export.', true);
            return;
        }

        // Create a JSON blob
        const blob = new Blob([JSON.stringify(scripts, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        // Create temporary link to trigger download
        const a = document.createElement('a');
        a.href = url;
        const date = new Date().toISOString().split('T')[0];
        a.download = `userscripts_backup_${date}.json`;
        a.click();
        
        // Clean up
        URL.revokeObjectURL(url);
        showStatus(`Successfully exported ${scripts.length} script(s).`);
    });

    // --- 3. Import Setup ---
    importBtn.addEventListener('click', () => {
        importFile.click(); // Trigger the hidden file input
    });

    importFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const importedData = JSON.parse(event.target.result);
                
                if (!Array.isArray(importedData)) {
                    throw new Error('Invalid file format. Expected an array of scripts.');
                }

                const { scripts = [] } = await chrome.storage.local.get('scripts');
                const existingNames = new Set(scripts.map(s => s.name));
                
                let importedCount = 0;
                let renamedDetails = [];

                for (let importedScript of importedData) {
                    // Skip invalid scripts missing core data
                    if (!importedScript.name || !importedScript.code) continue;

                    // 1. Generate a brand new unique ID so it doesn't clash with existing ones
                    importedScript.id = `script_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

                    // 2. Handle Name Collisions
                    let originalName = importedScript.name;
                    let newName = originalName;
                    let counter = 1;

                    while (existingNames.has(newName)) {
                        newName = `${originalName} (${counter})`;
                        counter++;
                    }

                    if (newName !== originalName) {
                        importedScript.name = newName;
                        // Dynamically update the @name tag inside the raw code so it matches when edited later
                        importedScript.code = importedScript.code.replace(
                            /\/\/\s*@name\s+(.*)/i, 
                            `// @name        ${newName}`
                        );
                        renamedDetails.push(`"${originalName}" → "${newName}"`);
                    }

                    existingNames.add(newName);
                    scripts.push(importedScript);
                    importedCount++;
                }

                // Save merged scripts back to storage
                await chrome.storage.local.set({ scripts });

                // Construct success message
                let msg = `Successfully imported ${importedCount} script(s).`;
                if (renamedDetails.length > 0) {
                    msg += ` Renamed to avoid conflicts: ${renamedDetails.join(', ')}.`;
                }
                showStatus(msg);

            } catch (err) {
                showStatus(`Import failed: ${err.message}`, true);
            }

            // Reset file input so the user can import the exact same file again if they want to
            importFile.value = '';
        };

        reader.readAsText(file);
    });
});