# PWA Conversion TODO

This document outlines the remaining steps to convert the Work Notes application into a Progressive Web App (PWA).

---

## Phase 1: Essential PWA Features

### 1. Add PWA Plugin and Configuration
- [x] Install `vite-plugin-pwa` package
- [x] Configure service worker strategy (workbox)
- [x] Set up caching strategies for assets and API calls
- [x] Configure offline fallback pages

### 2. Create Web App Manifest
- [x] Define app metadata (name, short_name, description)
- [x] Add app icons (multiple sizes: 192x192, 512x512, maskable icons)
- [x] Set display mode (standalone/fullscreen/minimal-ui)
- [x] Configure theme colors and background color
- [x] Set start_url and scope
- [x] Add app shortcuts for quick access
- [ ] Add screenshots for app stores (optional)

### 3. Service Worker Implementation
- [x] Cache static assets (JS, CSS, fonts, images)
- [x] Implement runtime caching for dynamic data
- [x] Add offline support for key routes
- [ ] Handle background sync for note updates (Phase 2)
- [ ] Implement periodic background sync for data refresh (Phase 2 - optional)

---

## Phase 2: Enhanced Functionality

### 4. Offline Data Management
- [ ] Migrate from localStorage to IndexedDB for better offline storage
- [ ] Implement local-first architecture with sync queue
- [ ] Add conflict resolution for offline edits
- [ ] Store week notes locally with sync indicators
- [ ] Cache week range data for review page

### 5. Install Prompt & App Updates
- [ ] Add "Install App" button/banner
- [ ] Handle beforeinstallprompt event
- [ ] Implement update notification when new version available
- [ ] Add skip waiting logic for service worker updates
- [ ] Show reload prompt to users

### 6. PWA-Specific Features
- [ ] Add app shortcuts (manifest shortcuts to common actions)
- [ ] Implement share target API (share to your app)
- [ ] Add badge API for notification counts (optional)
- [ ] Enable file handling API for importing notes (optional)

---

## Phase 3: Performance & Optimization

### 7. Performance Optimization
- [ ] Implement code splitting and lazy loading
- [ ] Optimize assets (compress images, minify code)
- [ ] Add resource hints (preload, prefetch)
- [ ] Measure and improve lighthouse PWA score
- [ ] Ensure fast first contentful paint (FCP)

### 8. Testing & Validation
- [ ] Test on multiple devices and browsers
- [ ] Verify offline functionality works correctly
- [ ] Test install flow on iOS and Android
- [ ] Run Lighthouse PWA audit (aim for 90+ score)
- [ ] Test service worker update mechanism
- [ ] Validate manifest with Chrome DevTools

---

## Phase 4: Platform-Specific & Distribution

### 9. iOS-Specific Considerations
- [ ] Add apple-touch-icon meta tags
- [ ] Set apple-mobile-web-app-capable
- [ ] Configure apple-mobile-web-app-status-bar-style
- [ ] Handle iOS Safari quirks and limitations
- [ ] Test standalone mode on iOS

### 10. Deployment & Distribution
- [ ] Configure HTTPS (required for PWA)
- [ ] Set up proper cache headers
- [ ] Deploy service worker and manifest
- [ ] Submit to app stores (optional: TWA for Play Store)
- [ ] Add installation instructions for users

---

## Implementation Priority

**Phase 1 (Essential):**
1. Add PWA plugin & manifest
2. Basic service worker with asset caching
3. Offline support for critical pages

**Phase 2 (Enhanced):**
4. IndexedDB migration
5. Install prompt
6. Update notifications

**Phase 3 (Advanced):**
7. Background sync
8. App shortcuts
9. Performance optimization

**Phase 4 (Polish):**
10. iOS optimization
11. Store submission
12. Advanced features

---

## Resources

- [Vite PWA Plugin Documentation](https://vite-pwa-org.netlify.app/)
- [Web.dev PWA Guide](https://web.dev/progressive-web-apps/)
- [MDN PWA Documentation](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [Workbox Documentation](https://developer.chrome.com/docs/workbox/)

---

## Notes

- HTTPS is required for PWA features to work
- Service workers only work on localhost and HTTPS domains
- iOS has some PWA limitations compared to Android
- IndexedDB is recommended over localStorage for larger data
- Test on real devices, not just browser DevTools
