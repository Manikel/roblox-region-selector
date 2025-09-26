// popup.js - Handles the extension popup interface

document.addEventListener('DOMContentLoaded', function() {
  const regionSelect = document.getElementById('regionSelect');
  const saveBtn = document.getElementById('saveBtn');
  const resetBtn = document.getElementById('resetBtn');
  const status = document.getElementById('status');

  // Load saved region preference
  loadSavedRegion();

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

  function loadSavedRegion() {
    chrome.storage.local.get(['preferredRegion'], function(result) {
      if (result.preferredRegion) {
        regionSelect.value = result.preferredRegion;
        updateStatus(`Current: ${getRegionName(result.preferredRegion)}`, 'active');
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
      'us-east': 'US East',
      'us-west': 'US West', 
      'us-central': 'US Central',
      'eu-west': 'Europe West',
      'eu-central': 'Europe Central',
      'asia-pacific': 'Asia Pacific',
      'asia-east': 'Asia East'
    };
    return regionNames[regionCode] || regionCode;
  }
});
