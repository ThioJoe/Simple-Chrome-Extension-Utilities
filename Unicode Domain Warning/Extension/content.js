// content.js
(function() {
  const hostname = window.location.hostname; // This is the punycode version
  const pageTitle = document.title; // Get the page title

  // Get settings from Chrome storage
  chrome.storage.sync.get(['whitelist'], (settings) => {
    const whitelist = settings.whitelist || [];
    
    // Check if the current hostname is in the whitelist
    if (whitelist.includes(hostname)) {
      return; // It's whitelisted, do nothing.
    }

    // Check for non-ASCII characters OR the Punycode prefix (xn--)
    // We explicitly exclude the loopback address "localhost"
    const isIDN = (hostname.toLowerCase() !== 'localhost') && (/[^\u0000-\u007f]/.test(hostname) || hostname.toLowerCase().includes('xn--'));

    if (isIDN) {
      // Check if the banner has already been dismissed for this domain for this session/tab
      const dismissedDomains = JSON.parse(sessionStorage.getItem('dismissed_idn_domains') || '[]');
      if (dismissedDomains.includes(hostname)) {
        return;
      }

      // --- Create Banner ---
      const banner = document.createElement('div');
      banner.style.position = 'fixed';
      banner.style.top = '0';
      banner.style.left = '0';
      banner.style.width = '100%';
      banner.style.backgroundColor = '#d32f2f'; // Red warning color
      banner.style.color = 'white';
      banner.style.textAlign = 'center';
      banner.style.padding = '15px';
      banner.style.zIndex = '2147483647'; // Max z-index
      banner.style.fontFamily = 'Arial, sans-serif';
      banner.style.fontWeight = 'bold';
      banner.style.fontSize = '16px';
      banner.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
      
      const bannerText = document.createElement('span');
      bannerText.innerText = `⚠️ WARNING: This site uses an Internationalized Domain Name (IDN): ${hostname}`;
      banner.appendChild(bannerText);

      // --- Whitelist Button ---
      const whitelistBtn = document.createElement('button');
      whitelistBtn.innerText = 'Whitelist this domain';
      whitelistBtn.style.marginLeft = '20px';
      whitelistBtn.style.padding = '5px 10px';
      whitelistBtn.style.fontSize = '14px';
      whitelistBtn.style.fontWeight = 'normal';
      whitelistBtn.style.color = '#d32f2f';
      whitelistBtn.style.backgroundColor = '#ffffff';
      whitelistBtn.style.border = '1px solid #d32f2f';
      whitelistBtn.style.borderRadius = '4px';
      whitelistBtn.style.cursor = 'pointer';

      whitelistBtn.onclick = () => {
        // Get whitelist and our new metadata map
        chrome.storage.sync.get(['whitelist', 'whitelistMetadata'], (data) => {
          const currentWhitelist = data.whitelist || [];
          const currentMetadata = data.whitelistMetadata || {};
          
          if (!currentWhitelist.includes(hostname)) {
            const today = new Date().toISOString().split('T')[0];
            
            currentWhitelist.push(hostname);
            currentMetadata[hostname] = {
              added: today,
              title: pageTitle // Save the title
            };
            
            chrome.storage.sync.set({ 
              whitelist: currentWhitelist,
              whitelistMetadata: currentMetadata 
            }, () => {
              console.log(`Whitelisted ${hostname}`);
              banner.remove();
            });
          }
        });
      };
      banner.appendChild(whitelistBtn);
      
      // --- Close Button ---
      const closeBtn = document.createElement('button');
      closeBtn.innerText = 'Dismiss';
      closeBtn.style.marginLeft = '10px';
      closeBtn.style.padding = '5px 10px';
      closeBtn.style.fontSize = '14px';
      closeBtn.style.fontWeight = 'normal';
      closeBtn.style.color = '#ffffff';
      closeBtn.style.backgroundColor = 'transparent';
      closeBtn.style.border = '1px solid #ffffff';
      closeBtn.style.borderRadius = '4px';
      closeBtn.style.cursor = 'pointer';
      
      closeBtn.onclick = () => {
        // Remember that the banner was dimissed for this domain for the rest of the session
        const dismissed = JSON.parse(sessionStorage.getItem('dismissed_idn_domains') || '[]');
        if (!dismissed.includes(hostname)) {
          dismissed.push(hostname);
          sessionStorage.setItem('dismissed_idn_domains', JSON.stringify(dismissed));
        }
        banner.remove();
      };
      
      banner.appendChild(closeBtn);
      document.body.prepend(banner);
    }
  });
})();