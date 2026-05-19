import json
import os
import requests
from PIL import Image
from io import BytesIO
import time

SPECIES_FILE = r"FrogFinder\assets\data\speciesDetails.json"
OUTPUT_DIR = r"FrogFinder\assets\data\frog_images"
SIZE = (512, 512)

os.makedirs(OUTPUT_DIR, exist_ok=True)

with open(SPECIES_FILE) as f:
    species_list = json.load(f)

INAT_API = "https://api.inaturalist.org/v1/taxa"
HEADERS = {"User-Agent": "FrogFinderBot/1.0 (educational project; ashleymckinn@gmail.com)"}


def get_inat_image_url(scientific_name, common_name):
    for query in [scientific_name, common_name]:
        params = {"q": query, "rank": "species", "per_page": 5}
        resp = requests.get(INAT_API, params=params, headers=HEADERS, timeout=15)
        if resp.status_code != 200:
            continue
        results = resp.json().get("results", [])
        for taxon in results:
            photo = taxon.get("default_photo")
            if photo:
                # Prefer medium_url, fall back to square_url
                url = photo.get("medium_url") or photo.get("square_url")
                if url:
                    return url
    return None


def download_and_save(url, dest_path):
    resp = requests.get(url, headers=HEADERS, timeout=20)
    resp.raise_for_status()
    img = Image.open(BytesIO(resp.content)).convert("RGB")
    # Scale so shortest side == 512, then center-crop to 512x512
    w, h = img.size
    scale = SIZE[0] / min(w, h)
    img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
    w, h = img.size
    left = (w - SIZE[0]) // 2
    top = (h - SIZE[1]) // 2
    img = img.crop((left, top, left + SIZE[0], top + SIZE[1]))
    img.save(dest_path, "JPEG", quality=90)


failed = []

for species in species_list:
    common = species["name"]
    scientific = species["scientific_name"]
    filename = common.replace(" ", "_") + ".jpg"
    dest = os.path.join(OUTPUT_DIR, filename)

    if os.path.exists(dest):
        print(f"  [skip] {common}")
        continue

    print(f"Fetching: {common} ({scientific})")
    url = get_inat_image_url(scientific, common)

    if url:
        try:
            download_and_save(url, dest)
            print(f"  [ok]   {filename}")
        except Exception as e:
            print(f"  [err]  {filename}: {e}")
            failed.append(common)
    else:
        print(f"  [miss] No image found for {common}")
        failed.append(common)

    time.sleep(1)

print("\nDone.")
if failed:
    print("Failed / no image found for:", failed)
else:
    print("All images downloaded successfully.")
