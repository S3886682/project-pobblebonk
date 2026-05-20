# Model Training SOP — FrogFinder Victorian Frog Classifier

## Overview

The FrogFinder classifier is an SVM model trained exclusively on **36 Victorian frog species**. It is not a general-purpose Australian frog classifier and species outside Victoria will not be recognised.

The model pipeline lives in `ModelTraining/`. Training is two commands: `train.py` then `evaluate.py`.

---

## Improving the Model

The fastest way to improve accuracy is to add more audio files for a species that is underperforming. The model re-trains from scratch each time.

### Step 1 — Add audio files

Drop `.mp3` or `.wav` files into the relevant species folder:

```
ModelTraining/
  datasets/
    updated/
      Training Audio/
        Spotted Marsh Frog/       ← add files here
        Southern Brown Tree Frog/ ← add files here
        Tylers Toadlet/
        ...
```

**File naming convention** (required for source tracking):

| Source | Prefix | Example |
|---|---|---|
| FrogID | `frogid_` | `frogid_Spotted_Marsh_Frog_unknown_1.mp3` |
| iNaturalist | `inaturalist_` | `inaturalist_Spotted_Marsh_Frog_inat12345_1.mp3` |
| Xeno-Canto | `xeno_canto_` | `xeno_canto_Spotted_Marsh_Frog_883143_chunk1.mp3` |
| Wild Ambience | `wildambience_` | `wildambience_Spotted_Marsh_Frog_GBF1.mp3` |
| Other / provided | no prefix | `Spotted_Marsh_Frog_field_recording.mp3` |

**Audio quality guidelines:**
- Formats: `.mp3` or `.wav` (both supported)
- Duration: 1–30 seconds per file (longer recordings are automatically chunked by the download scripts)
- The file should contain a clear call from **one species only** — mixed-species chorus recordings will confuse the model
- Some background ambient noise is fine — the model trains with noise augmentation

**Minimum recommended files per species:** ~10. Species with fewer than 5 files will have low confidence scores.

---

### Step 2 — Retrain the model

```bash
cd ModelTraining
python train.py
```

This will:
- Load all audio from `datasets/updated/Training Audio/` and `Background Audio/`
- Extract MFCC + spectral features from each file (4x augmented)
- Run a 5-fold cross-validated grid search to find the best SVM hyperparameters
- Save the trained model to `models/latest/model.pkl`

Training takes approximately **10–15 minutes** depending on dataset size.

---

### Step 3 — Evaluate

```bash
python evaluate.py
```

This runs the model against the 36 held-out test files in `datasets/updated/Testing Audio/` and prints a per-species results table:

```
File                          Truth                  Predicted              Conf
--------------------------------------------------------------------------------
01 Spotted Marsh Frog.mp3     Spotted Marsh Frog     Spotted Marsh Frog    61.0%  PASS
...
Accuracy: 36/36  (100.0%)
```

A JSON report is also saved to `reports/evaluation_<timestamp>.json` for comparison across runs.


---

## Testing Audio — Do Not Modify Casually

`datasets/updated/Testing Audio/` contains one representative test file per species. These are held out from training and used by `evaluate.py`.

**Rules:**
- Do not add training files here — they must not appear in both folders
- If replacing a test file, pick a clean solo recording (not a chorus)
- The file must be named `<number> <Species Name>.<ext>` e.g. `01 Spotted Marsh Frog.mp3`
- If you replace a test file and pull the new one from training, remember to remove it from the training folder and retrain

---

## Parameter Tuning

Current best configuration (in `config.py`):

| Parameter | Value | Notes |
|---|---|---|
| `WIN_SEC` | 1.0 | Window size in seconds — captures full call cycles |
| `N_MFCC` | 20 | MFCC coefficients |
| `N_FFT` | 2048 | FFT window size |
| `HOP_LENGTH` | 256 | Hop length — finer time resolution |
| `AUG_NOISE_LVL` | 0.3 | Background noise mix ratio during augmentation |

To find better parameters, run the parameter sweep (takes ~90 min):

```bash
python sweep.py              # single-parameter variations
python sweep.py --quick      # combos only (if you already know the best singles)
```

The sweep tests each parameter independently, prints a ranked table, and saves results to `reports/sweep_<timestamp>.json`. Apply the best settings to `config.py` then retrain.

---

## Species Coverage

The model covers exactly **36 Victorian frog species**. The species list is defined in:

```
FrogFinder/assets/data/speciesDetails.json
```

To add a new species to the model:
1. Add it to `speciesDetails.json`
2. Create a new folder in `Training Audio/` with the exact species common name
3. Add a test file to `Testing Audio/` named `<number> <Species Name>.mp3`
4. Add audio files and retrain

---

## File Reference

```
ModelTraining/
  config.py                         — all tunable parameters
  train.py                          — trains the model
  evaluate.py                       — tests against held-out audio
  features.py                       — feature extraction (do not change without re-sweeping)
  sweep.py                          — parameter search tool
  models/latest/model.pkl           — trained model (output of train.py)
  models/latest/label_classes.json  — list of species the model knows
  datasets/updated/Training Audio/  — training files, one folder per species
  datasets/updated/Testing Audio/   — one test file per species (do not use for training)
  Background Audio/                 — ambient noise files used in augmentation
  reports/                          — evaluation and sweep JSON reports
```

---

## Contribute by Adding More Data

The single most effective way to improve model accuracy is more training audio. Species with fewer than 10 files tend to have low confidence scores; anything under 5 files is unreliable.

### 1. Free / Open Databases

| Source | URL | Notes |
|---|---|---|
| **FrogID** (Australian Museum) | frogid.net.au | Largest Australian frog call database. Contact for researcher access. |
| **xeno-canto** | xeno-canto.org | Global wildlife sound library. Search by species. |
| **Macaulay Library** (Cornell) | macaulaylibrary.org | High-quality recordings, searchable by species. |
| **ALA - Atlas of Living Australia** | ala.org.au | Links to occurrence records with some audio. |
| **BioAcoustica** | bioacoustica.org | Open repository for biodiversity sound data. |

### 2. Victorian-Specific Resources

Outreach to the following organisations and ask if they'll support this project:
- **Parks Victoria** — may have existing monitoring data from acoustic recorders deployed in parks
- **DELWP / DEECA** — Victorian government biodiversity data, contact for acoustic survey datasets
- **Melbourne Water** — funds frog monitoring programs, may have recordings
- **Frog Census** (Zoos Victoria) — community science data, contact for audio access

### 3. Field Recording

For species with no online recordings available, field recording is the most reliable source. Consider taking recording equipment to Melbourne Zoo.

---

### Priority Species (low model confidence — need more audio)

The following species passed the current evaluation but with low confidence scores. More training audio would improve reliability on real-world recordings.

| Species | Confidence |
|---|---|
| Martins Toadlet | 29.7% |
| Tylers Toadlet | 38.3% |
| Southern Smooth Froglet | 38.7% |
| Littlejohns Tree Frog | 40.9% |
| Growling Grass Frog | 48.4% |
| Lesueurs Tree Frog | 48.8% |
| Peron's Tree Frog | 50.5% |
| Blue Mountains Tree Frog | 50.7% |
| Eastern Dwarf Tree Frog | 53.7% |
| Bibrons Toadlet | 57.2% |
| Giant Banjo Frog | 57.4% |
| Common Spadefoot Toad | 57.7% |
| Wrinkled Toadlet | 58.4% |
| Barking Marsh Frog | 58.7% |
| Baw Baw Frog | 59.4% |
| Victorian Smooth Froglet | 60.9% |
| Spotted Marsh Frog | 61.0% |
| Striped Marsh Frog | 63.7% |
| Red-groined Froglet | 63.8% |

Martins Toadlet in particular has very few recordings available online, we were not able to find many recordings for this species.
