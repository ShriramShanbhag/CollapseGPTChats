// background.js (service worker)
chrome.runtime.onInstalled.addListener(() => {
    // Create alarm that triggers every minute
    chrome.alarms.create("cleanup", { periodInMinutes: 10 });
  });
  
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "cleanup") {
      cleanupExpiredChats();
    }
  });


// Removes expired (or legacy) collapsed chat states from chrome.storage.local
async function cleanupExpiredChats() {
    // Get all collapse data ('cgc' object)
    const state = await chrome.storage.local.get('cgc');
    if (!state.cgc) {
      console.log('No collapse data to clean.');
      return;
    }
  
    const now = Date.now();
    let changed = false;
  
    // Go through each chat record
    for (const chatId in state.cgc) {
      const chatData = state.cgc[chatId];
  
      // If expired, delete
      if (chatData.expiry && chatData.expiry < now) {
        console.log(`Expired collapse state for chat ${chatId}, removing.`);
        delete state.cgc[chatId];
        changed = true;
        continue;
      }
    }
  
    // If anything changed, update storage
    if (changed) {
      await chrome.storage.local.set({ cgc: state.cgc });
      console.log('Expired collapse states cleaned up.');
    } else {
      console.log('No expired collapse states found.');
    }
  }
  