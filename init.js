// Application initialization for MountainCircles Map
import { initializeMap } from "./mapInitializer.js";
import { addGeoJSONLayers, updateParametersBox, switchConfig, toggleAirspaceVisibility, updateSidebarConfigButtonStyles } from "./sidebar.js";
import { setupLayerEventHandlers } from "./layers.js";
import { initializeAirspaceData, setupAirspacePopupHandler } from "./map.js";
import { setupDockEventListeners } from "./dock.js";
import { updatePopupStyle } from "./airspace.js";
import { 
    getCurrentConfig,
    loadStateFromLocalStorage,
    saveStateToLocalStorage,
    getAirspaceVisible,
    getLayersToggleState
} from "./state.js";
import { setupIGCEventListeners } from "./igc.js";
import { setupInstallEventListeners } from "./install.js";
import { setupMenuEventListeners } from "./menu.js";
import { getLayerManager } from "./state.js";
import { isMobileDevice } from "./utils.js";
import { initializeTracking } from "./tracking.js";

/**
 * Initializes the application
 * @param {string} mapContainerId - The ID of the map container element
 * @returns {Promise<void>}
 */
export async function initializeApp(mapContainerId = 'map') {
    // Determine if running on mobile device ONCE at startup
    window.APP_CONFIG = {
        isMobile: isMobileDevice()
    };
    
    // Try to load saved state from Cache API
    const stateLoaded = await loadStateFromLocalStorage();
    
    // Store the loaded config value to apply later after map initialization
    const savedConfig = getCurrentConfig();
    
    // Safety check: Make sure savedConfig is valid
    if (!savedConfig || !savedConfig.includes('/')) {
        console.error(`Invalid config detected: "${savedConfig}". This could be dangerous for aviation safety.`);
        alert('WARNING: Invalid configuration detected. The application may not display correct aviation data. Please reload or reset your settings.');
    }
    
    // Initialize the parameters box with the current configuration
    try {
        updateParametersBox(savedConfig.split('/')[1]);
    } catch (error) {
        console.error('Error updating parameters box:', error);
    }
    
    // Set up window event listeners for popup style
    window.addEventListener('resize', updatePopupStyle);
    window.addEventListener('orientationchange', updatePopupStyle);
    
    // Set up install event listeners
    setupInstallEventListeners();
    
    // Set up menu event listeners
    setupMenuEventListeners();
    
    // Update sidebar config button styles to show which configs are cached
    // This needs to be done after the sidebar is created, so we'll do it after map initialization
    
    // Save state when user leaves the page or closes the tab
    window.addEventListener('beforeunload', () => {
        // Need to use a synchronous approach here since beforeunload doesn't wait for promises
        // We'll use a special sync function for this case
        saveStateToLocalStorage().catch(err => console.error('Error saving state:', err));
    });
    
    // Initialize the map and set up event handlers
    await initializeMap(mapContainerId, async (mapInstance) => {
        try {
            // If we have a saved config, apply it
            if (stateLoaded && savedConfig) {
                switchConfig(savedConfig);
            } else {
                // Otherwise do the normal initialization
                addGeoJSONLayers();
            }
            
            // Set up layer event handlers
            setupLayerEventHandlers();
            
            // Initialize airspace data
            await initializeAirspaceData();
            
            // Set up airspace popup handler
            setupAirspacePopupHandler(mapInstance);
            
            // Set up dock event listeners
            setupDockEventListeners();
            
            // Set up IGC event listeners
            setupIGCEventListeners();

            // Initialize the tracklog recording functionality
            initializeTracking();
            
            // After all initialization is done, ensure visibility states match saved state
            mapInstance.once('idle', async () => {
                // Apply the saved linestring layer toggle state
                if (stateLoaded) {
                    // Apply linestring layers visibility based on toggle state
                    const linestringsToggleState = getLayersToggleState();
                    
                    // Set visibility of main linestring layers according to toggle state
                    getLayerManager().setVisibility('linestrings-layer', linestringsToggleState);
                    getLayerManager().setVisibility('linestrings-labels', linestringsToggleState);
                    
                    // Hide any dynamic layers if toggle is off
                    if (!linestringsToggleState) {
                        const style = mapInstance.getStyle();
                        if (style && style.layers) {
                            style.layers.forEach(layer => {
                                if (layer.id.startsWith('dynamic-lines-')) {
                                    getLayerManager().setVisibility(layer.id, false);
                                }
                            });
                        }
                    }
                    
                    // Apply the saved airspace visibility state
                    const airspaceVisible = getAirspaceVisible();
                    
                    // The toggle in the sidebar might not be created yet, so we directly set layer visibility
                    getLayerManager().setVisibility('airspace-fill', airspaceVisible);
                    getLayerManager().setVisibility('airspace-outline', airspaceVisible);
                    
                    // Update any checkbox states once the sidebar is ready
                    const airspaceCheckboxes = document.querySelectorAll('#airspace-sidebar input[type="checkbox"][id^="toggle-"]');
                    airspaceCheckboxes.forEach(cb => {
                        cb.disabled = !airspaceVisible;
                    });
                }
                
                // Update the config button styles to show which configs are cached
                await updateSidebarConfigButtonStyles();
            });
        } catch (error) {
            console.error('Error during map initialization:', error);
            alert('There was an error initializing the map: ' + error.message);
        }
    });
} 