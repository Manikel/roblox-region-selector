// popup.js - Handles the extension popup interface

document.addEventListener('DOMContentLoaded', function() {
  const regionSelect = document.getElementById('regionSelect');
  const saveBtn = document.getElementById('saveBtn');
  const resetBtn = document.getElementById('resetBtn');
  const status = document.getElementById('status');
  const pingStatus = document.getElementById('pingStatus');

  let isOnRoblox = false;
  let regionPings = {};

  // Check if current tab is on Roblox
  checkRobloxTab();

  // Load saved region preference
  loadSavedRegion();

  // Measure ping to all regions
  measureRegionPings();

  // Save button click handler
  saveBtn.addEventListener('click', function() {
    const selectedRegion = regionSelect.value;
    
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
    regionSelect.value = 'auto';
    chrome.storage.local.remove('preferredRegion', function() {
      updateStatus('Settings reset to default');
      
      chrome.runtime.sendMessage({
        action: 'updateRegion',
        region: 'auto'
      });
    });
  });

  // Region selection change handler
  regionSelect.addEventListener('change', function() {
    const region = regionSelect.value;
    if (region === 'auto') {
      updateStatus('Using Roblox default region selection');
    } else {
      updateStatus(`Will connect to ${getRegionName(region)} servers`);
    }
  });

  function checkRobloxTab() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs[0] && tabs[0].url) {
        const url = tabs[0].url;
        isOnRoblox = url.includes('roblox.com');
        
        if (isOnRoblox) {
          // Enable controls
          regionSelect.disabled = false;
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
        } else {
          // Disable controls and show warning
          regionSelect.disabled = true;
          saveBtn.disabled = true;
          resetBtn.disabled = true;
          updateStatus('Not on Roblox - Navigate to roblox.com to use this extension', 'warning');
        }
      }
    });
  }

  function loadSavedRegion() {
    chrome.storage.local.get(['preferredRegion'], function(result) {
      if (result.preferredRegion) {
        regionSelect.value = result.preferredRegion;
      }
    });
  }

  function updateStatus(message, className = '') {
    status.textContent = message;
    status.className = 'status ' + className;
  }

  function getRegionName(regionCode) {
    const regionNames = {
      'auto': 'Auto',
      'seattle': 'Seattle, WA',
      'losangeles': 'Los Angeles, CA',
      'dallas': 'Dallas, TX',
      'chicago': 'Chicago, IL',
      'atlanta': 'Atlanta, GA',
      'miami': 'Miami, FL',
      'ashburn': 'Ashburn, VA',
      'newyork': 'New York City, NY',
      'london': 'London, UK',
      'amsterdam': 'Amsterdam, NL',
      'paris': 'Paris, FR',
      'frankfurt': 'Frankfurt, DE',
      'warsaw': 'Warsaw, PL',
      'mumbai': 'Mumbai, IN',
      'tokyo': 'Tokyo, JP',
      'singapore': 'Singapore',
      'sydney': 'Sydney, AU'
    };
    return regionNames[regionCode] || regionCode;
  }

  async function measureRegionPings() {
    pingStatus.textContent = 'Measuring ping to regions...';
    pingStatus.style.color = '#888';

    // Request ping measurements from background script
    chrome.runtime.sendMessage({action: 'measurePings'}, function(response) {
      if (response && response.pings) {
        regionPings = response.pings;
        updateRegionOptionsWithPing();
        pingStatus.textContent = 'Ping measurements complete';
        pingStatus.style.color = '#90ee90';
        
        setTimeout(() => {
          pingStatus.style.display = 'none';
        }, 2000);
      } else {
        pingStatus.textContent = 'Could not measure ping';
        pingStatus.style.color = '#ff6b6b';
      }
    });
  }

  function updateRegionOptionsWithPing() {
    const options = regionSelect.querySelectorAll('option');
    
    options.forEach(option => {
      const regionCode = option.value;
      if (regionCode === 'auto') return;
      
      const ping = regionPings[regionCode];
      if (ping !== undefined && ping !== null) {
        const originalText = getRegionName(regionCode);
        const pingColor = getPingColor(ping);
        option.textContent = `${originalText} - ${ping}ms`;
        option.style.color = pingColor;
      }
    });
  }

  function getPingColor(ping) {
    if (ping < 100) {
      return '#90ee90'; // Green
    } else if (ping >= 100 && ping < 200) {
      return '#ffcc90'; // Yellow/Orange
    } else {
      return '#ff9090'; // Light Red
    }
  }
});