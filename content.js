
var savedLocalData = {}
function log(...args) {
  console.log(...args);
}
// Wait for the page to load and continuously monitor for new messages
async function initializeCollapsibleMessages() {
  let debouncer;
    const observer = new MutationObserver(() => {
      clearTimeout(debouncer);
      debouncer = setTimeout(() => {
        addCollapseButtons();
        requestAnimationFrame(async () => {
          const chatId = window.location.toString().split('/').pop();
          // apply collapse columns from saved local data
          const collapsedIds = await fetchCollapsedMeesageIds(chatId);
          // log("Initial state: ", collapsedIds);
          collapseMessageById(...collapsedIds)
        })
      }, 300);

    });
  
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
  }

  function collapseMessageById(...ids) {
    const messageContainers = document.querySelectorAll('[data-message-author-role]');
    // log("message containers: ", messageContainers);
    const messagesToCollapse = Array(...messageContainers).filter((container) => {
      let id = container.getAttribute('data-message-id');
      return ids.includes(id);
    })

    messagesToCollapse.forEach((m) => {
      const wrapper = m.querySelector('.message-wrapper');
      const preview = m.querySelector('.message-preview');
      const btn = m.querySelector('.collapse-btn')
      if (wrapper && preview && !wrapper.classList.contains('collapsed')) {
        const isUser = m.getAttribute('data-message-author-role') === 'user';
        const messageId = m.getAttribute('data-message-id')
        toggleCollapse(wrapper, preview, btn, isUser, messageId);
      }
    })
  }
  
  function addCollapseButtons() {
    log("Adding collapse buttons");

    const messageContainers = document.querySelectorAll('[data-message-author-role]');
    
    messageContainers.forEach((container, index) => {
      if (container.querySelector('.collapse-btn')) return; // Skip if button already exists
      
      const role = container.getAttribute('data-message-author-role');
      const isUser = role === 'user';
      
      const collapseBtn = document.createElement('button');
      collapseBtn.className = 'collapse-btn';
      collapseBtn.innerHTML = '▼';
      collapseBtn.title = isUser ? 'Collapse query' : 'Collapse response';
      
      const messageContent = container.querySelector('[data-message-id]') || 
                            container.querySelector('.markdown') || 
                            container.querySelector('div > div');
      
      const messageID = container.getAttribute('data-message-id');
      if (!messageContent) return;
      
      // Create wrapper and preview elements
      const wrapper = document.createElement('div');
      wrapper.className = 'message-wrapper w-full';
      
      const preview = document.createElement('div');
      preview.className = 'message-preview collapsed-preview';
      preview.style.display = 'none';
      
      // Extract and set preview text
      const previewText = extractPreviewText(messageContent, isUser);
      preview.innerHTML = `<span class="preview-text">${previewText}</span>`;
      
      // Insert wrapper before messageContent
      messageContent.parentNode.insertBefore(wrapper, messageContent);
      wrapper.appendChild(messageContent);
      
      // Insert preview after wrapper
      wrapper.parentNode.insertBefore(preview, wrapper.nextSibling);
      
      // Create button container
      const buttonContainer = document.createElement('div');
      buttonContainer.className = 'collapse-button-container';
      buttonContainer.appendChild(collapseBtn);
      container.insertBefore(buttonContainer, container.firstChild);
      
      // Add click event
      collapseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleCollapse(wrapper, preview, collapseBtn, isUser, messageID);
      });
    });
  }
  
  function extractPreviewText(messageContent, isUser) {
    let text = '';
    
    try {
      // For user messages (usually plain text)
      if (isUser) {
        text = messageContent.textContent || messageContent.innerText || '';
      } else {
        // For AI responses, try to get the first meaningful paragraph
        const paragraphs = messageContent.querySelectorAll('p');
        if (paragraphs.length > 0) {
          text = paragraphs[0].textContent || paragraphs[0].innerText || '';
        } else {
          // Fallback to general text content
          text = messageContent.textContent || messageContent.innerText || '';
        }
      }
      
      // Clean up the text
      text = text.trim();
      
      // Get first line or first sentence, whichever is shorter
      const firstLine = text.split('\n')[0];
      const firstSentence = text.split(/[.!?]/)[0];
      
      let preview = firstLine.length <= firstSentence.length ? firstLine : firstSentence;
      
      // Limit length and add ellipsis if needed
      const maxLength = 100;
      if (preview.length > maxLength) {
        preview = preview.substring(0, maxLength) + '...';
      } else if (preview !== text) {
        preview += '...';
      }
      
      return preview || 'Click to expand...';
      
    } catch (error) {
      console.error('Error extracting preview text:', error);
      return 'Click to expand...';
    }
  }
  
  async function toggleCollapse(wrapper, preview, button, isUser, messageId) {
    try {
      const isCollapsed = wrapper.classList.contains('collapsed');
      log(isCollapsed? `expanding message with ID - ${messageId}`: `collapsing message with ID - ${messageId}`);
      const chatId = window.location.toString().split('/').pop();
      if (isCollapsed) {
        // Expand
        wrapper.classList.remove('collapsed');
        wrapper.style.display = '';
        preview.style.display = 'none';
        button.innerHTML = '▼';
        button.title = isUser ? 'Collapse query' : 'Collapse response';
        let currenIds = await fetchCollapsedMeesageIds(chatId)
        log("Current ids: ", currenIds);
        let newIds = currenIds.filter((id) => id != messageId);
        log("new ids: ", newIds);
        await setCollapseMessageIds(chatId, [...new Set(newIds)]);
      } else {
        // Collapse
        wrapper.classList.add('collapsed');
        wrapper.style.display = 'none';
        preview.style.display = 'block';
        button.innerHTML = '▶';
        button.title = isUser ? 'Expand query' : 'Expand response';
        let currenIds = await fetchCollapsedMeesageIds(chatId)
        log("collapsing: ", messageId);
        let newIds = [...currenIds, messageId];
        log("new ids: ", newIds);
        await setCollapseMessageIds(chatId, [...new Set(newIds)]);
        log("collapse complete for id", messageId)
    }
    } catch (e) {
      log("Error: ", e);
    }
    
  }
  
  // Alternative selectors for different ChatGPT layouts
  // function addCollapseButtonsAlternative() {
  //   log("Adding collapse alternative");
  //   const messages = document.querySelectorAll('div[class*="group"]');
    
  //   messages.forEach((message) => {
  //     if (message.querySelector('.collapse-btn')) return;
      
  //     const userMessage = message.querySelector('div[class*="whitespace-pre-wrap"]');
  //     const assistantMessage = message.querySelector('div[class*="markdown"]');
  //     const targetContent = userMessage || assistantMessage;
      
  //     if (targetContent) {
  //       addCollapseToElementWithPreview(message, targetContent, !!userMessage);
  //     }
  //   });
  // }
  
  // function addCollapseToElementWithPreview(container, content, isUser) {
  //   const collapseBtn = document.createElement('button');
  //   collapseBtn.className = 'collapse-btn';
  //   collapseBtn.innerHTML = '▼';
  //   collapseBtn.title = isUser ? 'Collapse query' : 'Collapse response';
    
  //   // Create wrapper and preview
  //   const wrapper = document.createElement('div');
  //   wrapper.className = 'message-wrapper';
    
  //   const preview = document.createElement('div');
  //   preview.className = 'message-preview collapsed-preview';
  //   preview.style.display = 'none';
    
  //   // Extract preview text
  //   const previewText = extractPreviewText(content, isUser);
  //   preview.innerHTML = `<span class="preview-text">${previewText}</span>`;
    
  //   // Wrap content
  //   content.parentNode.insertBefore(wrapper, content);
  //   wrapper.appendChild(content);
  //   wrapper.parentNode.insertBefore(preview, wrapper.nextSibling);
    
  //   // Add button
  //   const buttonContainer = document.createElement('div');
  //   buttonContainer.className = 'collapse-button-container';
  //   buttonContainer.appendChild(collapseBtn);
  //   container.insertBefore(buttonContainer, container.firstChild);
    
  //   collapseBtn.addEventListener('click', (e) => {
  //     e.stopPropagation();
  //     toggleCollapse(wrapper, preview, collapseBtn, isUser);
  //   });
  // }

  async function fetchCollapsedMeesageIds(chatId) {
    let state = await chrome.storage.local.get('cgc');
    // log("State: ", state);
    if(!state['cgc']) {
      await chrome.storage.local.set({'cgc': {}});
      return []
    }
    if(state['cgc'] && state['cgc'][chatId]) return state['cgc'][chatId]['messageIds'] || [];
    return [];
  }

  async function setCollapseMessageIds(chatId, messageIds) {
    log("Tweaking storage")
    let state = await chrome.storage.local.get('cgc');
    let expiry = new Date();
    expiry.setDate(expiry.getDate() + 7);
    expiry = expiry.getTime();
    if(state['cgc'][chatId]) {
      await chrome.storage.local.set({'cgc': {
        ...state['cgc'],
        [chatId]: {
          ...state[chatId], 
          messageIds,
          expiry
        }
      }});
    }
    else {
      await chrome.storage.local.set({'cgc': {
        ...state['cgc'],
        [chatId]: {
          messageIds,
          expiry
        }
      }});
    }
  }
  
  // Keyboard shortcuts with preview support
  document.addEventListener('keydown', async (e) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') {
      e.preventDefault();
      await collapseAll();
    }
    
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'E') {
      e.preventDefault();
      await expandAll();
    }
  });
  
  async function collapseAll() {
    const buttons = document.querySelectorAll('.collapse-btn');
    for(const btn of buttons) {
      const container = btn.closest('[data-message-author-role]');
      if (!container) return;
      
      const wrapper = container.querySelector('.message-wrapper');
      const preview = container.querySelector('.message-preview');
      
      if (wrapper && preview && !wrapper.classList.contains('collapsed')) {
        const isUser = container.getAttribute('data-message-author-role') === 'user';
        const messageId = container.getAttribute('data-message-id')
        await toggleCollapse(wrapper, preview, btn, isUser, messageId);
      }
    }
  }
  
  async function expandAll() {
    const buttons = document.querySelectorAll('.collapse-btn');
    for(const btn of buttons) {
      const container = btn.closest('[data-message-author-role]');
      if (!container) return;
      
      const wrapper = container.querySelector('.message-wrapper');
      const preview = container.querySelector('.message-preview');
      
      if (wrapper && preview && wrapper.classList.contains('collapsed')) {
        const isUser = container.getAttribute('data-message-author-role') === 'user';
        const messageId = container.getAttribute('data-message-id')
        await toggleCollapse(wrapper, preview, btn, isUser, messageId);
      }
    }
  }
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeCollapsibleMessages);
  } else {
    initializeCollapsibleMessages();
  }
  
  // Also try alternative method for different layouts
  // setTimeout(() => {
  //   addCollapseButtonsAlternative();
  // }, 2000);
  