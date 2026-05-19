"""
Two tasks:
 1. Rename xeno_canto_F7VSF_* → provided_dataset_F7VSF_* in all training folders.
 2. For each species not already represented in Testing Audio, move one
    provided_dataset_ file (falling back to any file) to Testing Audio,
    naming it "{index:02d} {Species Name}.{ext}".
"""

import json
import shutil
from pathlib import Path

BASE_DIR = Path(__file__).parent
TRAINING_DIR = BASE_DIR / "datasets" / "updated" / "Training Audio"
TESTING_DIR  = BASE_DIR / "datasets" / "updated" / "Testing Audio"
SPECIES_JSON = BASE_DIR.parent / "FrogFinder" / "assets" / "data" / "speciesDetails.json"

TESTING_DIR.mkdir(parents=True, exist_ok=True)

with open(SPECIES_JSON, encoding="utf-8") as f:
    species_list = json.load(f)

# ---------------------------------------------------------------------------
# Task 1 — fix F7VSF prefix
# ---------------------------------------------------------------------------
fixed = 0
for f in TRAINING_DIR.rglob("xeno_canto_F7VSF_*"):
    target = f.parent / f.name.replace("xeno_canto_F7VSF_", "provided_dataset_F7VSF_", 1)
    f.rename(target)
    fixed += 1
print(f"Fixed {fixed} F7VSF file(s) -> provided_dataset_\n")

# ---------------------------------------------------------------------------
# Task 2 — populate Testing Audio
# ---------------------------------------------------------------------------

# Find species already covered in Testing Audio (match by common name, case-insensitive)
existing_testing = {f.stem.split(" ", 1)[1].lower() if " " in f.stem else f.stem.lower()
                    for f in TESTING_DIR.iterdir() if f.is_file()}

def folder_name(species_name: str) -> str:
    return species_name.replace("'", "")

moved = 0
skipped = 0

for idx, species in enumerate(species_list, start=1):
    name = species["name"]

    if name.lower() in existing_testing:
        print(f"  [skip] {name} — already in Testing Audio")
        skipped += 1
        continue

    train_folder = TRAINING_DIR / folder_name(name)
    if not train_folder.exists():
        print(f"  [warn] training folder not found: {name}")
        continue

    all_files = [f for f in train_folder.iterdir()
                 if f.is_file() and f.suffix.lower() in (".mp3", ".wav")]
    if not all_files:
        print(f"  [warn] no audio files for: {name}")
        continue

    # Prefer a provided_dataset_ file; fall back to first available
    provided = [f for f in all_files if f.name.startswith("provided_dataset_")]
    chosen = provided[0] if provided else all_files[0]

    dest_name = f"{idx:02d} {name}{chosen.suffix}"
    dest = TESTING_DIR / dest_name

    shutil.move(str(chosen), str(dest))
    print(f"  [ok]  {chosen.name}  ->  {dest_name}")
    moved += 1

print(f"\nDone. {moved} file(s) moved to Testing Audio, {skipped} already present.")
