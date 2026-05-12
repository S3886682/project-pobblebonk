"""
Downloads frog recordings from Xeno-Canto for species missing from the dataset.
Recordings longer than CHUNK_DURATION_S are split into 25-second chunks.

Usage:
    python download_xeno_canto.py --api-key YOUR_KEY
    python download_xeno_canto.py --api-key YOUR_KEY --max 15 --quality A
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
MAX_RECORDINGS = 10          # per species
QUALITY_FILTER = ["A", "B"]  # Xeno-Canto quality grades to accept
COUNTRY_FILTER = "Australia"
REQUEST_DELAY_S = 1.0        # polite delay between API calls

BASE_DIR = Path(__file__).parent
TRAINING_DIR = BASE_DIR / "datasets" / "updated" / "Training Audio"
SPECIES_JSON = BASE_DIR.parent / "FrogFinder" / "assets" / "data" / "speciesDetails.json"
XENO_CANTO_API = "https://xeno-canto.org/api/3/recordings"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def load_species():
    with open(SPECIES_JSON, encoding="utf-8") as f:
        return json.load(f)


def folder_name_for(species_name: str) -> str:
    """Map a species common name to its Training Audio folder name."""
    # Folder names in the dataset drop apostrophes and use title case
    return species_name.replace("'", "")


def find_missing_species(species: list) -> list:
    """Return species whose Training Audio folder has no audio files."""
    missing = []
    for s in species:
        folder = TRAINING_DIR / folder_name_for(s["name"])
        if not folder.exists():
            print(f"  [warn] folder not found: {folder.name}")
            continue
        audio_files = list(folder.glob("*.mp3")) + list(folder.glob("*.wav"))
        if not audio_files:
            missing.append(s)
    return missing


def safe_filename(name: str) -> str:
    return name.replace(" ", "_").replace("'", "").replace("/", "-")


def query_xeno_canto(scientific_name: str, api_key: str, page: int = 1) -> dict:
    # API v3 requires tag-based queries: gen:<genus> sp:<epithet> cnt:<country>
    parts = scientific_name.strip().split()
    genus, epithet = parts[0], parts[1] if len(parts) > 1 else ""
    query = f"gen:{genus} sp:{epithet} cnt:{COUNTRY_FILTER}"
    params = {"query": query, "key": api_key, "page": page}
    resp = requests.get(XENO_CANTO_API, params=params, timeout=30)
    resp.raise_for_status()
    return resp.json()


def fetch_recordings(scientific_name: str, api_key: str, quality: list, max_count: int) -> list:
    """Collect up to max_count recordings of the requested quality grades."""
    collected = []
    page = 1

    while len(collected) < max_count:
        print(f"    querying page {page} for '{scientific_name}' ...")
        try:
            data = query_xeno_canto(scientific_name, api_key, page)
        except Exception as e:
            print(f"    [error] API request failed: {e}")
            break

        recordings = data.get("recordings", [])
        if not recordings:
            break

        for rec in recordings:
            if rec.get("q") in quality:
                collected.append(rec)
                if len(collected) >= max_count:
                    break

        num_pages = int(data.get("numPages", 1))
        if page >= num_pages:
            break
        page += 1
        time.sleep(REQUEST_DELAY_S)

    return collected


def download_file(url: str, dest: Path) -> bool:
    try:
        # Xeno-Canto audio URLs sometimes need the scheme
        if url.startswith("//"):
            url = "https:" + url
        resp = requests.get(url, timeout=60, stream=True)
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
        # Skip very short trailing chunks (< 5 s)
        if len(chunk) < 5000:
            continue
        out_path = output_dir / f"{base_name}_chunk{i + 1}.mp3"
        chunk.export(str(out_path), format="mp3")
        print(f"      saved chunk {i + 1}/{num_chunks}: {out_path.name}")


def process_recording(rec: dict, output_dir: Path, species_name: str):
    xc_id = rec.get("id", "unknown")
    file_url = rec.get("file", "")
    length_str = rec.get("length", "0:00")  # e.g. "1:23"

    if not file_url:
        print(f"    [skip] recording {xc_id} has no file URL")
        return

    base_name = f"{safe_filename(species_name)}_{xc_id}"
    tmp_path = output_dir / f"_tmp_{base_name}.mp3"

    # Skip if already downloaded (any chunk or single file)
    existing = list(output_dir.glob(f"{base_name}*.mp3"))
    if existing:
        print(f"    [skip] {base_name} already present")
        return

    # Parse length
    try:
        parts = length_str.split(":")
        total_s = int(parts[0]) * 60 + int(parts[1]) if len(parts) == 2 else int(parts[0])
    except Exception:
        total_s = 0

    print(f"    downloading XC{xc_id} (quality={rec.get('q')}, length={length_str}) ...")
    if not download_file(file_url, tmp_path):
        return

    if total_s > CHUNK_DURATION_S:
        try:
            audio = AudioSegment.from_file(str(tmp_path))
            save_chunks(audio, output_dir, base_name)
        except Exception as e:
            print(f"    [error] chunking failed: {e}")
            single_out = output_dir / f"{base_name}.mp3"
            tmp_path.rename(single_out)
            print(f"      saved as-is: {single_out.name}")
        finally:
            if tmp_path.exists():
                tmp_path.unlink()
    else:
        final_path = output_dir / f"{base_name}.mp3"
        tmp_path.rename(final_path)
        print(f"      saved: {final_path.name}")

    time.sleep(REQUEST_DELAY_S)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Download Xeno-Canto recordings for missing frog species")
    parser.add_argument("--api-key", required=True, help="Your Xeno-Canto API key")
    parser.add_argument("--max", type=int, default=MAX_RECORDINGS, dest="max_count",
                        help=f"Max recordings per species (default: {MAX_RECORDINGS})")
    parser.add_argument("--quality", nargs="+", default=QUALITY_FILTER,
                        help=f"Accepted quality grades (default: {QUALITY_FILTER})")
    args = parser.parse_args()

    species = load_species()
    print(f"Loaded {len(species)} species from speciesDetails.json")

    missing = find_missing_species(species)
    print(f"\n{len(missing)} species missing audio:\n")
    for s in missing:
        print(f"  - {s['name']} ({s['scientific_name']})")

    if not missing:
        print("\nNothing to download.")
        return

    print()
    for s in missing:
        name = s["name"]
        sci_name = s["scientific_name"]
        output_dir = TRAINING_DIR / folder_name_for(name)
        print(f"\n[{name}]")

        recordings = fetch_recordings(sci_name, args.api_key, args.quality, args.max_count)
        print(f"  found {len(recordings)} matching recording(s)")

        if not recordings:
            print("  no recordings found — skipping")
            continue

        for rec in recordings:
            process_recording(rec, output_dir, name)

    print("\nDone.")


if __name__ == "__main__":
    main()
