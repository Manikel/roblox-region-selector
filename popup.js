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

  // CloudFlare speed test endpoints for specific data centers
  // These route to ACTUAL regional data centers, not the nearest one
  const REGION_TEST_ENDPOINTS = {
    'seattle': 'https://sea.speedtest.cloudflare.com/__down?bytes=100000',
    'losangeles': 'https://lax.speedtest.cloudflare.com/__down?bytes=100000',
    'dallas': 'https://dfw.speedtest.cloudflare.com/__down?bytes=100000',
    'chicago': 'https://ord.speedtest.cloudflare.com/__down?bytes=100000',
    'atlanta': 'https://atl.speedtest.cloudflare.com/__down?bytes=100000',
    'miami': 'https://mia.speedtest.cloudflare.com/__down?bytes=100000',
    'ashburn': 'https://iad.speedtest.cloudflare.com/__down?bytes=100000',
    'newyork': 'https://ewr.speedtest.cloudflare.com/__down?bytes=100000',
    'london': 'https://lhr.speedtest.cloudflare.com/__down?bytes=100000',
    'amsterdam': 'https://ams.speedtest.cloudflare.com/__down?bytes=100000',
    'paris': 'https://cdg.speedtest.cloudflare.com/__down?bytes=100000',
    'frankfurt': 'https://fra.speedtest.cloudflare.com/__down?bytes=100000',
    'warsaw': 'https://waw.speedtest.cloudflare.com/__down?bytes=100000',
    'mumbai': 'https://bom.speedtest.cloudflare.com/__down?bytes=100000',
    'tokyo': 'https://nrt.speedtest.cloudflare.com/__down?bytes=100000',
    'singapore': 'https://sin.speedtest.cloudflare.com/__down?bytes=100000',
    'sydney': 'https://syd.speedtest.cloudflare.com/__down?bytes=100000'
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
    const endpoint = REGION_TEST_ENDPOINTS[regionCode];
    if (!endpoint) return null;

    try {
      const startTime = performance.now();
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      await fetch(endpoint, {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      const endTime = performance.now();
      
      // Calculate actual round-trip time
      const ping = Math.round(endTime - startTime);
      
      return Math.min(Math.max(ping, 1), 999);
      
    } catch (error) {
      if (error.name === 'AbortError') {
        return 999; // Timeout
      }
      return null;
    }
  }

  async function measureRegionPings() {
    pingStatus.textContent = 'Measuring latency...';
    pingStatus.style.display = 'block';
    pingStatus.style.color = '#888';

    const regions = Object.keys(REGION_TEST_ENDPOINTS);
    const batchSize = 4;
    let completed = 0;

    for (let i = 0; i < regions.length; i += batchSize) {
      const batch = regions.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (regionCode) => {
        const ping = await measurePingToRegion(regionCode);
        
        if (ping !== null) {
          regionPings[regionCode] = ping;
          updatePingDisplay(regionCode, ping);
        } else {
          updatePingDisplay(regionCode, null);
        }
        
        completed++;
        pingStatus.textContent = `Measuring latency... (${completed}/${regions.length})`;
      }));
      
      await new Promise(resolve => setTimeout(resolve, 50));
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