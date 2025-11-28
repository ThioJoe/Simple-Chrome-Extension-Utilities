// content.js

const PROCESSED_MARKER_CLASS = 'bottom-copy-button-added';
const FOOTER_CLASS_TAG = 'cloned-code-block-footer'; // For easier identification

function addFooterCopyButton(codeBlockElement) {
    // Check if we've already processed this code block
    if (codeBlockElement.classList.contains(PROCESSED_MARKER_CLASS)) {
        return;
    }

    const header = codeBlockElement.querySelector('.code-block-decoration.header-formatted');

    if (header) {
        // Clone the header
        const footer = header.cloneNode(true);
        footer.classList.add(FOOTER_CLASS_TAG); // Add a class to identify it as a footer

        // Remove specific header-only styles if necessary (optional, but good practice)
        // For example, if the original header had a specific top margin you don't want in the footer.
        // footer.style.marginTop = '0'; // Example

        // Ensure the copy button in the cloned footer works.
        // Gemini uses Angular and Material components. Event listeners might not be
        // simply cloned. The most robust way to ensure functionality is to make
        // the new button click the original button.
        const originalCopyButton = header.querySelector('button.copy-button');
        const newCopyButton = footer.querySelector('button.copy-button');

        if (originalCopyButton && newCopyButton) {
            newCopyButton.addEventListener('click', (event) => {
                event.stopPropagation(); // Prevent event from bubbling up further if needed
                originalCopyButton.click(); // Trigger the original button's click handler
            });
        }

        // Append the cloned header (now acting as a footer) to the code block
        codeBlockElement.appendChild(footer);

        // Mark this code block as processed
        codeBlockElement.classList.add(PROCESSED_MARKER_CLASS);
    }
}

function processAllCodeBlocks() {
    const codeBlocks = document.querySelectorAll('div.code-block:not(.' + PROCESSED_MARKER_CLASS + ')');
    codeBlocks.forEach(addFooterCopyButton);
}

// Initial run when the script is injected
processAllCodeBlocks();

const observer = new MutationObserver((mutationsList, observerInstance) => {
    for (const mutation of mutationsList) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            mutation.addedNodes.forEach(node => {
                // Check if the added node is a code block itself
                if (node.nodeType === Node.ELEMENT_NODE && node.matches('div.code-block')) {
                    // OLD: addFooterCopyButton(node);
                    setTimeout(() => addFooterCopyButton(node), 100); // NEW: Add a small delay
                }
                // Also check if the added node *contains* code blocks
                else if (node.nodeType === Node.ELEMENT_NODE && node.querySelectorAll) {
                    const newCodeBlocks = node.querySelectorAll('div.code-block:not(.' + PROCESSED_MARKER_CLASS + ')');
                    newCodeBlocks.forEach(codeBlockNode => { // Renamed inner variable for clarity
                        // OLD: addFooterCopyButton(codeBlockNode);
                        setTimeout(() => addFooterCopyButton(codeBlockNode), 100); // NEW: Add a small delay
                    });
                }
            });
        }
    }
});

const targetNode = document.body;
const config = { childList: true, subtree: true };
observer.observe(targetNode, config);
