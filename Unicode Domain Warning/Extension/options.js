// options.js

// Restores options from chrome.storage
function restoreOptions() {
  chrome.storage.sync.get(['whitelist', 'whitelistMetadata', 'allowedChars'], (data) => {
    const whitelist = data.whitelist || [];
    const metadata = data.whitelistMetadata || {};
    const allowedChars = data.allowedChars || '';

    renderWhitelist(whitelist, metadata);

    // Initialize Allowed Characters UI
    const charInput = document.getElementById('allowed-chars-input');
    charInput.value = allowedChars;
    renderAllowedCharsPreview(allowedChars);
  });
}

// Update the visual preview of allowed characters
function renderAllowedCharsPreview(chars) {
  const preview = document.getElementById('allowed-chars-preview');
  // Display them with spaces for clarity if the user didn't type spaces, 
  // but the CSS letter-spacing handles the visual spread mostly.
  preview.textContent = chars;
  
  // Hide the preview box if there are no characters
  preview.style.display = chars.length > 0 ? 'block' : 'none';
}

// Saves the allowed characters
function saveAllowedChars() {
  const charInput = document.getElementById('allowed-chars-input');
  // Remove all whitespace (spaces, tabs, newlines)
  const rawChars = charInput.value.replace(/\s/g, '');

  // De-duplicate characters using a Set
  const uniqueChars = [...new Set(rawChars)].join('');

  // Update input to reflect cleaned/deduped version
  charInput.value = uniqueChars;
  renderAllowedCharsPreview(uniqueChars);

  chrome.storage.sync.set({
    allowedChars: uniqueChars
  }, () => {
    const status = document.getElementById('save-status');
    status.style.opacity = '1';
    setTimeout(() => {
      status.style.opacity = '0';
    }, 1500);
  });
}

// Renders the list of whitelisted domains
function renderWhitelist(whitelist, metadata) {
  const container = document.getElementById('whitelist-container');
  const noDomainsMsg = document.getElementById('no-domains-msg');
  container.innerHTML = ''; // Clear existing list

  if (!whitelist || whitelist.length === 0) {
    noDomainsMsg.style.display = 'block';
    return;
  }

  noDomainsMsg.style.display = 'none';

  whitelist.forEach(domain => {
    const row = document.createElement('tr');

    // Unicode Version Cell
    const unicodeCell = document.createElement('td');
    let unicodeString = '';
    try {
      if (window.punycode) {
        unicodeString = window.punycode.toUnicode(domain);
      } else {
        unicodeString = '-';
      }
    } catch (e) {
      console.error('Punycode conversion failed for', domain, e);
      unicodeString = 'Error';
    }

    // Create Link for Unicode
    const unicodeLink = document.createElement('a');
    unicodeLink.href = `http://${domain}`;
    unicodeLink.target = '_blank';
    unicodeLink.textContent = unicodeString;

    unicodeCell.appendChild(unicodeLink);
    row.appendChild(unicodeCell);

    // Domain Cell (as hyperlink)
    const domainCell = document.createElement('td');
    const domainLink = document.createElement('a');
    domainLink.href = `http://${domain}`;
    domainLink.target = '_blank'; // Open in new tab
    domainLink.textContent = domain;
    domainCell.appendChild(domainLink);
    row.appendChild(domainCell);

    // Date Cell
    const dateCell = document.createElement('td');
    const domainMetadata = metadata[domain];
    dateCell.textContent = (domainMetadata && domainMetadata.added) ? domainMetadata.added : 'N/A';
    row.appendChild(dateCell);
    
    // Remove Button Cell
    const actionCell = document.createElement('td');
    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Remove';
    removeBtn.className = 'remove-btn';
    removeBtn.dataset.domain = domain;
    removeBtn.addEventListener('click', removeDomain);
    actionCell.appendChild(removeBtn);
    row.appendChild(actionCell);

    container.appendChild(row);
  });
}

// Removes a domain from the whitelist
function removeDomain(event) {
  const domainToRemove = event.target.dataset.domain;
  
  // Lock the table and column widths to prevent layout shift
  const table = document.getElementById('whitelist-table');
  table.style.width = table.offsetWidth + 'px';
  
  // Lock header cell widths to prevent layout shift
  const headerCells = table.querySelectorAll('th');
  headerCells.forEach(cell => {
    cell.style.width = cell.offsetWidth + 'px';
  });
  
  chrome.storage.sync.get(['whitelist', 'whitelistMetadata'], (data) => {
    let whitelist = data.whitelist || [];
    let metadata = data.whitelistMetadata || {};

    // Remove from whitelist array
    whitelist = whitelist.filter(domain => domain !== domainToRemove);

    // Remove from metadata object
    if (metadata[domainToRemove]) {
      delete metadata[domainToRemove];
    }

    // Save the updated lists
    chrome.storage.sync.set({
      whitelist: whitelist,
      whitelistMetadata: metadata
    }, () => {
      // Re-render the list
      renderWhitelist(whitelist, metadata);
    });
  });
}

// Initialize version button and changelog modal
function initVersionChangelog() {
  // Get version from manifest
  const manifest = chrome.runtime.getManifest();
  const versionNumber = document.getElementById('version-number');
  if (versionNumber) {
    versionNumber.textContent = manifest.version;
  }

  // Modal elements
  const modal = document.getElementById('changelog-modal');
  const versionBtn = document.getElementById('version-btn');
  const closeBtn = document.getElementById('modal-close');

  // Open modal
  versionBtn.addEventListener('click', () => {
    modal.classList.add('show');
  });

  // Close modal with X button
  closeBtn.addEventListener('click', () => {
    modal.classList.remove('show');
  });
}

// Listen for when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  restoreOptions();
  initVersionChangelog();

  // Event listeners for Allowed Characters
  document.getElementById('save-chars-btn').addEventListener('click', saveAllowedChars);
});