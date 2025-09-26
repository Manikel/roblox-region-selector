// background.js - Service worker for the extension

let currentRegion = 'auto';

// Roblox server IP ranges mapped to cities
const REGION_IP_RANGES = {
  'seattle': ['128.116.115.0/24'],
  'losangeles': ['128.116.116.0/24', '128.116.1.0/24', '128.116.63.0/24'],
  'dallas': ['128.116.95.0/24'],
  'chicago': ['128.116.101.0/24', '128.116.48.0/24'],
  'atlanta': ['128.116.22.0/24', '128.116.99.0/24'],
  'miami': ['128.116.45.0/24', '128.116.127.0/24'],
  'ashburn': ['128.116.102.0/24', '128.116.53.0/24'],
  'newyork': ['128.116.32.0/24'],
  'london': ['128.116.33.0/24', '128.116.119.0/24'],
  'amsterdam': ['128.116.21.0/24'],
  'paris': ['128.116.4.0/24', '128.116.122.0/24'],
  'frankfurt': ['128.116.5.0/24', '128.116.44.0/24', '128.116.123.0/24'],
  'warsaw': ['128.116.31.0/24', '128.116.124.0/24'],
  'mumbai': ['128.116.104.0/24'],
  'tokyo': ['128.116.55.0/24', '128.116.120.0/24'],
  'singapore': ['128.116.50.0/24', '128.116.97.0/24'],
  'sydney': ['128.116.51.0/24']
};

// Get a random IP from the selected region's ranges
function getRandomIPFromRegion(regionCode) {
  if (regionCode === 'auto' || !REGION_IP_RANGES[regionCode]) {
    return null;
  }
  
  const ranges = REGION_IP_RANGES[regionCode];
  const selectedRange = ranges[Math.floor(Math.random() * ranges.length)];
  
  // Parse CIDR (e.g., "128.116.115.0/24")
  const [baseIP, prefixLength] = selectedRange.split('/');
  const [a, b, c, d] = baseIP.split('.').map(Number);
  
  // For /24 networks, only the last octet varies (0-255)
  if (prefixLength === '24') {
    const randomLastOctet = Math.floor(Math.random() * 256);
    return `${a}.${b}.${c}.${randomLastOctet}`;
  }
  
  return baseIP; // Fallback
}

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