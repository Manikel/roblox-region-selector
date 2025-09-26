// background.js - Service worker for the extension

let currentRegion = 'auto';

// Initialize when extension starts
chrome.runtime.onStartup.addListener(initialize);
chrome.runtime.onInstalled.addListener(initialize);

function initialize() {
  // Load saved region preference
  chrome.storage.local.get(['preferredRegion'], function(result) {
    currentRegion = result.preferredRegion || 'auto';
    console.log('Roblox Region Selector initialized with region:', currentRegion);
  });
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'updateRegion') {
    currentRegion = message.region;
    console.log('Region updated to:', currentRegion);
    
    // Update any active tabs that might be affected
    chrome.tabs.query({url: "*://*.roblox.com/*"}, function(tabs) {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {
          action: 'regionChanged',
          region: currentRegion
        }).catch(() => {
          // Ignore errors for tabs that don't have content scripts
        });
      });
    });
  }
  
  if (message.action === 'getRegion') {
    sendResponse({region: currentRegion});
  }
});

// TODO: This is where you'll implement the network request interception
// You'll need to research Roblox's server selection API and use
// chrome.declarativeNetRequest to modify requests

/*
Future implementation will include:
1. Identifying Roblox server selection requests
2. Modifying those requests to target specific regions
3. Mapping region preferences to actual Roblox server endpoints
4. Handling cases where preferred region is unavailable

Example structure:
chrome.declarativeNetRequest.updateDynamicRules({
  removeRuleIds: [1], // Remove previous rules
  addRules: [{
    id: 1,
    priority: 1,
    action: {
      type: "modifyHeaders",
      requestHeaders: [
        {header: "X-Region-Preference", operation: "set", value: currentRegion}
      ]
    },
    condition: {
      urlFilter: "*://roblox.com/*/join-game*",
      resourceTypes: ["xmlhttprequest"]
    }
  }]
});
*/

console.log('Roblox Region Selector background script loaded');
