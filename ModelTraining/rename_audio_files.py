"""
Renames training audio files with source prefixes:
  - Files starting with a number  → provided_dataset_<rest of name>
  - Files containing _inat        → inaturalist_<original name>
  - Everything else               → xeno_canto_<original name>

Safe to re-run: already-prefixed files are skipped.
"""

import re
from pathlib import Path

BASE_DIR = Path(__file__).parent
TRAINING_DIR = BASE_DIR / "datasets" / "updated" / "Training Audio"

KNOWN_PREFIXES = ("provided_dataset_", "inaturalist_", "xeno_canto_")
LEADING_NUMBER = re.compile(r"^\d+\s+")


def classify(name: str) -> str:
    if LEADING_NUMBER.match(name):
        return "provided_dataset"
    if "_inat" in name:
        return "inaturalist"
    return "xeno_canto"


def new_name(name: str, folder: Path) -> str:
    source = classify(name)
    if source == "provided_dataset":
        m = LEADING_NUMBER.match(name)
        number = m.group().strip()
        stripped = LEADING_NUMBER.sub("", name)
        candidate = f"provided_dataset_{stripped}"
        # If stripping the number would collide, embed the number before the extension
        stem = Path(stripped).stem
        ext = Path(stripped).suffix
        if (folder / candidate).exists():
            candidate = f"provided_dataset_{stem}_{number}{ext}"
        return candidate
    return f"{source}_{name}"


total_renamed = 0

for folder in sorted(TRAINING_DIR.iterdir()):
    if not folder.is_dir():
        continue

    renamed = 0
    for f in sorted(folder.iterdir()):
        if not f.is_file():
            continue
        if f.name.startswith(KNOWN_PREFIXES):
            continue  # already prefixed

        target_name = new_name(f.name, folder)
        target = f.parent / target_name

        if target.exists():
            print(f"  [warn] target already exists, skipping: {target_name}")
            continue

        f.rename(target)
        renamed += 1

    if renamed:
        print(f"[{folder.name}] renamed {renamed} file(s)")
        total_renamed += renamed

print(f"\nDone. {total_renamed} file(s) renamed across all species.")
