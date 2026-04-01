# FrogFinder - Setup Guide

## Quick Start (5 minutes)

### 0. Prerequisites

Make sure you have installed:

- Node.js (v18 or later): https://nodejs.org/
- npm (comes with Node)

- **Mac OS**: `brew install node` (Assuming you have homebrew installed)
- **Windows**: `winget install OpenJS.NodeJS.LTS`


### 1. Go to FrogFinder directory
```bash
cd project-pobblebonk/FrogFinder
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Download Expo Go App
- **iOS**: Download from [Apple App Store](https://apps.apple.com/app/expo-go/id1198753527)
- **Android**: Download from [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)

### 4. Start Development Server
```bash
npx expo start
```

This will open the Expo CLI in your terminal with a QR code.

### 5. Scan QR Code
- **iOS**: Open Camera app and point at the QR code (automatically opens Expo Go)
- **Android**: Open Expo Go app → Tap "Scan QR Code" and point at the QR code

The app will load on your device and hot-reload as you make changes.

> **NOTE**: The app will be running locally, the server only exists to send updated files.

---

## Project Structure

```
FrogFinder/
├── App.js                 # Main app entry, navigation setup
├── screens/               # UI screens
│   ├── AboutScreen.jsx   # App info
│   ├── ClassifyScreen.jsx # Main classification interface
│   └── SightingsScreen.jsx # Saved sightings list
├── hooks/                 # React hooks (stubs with dummy data)
│   ├── useRecorder.js    # Audio recording state
│   ├── useClassifier.js  # ML classification
│   └── useSightings.js   # Sightings management
├── services/              # Business logic (stubs)
│   ├── filePickerService.js       # File upload
│   ├── micRecorderService.js      # Audio recording
│   ├── classifierService.js       # ML model
│   ├── speciesService.js          # Species database
│   ├── sightingsService.js        # Sightings persistence
│   └── uploadService.js           # Cloud sync (Supabase)
├── config/                # Theme and app config
│   ├── Theme.js          # Design tokens
│   ├── MfccConfig.js     # Audio processing config
│   └── AppConfig.js      # App settings
└── assets/                # Images and data
```

---

## Current Implementation

### Whats Ready for Frontend

> **NOTE**: Current setup of screens is only an example of how to call the functions, Front-End developers should define the flow, navigation and design of these elements.

- **3-screen navigation** with swipe and button controls
- **All screens** display properly with safe area handling
- **Theme system** configured with colors, spacing, typography
- **Record button** with styled buttons and basic layout
- **Classification results display** showing full species info
- **Sightings list** showing all captured frog calls

### Ready for Backend Integration

All backend services return dummy data:
- `useRecorder()` → Returns dummy audio URI after 1s delay
- `useClassifier()` → Returns realistic Pobblebonk species + 3 alternatives after 1.5s delay
- `useSightings()` → Returns 3 dummy sightings
- `filePickerService.pickAudioFile()` → Returns dummy audio URI
- Other services → Scaffolded with TODO comments

### Design System

Edit colors, spacing, and typography in `config/Theme.js`:
```javascript
Theme.colors.primary      // #007AFF (blue)
Theme.colors.text         // #000000 (black)
Theme.spacing.md          // 16px
Theme.typography.h2       // 24px bold heading
```

---

## Development Workflow

### For Frontend Developers
- Edit screen components in `screens/`
- Add styling using `Theme` imports
- Screens automatically hot-reload when you save
- All UI is flexible, you're free to do what you like with this
- Expect the function calls to be identical

### For Backend/ML Developers
- Replace stub implementations in `services/` with real logic
- Update hooks in `hooks/` to call actual services
- Keep the same function signatures for compatibility
- Use `console.log()` to verify data flow (visible in terminal)

---

## Testing

### Quick Test Flow
1. **Record Screen**: Tap "Start Recording" → "Stop Recording" → See Pobblebonk classification
2. **Upload File**: Tap "Upload File" → See Pobblebonk classification
3. **Navigation**: Swipe left/right or use nav buttons to move between screens
4. **Sightings**: Tap "Next" twice to see saved sightings list

### Debugging
- Open terminal where you ran `npm start` to see console logs
- Use `console.log()` in your code to debug
- Press `i` in terminal to open iOS simulator
- Press `a` in terminal to open Android emulator

---

## Troubleshooting

**App won't load?**
- Make sure you're in the `FrogFinder` directory
- Try: `npm install` then `npm start`
- Check that Expo Go is updated to latest version

**Changes not updating?**
- Save the file
- Look for "Module reloading" in terminal
- If stuck, press `r` in terminal to reload

**Port already in use?**
- Run: `npm start -- --tunnel` to use different connection method

---