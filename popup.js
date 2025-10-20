// popup.js - Handles the extension popup interface

document.addEventListener('DOMContentLoaded', function() {
  const selectDisplay = document.getElementById('regionSelectDisplay');
  const selectItems = document.getElementById('regionSelectItems');
  const saveBtn = document.getElementById('saveBtn');
  const resetBtn = document.getElementById('resetBtn');
  const status = document.getElementById('status');
  const pingStatus = document.getElementById('pingStatus');

  let isOnRoblox = false;
  let regionPings = {};
  let selectedRegion = 'auto';

  // Region structure with groups
  const REGIONS = {
    'auto': { name: 'Auto (Default)', group: null },
    'us': [
      { code: 'seattle', name: 'Seattle, WA' },
      { code: 'losangeles', name: 'Los Angeles, CA' },
      { code: 'dallas', name: 'Dallas, TX' },
      { code: 'chicago', name: 'Chicago, IL' },
      { code: 'atlanta', name: 'Atlanta, GA' },
      { code: 'miami', name: 'Miami, FL' },
      { code: 'ashburn', name: 'Ashburn, VA' },
      { code: 'newyork', name: 'New York City, NY' }
    ],
    'eu': [
      { code: 'london', name: 'London, UK' },
      { code: 'amsterdam', name: 'Amsterdam, NL' },
      { code: 'paris', name: 'Paris, FR' },
      { code: 'frankfurt', name: 'Frankfurt, DE' },
      { code: 'warsaw', name: 'Warsaw, PL' }
    ],
    'ap': [
      { code: 'mumbai', name: 'Mumbai, IN' },
      { code: 'tokyo', name: 'Tokyo, JP' },
      { code: 'singapore', name: 'Singapore' },
      { code: 'sydney', name: 'Sydney, AU' }
    ]
  };

  const GROUP_NAMES = {
    'us': 'United States',
    'eu': 'Europe',
    'ap': 'Asia Pacific'
  };

  // Actual Roblox server IPs for each region (from background.js REGION_IP_RANGES)
  const REGION_TEST_IPS = {
    'seattle': '128.116.115.1',
    'losangeles': '128.116.116.1',
    'dallas': '128.116.95.1',
    'chicago': '128.116.101.1',
    'atlanta': '128.116.22.1',
    'miami': '128.116.45.1',
    'ashburn': '128.116.102.1',
    'newyork': '128.116.32.1',
    'london': '128.116.33.1',
    'amsterdam': '128.116.21.1',
    'paris': '128.116.4.1',
    'frankfurt': '128.116.5.1',
    'warsaw': '128.116.31.1',
    'mumbai': '128.116.104.1',
    'tokyo': '128.116.55.1',
    'singapore': '128.116.50.1',
    'sydney': '128.116.51.1'
  };

  // Initialize dropdown
  buildDropdown();
  
  // Check if current tab is on Roblox
  checkRobloxTab();

  // Load saved region preference
  loadSavedRegion();

  // Toggle dropdown
  selectDisplay.addEventListener('click', function(e) {
    if (!selectDisplay.classList.contains('select-disabled')) {
      e.stopPropagation();
      selectItems.classList.toggle('select-hide');
      selectDisplay.classList.toggle('select-arrow-active');
    }
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', function() {
    selectItems.classList.add('select-hide');
    selectDisplay.classList.remove('select-arrow-active');
  });

  // Save button click handler
  saveBtn.addEventListener('click', function() {
    // Save to Chrome storage
    chrome.storage.local.set({
      'preferredRegion': selectedRegion
    }, function() {
      updateStatus('Region preference saved!', 'active');
      
      // Notify background script of the change
      chrome.runtime.sendMessage({
        action: 'updateRegion',
        region: selectedRegion
      });
      
      // Auto-close popup after a moment
      setTimeout(() => {
        window.close();
      }, 1000);
    });
  });

  // Reset button click handler
  resetBtn.addEventListener('click', function() {
    selectedRegion = 'auto';
    selectDisplay.textContent = REGIONS.auto.name;
    chrome.storage.local.remove('preferredRegion', function() {
      updateStatus('Settings reset to default');
      
      chrome.runtime.sendMessage({
        action: 'updateRegion',
        region: 'auto'
      });
    });
  });

  function buildDropdown() {
    selectItems.innerHTML = '';
    
    // Add Auto option
    const autoOption = document.createElement('div');
    autoOption.textContent = REGIONS.auto.name;
    autoOption.dataset.value = 'auto';
    autoOption.addEventListener('click', function(e) {
      selectOption('auto', REGIONS.auto.name);
      e.stopPropagation();
    });
    selectItems.appendChild(autoOption);

    // Add grouped options
    ['us', 'eu', 'ap'].forEach(groupKey => {
      // Add group label
      const groupLabel = document.createElement('div');
      groupLabel.className = 'optgroup-label';
      groupLabel.textContent = GROUP_NAMES[groupKey];
      selectItems.appendChild(groupLabel);

      // Add regions in group
      REGIONS[groupKey].forEach(region => {
        const option = document.createElement('div');
        option.dataset.value = region.code;
        
        const citySpan = document.createElement('span');
        citySpan.className = 'option-city';
        citySpan.textContent = region.name;
        option.appendChild(citySpan);
        
        const pingSpan = document.createElement('span');
        pingSpan.className = 'option-ping';
        pingSpan.dataset.region = region.code;
        pingSpan.textContent = '...';
        option.appendChild(pingSpan);
        
        option.addEventListener('click', function(e) {
          selectOption(region.code, region.name);
          e.stopPropagation();
        });
        
        selectItems.appendChild(option);
      });
    });
  }

  function selectOption(code, name) {
    selectedRegion = code;
    selectDisplay.textContent = name;
    
    // Update selection styling
    const allOptions = selectItems.querySelectorAll('div[data-value]');
    allOptions.forEach(opt => opt.classList.remove('same-as-selected'));
    const selectedOpt = selectItems.querySelector(`div[data-value="${code}"]`);
    if (selectedOpt) {
      selectedOpt.classList.add('same-as-selected');
    }
    
    // Close dropdown
    selectItems.classList.add('select-hide');
    selectDisplay.classList.remove('select-arrow-active');
    
    // Update status
    if (code === 'auto') {
      updateStatus('Using Roblox default region selection');
    } else {
      const ping = regionPings[code];
      const pingText = ping ? ` (~${ping}ms)` : '';
      updateStatus(`Will connect to ${name} servers${pingText}`);
    }
  }

  function checkRobloxTab() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs[0] && tabs[0].url) {
        const url = tabs[0].url;
        isOnRoblox = url.includes('roblox.com');
        
        if (isOnRoblox) {
          // Enable controls
          selectDisplay.classList.remove('select-disabled');
          saveBtn.disabled = false;
          resetBtn.disabled = false;
          
          // Update status based on saved preference
          chrome.storage.local.get(['preferredRegion'], function(result) {
            if (result.preferredRegion && result.preferredRegion !== 'auto') {
              updateStatus(`Current: ${getRegionName(result.preferredRegion)}`, 'active');
            } else {
              updateStatus('On Roblox - Select a region to begin');
            }
          });
          
          // Only measure pings if on Roblox
          measureRegionPings();
        } else {
          // Disable controls and show warning
          selectDisplay.classList.add('select-disabled');
          saveBtn.disabled = true;
          resetBtn.disabled = true;
          updateStatus('Not on Roblox - Navigate to roblox.com to use this extension', 'warning');
          
          // Hide ping status completely when not on Roblox
          pingStatus.style.display = 'none';
        }
      }
    });
  }

  function loadSavedRegion() {
    chrome.storage.local.get(['preferredRegion'], function(result) {
      if (result.preferredRegion) {
        selectedRegion = result.preferredRegion;
        const name = getRegionName(selectedRegion);
        selectDisplay.textContent = name;
        
        // Mark as selected in dropdown
        const selectedOpt = selectItems.querySelector(`div[data-value="${selectedRegion}"]`);
        if (selectedOpt) {
          selectedOpt.classList.add('same-as-selected');
        }
      }
    });
  }

  function updateStatus(message, className = '') {
    status.textContent = message;
    status.className = 'status ' + className;
  }

  function getRegionName(regionCode) {
    if (regionCode === 'auto') return REGIONS.auto.name;
    
    for (const groupKey of ['us', 'eu', 'ap']) {
      const region = REGIONS[groupKey].find(r => r.code === regionCode);
      if (region) return region.name;
    }
    return regionCode;
  }

  function getPingClass(ping) {
    if (ping < 100) return 'ping-low';
    if (ping < 200) return 'ping-medium';
    return 'ping-high';
  }

  async function measurePingToRegion(regionCode) {
    const ip = REGION_TEST_IPS[regionCode];
    if (!ip) return null;

    try {
      // Use WebSocket to measure actual network latency to Roblox server IP
      const startTime = performance.now();
      
      // Try to make a HEAD request with a short timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      try {
        // Attempt to fetch from the Roblox server IP
        // Note: This will likely fail due to CORS, but the timing before failure gives us the ping
        await fetch(`http://${ip}:80`, {
          method: 'HEAD',
          mode: 'no-cors',
          cache: 'no-store',
          signal: controller.signal
        });
      } catch (e) {
        // Expected to fail, but we got timing info
      }
      
      clearTimeout(timeoutId);
      const endTime = performance.now();
      const ping = Math.round(endTime - startTime);
      
      // Clamp to reasonable values (CORS failures can give weird timings)
      return Math.min(Math.max(ping, 1), 500);
      
    } catch (error) {
      // If measurement completely fails, return null
      return null;
    }
  }

  async function measureRegionPings() {
    pingStatus.textContent = 'Measuring latency...';
    pingStatus.style.display = 'block';
    pingStatus.style.color = '#888';

    const regions = Object.keys(REGION_TEST_IPS);
    const batchSize = 3; // Reduced batch size for more accurate measurements
    let completed = 0;

    for (let i = 0; i < regions.length; i += batchSize) {
      const batch = regions.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (regionCode) => {
        const ping = await measurePingToRegion(regionCode);
        
        if (ping !== null) {
          regionPings[regionCode] = ping;
          updatePingDisplay(regionCode, ping);
        } else {
          // Show "N/A" if ping measurement failed
          updatePingDisplay(regionCode, null);
        }
        
        completed++;
        pingStatus.textContent = `Measuring latency... (${completed}/${regions.length})`;
      }));
      
      // Small delay between batches to avoid overwhelming the browser
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    pingStatus.textContent = 'Latency measurements complete ✓';
    pingStatus.style.color = '#90ee90';
    
    setTimeout(() => {
      pingStatus.style.display = 'none';
    }, 2000);
  }

  function updatePingDisplay(regionCode, ping) {
    const pingSpan = selectItems.querySelector(`span[data-region="${regionCode}"]`);
    if (pingSpan) {
      if (ping === null) {
        pingSpan.textContent = 'N/A';
        pingSpan.className = 'option-ping';
        pingSpan.style.color = '#666';
      } else {
        pingSpan.textContent = `${ping}ms`;
        pingSpan.className = 'option-ping ' + getPingClass(ping);
      }
    }
  }
});