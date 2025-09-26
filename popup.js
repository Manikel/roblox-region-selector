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
});