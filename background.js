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

// Check if IP address matches a region's CIDR ranges
function isIPInRegion(ipAddress, regionCode) {
  if (!REGION_IP_RANGES[regionCode]) return false;
  
  const ranges = REGION_IP_RANGES[regionCode];
  
  for (const range of ranges) {
    if (isIPInCIDR(ipAddress, range)) {
      return true;
    }
  }
  
  return false;
}

// Check if IP is in CIDR range (simplified for /24 networks)
function isIPInCIDR(ip, cidr) {
  const [rangeIP, prefixLength] = cidr.split('/');
  
  if (prefixLength === '24') {
    const ipParts = ip.split('.');
    const rangeParts = rangeIP.split('.');
    
    // For /24, first 3 octets must match exactly
    return ipParts[0] === rangeParts[0] && 
           ipParts[1] === rangeParts[1] && 
           ipParts[2] === rangeParts[2];
  }
  
  return false;
}

// Set up User-Agent modification for Roblox API requests
function setupUserAgentModification() {
  chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [1],
    addRules: [{
      id: 1,
      priority: 1,
      action: {
        type: "modifyHeaders",
        requestHeaders: [{
          header: "User-Agent",
          operation: "set",
          value: "Roblox/WinInet"
        }]
      },
      condition: {
        urlFilter: "*://gamejoin.roblox.com/v1/join-game-instance",
        resourceTypes: ["xmlhttprequest"]
      }
    }]
  });
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
  
  // Set up User-Agent modification
  setupUserAgentModification();
}

// Listen for messages from popup and content scripts
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
    
    sendResponse({success: true});
  }
  
  if (message.action === 'getRegion') {
    sendResponse({region: currentRegion});
  }
  
  // Handle server detail requests from content script
  if (message.action === 'getServerDetails') {
    handleServerDetailsRequest(message.placeId, message.serverId, sendResponse);
    return true; // Keep message channel open for async response
  }
});

// Fetch server IP details using Roblox API
async function handleServerDetailsRequest(placeId, serverId, sendResponse) {
  try {
    const response = await fetch('https://gamejoin.roblox.com/v1/join-game-instance', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Roblox/WinInet'
      },
      body: JSON.stringify({
        placeId: parseInt(placeId),
        isTeleport: 'False',
        gameId: serverId,
        gameJoinAttemptId: serverId
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Extract server IP from response
    let serverIP = null;
    if (data.joinScript && data.joinScript.UdmuxEndpoints && data.joinScript.UdmuxEndpoints[0]) {
      serverIP = data.joinScript.UdmuxEndpoints[0].Address;
    }
    
    // Determine region based on IP
    let detectedRegion = 'unknown';
    if (serverIP) {
      for (const [regionCode, ranges] of Object.entries(REGION_IP_RANGES)) {
        if (isIPInRegion(serverIP, regionCode)) {
          detectedRegion = regionCode;
          break;
        }
      }
    }
    
    sendResponse({
      success: true,
      serverIP: serverIP,
      region: detectedRegion,
      matchesPreferred: detectedRegion === currentRegion
    });
    
  } catch (error) {
    console.error('Error fetching server details:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

console.log('Roblox Region Selector background script loaded');
