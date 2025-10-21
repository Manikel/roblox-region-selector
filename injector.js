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
    
    // Intercept ONLY the Play button on game pages
    function interceptPlayButton() {
        // Target the specific play button using multiple selectors
        const selectors = [
            'button[data-testid="play-button"]',
            '#game-details-play-button-container button',
            'button.btn-common-play-game-lg',
            'button[class*="btn-primary-md"][class*="play"]'
        ];
        
        let playButtons = [];
        for (const selector of selectors) {
            try {
                const buttons = document.querySelectorAll(selector);
                buttons.forEach(btn => {
                    if (btn && !playButtons.includes(btn)) {
                        playButtons.push(btn);
                    }
                });
            } catch (e) {
                console.error('[Roblox Region Selector] Error with selector:', selector, e);
            }
        }
        
        console.log('[Roblox Region Selector] Found', playButtons.length, 'play buttons');
        
        playButtons.forEach(button => {
            if (!button || button.dataset.regionSelectorAttached) return;
            
            try {
                button.dataset.regionSelectorAttached = 'true';
                console.log('[Roblox Region Selector] Attached listener to play button');
                
                button.addEventListener('click', function(e) {
                    console.log('[Roblox Region Selector] Play button clicked! shouldInterceptPlay:', shouldInterceptPlay);
                    
                    // Only intercept if a region is selected (not auto)
                    if (shouldInterceptPlay) {
                        // STOP the event from reaching Roblox
                        e.preventDefault();
                        e.stopPropagation();
                        e.stopImmediatePropagation();
                        
                        console.log('[Roblox Region Selector] Intercepted play button click');
                        
                        // Get place ID from URL
                        const urlMatch = window.location.pathname.match(/\/games\/(\d+)/);
                        if (urlMatch && urlMatch[1]) {
                            const placeId = urlMatch[1];
                            
                            console.log('[Roblox Region Selector] Sending play button message for place:', placeId);
                            
                            // Send message to content script
                            window.postMessage({
                                type: 'PLAY_BUTTON_CLICKED',
                                placeId: placeId
                            }, window.location.origin);
                        } else {
                            console.error('[Roblox Region Selector] Could not extract place ID from URL');
                        }
                        
                        return false;
                    } else {
                        console.log('[Roblox Region Selector] Auto mode, allowing normal join');
                    }
                    // If auto mode, let Roblox handle it normally
                }, true); // Use capture phase to intercept before Roblox
            } catch (e) {
                console.error('[Roblox Region Selector] Error attaching listener:', e);
            }
        });
    }
    
    // Setup observer with retry mechanism
    function setupPlayButtonObserver() {
        console.log('[Roblox Region Selector] Setting up play button observer');
        
        // Run interceptor immediately
        interceptPlayButton();
        
        // Keep trying to find and attach to the button every 500ms for the first 10 seconds
        let attempts = 0;
        const maxAttempts = 20;
        const retryInterval = setInterval(() => {
            attempts++;
            interceptPlayButton();
            
            if (attempts >= maxAttempts) {
                clearInterval(retryInterval);
                console.log('[Roblox Region Selector] Stopped retry attempts');
            }
        }, 500);
        
        // Watch for new buttons being added
        const observer = new MutationObserver((mutations) => {
            interceptPlayButton();
        });
        
        // Observe the entire document for changes
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    
    // Wait for page to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupPlayButtonObserver);
    } else {
        setupPlayButtonObserver();
    }
    
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