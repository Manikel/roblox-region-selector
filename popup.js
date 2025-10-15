<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      width: 320px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #1a1a1a;
      color: #e0e0e0;
      overflow: hidden;
    }
    
    .header {
      background: #2d2d2d;
      padding: 16px;
      border-bottom: 1px solid #3a3a3a;
      position: relative;
    }
    
    .header-logo {
      position: absolute;
      top: 16px;
      right: 16px;
      width: 40px;
      height: 40px;
      object-fit: contain;
    }
    
    h1 {
      font-size: 16px;
      font-weight: 600;
      color: #ffffff;
      margin-bottom: 4px;
      padding-right: 50px;
    }
    
    .subtitle {
      font-size: 12px;
      color: #a0a0a0;
      font-weight: 400;
    }
    
    .content {
      padding: 16px;
    }
    
    .form-group {
      margin-bottom: 16px;
    }
    
    label {
      display: block;
      margin-bottom: 6px;
      font-size: 13px;
      font-weight: 500;
      color: #b0b0b0;
    }
    
    /* Custom Select Styles */
    .custom-select {
      position: relative;
      width: 100%;
    }
    
    .select-header {
      width: 100%;
      padding: 10px 12px;
      background: #2d2d2d;
      border: 1px solid #404040;
      border-radius: 6px;
      color: #e0e0e0;
      font-size: 13px;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }
    
    .select-header:hover:not(.disabled) {
      border-color: #505050;
    }
    
    .select-header.disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .select-header.open {
      border-color: #0078d4;
      box-shadow: 0 0 0 2px rgba(0, 120, 212, 0.2);
      border-bottom-left-radius: 0;
      border-bottom-right-radius: 0;
    }
    
    .select-arrow {
      margin-left: 8px;
      transition: transform 0.2s;
    }
    
    .select-arrow.open {
      transform: rotate(180deg);
    }
    
    .select-dropdown {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: #2d2d2d;
      border: 1px solid #0078d4;
      border-top: none;
      border-radius: 0 0 6px 6px;
      max-height: 250px;
      overflow-y: auto;
      z-index: 1000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    }
    
    .select-group-label {
      padding: 8px 12px;
      font-size: 11px;
      font-weight: 600;
      color: #b0b0b0;
      background: #252525;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .select-option {
      padding: 10px 12px;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
      transition: background 0.15s;
      font-size: 13px;
    }
    
    .select-option:hover {
      background: #383838;
    }
    
    .select-option.selected {
      background: #1a3d5a;
    }
    
    .option-city {
      color: #e0e0e0;
    }
    
    .option-ping {
      font-weight: 500;
      margin-left: auto;
      padding-left: 8px;
    }
    
    .ping-green { color: #90ee90; }
    .ping-yellow { color: #ffcc90; }
    .ping-red { color: #ff9090; }
    
    .ping-measuring {
      font-size: 11px;
      color: #888;
      margin-top: 4px;
    }
    
    .status {
      background: #2a2a2a;
      border: 1px solid #404040;
      border-radius: 6px;
      padding: 10px 12px;
      font-size: 12px;
      color: #b0b0b0;
      margin-bottom: 16px;
      text-align: center;
    }
    
    .status.active {
      background: #1a3d1a;
      border-color: #2d5a2d;
      color: #90ee90;
    }
    
    .status.warning {
      background: #3d2a1a;
      border-color: #5a3d2d;
      color: #ffcc90;
    }
    
    .buttons {
      display: flex;
      gap: 8px;
    }
    
    button {
      flex: 1;
      padding: 10px 16px;
      border: 1px solid #404040;
      border-radius: 6px;
      background: #2d2d2d;
      color: #e0e0e0;
      cursor: pointer;
      font-size: 12px;
      font-weight: 500;
      transition: all 0.2s ease;
      outline: none;
    }
    
    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    button:hover:not(:disabled) {
      background: #383838;
      border-color: #505050;
    }
    
    button:active:not(:disabled) {
      transform: translateY(1px);
    }
    
    button.primary {
      background: #0078d4;
      border-color: #106ebe;
      color: #ffffff;
    }
    
    button.primary:hover:not(:disabled) {
      background: #106ebe;
      border-color: #005a9e;
    }
    
    button.primary:focus:not(:disabled) {
      box-shadow: 0 0 0 2px rgba(0, 120, 212, 0.3);
    }
  </style>
</head>
<body>
  <div class="header">
    <img src="icons/icon128.png" alt="RSP Logo" class="header-logo">
    <h1>Roblox Region Selector</h1>
    <p class="subtitle">Choose your preferred server region</p>
  </div>
  
  <div class="content">
    <div class="form-group">
      <label for="regionSelect">Server Region</label>
      <div class="custom-select" id="customSelect">
        <div class="select-header disabled" id="selectHeader">
          <span id="selectedText">Auto (Default)</span>
          <span class="select-arrow">▼</span>
        </div>
        <div class="select-dropdown" id="selectDropdown" style="display: none;">
          <div class="select-option" data-value="auto">
            <span class="option-city">Auto (Default)</span>
          </div>
          <div class="select-group-label">United States</div>
          <div class="select-option" data-value="seattle">
            <span class="option-city">Seattle, WA</span>
            <span class="option-ping" data-region="seattle"></span>
          </div>
          <div class="select-option" data-value="losangeles">
            <span class="option-city">Los Angeles, CA</span>
            <span class="option-ping" data-region="losangeles"></span>
          </div>
          <div class="select-option" data-value="dallas">
            <span class="option-city">Dallas, TX</span>
            <span class="option-ping" data-region="dallas"></span>
          </div>
          <div class="select-option" data-value="chicago">
            <span class="option-city">Chicago, IL</span>
            <span class="option-ping" data-region="chicago"></span>
          </div>
          <div class="select-option" data-value="atlanta">
            <span class="option-city">Atlanta, GA</span>
            <span class="option-ping" data-region="atlanta"></span>
          </div>
          <div class="select-option" data-value="miami">
            <span class="option-city">Miami, FL</span>
            <span class="option-ping" data-region="miami"></span>
          </div>
          <div class="select-option" data-value="ashburn">
            <span class="option-city">Ashburn, VA</span>
            <span class="option-ping" data-region="ashburn"></span>
          </div>
          <div class="select-option" data-value="newyork">
            <span class="option-city">New York City, NY</span>
            <span class="option-ping" data-region="newyork"></span>
          </div>
          <div class="select-group-label">Europe</div>
          <div class="select-option" data-value="london">
            <span class="option-city">London, UK</span>
            <span class="option-ping" data-region="london"></span>
          </div>
          <div class="select-option" data-value="amsterdam">
            <span class="option-city">Amsterdam, NL</span>
            <span class="option-ping" data-region="amsterdam"></span>
          </div>
          <div class="select-option" data-value="paris">
            <span class="option-city">Paris, FR</span>
            <span class="option-ping" data-region="paris"></span>
          </div>
          <div class="select-option" data-value="frankfurt">
            <span class="option-city">Frankfurt, DE</span>
            <span class="option-ping" data-region="frankfurt"></span>
          </div>
          <div class="select-option" data-value="warsaw">
            <span class="option-city">Warsaw, PL</span>
            <span class="option-ping" data-region="warsaw"></span>
          </div>
          <div class="select-group-label">Asia Pacific</div>
          <div class="select-option" data-value="mumbai">
            <span class="option-city">Mumbai, IN</span>
            <span class="option-ping" data-region="mumbai"></span>
          </div>
          <div class="select-option" data-value="tokyo">
            <span class="option-city">Tokyo, JP</span>
            <span class="option-ping" data-region="tokyo"></span>
          </div>
          <div class="select-option" data-value="singapore">
            <span class="option-city">Singapore</span>
            <span class="option-ping" data-region="singapore"></span>
          </div>
          <div class="select-option" data-value="sydney">
            <span class="option-city">Sydney, AU</span>
            <span class="option-ping" data-region="sydney"></span>
          </div>
        </div>
      </div>
      <div class="ping-measuring" id="pingStatus"></div>
    </div>
    
    <div class="status" id="status">
      Checking for Roblox tab...
    </div>
    
    <div class="buttons">
      <button id="saveBtn" class="primary" disabled>Apply</button>
      <button id="resetBtn" disabled>Reset</button>
    </div>
  </div>
  
  <script src="popup.js"></script>
  <script>
    // Custom select functionality
    const selectHeader = document.getElementById('selectHeader');
    const selectDropdown = document.getElementById('selectDropdown');
    const selectArrow = document.querySelector('.select-arrow');
    const selectedText = document.getElementById('selectedText');
    const options = document.querySelectorAll('.select-option');
    
    let currentValue = 'auto';
    let isDropdownOpen = false;
    
    selectHeader.addEventListener('click', function() {
      if (this.classList.contains('disabled')) return;
      
      isDropdownOpen = !isDropdownOpen;
      selectDropdown.style.display = isDropdownOpen ? 'block' : 'none';
      selectHeader.classList.toggle('open', isDropdownOpen);
      selectArrow.classList.toggle('open', isDropdownOpen);
    });
    
    options.forEach(option => {
      option.addEventListener('click', function() {
        currentValue = this.dataset.value;
        const cityText = this.querySelector('.option-city').textContent;
        selectedText.textContent = cityText;
        
        options.forEach(opt => opt.classList.remove('selected'));
        this.classList.add('selected');
        
        selectDropdown.style.display = 'none';
        isDropdownOpen = false;
        selectHeader.classList.remove('open');
        selectArrow.classList.remove('open');
        
        // Trigger change event
        const event = new CustomEvent('regionchange', { detail: { value: currentValue } });
        document.getElementById('customSelect').dispatchEvent(event);
      });
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
      if (!document.getElementById('customSelect').contains(e.target)) {
        selectDropdown.style.display = 'none';
        isDropdownOpen = false;
        selectHeader.classList.remove('open');
        selectArrow.classList.remove('open');
      }
    });
    
    // Export functions for popup.js
    window.customSelect = {
      getValue: () => currentValue,
      setValue: (value) => {
        const option = document.querySelector(`[data-value="${value}"]`);
        if (option) {
          option.click();
        }
      },
      setEnabled: (enabled) => {
        if (enabled) {
          selectHeader.classList.remove('disabled');
        } else {
          selectHeader.classList.add('disabled');
          selectDropdown.style.display = 'none';
          isDropdownOpen = false;
          selectHeader.classList.remove('open');
          selectArrow.classList.remove('open');
        }
      },
      updatePing: (region, ping) => {
        const pingEl = document.querySelector(`[data-region="${region}"]`);
        if (pingEl) {
          pingEl.textContent = `${ping}ms`;
          pingEl.classList.remove('ping-green', 'ping-yellow', 'ping-red');
          if (ping < 100) {
            pingEl.classList.add('ping-green');
          } else if (ping < 200) {
            pingEl.classList.add('ping-yellow');
          } else {
            pingEl.classList.add('ping-red');
          }
        }
      }
    };
  </script>
</body>
</html>