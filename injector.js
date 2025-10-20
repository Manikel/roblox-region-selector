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
        // Target ONLY the main play button on game detail pages
        // Look for the button that contains "Play" or has specific Roblox play button classes
        const playButtons = document.querySelectorAll('button[class*="PlayButton"], button[class*="play-button"]');
        
        playButtons.forEach(button => {
            // Additional check: button should contain "Play" text or have play icon
            const buttonText = button.textContent.trim().toLowerCase();
            const hasPlayText = buttonText === 'play' || buttonText.includes('play');
            
            // Skip if this doesn't look like the main play button
            if (!hasPlayText && !button.querySelector('[class*="play-icon"], [class*="PlayIcon"]')) {
                return;
            }
            
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
                            
                            console.log('[Roblox Region Selector] Play button clicked, intercepting...');
                            
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
    
    // More specific observer to reduce false positives
    function setupPlayButtonObserver() {
        // Run interceptor immediately
        interceptPlayButton();
        
        // Watch for new buttons being added to specific containers
        const observer = new MutationObserver((mutations) => {
            // Only check if mutations include button elements or their containers
            let shouldCheck = false;
            for (const mutation of mutations) {
                if (mutation.addedNodes.length > 0) {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === 1) { // Element node
                            if (node.tagName === 'BUTTON' || node.querySelector('button')) {
                                shouldCheck = true;
                                break;
                            }
                        }
                    }
                }
                if (shouldCheck) break;
            }
            
            if (shouldCheck) {
                interceptPlayButton();
            }
        });
        
        // Only observe the main game container, not the entire body
        const gameContainer = document.querySelector('#game-detail-page, [class*="game-detail"], main');
        if (gameContainer) {
            observer.observe(gameContainer, {
                childList: true,
                subtree: true
            });
        } else {
            // Fallback to body if specific container not found
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        }
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