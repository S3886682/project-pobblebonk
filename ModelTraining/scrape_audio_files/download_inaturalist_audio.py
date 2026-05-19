"""
Downloads frog call recordings from iNaturalist for species missing audio in the
Training Audio dataset. Recordings longer than CHUNK_DURATION_S are split into
25-second chunks, matching the Xeno-Canto pipeline convention.

Usage:
    python download_inaturalist_audio.py
    python download_inaturalist_audio.py --max 20
"""

import argparse
import json
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

INAT_API = "https://api.inaturalist.org/v1/observations"
HEADERS = {"User-Agent": "FrogFinderBot/1.0 (educational/research project; ashleymckinn@gmail.com)"}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def load_species():
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
        audio_files = list(folder.glob("*.mp3")) + list(folder.glob("*.wav")) + list(folder.glob("*.m4a"))
        if not audio_files:
            missing.append(s)
    return missing


def safe_filename(name: str) -> str:
    return name.replace(" ", "_").replace("'", "").replace("/", "-")


def resolve_taxon_id(scientific_name: str) -> int | None:
    """Look up the iNaturalist taxon_id for a scientific name, handling reclassifications."""
    params = {"q": scientific_name, "rank": "species", "per_page": 1}
    try:
        resp = requests.get("https://api.inaturalist.org/v1/taxa", params=params,
                            headers=HEADERS, timeout=15)
        resp.raise_for_status()
        results = resp.json().get("results", [])
        if results:
            return results[0]["id"]
    except Exception as e:
        print(f"    [warn] taxon lookup failed for {scientific_name}: {e}")
    return None


def fetch_inat_sounds(scientific_name: str, max_count: int) -> list:
    """Return up to max_count sound dicts for the given taxon from iNaturalist."""
    taxon_id = resolve_taxon_id(scientific_name)
    if taxon_id:
        print(f"    resolved taxon_id={taxon_id} for {scientific_name}")
    else:
        print(f"    [warn] could not resolve taxon_id, falling back to name search")

    collected = []
    page = 1

    while len(collected) < max_count:
        params = {
            "sounds": "true",
            "per_page": 20,
            "page": page,
            "order_by": "votes",
        }
        if taxon_id:
            params["taxon_id"] = taxon_id
        else:
            params["taxon_name"] = scientific_name
        try:
            resp = requests.get(INAT_API, params=params, headers=HEADERS, timeout=20)
            resp.raise_for_status()
        except Exception as e:
            print(f"    [error] API request failed: {e}")
            break

        data = resp.json()
        observations = data.get("results", [])
        if not observations:
            break

        for obs in observations:
            for sound in obs.get("sounds", []):
                url = sound.get("file_url")
                if url:
                    collected.append({
                        "url": url,
                        "obs_id": obs.get("id"),
                        "license": sound.get("license_code", "unknown"),
                        "attribution": sound.get("attribution", ""),
                        "content_type": sound.get("file_content_type", ""),
                    })
                    if len(collected) >= max_count:
                        break
            if len(collected) >= max_count:
                break

        total = data.get("total_results", 0)
        if page * 20 >= total:
            break
        page += 1
        time.sleep(REQUEST_DELAY_S)

    return collected


def ext_for(sound: dict) -> str:
    ct = sound.get("content_type", "")
    url = sound.get("url", "")
    if "m4a" in url or "m4a" in ct or "mp4" in ct:
        return ".m4a"
    if "ogg" in url or "ogg" in ct:
        return ".ogg"
    return ".mp3"


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


def process_sound(sound: dict, idx: int, output_dir: Path, species_name: str):
    url = sound["url"]
    obs_id = sound["obs_id"]
    ext = ext_for(sound)
    base_name = f"{safe_filename(species_name)}_inat{obs_id}_{idx}"
    tmp_path = output_dir / f"_tmp_{base_name}{ext}"

    existing = list(output_dir.glob(f"{base_name}*")) + list(output_dir.glob(f"inaturalist_{base_name}*"))
    if existing:
        print(f"    [skip] {base_name} already present")
        return

    print(f"    downloading obs {obs_id} sound {idx} (license={sound['license']}) ...")
    if not download_file(url, tmp_path):
        return

    try:
        audio = AudioSegment.from_file(str(tmp_path))
    except Exception as e:
        print(f"    [error] could not decode audio: {e}")
        if tmp_path.exists():
            tmp_path.unlink()
        return

    duration_s = len(audio) / 1000
    if duration_s > CHUNK_DURATION_S:
        save_chunks(audio, output_dir, base_name)
        if tmp_path.exists():
            tmp_path.unlink()
    else:
        final_path = output_dir / f"{base_name}.mp3"
        audio.export(str(final_path), format="mp3")
        if tmp_path.exists():
            tmp_path.unlink()
        print(f"      saved: {final_path.name}")

    time.sleep(REQUEST_DELAY_S)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Download iNaturalist audio for frog species")
    parser.add_argument("--max", type=int, default=MAX_SOUNDS, dest="max_count",
                        help=f"Max audio files per species (default: {MAX_SOUNDS})")
    parser.add_argument("--all", action="store_true", dest="run_all",
                        help="Run for all species, not just those missing audio")
    args = parser.parse_args()

    species = load_species()
    print(f"Loaded {len(species)} species from speciesDetails.json")

    if args.run_all:
        targets = [s for s in species if (TRAINING_DIR / folder_name_for(s["name"])).exists()]
        print(f"\nRunning for all {len(targets)} species\n")
    else:
        targets = find_missing_species(species)
        print(f"\n{len(targets)} species missing audio:\n")
        for s in targets:
            print(f"  - {s['name']} ({s['scientific_name']})")

    if not targets:
        print("\nNothing to download.")
        return

    print()
    failed = []
    for s in targets:
        name = s["name"]
        sci = s["scientific_name"]
        output_dir = TRAINING_DIR / folder_name_for(name)
        print(f"\n[{name} / {sci}]")

        sounds = fetch_inat_sounds(sci, args.max_count)
        print(f"  found {len(sounds)} sound(s) on iNaturalist")

        if not sounds:
            print("  no audio found — skipping")
            failed.append(name)
            continue

        for i, sound in enumerate(sounds, 1):
            process_sound(sound, i, output_dir, name)

    print("\nDone.")
    if failed:
        print("No audio found for:", failed)
    else:
        print("All missing species have audio.")


if __name__ == "__main__":
    main()
