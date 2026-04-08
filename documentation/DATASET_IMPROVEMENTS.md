# Dataset Improvement Plan

## Context

FrogFinder is targeted at researchers and parks staff operating in the **Melbourne region and Victoria**, including border regions (ACT corridor, southern NSW, SA border). The current training set has 55 species, but was not built with Victoria as the primary use case - it contains many Queensland/NT/WA species that will never be encountered, while missing several common Victorian frogs entirely.

---

## Priority: Missing Victorian Species

These species are found in Melbourne and Victorian parks but are **not in the training set at all**. The model cannot identify them.

| Species | Why It Matters | Status |
|---|---|---|
| **Spotted Marsh Frog** | One of the most common frogs across all of Victoria and Melbourne suburbs | **Missing** |
| **Southern Brown Tree Frog** | Extremely common across Victoria, including urban areas | **Missing** |
| **Peron's Tree Frog**  | Common in north and east Victoria | **Missing** |
| **Southern Toadlet**  | Victoria endemic, widespread | **Missing** |
| **Alpine Tree Frog**  | Common in alpine/sub-alpine Victorian parks (Alpine NP, Kosciuszko border) | **Missing** |
| **Smooth Toadlet**  | Found across eastern Victoria and Melbourne fringe | **Missing** |
| **Stony Creek Frog** | Found in ranges east of Melbourne | **Missing** |
| **Brown Toadlet**  | Western Victoria grasslands | **Missing** |

---

## Low Confidence - Weak Training Data

These species are in the training set and tested correctly, but with low confidence scores. Low confidence means the model is uncertain and more likely to misclassify in real-world noisy conditions. The likely cause is too few training clips.

| Species | Confidence | Training Files | Action |
|---|---|---|---|
| **Tapping Nursery Frog** | 18.3% | 4 files | Add more clips - critically under-represented |
| **Moss Froglet** | 20.5% | 4 files | Add more clips - critically under-represented |
| **Magnificent Brood Frog** | 20.5% | 10 files | Add more clips |
| **Sunset Frog** | 27.3% | 7 files | Add more clips |
| **Northern Flinders Ranges Froglet** | 30.3% | 6 files | Add more clips |
| **Moss Froglet** | 30.7% | 4 files | Add more clips - critically under-represented |
| **Green and Golden Bell Frog** | 36.2% | 9 files | Add more clips; also check audio quality |


---

## Easy Wins - Quick Data Improvements

Species already in the model where small additions would have high impact:

1. **Tapping Nursery Frog** (4 files → target 20) - biggest confidence gap relative to clip count
2. **Moss Froglet** (4 files → target 20) - same issue
3. **Sunset Frog** (7 files → target 20)
4. **Northern Flinders Ranges Froglet** (6 files → target 20)
5. **Magnificent Brood Frog** (10 files → target 20)

---

## Species to Consider Removing

These species are in the training set but are **not found in Victoria or bordering regions**. They add noise to the classifier and may increase the chance of false positives in Victorian field conditions.

| Species | Natural Range |
|---|---|
| Howard Springs Toadlet | NT/WA only |
| Magnificent Tree Frog | NT/WA only |
| Kuranda Tree Frog | Far north QLD |
| Kroombit Tops Tinker Frog | Central QLD only |
| Bellenden Ker Nursery Frog | Far north QLD |
| Beautiful Nursery Frog | Far north QLD |
| Hosmer's Nursery Frog | QLD only |
| Mount Top Nursery Frog | QLD only |
| Mt Elliot Nursery Frog | QLD only |
| Rattling Nursery Frog | QLD only |
| Motorbike Frog | WA only |
| Wallum Sedge Frog | Coastal QLD/NSW only |

> Note: Removing these will reduce the class count and is likely to improve accuracy for Victorian species. Run `evaluate.py` before and after to confirm.

---

## Plan to Source New Data

### 1. Free / Open Databases

| Source | URL | Notes |
|---|---|---|
| **FrogID** (Australian Museum) | frogid.net.au | Largest Australian frog call database. Contact for researcher access. |
| **xeno-canto** | xeno-canto.org | Global wildlife sound library. Search by species. |
| **Macaulay Library** (Cornell) | macaulaylibrary.org | High-quality recordings, searchable by species. |
| **ALA - Atlas of Living Australia** | ala.org.au | Links to occurrence records with some audio. |
| **BioAcoustica** | bioacoustica.org | Open repository for biodiversity sound data. |

### 2. Victorian-Specific Resources

- **Parks Victoria** - may have existing monitoring data from acoustic recorders deployed in parks
- **DELWP / DEECA** - Victorian government biodiversity data, contact for acoustic survey datasets
- **Melbourne Water** - funds frog monitoring programs, may have recordings
- **Frog Census** (Zoos Victoria) - community science data, contact for audio access

### 3. Field Recording

For species with no online recordings available, field recording is the most reliable source. Target locations:

| Species to Target | Location |
|---|---|
| Spotted Marsh Frog | Any wetland, suburban Melbourne   Westgate Park, Brimbank |
| Southern Brown Tree Frog | Dandenong Ranges, Yarra Ranges NP |
| Southern Toadlet | Grampians, Otway Ranges |
| Alpine Tree Frog | Alpine NP, Mt Buller area |
| Peron's Tree Frog | Healesville, Yarra Valley |

### 4. Audio Quality Requirements

When adding new clips:
- Format: WAV preferred (MP3 acceptable at 128kbps+)
- Sample rate: 32kHz minimum (44.1kHz ideal)
- Duration: 0.3–2s clean call segments (use `Sound Splitter.py` if splitting longer recordings)
- Background noise: some ambient noise is fine the model is trained with noise augmentation
- Avoid: clipping, heavy wind noise, overlapping calls from multiple species in the same clip

---

## Suggested Priority Order

1. Add missing high-priority Victorian species (Spotted Marsh Frog, Southern Brown Tree Frog, Southern Toadlet)
2. Boost under-represented species clips (Tapping Nursery Frog, Moss Froglet, Sunset Frog)
3. Remove out-of-range species from training set
4. Add remaining missing Victorian species
5. Re-run `python train.py` and `python evaluate.py` after each batch to track improvement
