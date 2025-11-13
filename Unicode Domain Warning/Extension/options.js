// options.js

// Restores options from chrome.storage
function restoreOptions() {
  chrome.storage.sync.get(['whitelist', 'whitelistMetadata'], (data) => {
    const whitelist = data.whitelist || [];
    const metadata = data.whitelistMetadata || {};
    renderWhitelist(whitelist, metadata);
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
    
    // Domain Cell (as hyperlink)
    const domainCell = document.createElement('td');
    const domainLink = document.createElement('a');
    domainLink.href = `http://${domain}`;
    domainLink.target = '_blank'; // Open in new tab
    domainLink.textContent = domain;
    domainCell.appendChild(domainLink);
    row.appendChild(domainCell);

    // Page Title Cell
    const titleCell = document.createElement('td');
    const domainMetadata = metadata[domain];
    titleCell.textContent = (domainMetadata && domainMetadata.title) ? domainMetadata.title : 'N/A';
    if (titleCell.textContent !== 'N/A') {
      titleCell.title = domainMetadata.title; // Show full title on hover
    }
    row.appendChild(titleCell);

    // Date Cell
    const dateCell = document.createElement('td');
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

// Listen for when the DOM is loaded
document.addEventListener('DOMContentLoaded', restoreOptions);