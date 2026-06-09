================================================================================
  FROGFINDER  |  RMIT Capstone Project
  Version 1.0.0
================================================================================

GITHUB REPOSITORY
  https://github.com/S3886682/project-pobblebonk


PROJECT OVERVIEW
  FrogFinder is a mobile application that classifies Australian frog species
  from audio recordings. All audio processing and ML inference runs entirely
  on-device — no internet connection is required to record and identify frogs.

  Team:
    Ashley McKinnon    - Project Lead
    Bridget Valder     - Frontend
    Daniel Lienert     - ML/AI
    Lenneth Rosario    - Backend
    Vinuka Goonetillake- UX/QA


--------------------------------------------------------------------------------
  RELEASE NOTES
--------------------------------------------------------------------------------

  v1.0.0  (2026-06-09)
  - On-device SVM classifier trained on Victorian frog species
  - Record frog calls via microphone or upload WAV files for identification
  - Confidence score and species details shown for each classification
  - Automatic GPS-tagged sightings log saved locally to device
  - Search and browse all supported frog species with call descriptions
  - Swipe navigation between Record, Search, and Sightings screens
  - Supports 16-bit WAV audio input at any sample rate (resampled to 32kHz)
  - ML model: SVM with RBF kernel, MFCC + spectral contrast + delta features


--------------------------------------------------------------------------------
  PREREQUISITES
--------------------------------------------------------------------------------

  - Node.js v18 or later  (https://nodejs.org/)
    Mac:     brew install node
    Windows: winget install OpenJS.NodeJS.LTS

  - npm (bundled with Node.js)

  - Expo Go app on your mobile device
    iOS:     https://apps.apple.com/app/expo-go/id1198753527
    Android: https://play.google.com/store/apps/details?id=host.exp.exponent


--------------------------------------------------------------------------------
  INSTALLATION
--------------------------------------------------------------------------------

  1. Clone the repository:
       git clone https://github.com/S3886682/project-pobblebonk.git
       cd project-pobblebonk/FrogFinder

  2. Install dependencies:
       npm install

  3. (Optional) Configure cloud sync environment variables if using Supabase:
       REACT_APP_SUPABASE_URL=<your-supabase-project-url>
       REACT_APP_SUPABASE_ANON_KEY=<your-supabase-anon-key>

     Create a .env file in the FrogFinder/ directory with the above values.
     Cloud sync is optional — the app works fully offline without it.


--------------------------------------------------------------------------------
  RUNNING THE APP
--------------------------------------------------------------------------------

  1. Start the development server:
       cd FrogFinder
       npx expo start

  2. Scan the QR code that appears in the terminal:
       iOS:     Open the Camera app and point at the QR code
       Android: Open Expo Go -> "Scan QR Code"

  The app will load on your device and hot-reload when files are saved.

  NOTE: The Expo server only serves updated files to the device.
        All ML processing runs locally on the device, not the server.

  Emulator shortcuts (in the Expo terminal):
    Press i  - open iOS Simulator
    Press a  - open Android Emulator
    Press r  - force reload


--------------------------------------------------------------------------------
  MODEL TRAINING (ML/AI)
--------------------------------------------------------------------------------

  The ML model is pre-trained and bundled as FrogFinder/services/svm_model.json.
  To retrain:

  1. Install Python dependencies:
       cd ModelTraining
       pip install -r requirements.txt   (or install scikit-learn, librosa, numpy)

  2. Edit ModelTraining/config.py to adjust audio/model parameters.

  3. Run training:
       python train.py
       python evaluate.py
       python export_model_json.py       (exports to FrogFinder/services/svm_model.json)

  Key model parameters (config.py):
    SAMPLE_RATE  = 32000 Hz
    WIN_SEC      = 1.0 s window
    N_MFCC       = 30 coefficients
    SVM_C        = 10  (GridSearchCV override)


--------------------------------------------------------------------------------
  PROJECT STRUCTURE
--------------------------------------------------------------------------------

  project-pobblebonk/
  ├── FrogFinder/                 React Native mobile app
  │   ├── App.js                  Entry point and tab navigation
  │   ├── screens/                UI screens (Classify, Search, Sightings)
  │   ├── hooks/                  State management hooks
  │   ├── services/               Business logic and ML inference
  │   │   ├── classifierService.js   On-device SVM inference engine
  │   │   ├── sightingsService.js    Local JSON sightings store
  │   │   ├── uploadService.js       Supabase cloud sync (optional)
  │   │   └── svm_model.json         Bundled trained model
  │   ├── config/
  │   │   ├── AppConfig.js        App settings and env-var bindings
  │   │   ├── supabase.js         Supabase client setup
  │   │   └── database.js         SQLite schema (scaffolded)
  │   └── assets/
  │       ├── data/speciesDetails.json   Static species info
  │       └── audio/                     Sample frog call audio
  ├── ModelTraining/              Python ML training pipeline
  │   ├── config.py               Audio + model hyperparameters
  │   ├── train.py                SVM training script
  │   ├── evaluate.py             Model evaluation
  │   └── export_model_json.py    Exports model for JS app
  └── documentation/              Architecture diagrams and setup guides


--------------------------------------------------------------------------------
  TROUBLESHOOTING
--------------------------------------------------------------------------------

  App won't load:
    - Ensure you are in the FrogFinder/ directory
    - Run: npm install  then  npx expo start
    - Make sure Expo Go is updated to the latest version

  Changes not updating:
    - Save the file and wait for "Module reloading" in the terminal
    - Press r in the terminal to force a full reload

  Port conflict:
    - Run: npx expo start --tunnel

  Classification fails on Android:
    - Only 16-bit WAV files are supported
    - Use the file picker (Upload) rather than recording if issues persist

================================================================================
