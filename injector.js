// injector.js - Runs in page context to access Roblox's internal functions

(function() {
    'use strict';
    
    console.log('[Roblox Region Selector] Injector script loaded in page context');
    
    let shouldInterceptPlay = false;
    let currentRegion = 'auto';
    
    // Listen for region preference updates
    window.addEventListener('message', function(event) {
        if (event.origin !== window.location.origin) return;
        
        if (event.data && event.data.type === 'UPDATE_REGION_PREFERENCE') {
            currentRegion = event.data.region;
            shouldInterceptPlay = currentRegion && currentRegion !== 'auto';
            console.log('[Roblox Region Selector] Region preference updated:', currentRegion, 'Intercept:', shouldInterceptPlay);
        }
    });
    
    // Intercept Play button clicks
    function interceptPlayButton() {
        // Find all play buttons and add click listeners
        const playButtons = document.querySelectorAll('[class*="play"], [class*="Play"], button[class*="btn-"]');
        
        playButtons.forEach(button => {
            if (!button.dataset.regionSelectorAttached) {
                button.dataset.regionSelectorAttached = 'true';
                
                button.addEventListener('click', function(e) {
                    // Only intercept if a region is selected (not auto)
                    if (shouldInterceptPlay) {
                        // STOP the event from reaching Roblox
                        e.preventDefault();
                        e.stopPropagation();
                        e.stopImmediatePropagation();
                        
                        // Get place ID from URL
                        const urlMatch = window.location.pathname.match(/\/games\/(\d+)/);
                        if (urlMatch && urlMatch[1]) {
                            const placeId = urlMatch[1];
                            
                            // Send message to content script
                            window.postMessage({
                                type: 'PLAY_BUTTON_CLICKED',
                                placeId: placeId
                            }, window.location.origin);
                        }
                        
                        return false;
                    }
                    // If auto mode, let Roblox handle it normally
                }, true); // Use capture phase to intercept before Roblox
            }
        });
    }
    
    // Run interceptor immediately and on DOM changes
    interceptPlayButton();
    
    // Watch for new buttons being added to the page
    const observer = new MutationObserver((mutations) => {
        interceptPlayButton();
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    // Listen for messages from content script to join specific servers
    window.addEventListener('message', function(event) {
        // Only accept messages from same origin
        if (event.origin !== window.location.origin) {
            return;
        }
        
        if (event.data && event.data.type === 'JOIN_SPECIFIC_SERVER') {
            const { placeId, serverId } = event.data;
            
            console.log('[Roblox Region Selector] Joining server:', serverId);
            
            try {
                // Use Roblox's internal GameLauncher function
                if (window.Roblox && window.Roblox.GameLauncher && window.Roblox.GameLauncher.joinGameInstance) {
                    window.Roblox.GameLauncher.joinGameInstance(parseInt(placeId), serverId);
                    console.log('[Roblox Region Selector] Successfully initiated server join');
                } else {
                    console.error('[Roblox Region Selector] Roblox.GameLauncher.joinGameInstance not available');
                    
                    // Fallback: try to construct the join URL
                    const joinUrl = `roblox://placeId=${placeId}&gameInstanceId=${serverId}`;
                    window.location.href = joinUrl;
                }
            } catch (error) {
                console.error('[Roblox Region Selector] Error joining server:', error);
            }
        }
    });
    
    // Notify content script that injector is ready
    window.postMessage({
        type: 'INJECTOR_READY',
        source: 'roblox-region-selector'
    }, window.location.origin);
    
})();