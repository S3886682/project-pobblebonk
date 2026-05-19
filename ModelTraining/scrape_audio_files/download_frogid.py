"""
Downloads frog call recordings from FrogID (frogid.net.au) for species missing
audio in the Training Audio dataset. Recordings longer than CHUNK_DURATION_S
are split into 25-second chunks, matching the Xeno-Canto/iNaturalist pipeline
convention.

Usage:
    python download_frogid_audio.py
    python download_frogid_audio.py --max 5
    python download_frogid_audio.py --species "litoria-lesueuri"
"""

import argparse
import hashlib
import json
import re
import time
from pathlib import Path

import requests
from pydub import AudioSegment

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
CHUNK_DURATION_S = 25
MAX_SOUNDS = 15          # max audio files per species
REQUEST_DELAY_S = 1.0

BASE_DIR = Path(__file__).parent.parent          # ModelTraining/
TRAINING_DIR = BASE_DIR / "datasets" / "updated" / "Training Audio"
SPECIES_JSON = BASE_DIR.parent / "FrogFinder" / "assets" / "data" / "speciesDetails.json"

FROGID_BASE = "https://www.frogid.net.au/frogs"
FROGID_MEDIA = "https://media.frogid.net.au"
HEADERS = {"User-Agent": "FrogFinderBot/1.0 (educational/research project; ashleymckinn@gmail.com)"}

# Matches .m4a URLs in the rendered HTML
AUDIO_RE = re.compile(r'https://media\.frogid\.net\.au/[^\s"\'<>]+\.m4a')
# Matches the "Call recorded by <Name>" label just before each audio URL
RECORDER_RE = re.compile(
    r'Call recorded by \*\*([^*]+)\*\*\s*\n+\[https://media\.frogid\.net\.au/([^\]]+)\]',
    re.MULTILINE,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def load_species() -> list:
    with open(SPECIES_JSON, encoding="utf-8") as f:
        return json.load(f)


def folder_name_for(species_name: str) -> str:
    return species_name.replace("'", "")


def find_missing_species(species: list) -> list:
    missing = []
    for s in species:
        folder = TRAINING_DIR / folder_name_for(s["name"])
        if not folder.exists():
            print(f"  [warn] folder not found: {folder.name}")
            continue
        audio_files = (
            list(folder.glob("*.mp3"))
            + list(folder.glob("*.wav"))
            + list(folder.glob("*.m4a"))
        )
        if not audio_files:
            missing.append(s)
    return missing


# FrogID uses full Latin endings which sometimes differ from speciesDetails.json
SLUG_OVERRIDES: dict[str, str] = {
    "litoria-ewingi":          "litoria-ewingii",
    "litoria-peroni":          "litoria-peronii",
    "litoria-verreauxi":       "litoria-verreauxii",
    "limnodynastes-dumerili":  "limnodynastes-dumerilii",
    "limnodynastes-peroni":    "limnodynastes-peronii",
    "neobatrachus-sudelli":    "neobatrachus-sudellae",
    "pseudophryne-bibroni":    "pseudophryne-bibronii",
}


def slug_for(scientific_name: str) -> str:
    """Convert 'Litoria lesueuri' → 'litoria-lesueuri', applying FrogID overrides."""
    slug = scientific_name.lower().replace(" ", "-").replace("'", "")
    return SLUG_OVERRIDES.get(slug, slug)


def safe_filename(name: str) -> str:
    return name.replace(" ", "_").replace("'", "").replace("/", "-")


def md5(path: Path) -> str:
    h = hashlib.md5()
    with open(path, "rb") as f:
        for block in iter(lambda: f.read(65536), b""):
            h.update(block)
    return h.hexdigest()


def existing_hashes(output_dir: Path) -> set[str]:
    """Return MD5 hashes of all audio files already in the folder."""
    hashes = set()
    for p in output_dir.glob("*.mp3"):
        if not p.name.startswith("_tmp_"):
            hashes.add(md5(p))
    return hashes


def safe_recorder(recorder: str) -> str:
    """Condense a recorder name to a filesystem-safe token."""
    return recorder.strip().lower().replace(" ", "_").replace(".", "")


def fetch_frogid_sounds(scientific_name: str) -> list[dict]:
    """
    Fetch the FrogID species page and return a list of sound dicts:
        {"url": str, "recorder": str}
    Falls back to a regex scan of all .m4a URLs if the structured parse fails.
    """
    slug = slug_for(scientific_name)
    url = f"{FROGID_BASE}/{slug}/"

    try:
        resp = requests.get(url, headers=HEADERS, timeout=20)
        resp.raise_for_status()
    except Exception as e:
        print(f"    [error] could not fetch {url}: {e}")
        return []

    # Try structured parse first (recorder name + URL pairs)
    sounds = []
    for match in RECORDER_RE.finditer(resp.text):
        recorder = match.group(1).strip()
        path = match.group(2).strip()
        sounds.append({
            "url": f"https://media.frogid.net.au/{path}",
            "recorder": recorder,
        })

    # Fallback: grab any .m4a URL on the page
    if not sounds:
        for audio_url in AUDIO_RE.findall(resp.text):
            sounds.append({"url": audio_url, "recorder": "unknown"})

    # Deduplicate by URL
    seen = set()
    deduped = []
    for s in sounds:
        if s["url"] not in seen:
            seen.add(s["url"])
            deduped.append(s)

    return deduped


def download_file(url: str, dest: Path) -> bool:
    try:
        resp = requests.get(url, headers=HEADERS, timeout=60, stream=True)
        resp.raise_for_status()
        dest.parent.mkdir(parents=True, exist_ok=True)
        with open(dest, "wb") as f:
            for chunk in resp.iter_content(chunk_size=65536):
                f.write(chunk)
        return True
    except Exception as e:
        print(f"    [error] download failed ({url}): {e}")
        if dest.exists():
            dest.unlink()
        return False


def save_chunks(audio: AudioSegment, output_dir: Path, base_name: str):
    chunk_ms = CHUNK_DURATION_S * 1000
    num_chunks = (len(audio) + chunk_ms - 1) // chunk_ms
    for i in range(num_chunks):
        chunk = audio[i * chunk_ms : (i + 1) * chunk_ms]
        if len(chunk) < 5000:
            continue
        out_path = output_dir / f"{base_name}_chunk{i + 1}.mp3"
        chunk.export(str(out_path), format="mp3")
        print(f"      saved chunk {i + 1}/{num_chunks}: {out_path.name}")


def process_sound(sound: dict, idx: int, output_dir: Path, species_name: str,
                  seen_hashes: set[str]):
    """Download, decode, chunk-if-needed, and save a single sound."""
    url = sound["url"]
    recorder = safe_recorder(sound["recorder"])
    base_name = f"frogid_{safe_filename(species_name)}_{recorder}_{idx}"
    tmp_path = output_dir / f"_tmp_{base_name}.m4a"

    # Skip if any file with this base name already exists
    if list(output_dir.glob(f"{base_name}*")):
        print(f"    [skip] {base_name} already present")
        return

    print(f"    downloading call {idx} (recorder={sound['recorder']}) ...")
    if not download_file(url, tmp_path):
        return

    # Duplicate content check
    file_hash = md5(tmp_path)
    if file_hash in seen_hashes:
        print(f"    [skip] duplicate content, discarding")
        tmp_path.unlink(missing_ok=True)
        return
    seen_hashes.add(file_hash)

    try:
        audio = AudioSegment.from_file(str(tmp_path))
    except Exception as e:
        print(f"    [error] could not decode audio: {e}")
        tmp_path.unlink(missing_ok=True)
        return

    duration_s = len(audio) / 1000
    if duration_s > CHUNK_DURATION_S:
        save_chunks(audio, output_dir, base_name)
        tmp_path.unlink(missing_ok=True)
    else:
        final_path = output_dir / f"{base_name}.mp3"
        audio.export(str(final_path), format="mp3")
        tmp_path.unlink(missing_ok=True)
        print(f"      saved: {final_path.name}")

    time.sleep(REQUEST_DELAY_S)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Download FrogID audio for frog species into Training Audio folders"
    )
    parser.add_argument(
        "--max",
        type=int,
        default=MAX_SOUNDS,
        dest="max_count",
        help=f"Max audio files per species (default: {MAX_SOUNDS})",
    )
    parser.add_argument(
        "--species",
        type=str,
        default=None,
        help="Run for a single species slug, e.g. 'litoria-lesueuri' (default: all missing)",
    )
    parser.add_argument(
        "--all",
        action="store_true",
        dest="all_species",
        help="Run for all species, not just those missing audio",
    )
    args = parser.parse_args()

    species_list = load_species()
    print(f"Loaded {len(species_list)} species from speciesDetails.json")

    if args.species:
        # Match by slug against scientific_name field
        target_slug = args.species.lower()
        to_process = [
            s for s in species_list
            if slug_for(s["scientific_name"]) == target_slug
        ]
        if not to_process:
            print(f"[error] no species matched slug '{args.species}'")
            return
    elif args.all_species:
        to_process = species_list
        print(f"\nRunning for all {len(to_process)} species")
    else:
        to_process = find_missing_species(species_list)
        print(f"\n{len(to_process)} species missing audio:\n")
        for s in to_process:
            print(f"  - {s['name']} ({s['scientific_name']})")

    if not to_process:
        print("\nNothing to download.")
        return

    print()
    failed = []
    for s in to_process:
        name = s["name"]
        sci = s["scientific_name"]
        output_dir = TRAINING_DIR / folder_name_for(name)
        print(f"\n[{name} / {sci}]")

        sounds = fetch_frogid_sounds(sci)
        print(f"  found {len(sounds)} call(s) on FrogID")

        if not sounds:
            print("  no audio found — skipping")
            failed.append(name)
            continue

        seen_hashes = existing_hashes(output_dir)
        for i, sound in enumerate(sounds[: args.max_count], 1):
            process_sound(sound, i, output_dir, name, seen_hashes)

    print("\nDone.")
    if failed:
        print("No audio found for:", failed)
    else:
        print("All targeted species have audio.")


if __name__ == "__main__":
    main()