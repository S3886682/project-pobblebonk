# 🐸 Frog Finder | RMIT Capstone Project
Final year capstone project for multidisciplinary group of RMIT students.
Application for automated classification of Australian frog species from environmental audio recordings, extending previous semesters capstone project.


---

## Repository Structure

```
TBD
```

---

## Data

Large data files (raw audio, spectrograms, model checkpoints) are **not committed to this repository**.

Shared data is stored externally.

All local data directories should be added to local `.gitignore`:


---

## Branching Convention

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

## Pull Requests

Use the PR template located at `.github/pull_request_template.md`. Every PR must include a linked Trello card number.

---

## Getting Started

### Pre-requisites
```

To add documentation on installing requirements. Potential to use docker here rather. 

```

---

## References

- Casey, B. (2020). *Bioacoustic monitoring of threatened frog species*. RMIT University.
- [FrogID](https://www.frogid.net.au/) — Australian Museum citizen science frog identification project
