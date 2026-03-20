// popup.js
document.addEventListener('DOMContentLoaded', () => {
    const addScriptBtn = document.getElementById('add-script-btn');
    const newScriptCodeEl = document.getElementById('new-script-code');
    const scriptListEl = document.getElementById('script-list');
    const errorMessageEl = document.getElementById('error-message');

    // Edit Modal Elements
    const editModal = document.getElementById('edit-modal');
    const editScriptCodeEl = document.getElementById('edit-script-code');
    const saveEditBtn = document.getElementById('save-edit-btn');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const editErrorMessageEl = document.getElementById('edit-error-message');
    let scriptIdToEdit = null; // To store the ID of the script being edited

    // --- Utility Functions ---

    /**
     * Parses metadata from a userscript string.
     * @param {string} code - The full code of the userscript.
     * @returns {object|null} - An object with name and match patterns, or null if invalid.
     */
    const parseMeta = (code) => {
        const nameMatch = code.match(/\/\/\s*@name\s+(.*)/);
        const matchLines = code.match(/\/\/\s*@match\s+(.*)/g) || [];

        if (!nameMatch || matchLines.length === 0) {
            return null;
        }

        const name = nameMatch[1].trim();
        const matches = matchLines.map(line => line.match(/\/\/\s*@match\s+(.*)/)[1].trim());

        const requireLines = code.match(/\/\/\s*@require\s+(.*)/g) || [];
        const requires = requireLines.map(line => line.match(/\/\/\s*@require\s+(.*)/)[1].trim());

        const grantLines = code.match(/\/\/\s*@grant\s+(.*)/g) || [];
        const grants = grantLines.map(line => line.match(/\/\/\s*@grant\s+(.*)/)[1].trim());

        const runAtMatch = code.match(/\/\/\s*@run-at\s+(.*)/);
        let runAt = 'document_idle';
        if (runAtMatch) {
            const rawRunAt = runAtMatch[1].trim().toLowerCase();
            if (rawRunAt === 'document-start' || rawRunAt === 'document_start') runAt = 'document_start';
            else if (rawRunAt === 'document-end' || rawRunAt === 'document_end') runAt = 'document_end';
        }

        return { name, matches, requires, grants, runAt };
    };

    /**
     * Renders all scripts from storage into the UI.
     */
    const renderScripts = async () => {
        const { scripts = [] } = await chrome.storage.local.get('scripts');
        scriptListEl.innerHTML = ''; // Clear current list

        if (scripts.length === 0) {
            scriptListEl.innerHTML = '<p class="description" style="text-align: center; padding: 1rem 0;">No scripts installed yet.</p>';
            return;
        }

        scripts.forEach(script => {
            const scriptDiv = document.createElement('div');
            scriptDiv.className = 'script-item';
            scriptDiv.dataset.id = script.id;

            scriptDiv.innerHTML = `
                <span class="script-item-name">${script.name}</span>
                <div class="actions-container">
                    <!-- Edit Button -->
                    <button class="edit-btn" title="Edit Script">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L14.732 3.732z" />
                        </svg>
                    </button>
                    <!-- Toggle Switch -->
                    <label class="toggle-container">
                        <input type="checkbox" class="toggle-checkbox" ${script.enabled ? 'checked' : ''}/>
                        <div class="toggle-label"></div>
                    </label>
                    <!-- Delete Button -->
                    <button class="delete-btn" title="Delete Script">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </div>
            `;
            scriptListEl.appendChild(scriptDiv);
        });
    };

    // --- Event Handlers ---

    /**
     * Handles adding a new script.
     */
    const handleAddScript = async () => {
        const code = newScriptCodeEl.value;
        errorMessageEl.textContent = '';

        if (!code.trim()) {
            errorMessageEl.textContent = 'Script code cannot be empty.';
            return;
        }

        const meta = parseMeta(code);
        if (!meta) {
            errorMessageEl.textContent = 'Invalid userscript header. Must contain @name and at least one @match.';
            return;
        }

        addScriptBtn.disabled = true;
        addScriptBtn.textContent = 'Fetching @require...';

        let requireCodes = [];
        try {
            for (const url of meta.requires) {
                const res = await fetch(url);
                if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
                requireCodes.push(await res.text());
            }
        } catch (err) {
            errorMessageEl.textContent = `Error loading @require: ${err.message}`;
            addScriptBtn.disabled = false;
            addScriptBtn.textContent = 'Add Script';
            return;
        }

        const newScript = {
            id: `script_${Date.now()}`,
            name: meta.name,
            matches: meta.matches,
            requires: meta.requires,
            requireCodes: requireCodes,
            grants: meta.grants,
            runAt: meta.runAt,
            code: code,
            enabled: true,
        };

        const { scripts = [] } = await chrome.storage.local.get('scripts');
        scripts.push(newScript);
        await chrome.storage.local.set({ scripts });

        newScriptCodeEl.value = '';
        addScriptBtn.disabled = false;
        addScriptBtn.textContent = 'Add Script';
        await renderScripts();
    };


    /**
     * Handles clicks on the script list (edit, toggle, or delete).
     * @param {Event} e - The click event.
     */
    const handleListClick = async (e) => {
        const scriptDiv = e.target.closest('[data-id]');
        if (!scriptDiv) return;

        const scriptId = scriptDiv.dataset.id;
        const { scripts = [] } = await chrome.storage.local.get('scripts');
        const scriptIndex = scripts.findIndex(s => s.id === scriptId);
        if (scriptIndex === -1) return;

        // Handle delete
        if (e.target.closest('.delete-btn')) {
            scripts.splice(scriptIndex, 1);
            await chrome.storage.local.set({ scripts });
            await renderScripts();
        }
        // Handle toggle
        else if (e.target.closest('.toggle-checkbox')) {
            scripts[scriptIndex].enabled = e.target.checked;
            await chrome.storage.local.set({ scripts });
        }
        // Handle edit
        else if (e.target.closest('.edit-btn')) {
            handleOpenEditModal(scriptId);
        }
    };

    /**
     * Opens the edit modal and populates it with script data.
     * @param {string} scriptId - The ID of the script to edit.
     */
    const handleOpenEditModal = async (scriptId) => {
        const { scripts = [] } = await chrome.storage.local.get('scripts');
        const scriptToEdit = scripts.find(s => s.id === scriptId);
        if (scriptToEdit) {
            scriptIdToEdit = scriptId;
            editScriptCodeEl.value = scriptToEdit.code;
            editErrorMessageEl.textContent = '';
            editModal.classList.remove('hidden');
        }
    };

    /**
     * Saves the changes from the edit modal.
     */
    const handleSaveScript = async () => {
        if (!scriptIdToEdit) return;

        const updatedCode = editScriptCodeEl.value;
        editErrorMessageEl.textContent = '';

        if (!updatedCode.trim()) {
            editErrorMessageEl.textContent = 'Script code cannot be empty.';
            return;
        }

        const meta = parseMeta(updatedCode);
        if (!meta) {
            editErrorMessageEl.textContent = 'Invalid userscript header. Must contain @name and at least one @match.';
            return;
        }

        saveEditBtn.disabled = true;
        saveEditBtn.textContent = 'Saving...';

        let requireCodes = [];
        try {
            for (const url of meta.requires) {
                const res = await fetch(url);
                if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
                requireCodes.push(await res.text());
            }
        } catch (err) {
            editErrorMessageEl.textContent = `Error loading @require: ${err.message}`;
            saveEditBtn.disabled = false;
            saveEditBtn.textContent = 'Save Changes';
            return;
        }

        const { scripts = [] } = await chrome.storage.local.get('scripts');
        const scriptIndex = scripts.findIndex(s => s.id === scriptIdToEdit);

        if (scriptIndex !== -1) {
            scripts[scriptIndex].name = meta.name;
            scripts[scriptIndex].matches = meta.matches;
            scripts[scriptIndex].requires = meta.requires;
            scripts[scriptIndex].requireCodes = requireCodes;
            scripts[scriptIndex].grants = meta.grants;
            scripts[scriptIndex].runAt = meta.runAt;
            scripts[scriptIndex].code = updatedCode;
            await chrome.storage.local.set({ scripts });

            editModal.classList.add('hidden');
            scriptIdToEdit = null;
            await renderScripts();
        } else {
            editErrorMessageEl.textContent = 'Error: Could not find script to save.';
        }

        saveEditBtn.disabled = false;
        saveEditBtn.textContent = 'Save Changes';
    };
    
    // --- Initial Setup ---
    addScriptBtn.addEventListener('click', handleAddScript);
    scriptListEl.addEventListener('click', handleListClick);
    saveEditBtn.addEventListener('click', handleSaveScript);
    cancelEditBtn.addEventListener('click', () => {
        editModal.classList.add('hidden');
        scriptIdToEdit = null;
    });

    renderScripts();
});

