// Function to add collapse/expand functionality to a given element
function addCollapseToggle(element) {
    // Check if the element already has a toggle button to prevent duplicates
    if (element.dataset.collapseToggleAdded) {
        return;
    }

    // Create the collapse/expand button
    const toggleButton = document.createElement('button');
    toggleButton.textContent = 'Collapse';
    toggleButton.style.cssText = `
        margin-left: 10px;
        padding: 4px 8px;
        border: none;
        border-radius: 4px;
        background-color: #f0f0f0;
        color: #333;
        cursor: pointer;
        font-size: 0.8em;
        transition: background-color 0.2s ease;
    `;

    // Add hover effect
    toggleButton.onmouseover = () => {
        toggleButton.style.backgroundColor = '#e0e0e0';
    };
    toggleButton.onmouseout = () => {
        toggleButton.style.backgroundColor = '#f0f0f0';
    };

    // Find the most suitable place to append the button.
    // For ChatGPT, the query/response content is often within a parent div
    // that has a header or avatar. We want to place the button near the top.
    let targetParent = null;


    // Try to find a header or the first paragraph within the element
    const header = element.querySelector('h1, h2, h3, h4, h5, h6');
    const firstParagraph = element.querySelector('p');

    if (header) {
        // Append next to the header if found
        targetParent = header.parentElement;
    } else if (firstParagraph) {
        // Append near the first text content if no header
        targetParent = firstParagraph.parentElement;
    } else {
        // Fallback to the element itself or its direct child if no specific target
        targetParent = element.querySelector('div') || element;
    }

    targetParent.style.border = '1px solid red';

    if (targetParent) {
        // Insert the button before the content that needs to be collapsed
        // This assumes the content to collapse is typically a sibling element
        // or contained within a sibling.
        // We'll target the immediate next sibling after the point where the button is inserted.
        const contentToToggle = element.querySelector('.markdown, .whitespace-pre-wrap') ||
                                element.querySelector('.prose') ||
                                element.lastElementChild; // Fallback to last child


        if (contentToToggle && contentToToggle !== toggleButton) {
             // Insert the button at the beginning of the element, or near its header/avatar
            const parentOfButton = element.querySelector('div[data-message-id]').parentElement || element.firstElementChild || element;
            parentOfButton.insertBefore(toggleButton, parentOfButton.firstElementChild);


            let isCollapsed = false;

            // Store the original display style to revert correctly
            const originalDisplay = contentToToggle.style.display;

            toggleButton.addEventListener('click', () => {
                if (isCollapsed) {
                    contentToToggle.style.display = originalDisplay; // Restore original display
                    toggleButton.textContent = 'Collapse';
                } else {
                    contentToToggle.style.display = 'none';
                    toggleButton.textContent = 'Expand';
                }
                isCollapsed = !isCollapsed;
            });

            element.dataset.collapseToggleAdded = 'true'; // Mark as processed
        }
    }
}

// Function to observe DOM changes and apply the collapse functionality
function observeChatElements() {
    // Select all potential query/response containers.
    // ChatGPT's structure often uses specific classes for messages.
    // We'll look for common parent elements that contain the user's query and the AI's response.
    // Example selectors (these might change with ChatGPT updates):
    // - div[data-testid^="conversation-turn-"] (more reliable)
    // - .group.w-full (common message container)
    const messageContainers = document.querySelectorAll(
        'article[data-testid^="conversation-turn-"], .group.w-full'
    );

    messageContainers.forEach(addCollapseToggle);
}

// Use a MutationObserver to detect when new chat elements are added to the DOM
// This ensures the buttons are added dynamically as you chat.
const observer = new MutationObserver((mutationsList, observer) => {
    for (const mutation of mutationsList) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            // Check if any added node is a potential chat message, or contains one
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === 1) { // Element node
                    if (node.matches('article[data-testid^="conversation-turn-"]') || node.matches('.group.w-full')) {
                        addCollapseToggle(node);
                    } else {
                        // If the added node is a parent containing messages, observe its children
                        const newMessages = node.querySelectorAll(
                            'article[data-testid^="conversation-turn-"], .group.w-full'
                        );
                        newMessages.forEach(addCollapseToggle);
                    }
                }
            });
        }
    }
});

// Start observing the body for changes
// This is broad, but necessary for dynamic content loading in SPAs like ChatGPT.
observer.observe(document.body, { childList: true, subtree: true });

 // Also run on initial load in case messages are already present when the script first executes.
 window.addEventListener('load', observeChatElements);

 // Set a fallback interval to periodically check for new elements.
 // This can catch elements that might be missed by the MutationObserver due to complex rendering.
 setInterval(observeChatElements, 1000);
