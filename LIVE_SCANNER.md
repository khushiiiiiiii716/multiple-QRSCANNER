# 📹 Live Webcam QR Scanner

## Overview

The **Live Scanner** feature enables real-time QR code detection directly from your device camera (webcam, phone camera, or tablet camera) without requiring file uploads.

---

## ✨ Features

### Real-Time Detection
- **Instant scanning** as soon as a QR code enters the frame
- **No shutter button** — fully automatic
- **Multiple QR support** — scans multiple codes sequentially
- **60 FPS scanning** (device-dependent)

### Smart Debouncing
- Prevents duplicate detections
- 2-second cooldown per unique QR code
- Maintains scan history for 50 most recent codes

### Visual Feedback
- ✅ **Corner guides** showing scan area
- 🔵 **Animated scan line** moving through frame
- ✅ **Green success animation** on detection
- 🎯 **Live bounding boxes** drawn on detected codes
- 🔴 **Corner markers** highlighting QR position

### Camera Controls
- 🔄 **Switch camera** button (if multiple cameras available)
- 📷 **Front/back camera** toggle on mobile devices
- ⚙️ **Auto-resolution** (targets 1280×720, adapts to device)

### Detection History
- 📋 **Recent detections panel** showing last 3 codes
- ⏰ **Timestamp** for each detection
- 🏷️ **Data type badge** (URL, WiFi, Email, etc.)
- 💾 **Persistent results** in floating panel (up to 50 codes)

---

## 🚀 Usage

### Desktop (Webcam)
1. Click **"Live Scan"** button in header or hero section
2. Allow camera access when prompted
3. Point webcam at a QR code
4. Detection happens automatically
5. View results in real-time panel

### Mobile (Phone/Tablet)
1. Tap **"Live Camera Scan"** button
2. Grant camera permission
3. Use **back camera** (default) or switch to front
4. Point camera at QR code
5. Instant detection and notification

---

## 🎯 Technical Details

### Detection Algorithm
```typescript
1. Capture video frame (60fps loop)
2. Draw frame to canvas
3. Extract ImageData (RGBA pixel array)
4. Pass to jsQR decoder
5. If QR found:
   - Check for duplicates (2s cooldown)
   - Draw bounding box & corners
   - Trigger success animation
   - Add to history
   - Fire onDetection callback
6. Request next frame (requestAnimationFrame)
```

### Performance
- **Frame Rate**: 60 FPS (device-dependent)
- **Detection Latency**: ~16-33ms per frame
- **Success Animation**: 1 second
- **Debounce Window**: 2 seconds
- **Memory**: ~10-20MB (video stream + canvas)

### Browser Compatibility
| Browser | Desktop | Mobile | Notes |
|---------|---------|--------|-------|
| Chrome | ✅ | ✅ | Full support |
| Firefox | ✅ | ✅ | Full support |
| Safari | ✅ | ✅ | iOS 11+ required |
| Edge | ✅ | ✅ | Chromium-based |
| Opera | ✅ | ✅ | Full support |

### Required Permissions
- **Camera access** (navigator.mediaDevices.getUserMedia)
- Triggers browser permission prompt on first use
- Permission persists per domain

---

## 🎨 UI Components

### Camera View
- **Aspect ratio**: 16:9
- **Resolution**: Adapts to device (target: 1280×720)
- **Overlay**: Transparent scan guides + animated line
- **Canvas**: Synchronized with video for annotation

### Corner Guides
4 corner frames indicating optimal scan area:
- Top-left, top-right, bottom-left, bottom-right
- Cyan color (#4ECDC4)
- 50% opacity
- Located at 25% / 75% screen bounds

### Success Indicator
- Green circular badge with checkmark
- Scale animation (0 → 1 → 1.5)
- Fade out after 1 second
- Centered over detected code

### Detection Panel
Displays last 3 detections:
- Data type badge (colored)
- QR data (truncated at 50 chars)
- Scrollable if overflow

### Floating Results Panel
Bottom-right corner panel when scanner is closed:
- Shows all live scan history
- Colored type badges
- Timestamps
- Scrollable list
- "Clear" button
- Auto-hides when empty

---

## 🔧 Configuration

### Camera Constraints
```typescript
{
  video: {
    facingMode: 'environment', // or 'user'
    width: { ideal: 1280 },
    height: { ideal: 720 },
  }
}
```

### jsQR Options
```typescript
{
  inversionAttempts: 'attemptBoth'
  // Tries both normal and inverted images
}
```

---

## 🐛 Error Handling

### Permission Denied
```
Message: "Camera permission denied. Please allow camera access and try again."
Action: "Try Again" button → re-requests permission
```

### No Camera Found
```
Message: "No camera found. Please connect a camera and try again."
Action: Retry or close modal
```

### Generic Error
```
Message: Shows browser error message
Action: "Try Again" button
```

### Camera in Use
If camera is already in use by another app:
```
Message: "Camera is busy. Close other apps using the camera."
```

---

## 📱 Mobile-Specific Features

### Auto Camera Selection
- **Default**: Back camera (`facingMode: 'environment'`)
- **Switch**: Tap switch icon to use front camera
- **Remember**: Maintains selection during session

### Orientation Support
- Works in portrait and landscape
- Video stream auto-rotates
- Scan area adapts to orientation

### Touch Gestures
- **Tap to close**: Tap outside modal
- **Pinch to zoom**: Native browser support (if available)

---

## 💡 Use Cases

1. **Contactless Check-in**
   - Event entry
   - Building access
   - Conference registration

2. **Product Information**
   - Scan packaging QR codes
   - Price lookups
   - Ingredient details

3. **WiFi Sharing**
   - Scan WiFi QR codes for instant connection
   - No manual password entry

4. **Payment**
   - Cryptocurrency wallets
   - Payment apps
   - Donation links

5. **URL Shortcuts**
   - Quick website access
   - App download links
   - Social media profiles

6. **Inventory**
   - Stock checking
   - Warehouse management
   - Asset tracking

---

## 🎯 Future Enhancements

- [ ] Torch/flashlight toggle for low light
- [ ] Zoom controls (pinch gesture support)
- [ ] Beep sound on detection
- [ ] Vibration feedback (mobile)
- [ ] QR code history export (CSV/JSON)
- [ ] Batch scanning mode
- [ ] Screenshot capture on detection
- [ ] Auto-open URLs after scan
- [ ] QR code generator integration

---

## 🔒 Privacy & Security

### Camera Access
- **Local processing only** — video never leaves your device
- **No recording** — frames are processed in real-time and discarded
- **No uploads** — detection happens in browser using jsQR
- **Permission required** — explicit user consent

### Data Handling
- Detected QR data stored **only in browser memory**
- No server transmission
- Cleared on page reload
- Manual "Clear" button available

---

## 📊 Performance Tips

### For Best Results:
1. **Good lighting** — ensure QR code is well-lit
2. **Steady hand** — hold device still for 0.5s
3. **Distance** — 10-30cm from camera
4. **Focus** — allow camera to auto-focus
5. **Angle** — face QR code directly (not at extreme angle)

### Troubleshooting:
- **Blurry detection**: Adjust distance or wait for focus
- **No detection**: Ensure QR code is not damaged/dirty
- **Slow performance**: Close other tabs/apps
- **Permission issues**: Check browser settings → camera permissions

---

**Live Scanner Status: Fully Functional ✅**

Desktop & mobile camera support with real-time detection!
