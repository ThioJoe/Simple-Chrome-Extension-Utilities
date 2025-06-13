// Check if the script has already been injected to prevent re-declaration errors.
if (typeof window.textRandomizerInjected === 'undefined') {
    window.textRandomizerInjected = true;

    // Character set for randomization (letters, numbers - NO space here)
    const wordChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    let shouldBlur = false;
    let tooltipTimeout;
    const historyStack = [];

    // --- State tracking attributes ---
    const MODIFIED_ATTR = 'data-randomizer-modified';
    const SPAN_WRAPPER_ATTR = 'data-randomizer-span';
    const BLUR_AMOUNT_ATTR = 'data-randomizer-blur-amount';
    const DEFAULT_BLUR = 4; // px
    const MAX_BLUR = 12; // px

    function getRandomInt(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min; //The maximum is inclusive and the minimum is inclusive
    }

    function generateRandomString(length) {
        if (length <= 0) return ''; // Handle edge case

        let result = '';
        let currentWordLength = 0;
        // Determine the length of the *next* word chunk (3 to 6 chars)
        let targetWordLength = getRandomInt(3, 6);
        const wordCharsLength = wordChars.length;

        while (result.length < length) {
            // Check if we've reached the target word length AND if there's room for a space AND it's not the very beginning
            if (currentWordLength >= targetWordLength && result.length > 0 && result.length < length) {
                result += ' '; // Add a space
                currentWordLength = 0; // Reset word counter
                targetWordLength = getRandomInt(3, 6); // Get length for next word chunk
            } else {
                // Add a non-space character if there's room
                if (result.length < length) {
                    result += wordChars.charAt(Math.floor(Math.random() * wordCharsLength));
                    currentWordLength++;
                }
            }
        }

        // Important: The loop might slightly over/undershoot due to space insertion logic.
        // Ensure the final string is *exactly* the required length.
        // If too long, truncate. If too short (less likely), pad (though padding might look unnatural).
        // Truncating is generally safer for preserving layout approximately.
        if (result.length > length) {
            result = result.substring(0, length);
        }
        // Optional: Handle if it's too short, though the logic makes this unlikely unless original length was very small.
        // while (result.length < length) {
        //     result += wordChars.charAt(Math.floor(Math.random() * wordCharsLength));
        // }

        // Ensure the string doesn't end with a space if truncated.
        if (result.endsWith(' ')) {
            // If the last character is a space and we have room, replace it with a random char.
            if (length > 0) {
                result = result.substring(0, length - 1) + wordChars.charAt(Math.floor(Math.random() * wordCharsLength));
            } else {
                result = ''; // Handle case where length was 0 or 1 and ended in space
            }
        }


        return result;
    }

    function showBlurTooltip(element, blurAmount) {
        // Clear any existing tooltip timeout and remove the element
        clearTimeout(tooltipTimeout);
        document.querySelector('.randomizer-blur-tooltip')?.remove();

        const tooltip = document.createElement('div');
        tooltip.className = 'randomizer-blur-tooltip';
        tooltip.textContent = `Blur: ${blurAmount}px`;
        Object.assign(tooltip.style, {
            position: 'absolute',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            zIndex: '999999',
            pointerEvents: 'none',
            fontFamily: 'sans-serif'
        });

        document.body.appendChild(tooltip);

        const rect = element.getBoundingClientRect();
        // Position tooltip above the element
        tooltip.style.top = `${rect.top + window.scrollY - tooltip.offsetHeight - 5}px`;
        tooltip.style.left = `${rect.left + window.scrollX}px`;

        tooltipTimeout = setTimeout(() => {
            tooltip.remove();
        }, 750);
    }

    // --- Helper functions for applying/removing styles ---
    function applyBlur(element, blurAmount, instant = false) {
        const transitionStyle = instant ? 'none' : 'filter 0.3s ease-in';
        const isInputButton = element.tagName === 'INPUT';

        if (isInputButton) {
            // Fallback for input buttons: use text-shadow method
            const originalColor = window.getComputedStyle(element).color;
            element.style.transition = instant ? 'none' : 'color 0.3s ease-in, text-shadow 0.3s ease-in';
            element.style.color = 'transparent';
            element.style.textShadow = `0 0 ${blurAmount}px ${originalColor}`;
        } else {
            // Preferred method: use filter on wrapped spans
            const spans = element.querySelectorAll(`[${SPAN_WRAPPER_ATTR}]`);
            spans.forEach(span => {
                span.style.transition = transitionStyle;
                span.style.filter = `blur(${blurAmount}px)`;
            });
        }
        element.setAttribute(BLUR_AMOUNT_ATTR, blurAmount.toString());
        if (instant) {
            showBlurTooltip(element, blurAmount);
        }
    }

    function removeBlur(element) {
        const isInputButton = element.tagName === 'INPUT';
        if (isInputButton) {
            element.style.transition = 'none';
            element.style.color = '';
            element.style.textShadow = '';
        } else {
            const spans = element.querySelectorAll(`[${SPAN_WRAPPER_ATTR}]`);
            spans.forEach(span => {
                span.style.transition = 'none';
                span.style.filter = '';
            });
        }
        element.removeAttribute(BLUR_AMOUNT_ATTR);
    }

    function saveState(element) {
        const isInputButton = element.tagName === 'INPUT' && ['button', 'submit', 'reset'].includes(element.type);
        if (isInputButton) {
            historyStack.push({
                element: element,
                kind: 'input',
                beforeValue: element.value
            });
        } else {
            historyStack.push({
                element: element,
                kind: 'element',
                beforeHTML: element.innerHTML
            });
        }
    }


    // --- Event Listener and DOM manipulation logic is now wrapped in functions ---

    const handleInteraction = (event) => {
        const { altKey, ctrlKey } = event;

        // Only proceed if Ctrl or Alt key was held down
        if (!altKey && !ctrlKey) {
            return;
        }

        // Find the element we've previously modified, or use the direct target if it's new.
        const targetElement = event.target.closest(`[${MODIFIED_ATTR}]`) || event.target;

        // This function recursively finds text nodes and wraps them in a SPAN for styling.
        function wrapAndModifyText(element, mode = 'randomize') {
            const childNodes = Array.from(element.childNodes);
            childNodes.forEach(node => {
                if (node.nodeType === 3 && node.nodeValue.trim().length > 0) {
                    const span = document.createElement('span');
                    span.setAttribute(SPAN_WRAPPER_ATTR, 'true');
                    const trimmedLength = node.nodeValue.trim().length;

                    if (mode === 'randomize') {
                        span.textContent = generateRandomString(trimmedLength);
                    } else if (mode === 'clear') {
                        span.textContent = '\u00A0'.repeat(trimmedLength);
                    }
                    node.parentNode.replaceChild(span, node);
                } else if (node.nodeType === 1 && node.tagName !== 'SCRIPT' && node.tagName !== 'STYLE') {
                    wrapAndModifyText(node, mode);
                }
            });
        }

        // This function recursively finds and clears text nodes directly, without wrapping.
        function findAndClearText(element) {
            const childNodes = Array.from(element.childNodes);
            childNodes.forEach(node => {
                if (node.nodeType === 3 && node.nodeValue.trim().length > 0) {
                    const trimmedLength = node.nodeValue.trim().length;
                    node.nodeValue = '\u00A0'.repeat(trimmedLength);
                } else if (node.nodeType === 1 && node.tagName !== 'SCRIPT' && node.tagName !== 'STYLE') {
                    findAndClearText(node);
                }
            });
        }

        // Check for different types of elements that can contain text.
        const isInputButton = targetElement.tagName === 'INPUT' && ['button', 'submit', 'reset'].includes(targetElement.type);
        const hasTextContent = targetElement.textContent && targetElement.textContent.trim().length > 0;
        const hasInputValue = isInputButton && targetElement.value.trim().length > 0;
        const isModified = targetElement.hasAttribute(MODIFIED_ATTR);

        // A valid target is one with text, or an input button with value, or one we've already modified.
        if (hasTextContent || hasInputValue || isModified) {
            event.preventDefault();
            event.stopPropagation();

            if (ctrlKey && altKey) {
                // --- Ctrl + Alt: Clear text ---
                saveState(targetElement); // Save state before clearing
                if (isInputButton) {
                    const valueTrimmedLength = targetElement.value.trim().length;
                    targetElement.value = '\u00A0'.repeat(valueTrimmedLength);
                } else {
                    if (isModified) {
                        const spans = targetElement.querySelectorAll(`[${SPAN_WRAPPER_ATTR}]`);
                        spans.forEach(span => {
                            const len = span.textContent.length;
                            span.textContent = '\u00A0'.repeat(len);
                        });
                    } else {
                        findAndClearText(targetElement);
                    }
                }
                removeBlur(targetElement);
                targetElement.removeAttribute(MODIFIED_ATTR);

            } else if (ctrlKey) {
                // --- Ctrl only: Add or increase blur ---
                if (!isModified) return; // Only blur elements we've already randomized

                const currentBlur = parseInt(targetElement.getAttribute(BLUR_AMOUNT_ATTR) || '0', 10);
                let newBlur = currentBlur === 0 ? DEFAULT_BLUR : currentBlur + 2;
                if (newBlur > MAX_BLUR) {
                    newBlur = MAX_BLUR;
                }
                // Un-blur and re-blur instantly to ensure the change is applied reliably
                removeBlur(targetElement);
                applyBlur(targetElement, newBlur, true);

            } else if (altKey) {
                // --- Alt only: Randomize text ---
                saveState(targetElement); // Save state before randomizing
                removeBlur(targetElement); // Instantly remove any existing blur

                if (isInputButton) {
                    const originalLength = targetElement.value.trim().length;
                    targetElement.value = generateRandomString(originalLength);
                } else {
                    // If not yet modified, wrap text in spans. If already modified, just update spans.
                    if (!isModified) {
                        wrapAndModifyText(targetElement, 'randomize');
                    } else {
                        const spans = targetElement.querySelectorAll(`[${SPAN_WRAPPER_ATTR}]`);
                        spans.forEach(span => {
                            const len = span.textContent.length;
                            span.textContent = generateRandomString(len);
                        });
                    }
                }

                targetElement.setAttribute(MODIFIED_ATTR, 'true');

                // Visual indicator
                targetElement.style.outline = '2px dashed red';
                setTimeout(() => {
                    targetElement.style.outline = '';
                }, 500);

                if (shouldBlur) {
                    setTimeout(() => {
                        applyBlur(targetElement, DEFAULT_BLUR);
                    }, 200);
                }
            }
        }
    };

    const handleKeyDown = (event) => {
        if (event.key === 'Escape') {
            deactivate();
            // Notify the background script to update the toggle state
            chrome.runtime.sendMessage({ action: "deactivated_by_escape" });
        } else if (event.ctrlKey && event.key.toLowerCase() === 'z') {
            event.preventDefault();
            if (historyStack.length > 0) {
                const lastAction = historyStack.pop();
                const { element, kind, beforeHTML, beforeValue } = lastAction;

                if (kind === 'input') {
                    element.value = beforeValue;
                } else {
                    element.innerHTML = beforeHTML;
                }

                // Clean up any attributes we might have added
                element.removeAttribute(MODIFIED_ATTR);
                removeBlur(element);

                // Visual indicator for undo
                element.style.outline = '2px dashed green';
                setTimeout(() => {
                    element.style.outline = '';
                }, 500);
            }
        }
    };

    function activate() {
        if (window.textRandomizerActive) return;
        window.textRandomizerActive = true;

        // Fetch initial blur setting when activating
        chrome.storage.sync.get('blurEnabled', (data) => {
            shouldBlur = !!data.blurEnabled;
        });

        document.addEventListener('click', handleInteraction, true);
        document.addEventListener('keydown', handleKeyDown, true);
        console.log("Text Randomizer activated. Press Esc to deactivate.");
    }

    function deactivate() {
        window.textRandomizerActive = false;
        document.removeEventListener('click', handleInteraction, true);
        document.removeEventListener('keydown', handleKeyDown, true);
        console.log("Text Randomizer deactivated.");
    }

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "activate") {
            activate();
        } else if (request.action === "deactivate") {
            deactivate();
        }
    });

    // Listen for storage changes to update blur setting live, even if popup is closed
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'sync' && changes.blurEnabled) {
            shouldBlur = !!changes.blurEnabled.newValue;
        }
    });
}