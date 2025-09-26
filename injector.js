// injector.js - Runs in page context to access Roblox's internal functions

(function() {
    'use strict';
    
    console.log('[Roblox Region Selector] Injector script loaded in page context');
    
    // Listen for messages from content script
    window.addEventListener('message', function(event) {
        // Only accept messages from same origin
        if (event.origin !== window.location.origin) {
            return;
        }
        
        if (event.data && event.data.type === 'JOIN_SPECIFIC_SERVER') {
            const { placeId, serverId } = event.data;
            
            console.log('[Roblox Region Selector] Attempting to join server:', serverId);
            
            try {
                // Use Roblox's internal GameLauncher function
                if (window.Roblox && window.Roblox.GameLauncher && window.Roblox.GameLauncher.joinGameInstance) {
                    window.Roblox.GameLauncher.joinGameInstance(placeId, serverId);
                    console.log('[Roblox Region Selector] Successfully initiated server join');
                } else {
                    console.error('[Roblox Region Selector] Roblox.GameLauncher.joinGameInstance not available');
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
