// Minimal Service Worker for WeeWoo PWA (no caching)
// This service worker is only present to make the app installable as a PWA
// It doesn't cache anything - all requests go to the server

// Skip waiting for installation
self.addEventListener('install', (event) => {
  // Skip the waiting phase and activate immediately
  event.waitUntil(self.skipWaiting());
});

// Claim clients on activation
self.addEventListener('activate', (event) => {
  // Take control of all clients as soon as the service worker activates
  event.waitUntil(self.clients.claim());
});

// Pass through all fetch requests to the network
self.addEventListener('fetch', (event) => {
  // Simply fetch from network without any caching
  event.respondWith(fetch(event.request));
});
