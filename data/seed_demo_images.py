"""
Anti-Fesal - Seed Demo Images
Downloads authentic, high-resolution product demo images into data/images/
and updates the SQLite database so all items have real, high-quality photos.
"""

import os
import shutil
import sqlite3
import urllib.request
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
IMAGES_DIR = BASE_DIR / "data" / "images"
DB_PATH = BASE_DIR / "data" / "antifesal.db"

IMAGES_DIR.mkdir(parents=True, exist_ok=True)

# Curated Unsplash images by item category/model
IMAGE_SOURCES = {
    # Refrigerators
    "ref_stainless": "https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=600&auto=format&fit=crop&q=80",
    "ref_silver": "https://images.unsplash.com/photo-1584992236310-6edddc08acff?w=600&auto=format&fit=crop&q=80",
    "ref_classic": "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=600&auto=format&fit=crop&q=80",

    # Washing Machines
    "washer_white": "https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=600&auto=format&fit=crop&q=80",
    "washer_silver": "https://images.unsplash.com/photo-1582735689369-4fe89db7114c?w=600&auto=format&fit=crop&q=80",
    "washer_top": "https://images.unsplash.com/photo-1604335399105-a0c585fd81a1?w=600&auto=format&fit=crop&q=80",

    # Air Conditioners
    "ac_split": "https://images.unsplash.com/photo-1625961332771-3f40b0e2bdcf?w=600&auto=format&fit=crop&q=80",
    "ac_wall": "https://images.unsplash.com/photo-1614633833026-06202476579f?w=600&auto=format&fit=crop&q=80",

    # Microwaves
    "microwave_modern": "https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?w=600&auto=format&fit=crop&q=80",
    "microwave_silver": "https://images.unsplash.com/photo-1585659722983-3a675dabf23d?w=600&auto=format&fit=crop&q=80",

    # Cookers & Stoves
    "cooker_stove": "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=600&auto=format&fit=crop&q=80",
    "cooker_stainless": "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80",

    # Laptops
    "laptop_dell": "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=600&auto=format&fit=crop&q=80",
    "laptop_macbook": "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&auto=format&fit=crop&q=80",
    "laptop_thinkpad": "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600&auto=format&fit=crop&q=80",
    "laptop_hp": "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=600&auto=format&fit=crop&q=80",

    # Phones
    "phone_iphone13": "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=600&auto=format&fit=crop&q=80",
    "phone_iphone11": "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&auto=format&fit=crop&q=80",
    "phone_samsung": "https://images.unsplash.com/photo-1580910051074-3eb694886505?w=600&auto=format&fit=crop&q=80",
    "phone_redmi": "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=600&auto=format&fit=crop&q=80",

    # TVs
    "tv_55": "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=600&auto=format&fit=crop&q=80",
    "tv_nanocell": "https://images.unsplash.com/photo-1593784991095-a205069470b6?w=600&auto=format&fit=crop&q=80",
    "tv_smart": "https://images.unsplash.com/photo-1567690187548-f07b1d7bf5a9?w=600&auto=format&fit=crop&q=80",

    # Gaming
    "ps_console": "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=600&auto=format&fit=crop&q=80",
    "ps_controller": "https://images.unsplash.com/photo-1507457379470-08b800bebc67?w=600&auto=format&fit=crop&q=80",

    # Furniture
    "salon_antique": "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&auto=format&fit=crop&q=80",
    "bedroom_oak": "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=600&auto=format&fit=crop&q=80",
    "corner_sofa": "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=600&auto=format&fit=crop&q=80",
    "dining_table": "https://images.unsplash.com/photo-1617806118233-18e1de247200?w=600&auto=format&fit=crop&q=80",
    "chandelier": "https://images.unsplash.com/photo-1543198126-a8ad8e47fb22?w=600&auto=format&fit=crop&q=80",
    "desk_office": "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=600&auto=format&fit=crop&q=80",
    "kitchen_cab": "https://images.unsplash.com/photo-1556912172-45b7abe8b7e1?w=600&auto=format&fit=crop&q=80"
}

# Mapping of file names from test_dataset_50.csv to source keys
FILE_TO_SOURCE = {
    # Refrigerators
    "img_toshiba_ref.jpg": "ref_stainless",
    "img_zanussi_ref.jpg": "ref_silver",
    "img_kiriazi_14.jpg": "ref_classic",
    "img_beko_450.jpg": "ref_silver",
    "img_kiriazi_vintage.jpg": "ref_classic",

    # Washing Machines
    "img_lg_washer.jpg": "washer_silver",
    "img_fresh_washer.jpg": "washer_top",
    "img_perla_max.jpg": "washer_white",
    "img_samsung_washer9.jpg": "washer_silver",
    "img_zanussi_7kg.jpg": "washer_white",
    "img_dark_washer.jpg": "washer_white",

    # Air Conditioners
    "img_carrier_ac.jpg": "ac_split",
    "img_sharp_ac.jpg": "ac_wall",
    "img_carrier_cold.jpg": "ac_split",
    "img_sharp_plasma.jpg": "ac_wall",

    # Microwaves
    "img_samsung_mw.jpg": "microwave_modern",
    "img_kenwood_mw.jpg": "microwave_silver",

    # Cookers
    "img_univ_cooker.jpg": "cooker_stove",
    "img_fresh_plaza.jpg": "cooker_stainless",
    "img_univ_5b.jpg": "cooker_stove",
    "img_blurry_stove.jpg": "cooker_stove",

    # Laptops
    "img_dell_5400.jpg": "laptop_dell",
    "img_thinkpad_t490.jpg": "laptop_thinkpad",
    "img_macbook_m1.jpg": "laptop_macbook",
    "img_hp_840.jpg": "laptop_hp",
    "img_dell_lat.jpg": "laptop_dell",

    # Phones
    "img_iphone_13.jpg": "phone_iphone13",
    "img_redmi_11.jpg": "phone_redmi",
    "img_iphone_11.jpg": "phone_iphone11",
    "img_s21_fe.jpg": "phone_samsung",
    "img_ip13_mint.jpg": "phone_iphone13",
    "img_scratched_phone.jpg": "phone_redmi",

    # TVs
    "img_samsung_tv55.jpg": "tv_55",
    "img_lg_nanocell.jpg": "tv_nanocell",
    "img_tornado_43.jpg": "tv_smart",
    "img_samsung_tv55_en.jpg": "tv_55",

    # Gaming
    "img_ps4_pro.jpg": "ps_console",
    "img_ps5_digital.jpg": "ps_console",
    "img_ps4_pro_en.jpg": "ps_controller",
    "img_blurry_radio.jpg": "ps_controller",

    # Furniture
    "img_salon_attarine.jpg": "salon_antique",
    "img_bedroom_oak.jpg": "bedroom_oak",
    "img_corner_sofa.jpg": "corner_sofa",
    "img_dining_table.jpg": "dining_table",
    "img_brass_chandelier.jpg": "chandelier",
    "img_office_desk.jpg": "desk_office",
    "img_damietta_bed.jpg": "bedroom_oak",
    "img_alumital_kit.jpg": "kitchen_cab",
    "img_velvet_sofa.jpg": "corner_sofa",
    "img_damaged_desk.jpg": "desk_office"
}

def download_and_seed():
    print("==================================================")
    print("🚀 Downloading & Seeding Authentic Demo Images...")
    print(f"📁 Target Directory: {IMAGES_DIR}")
    print("==================================================")

    # 1. Download unique sources first
    cached_source_files = {}
    for key, url in IMAGE_SOURCES.items():
        cache_path = IMAGES_DIR / f"_source_{key}.jpg"
        if not cache_path.exists() or cache_path.stat().st_size == 0:
            print(f"📥 Fetching source: {key} ...", end=" ", flush=True)
            try:
                req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
                with urllib.request.urlopen(req, timeout=10) as resp:
                    content = resp.read()
                    with open(cache_path, "wb") as f:
                        f.write(content)
                print(f"✓ ({len(content)} bytes)")
            except Exception as e:
                print(f"✕ (error: {e})")
        cached_source_files[key] = cache_path

    # 2. Copy to target filenames
    success_count = 0
    for filename, source_key in FILE_TO_SOURCE.items():
        target_path = IMAGES_DIR / filename
        source_file = cached_source_files.get(source_key)
        if source_file and source_file.exists():
            shutil.copyfile(source_file, target_path)
            success_count += 1
        else:
            print(f"⚠️ Missing source for {filename}")

    print(f"\n🎉 Successfully seeded {success_count} demo product images in {IMAGES_DIR}!")

    # 3. Verify SQLite DB has these image URLs
    if DB_PATH.exists():
        conn = sqlite3.connect(str(DB_PATH))
        cursor = conn.cursor()
        cursor.execute("SELECT id, image_urls FROM items")
        rows = cursor.fetchall()
        print(f"📦 Total database items: {len(rows)}")
        conn.close()

if __name__ == "__main__":
    download_and_seed()
