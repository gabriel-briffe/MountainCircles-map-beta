/**
 * Tracklog functionality for MountainCircles Map
 * Records user path with 1-second interval and displays it color-coded by vertical speed
 */

import { 
  getMap, 
  getLayerManager, 
  getTracklog,
  setTracklog, 
  getLastTracklogDate, 
  setLastTracklogDate,
  getLastRecordedTime,
  setLastRecordedTime
} from './state.js';

// Track start time
let trackingStartTime = null;

// Simulation variables
let simulationActive = false;
let simulationInterval = null;
let simulationStartCoords = [5.9167, 45.5667]; // Chambery, France
let simulationAltitude = 300; // Starting altitude in meters
let simulationSpeed = 100; // km/h
let simulationHeading = 90; // degrees (east)
let simulationLastTime = null;

// Initialize tracking module
export function initializeTracking() {
  console.log('Initializing tracklog recording...');
  
  // Setup state on first load
  setupTracklogState();
  
  // Create tracklog layer
  createTracklogLayer();
  
  // Log simulation instructions to console (developer mode)
  logSimulationInstructions();
  
  // Start automatic recording (enabled by default)
  if (!simulationActive) {
    startTracking();
  }
  
  // Set up service worker message handler
  setupServiceWorkerMessageHandler();
  
  // Set tracking start time
  trackingStartTime = Date.now();
  
  // Log map info after initialization
  setTimeout(logMapInfo, 1000);
}

// Log instructions for using simulation commands from console
function logSimulationInstructions() {
  console.log('%c===== TRACKLOG SIMULATION COMMANDS =====', 'font-weight: bold; color: #6200ee; font-size: 14px');
  console.log('%cRun these commands in console to control the tracklog simulation:', 'color: #0277bd');
  console.log('%c• startSimulation() %c- Start simulation from Chambery, heading east at 100km/h', 'color: #2e7d32; font-weight: bold', 'color: #333');
  console.log('%c• stopSimulation() %c- Stop the active simulation', 'color: #c62828; font-weight: bold', 'color: #333');
  console.log('%c• forceDebugDisplay() %c- Show debugging visuals on the map', 'color: #6a1b9a; font-weight: bold', 'color: #333');
  console.log('%c========================================', 'font-weight: bold; color: #6200ee; font-size: 14px');
  
  // Make simulation functions available globally for console access
  window.startSimulation = startSimulation;
  window.stopSimulation = stopSimulation;
  window.forceDebugDisplay = forceDebugDisplay;
}

// Add simulation controls to the map
function addSimulationControls() {
  const controlDiv = document.createElement('div');
  controlDiv.id = 'simulation-controls';
  controlDiv.style.position = 'absolute';
  controlDiv.style.bottom = '20px';
  controlDiv.style.left = '10px';
  controlDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  controlDiv.style.padding = '10px';
  controlDiv.style.borderRadius = '4px';
  controlDiv.style.zIndex = '1000';
  
  const startButton = document.createElement('button');
  startButton.textContent = 'Start Simulation';
  startButton.style.padding = '8px 12px';
  startButton.style.marginRight = '10px';
  startButton.onclick = startSimulation;
  
  const stopButton = document.createElement('button');
  stopButton.textContent = 'Stop Simulation';
  stopButton.style.padding = '8px 12px';
  stopButton.style.marginRight = '10px';
  stopButton.onclick = stopSimulation;
  
  const debugButton = document.createElement('button');
  debugButton.textContent = 'Force Debug';
  debugButton.style.padding = '8px 12px';
  debugButton.onclick = forceDebugDisplay;
  
  controlDiv.appendChild(startButton);
  controlDiv.appendChild(stopButton);
  controlDiv.appendChild(debugButton);
  
  const mapContainer = document.getElementById('map');
  if (mapContainer) {
    mapContainer.appendChild(controlDiv);
  }
}

// Log detailed map information for debugging
function logMapInfo() {
  const map = getMap();
  if (!map) {
    console.error('Map not available');
    return;
  }
  
  console.log('Map Debug Info:');
  console.log('- Map loaded:', map.loaded());
  console.log('- Map style loaded:', map.isStyleLoaded());
  
  try {
    console.log('- Map center:', map.getCenter());
    console.log('- Map zoom:', map.getZoom());
    console.log('- Map bounds:', map.getBounds());
    
    const style = map.getStyle();
    console.log('- Style sources:', Object.keys(style.sources));
    console.log('- Style layers:', style.layers.map(l => l.id));
    
    console.log('- Tracklog layer exists:', !!map.getLayer('tracklog-line'));
    console.log('- Tracklog source exists:', !!map.getSource('tracklog-source'));
    
    // Check if tracklog layer is active/visible
    const tracklogLayer = style.layers.find(l => l.id === 'tracklog-line');
    if (tracklogLayer) {
      console.log('- Tracklog layer visibility:', tracklogLayer.layout?.visibility || 'visible (default)');
    }
  } catch (error) {
    console.error('Error getting map info:', error);
  }
}

// Force display of debug elements
function forceDebugDisplay() {
  const map = getMap();
  console.log('Forcing debug display...');
  
  try {
    // Add a large red circle at the map center
    const center = map.getCenter();
    
    // Remove existing debug circle if it exists
    if (map.getLayer('debug-circle')) {
      map.removeLayer('debug-circle');
    }
    
    if (map.getSource('debug-circle-source')) {
      map.removeSource('debug-circle-source');
    }
    
    // Add a debug circle source
    map.addSource('debug-circle-source', {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [center.lng, center.lat]
        },
        properties: {}
      }
    });
    
    // Add a large circle layer
    map.addLayer({
      id: 'debug-circle',
      type: 'circle',
      source: 'debug-circle-source',
      paint: {
        'circle-radius': 50,
        'circle-color': '#FF0000',
        'circle-opacity': 0.5,
        'circle-stroke-width': 3,
        'circle-stroke-color': '#FFFFFF'
      }
    });
    
    // Try converting tracklog to points-only
    const tracklog = getTracklog();
    if (tracklog.length > 0) {
      console.log(`Converting ${tracklog.length} tracklog points to circles`);
      
      if (map.getLayer('tracklog-debug-points')) {
        map.removeLayer('tracklog-debug-points');
      }
      
      if (map.getSource('tracklog-debug-source')) {
        map.removeSource('tracklog-debug-source');
      }
      
      // Create a point for each tracklog entry
      const points = tracklog.map(point => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: point.coordinates
        },
        properties: {}
      }));
      
      // Add a source for the tracklog points
      map.addSource('tracklog-debug-source', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: points
        }
      });
      
      // Add a circle layer to display the points
      map.addLayer({
        id: 'tracklog-debug-points',
        type: 'circle',
        source: 'tracklog-debug-source',
        paint: {
          'circle-radius': 8,
          'circle-color': '#00FFFF',
          'circle-opacity': 1,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#000000'
        }
      });
    }
    
    // Log updated map info
    logMapInfo();
  } catch (error) {
    console.error('Error forcing debug display:', error);
  }
}

// Start simulation
function startSimulation() {
  if (simulationActive) return;
  
  console.log('Starting tracklog simulation from Chambery');
  simulationActive = true;
  simulationLastTime = Date.now();
  
  // Reset tracklog for clean testing
  setTracklog([]);
  trackingStartTime = Date.now();
  
  // Fly the map to the starting location
  const map = getMap();
  map.flyTo({
    center: simulationStartCoords,
    zoom: 12,
    speed: 2
  });
  
  // Track the last simulation time to ensure exactly 1-second intervals
  let nextUpdateTime = Date.now() + 1000;
  
  // Simulate position updates every second
  simulationInterval = setInterval(() => {
    // Calculate time since last update (should be ~1000ms but can vary)
    const now = Date.now();
    
    // Skip this update if it's too soon
    if (now < nextUpdateTime) {
      return;
    }
    
    const timeDeltaMs = now - (simulationLastTime || now);
    simulationLastTime = now;
    nextUpdateTime = now + 1000; // Schedule next update exactly 1 second from now
    
    // Get current position from state or use start coords if none
    const tracklog = getTracklog();
    let currentPosition;
    
    if (tracklog.length > 0) {
      const lastPoint = tracklog[tracklog.length - 1];
      currentPosition = lastPoint.coordinates;
    } else {
      currentPosition = simulationStartCoords;
    }
    
    // Calculate new position based on speed and heading
    // 100 km/h = 27.78 m/s, so we move that distance in the heading direction
    const metersPerSecond = simulationSpeed * 1000 / 3600;
    const distanceMoved = metersPerSecond * (timeDeltaMs / 1000);
    
    // Convert distance to degrees (approximate, works for small distances)
    // 1 degree of longitude at equator is ~111km, adjust for latitude
    const latFactor = Math.cos(currentPosition[1] * Math.PI / 180);
    const lngChange = (distanceMoved / (111320 * latFactor)) * Math.sin(simulationHeading * Math.PI / 180);
    const latChange = (distanceMoved / 111320) * Math.cos(simulationHeading * Math.PI / 180);
    
    // Calculate new position
    const newLng = currentPosition[0] + lngChange;
    const newLat = currentPosition[1] + latChange;
    
    // Generate random altitude change between -10 and +10 meters
    const altitudeChange = (Math.random() * 20) - 10;
    simulationAltitude += altitudeChange;
    
    // Create simulated position object
    const simulatedPosition = {
      coords: {
        longitude: newLng,
        latitude: newLat,
        altitude: simulationAltitude,
        accuracy: 10,
        altitudeAccuracy: 5,
        heading: simulationHeading,
        speed: metersPerSecond
      },
      timestamp: now
    };
    
    // Process the simulated position
    handlePositionUpdate(simulatedPosition);
    
    // Move the map to follow the simulation
    map.panTo([newLng, newLat], { animate: true, duration: 1000 });
    
  }, 100); // Run more frequently but only update at 1-second intervals
}

// Stop simulation
function stopSimulation() {
  if (!simulationActive) return;
  
  console.log('Stopping tracklog simulation');
  simulationActive = false;
  
  if (simulationInterval) {
    clearInterval(simulationInterval);
    simulationInterval = null;
  }
}

// Setup initial tracklog state
function setupTracklogState() {
  // Set today's date for tracking
  setLastTracklogDate(new Date().toDateString());
  
  // Initialize empty tracklog if needed
  if (!getTracklog()) {
    setTracklog([]);
  }
}

// Create the tracklog layer on the map
function createTracklogLayer() {
  console.log('Creating tracklog layer...');
  const layerManager = getLayerManager();
  const map = getMap();
  
  try {
    // Remove any existing layer/source with the same name
    if (map.getLayer('tracklog-line')) {
      console.log('Removing existing tracklog layer');
      map.removeLayer('tracklog-line');
    }
    
    if (map.getSource('tracklog-source')) {
      console.log('Removing existing tracklog source');
      map.removeSource('tracklog-source');
    }
    
    // Add a new source directly to the map
    console.log('Adding tracklog source directly to map');
    map.addSource('tracklog-source', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: []
      }
    });
    
    // Add a new layer directly to the map 
    console.log('Adding tracklog layer directly to map');
    map.addLayer({
      id: 'tracklog-line',
      type: 'line',
      source: 'tracklog-source',
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
        'visibility': 'visible'
      },
      paint: {
        'line-width': 10,         // Extra thick for debugging
        'line-opacity': 1.0,
        'line-color': '#FF0000'    // Start with solid red for debugging
      }
    });
    
    console.log('Successfully added tracklog layer and source');
    
    // Also add a single-feature line layer that connects all points in one stroke
    // This is a simpler approach that might be more reliable
    setTimeout(createSingleLineFeature, 1000);
  } catch (error) {
    console.error('Error creating tracklog layer:', error);
  }
}

// Create a single line feature that connects all points in one stroke
function createSingleLineFeature() {
  const map = getMap();
  const tracklog = getTracklog();
  
  if (!map || tracklog.length < 2) return;
  
  console.log('Creating single line feature from all tracklog points');
  
  try {
    // Remove existing layer/source if they exist
    if (map.getLayer('tracklog-full-line')) {
      map.removeLayer('tracklog-full-line');
    }
    
    if (map.getSource('tracklog-full-source')) {
      map.removeSource('tracklog-full-source');
    }
    
    // Collect all valid coordinates into a single LineString
    const coordinates = tracklog
      .filter(point => point.coordinates && point.coordinates.length === 2)
      .map(point => point.coordinates);
    
    if (coordinates.length < 2) {
      console.warn('Not enough valid coordinates for a line');
      return;
    }
    
    // Calculate vertical speeds for each point
    const features = [];
    for (let i = 1; i < tracklog.length; i++) {
      const startPoint = tracklog[i-1];
      const endPoint = tracklog[i];
      
      // Skip invalid coordinates
      if (!startPoint.coordinates || !endPoint.coordinates) {
        continue;
      }
      
      // Calculate vertical speed in m/s
      const timeDiff = (endPoint.timestamp - startPoint.timestamp) / 1000; // seconds
      if (timeDiff < 0.1) continue; // Skip invalid time differences
      
      const altDiff = (endPoint.altitude || 0) - (startPoint.altitude || 0); // meters
      const verticalSpeed = altDiff / timeDiff; // m/s
      
      // Create a feature for this segment with vertical speed property
      features.push({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [startPoint.coordinates, endPoint.coordinates]
        },
        properties: {
          verticalSpeed: verticalSpeed
        }
      });
    }
    
    // Create a source with the features
    map.addSource('tracklog-full-source', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: features
      }
    });
    
    // Add a layer with vertical speed gradient
    map.addLayer({
      id: 'tracklog-full-line',
      type: 'line',
      source: 'tracklog-full-source',
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
        'visibility': 'visible'
      },
      paint: {
        'line-width': 8,
        'line-opacity': 1.0,
        'line-color': [
          'interpolate',
          ['linear'],
          ['get', 'verticalSpeed'],
          ...generateVerticalSpeedGradient()
        ]
      }
    });
    
    console.log('Single line feature created with gradient coloring');
  } catch (error) {
    console.error('Error creating single line feature:', error);
  }
}

// Start the tracking process
function startTracking() {
  // Set up geolocation watcher with high accuracy
  navigator.geolocation.watchPosition(
    handlePositionUpdate,
    handlePositionError,
    { 
      enableHighAccuracy: true,
      maximumAge: 0
    }
  );
  
  // Register with service worker for background tracking if available
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    navigator.serviceWorker.ready.then(registration => {
      // Register for background sync
      registration.sync.register('tracklog-sync');
    });
  }
}

// Set up handler for messages from service worker
function setupServiceWorkerMessageHandler() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', event => {
      // Handle position updates from service worker
      if (event.data && event.data.type === 'tracklog-position') {
        console.log('Received position from service worker:', event.data.position);
        handlePositionUpdate(event.data.position);
      }
    });
    
    // Periodically store tracklog data in service worker cache
    setInterval(() => {
      storeTracklogInServiceWorker();
    }, 5 * 60 * 1000); // Every 5 minutes
  }
}

// Store tracklog data in service worker for persistence
function storeTracklogInServiceWorker() {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    const tracklog = getTracklog();
    const date = getLastTracklogDate();
    
    // Only store if we have data and a registered service worker
    if (tracklog && tracklog.length > 0 && date) {
      navigator.serviceWorker.controller.postMessage({
        type: 'store-tracklog',
        tracklog: tracklog,
        date: date
      });
    }
  }
}

// Handle new position data
function handlePositionUpdate(position) {
  // Check if we need to reset tracklog (new day)
  checkAndResetDaily();
  
  // Record track point (throttled to 1s)
  // Only update display if a new point was actually recorded
  recordTrackPoint(position);
  
  // We no longer call updateTracklogDisplay() here - it's called directly in recordTrackPoint() when needed
}

// Process and record each track point
function recordTrackPoint(position) {
  const now = Date.now();
  // Enforce 1 second interval between records
  if (!getLastRecordedTime() || now - getLastRecordedTime() >= 1000) {
    // Make sure we have valid coordinates
    if (!position.coords || typeof position.coords.longitude !== 'number' || typeof position.coords.latitude !== 'number') {
      console.warn('Invalid position received:', position);
      return;
    }
    
    // Create the point with coordinates
    const lng = position.coords.longitude;
    const lat = position.coords.latitude;
    
    // Safety check for out-of-bounds coordinates
    if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
      console.warn('Invalid coordinates received:', lng, lat);
      return;
    }
    
    const point = {
      coordinates: [lng, lat],
      altitude: position.coords.altitude || 0,
      timestamp: now
    };
    
    // Log the point for debugging
    console.log(`Recording point: [${point.coordinates[0].toFixed(5)}, ${point.coordinates[1].toFixed(5)}], alt: ${point.altitude}`);
    
    // Add to tracklog
    const newTracklog = [...getTracklog(), point];
    setTracklog(newTracklog);
    setLastRecordedTime(now);
    
    // Update the display immediately after recording a new point
    updateTracklogDisplay();
    
    return true; // Return true if we recorded a point
  }
  return false; // Return false if we did not record a point (throttled)
}

// Check and reset tracklog for a new day
function checkAndResetDaily() {
  const today = new Date().toDateString();
  const lastDate = getLastTracklogDate();
  
  if (lastDate && today !== lastDate) {
    console.log('New day detected, resetting tracklog');
    setTracklog([]);
  }
  
  setLastTracklogDate(today);
}

// Update the map with current tracklog data
function updateTracklogDisplay() {
  const tracklog = getTracklog();
  if (tracklog.length < 2) {
    return;
  }
  
  console.log(`Updating tracklog display with ${tracklog.length} points`);
  
  // Create individual line segments
  const features = [];
  
  for (let i = 1; i < tracklog.length; i++) {
    const startPoint = tracklog[i-1];
    const endPoint = tracklog[i];
    
    // Skip invalid coordinates
    if (!startPoint.coordinates || !endPoint.coordinates) {
      console.warn(`Skipping segment ${i}: Invalid coordinates`);
      continue;
    }
    
    // Skip zero-length segments
    const isSamePoint = 
      startPoint.coordinates[0] === endPoint.coordinates[0] && 
      startPoint.coordinates[1] === endPoint.coordinates[1];
    
    if (isSamePoint) {
      console.warn(`Skipping segment ${i}: Same start and end point`);
      continue;
    }
    
    // Calculate vertical speed in m/s
    const timeDiff = (endPoint.timestamp - startPoint.timestamp) / 1000; // seconds
    if (timeDiff < 0.1) {
      console.warn(`Skipping segment ${i}: Time difference too small (${timeDiff}s)`);
      continue;
    }
    
    const altDiff = (endPoint.altitude || 0) - (startPoint.altitude || 0); // meters
    const verticalSpeed = altDiff / timeDiff; // m/s
    
    // Create a line segment with vertical speed property
    features.push({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [startPoint.coordinates, endPoint.coordinates]
      },
      properties: {
        segmentIndex: i,
        verticalSpeed: verticalSpeed
      }
    });
  }
  
  if (features.length === 0) {
    console.warn('No valid features to display');
    return;
  }
  
  // Get the map directly
  const map = getMap();
  
  if (!map) {
    console.error('Map not available');
    return;
  }
  
  console.log(`Updating source with ${features.length} line segments`);
  
  try {
    // Update the source directly
    const source = map.getSource('tracklog-source');
    if (source) {
      source.setData({
        type: 'FeatureCollection',
        features: features
      });
      console.log('Source updated successfully');
    } else {
      console.error('tracklog-source not found');
    }
    
    // Update the single line feature if it exists
    const fullSource = map.getSource('tracklog-full-source');
    if (fullSource) {
      // Calculate vertical speeds for each segment
      const gradientFeatures = [];
      for (let i = 1; i < tracklog.length; i++) {
        const startPoint = tracklog[i-1];
        const endPoint = tracklog[i];
        
        // Skip invalid coordinates
        if (!startPoint.coordinates || !endPoint.coordinates) {
          continue;
        }
        
        // Calculate vertical speed in m/s
        const timeDiff = (endPoint.timestamp - startPoint.timestamp) / 1000; // seconds
        if (timeDiff < 0.1) continue; // Skip invalid time differences
        
        const altDiff = (endPoint.altitude || 0) - (startPoint.altitude || 0); // meters
        const verticalSpeed = altDiff / timeDiff; // m/s
        
        // Create a feature for this segment with vertical speed property
        gradientFeatures.push({
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [startPoint.coordinates, endPoint.coordinates]
          },
          properties: {
            verticalSpeed: verticalSpeed
          }
        });
      }
      
      if (gradientFeatures.length >= 1) {
        fullSource.setData({
          type: 'FeatureCollection',
          features: gradientFeatures
        });
        console.log('Gradient line source updated with', gradientFeatures.length, 'segments');
      }
    } else {
      // Create the full line if it doesn't exist yet
      createSingleLineFeature();
    }
  } catch (error) {
    console.error('Error updating tracklog data:', error);
  }
}

// Handle position errors
function handlePositionError(error) {
  console.warn('Geolocation error:', error.message);
}

// Generate a smooth color gradient for vertical speed
function generateVerticalSpeedGradient() {
  const result = [];
  
  // Helper to convert HSL to RGB hex
  function hslToHex(h, s, l) {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = n => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  }
  
  // Create a pre-sorted array of [speed, color] pairs
  const colorPairs = [];
  
  // Negative vertical speed (descent): 100 steps from -10 to 0 m/s
  for (let i = 0; i <= 100; i++) {
    const speed = -10 + i * 0.1; // -10 to 0 m/s
    
    // Map speed to hue (240 = blue to 180 = cyan)
    let hue, saturation, lightness;
    
    if (speed < -0.1) {
      // Descent (blue range)
      const normalizedSpeed = (speed + 10) / 10; // 0 to 1
      hue = 240 - normalizedSpeed * 60;
      saturation = 100;
      lightness = 50;
    } else if (speed >= -0.1 && speed <= 0.1) {
      // Close to level (white)
      hue = 0;
      saturation = 0;
      lightness = 100;
    } else {
      // Ascent (yellow to red)
      const normalizedSpeed = speed / 10; // 0 to 1
      hue = 60 - normalizedSpeed * 60;
      saturation = 100;
      lightness = 50;
    }
    
    const color = hslToHex(hue, saturation, lightness);
    colorPairs.push([speed, color]);
  }
  
  // Positive vertical speed (ascent): 100 steps from 0 to 10 m/s
  // Skip the first step (0 m/s) as it's already added in the negative range
  for (let i = 1; i <= 100; i++) {
    const speed = i * 0.1; // 0.1 to 10 m/s
    
    // Map speed to hue (60 = yellow to 0 = red)
    const normalizedSpeed = speed / 10; // 0 to 1
    const hue = 60 - normalizedSpeed * 60;
    const saturation = 100;
    const lightness = 50;
    
    const color = hslToHex(hue, saturation, lightness);
    colorPairs.push([speed, color]);
  }
  
  // Sort the pairs by speed (ascending order)
  colorPairs.sort((a, b) => a[0] - b[0]);
  
  // Remove any duplicate speed values that might cause issues
  const uniquePairs = [];
  let lastSpeed = -Infinity;
  
  for (const pair of colorPairs) {
    if (pair[0] > lastSpeed) {
      uniquePairs.push(pair);
      lastSpeed = pair[0];
    }
  }
  
  // Flatten the array for the interpolate expression
  for (const pair of uniquePairs) {
    result.push(pair[0]);  // speed
    result.push(pair[1]);  // color
  }
  
  return result;
}

// Get the tracklog line style with color gradient
function getTracklogLineStyle() {
  return {
    id: 'tracklog-line',
    type: 'line',
    source: 'tracklog-source',
    layout: {
      'line-join': 'round',
      'line-cap': 'round',
      'visibility': 'visible'
    },
    paint: {
      'line-width': 6,         // Increase width
      'line-opacity': 1.0,     // Full opacity
      'line-color': [
        'interpolate',
        ['linear'],
        ['get', 'verticalSpeed'],
        ...generateVerticalSpeedGradient()
      ]
    }
  };
} 