# 🐸 FrogFinder | RMIT Capstone Project

Final year capstone project for a multidisciplinary group of RMIT students.

Application for automated classification of Australian frog species from environmental audio recordings, extending previous semester's capstone project.

---

## 👥 Members

| Name | Role |
|------|------|
| Ashley McKinnon | Project Lead |
| Bridget Valder | Frontend |
| Daniel Lienert | ML/AI |
| Lenneth Rosario | Backend |
| Vinuka Goonetillake | UX/QA |

---

## 🛠️ Tech Stack

### Application & Frontend
![React Native](https://img.shields.io/badge/React%20Native-61DAFB?style=flat&logo=react&logoColor=white)
![Expo](https://img.shields.io/badge/Expo-000020?style=flat&logo=expo&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)
![Tailwind](https://img.shields.io/badge/Tailwind-06B6D4?style=flat&logo=tailwindcss&logoColor=white)
![NativeWind](https://img.shields.io/badge/NativeWind-000000?style=flat&logoColor=white)


### Backend
![Postgres](https://img.shields.io/badge/Postgres-4169E1?style=flat&logo=postgresql&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat&logo=supabase&logoColor=white)
![JSON](https://img.shields.io/badge/JSON-000000?style=flat&logo=json&logoColor=white)


### AI/ML
![Python](https://img.shields.io/badge/Python-3776AB?style=flat&logo=python&logoColor=white)
![PyTorch](https://img.shields.io/badge/PyTorch-EE4C2C?style=flat&logo=pytorch&logoColor=white)
![Librosa](https://img.shields.io/badge/Librosa-1f77b4?style=flat&logoColor=white)
![Scikit--Learn](https://img.shields.io/badge/Scikit--Learn-F7931E?style=flat&logo=scikit-learn&logoColor=white)

---

## 🏛️ Architecture

![Architecture Diagram](documentation/images/framework-image.png)

**All processing runs on-device** - No external dependencies (backend/database for population tracking)

## 🏗️ Component Diagram

![Architecture Diagram](documentation/images/project-architecture-image.png)

---

## 📁 Project Structure

```
project-pobblebonk/
├── FrogFinder/             # React Native mobile app
│   ├── screens/            # UI screens
│   ├── hooks/              # State management
│   ├── services/           # Business logic
│   ├── config/             # App configuration
│   └── assets/             # Images and data
│
├── ModelTraining/          # ML model training
│   ├── Feature Extraction/ # MFCC and spectrograms
│   ├── Trained Models/     # Model checkpoints
│   └── Training Audio/     # 50+ frog species
│
└── documentation/          # Project docs
```

---

## 📲 Build and Run

See [SETUP.MD](documentation/SETUP.md) file for detailed installation and running instructions.

**Quick start:**
```bash
cd FrogFinder
npm install
npm start
# Scan QR code with Expo Go
```

---

## 📊 Data

Large data files (raw audio, spectrograms, model checkpoints) are **not committed to this repository**.

Shared data is stored externally.

All local data directories should be added to local `.gitignore`:

---

## 🌿 Branching Convention

| Prefix | Use |
|---|---|
| `feature/` | New functionality |
| `fix/` | Bug fixes |

**Format:** `feature/<short-description>` or `fix/<short-description>`

**Examples:**
```
feature/spectrogram-preprocessing
feature/cnn-transfer-learning
fix/class-imbalance-weighting
fix/audio-normalisation-bug
```

All branches should be created from `main` and submitted via pull request. Direct pushes to `main` are disabled.

---

## 🔄 Pull Requests

Use the PR template located at `.github/pull_request_template.md`. Every PR must include a linked Trello card number.

