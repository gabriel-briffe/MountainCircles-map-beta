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

// Initialize tracking module
export function initializeTracking() {
  console.log('Initializing tracklog recording...');
  
  // Setup state on first load
  setupTracklogState();
  
  // Create tracklog layer
  createTracklogLayer();
  
  // Create tracklog info flag
  createTracklogInfoFlag();
  
  // Start automatic recording (enabled by default)
  startTracking();
  
  // Set up service worker message handler
  setupServiceWorkerMessageHandler();
  
  // Set tracking start time
  trackingStartTime = Date.now();
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

// Create a flag div to display tracklog information
function createTracklogInfoFlag() {
  // Create the flag element
  const flagDiv = document.createElement('div');
  flagDiv.id = 'tracklog-info-flag';
  flagDiv.style.position = 'absolute';
  flagDiv.style.top = '10px';
  flagDiv.style.right = '10px';
  flagDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  flagDiv.style.color = 'white';
  flagDiv.style.padding = '10px 14px';
  flagDiv.style.borderRadius = '6px';
  flagDiv.style.fontSize = '14px';
  flagDiv.style.zIndex = '1000';
  flagDiv.style.fontFamily = 'Arial, sans-serif';
  flagDiv.style.boxShadow = '0 2px 6px rgba(0,0,0,0.5)';
  flagDiv.style.minWidth = '150px';
  flagDiv.style.backdropFilter = 'blur(3px)';
  flagDiv.style.lineHeight = '1.5';
  flagDiv.textContent = 'Tracklog segments: 0';
  
  // Add to the map container
  const mapContainer = document.getElementById('map');
  if (mapContainer) {
    mapContainer.appendChild(flagDiv);
  }
  
  // Set up regular updates for the flag (useful for timestamps even when path doesn't change)
  setInterval(() => {
    const tracklog = getTracklog();
    if (tracklog.length > 0) {
      updateTracklogInfoFlag(tracklog.length > 1 ? tracklog.length - 1 : 0);
    }
  }, 1000);
}

// Update the tracklog info flag with current info
function updateTracklogInfoFlag(segmentCount) {
  const flagDiv = document.getElementById('tracklog-info-flag');
  if (!flagDiv) return;
  
  const tracklog = getTracklog();
  
  // If we have at least one point, show altitude info
  let altitude = 'N/A';
  let verticalSpeed = 'N/A';
  
  if (tracklog.length > 0) {
    // Get latest point
    const latestPoint = tracklog[tracklog.length - 1];
    altitude = latestPoint.altitude ? `${Math.round(latestPoint.altitude)}m` : 'N/A';
    
    // Calculate vertical speed if we have at least two points
    if (tracklog.length > 1) {
      const prevPoint = tracklog[tracklog.length - 2];
      const timeDiff = (latestPoint.timestamp - prevPoint.timestamp) / 1000; // seconds
      const altDiff = latestPoint.altitude - prevPoint.altitude; // meters
      const vSpeed = altDiff / timeDiff; // m/s
      
      // Format vertical speed with sign and rounded to 1 decimal
      const sign = vSpeed > 0 ? '+' : '';
      verticalSpeed = `${sign}${vSpeed.toFixed(1)} m/s`;
    }
  }
  
  // Calculate tracking duration
  let trackingTime = 'Starting...';
  if (trackingStartTime) {
    const durationMs = Date.now() - trackingStartTime;
    trackingTime = formatDuration(durationMs);
  }
  
  // Create HTML content with data
  flagDiv.innerHTML = `
    <div style="font-weight: bold; margin-bottom: 4px;">Tracklog Info</div>
    <div>Duration: ${trackingTime}</div>
    <div>Segments: ${segmentCount}</div>
    <div>Altitude: ${altitude}</div>
    <div>Vertical: ${verticalSpeed}</div>
  `;
}

// Format milliseconds into a readable duration string (HH:MM:SS)
function formatDuration(durationMs) {
  const seconds = Math.floor(durationMs / 1000) % 60;
  const minutes = Math.floor(durationMs / (1000 * 60)) % 60;
  const hours = Math.floor(durationMs / (1000 * 60 * 60));
  
  const pad = (num) => num.toString().padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

// Create the tracklog layer on the map
function createTracklogLayer() {
  const layerManager = getLayerManager();
  
  // Add source for tracklog data
  layerManager.addOrUpdateSource('tracklog-source', {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: []
    }
  });
  
  // Add the tracklog line layer
  layerManager.addLayerIfNotExists('tracklog-line', getTracklogLineStyle());
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
  recordTrackPoint(position);
  
  // Update the map display
  updateTracklogDisplay();
}

// Process and record each track point
function recordTrackPoint(position) {
  const now = Date.now();
  // Enforce 1 second interval between records
  if (!getLastRecordedTime() || now - getLastRecordedTime() >= 1000) {
    const point = {
      coordinates: [position.coords.longitude, position.coords.latitude],
      altitude: position.coords.altitude || 0,
      timestamp: now
    };
    
    // Add to tracklog
    const newTracklog = [...getTracklog(), point];
    setTracklog(newTracklog);
    setLastRecordedTime(now);
  }
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
    updateTracklogInfoFlag(0);
    return;
  }
  
  // Create individual line segments
  const features = [];
  
  for (let i = 1; i < tracklog.length; i++) {
    const startPoint = tracklog[i-1];
    const endPoint = tracklog[i];
    
    // Calculate vertical speed for this specific segment
    const timeDiff = (endPoint.timestamp - startPoint.timestamp) / 1000; // seconds
    const altDiff = endPoint.altitude - startPoint.altitude; // meters
    const verticalSpeed = altDiff / timeDiff; // m/s
    
    // Create a line segment with its own vertical speed property
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
  
  // Update the source with individual segments
  getLayerManager().addOrUpdateSource('tracklog-source', {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: features
    }
  });
  
  // Update the info flag with segment count
  updateTracklogInfoFlag(features.length);
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
      'line-cap': 'round'
    },
    paint: {
      'line-width': 3,
      'line-color': [
        'interpolate',
        ['linear'],
        ['get', 'verticalSpeed'],
        ...generateVerticalSpeedGradient()
      ]
    }
  };
} 