"""
Generates data/reliability_test_100.csv containing 95 valid rows and 5 intentionally corrupted rows.
"""

import csv
from pathlib import Path

out_path = Path(__file__).resolve().parent / "reliability_test_100.csv"

# Base templates to repeat cleanly across 95 valid items
valid_templates = [
    ("Toshiba Refrigerator 16ft", "Appliances", "Toshiba Refrigerator 16ft No-Frost", "Sidi Beshr", "valid_img_1.jpg", "A", 14500.0),
    ("LG Washing Machine 8kg", "Appliances", "LG Washing Machine 8kg Direct Drive", "Smouha", "valid_img_2.jpg", "B", 12400.0),
    ("Carrier AC 1.5HP", "Appliances", "Carrier Air Conditioner 1.5HP Optimax", "Miami", "valid_img_3.jpg", "B", 12800.0),
    ("Samsung Microwave 28L", "Appliances", "Samsung Microwave 28L Grill", "Moharam Bek", "valid_img_4.jpg", "A", 4200.0),
    ("Universal Cooker 5B", "Appliances", "Universal Cooker 5 Burners Cast Iron", "El-Mansheya", "valid_img_5.jpg", "B", 6000.0),
    ("Dell Latitude 5400", "Electronics", "Dell Latitude 5400 i5 8th Gen", "Smouha", "valid_img_6.jpg", "B", 7600.0),
    ("iPhone 13 128GB", "Electronics", "Apple iPhone 13 128GB Midnight", "Gleem", "valid_img_7.jpg", "A", 24500.0),
    ("Samsung TV 55 UHD", "Electronics", "Samsung TV 55 Inch Crystal UHD 4K", "Loran", "valid_img_8.jpg", "A", 15000.0),
    ("PlayStation 4 Pro 1TB", "Electronics", "Sony PlayStation 4 Pro 1TB", "Sidi Beshr", "valid_img_9.jpg", "B", 9200.0),
    ("Salon Attarine Antique", "Furniture", "Salon Attarine Louis Quinze Antique", "El-Attarine", "valid_img_10.jpg", "A", 22000.0),
    ("Damietta Bedroom Set", "Furniture", "Damietta Solid Oak Bedroom Set", "Smouha", "valid_img_11.jpg", "B", 28000.0),
    ("Modern Corner Sofa", "Furniture", "Modern L-Shaped Corner Sofa Velvet", "Roushdy", "valid_img_12.jpg", "A", 12500.0),
    ("Solid Beech Dining Set", "Furniture", "Solid Beech Dining Table + 6 Chairs", "Gleem", "valid_img_13.jpg", "B", 13200.0),
    ("Executive Wood Desk", "Furniture", "Executive Solid Wood Office Desk 160cm", "El-Attarine", "valid_img_14.jpg", "B", 5200.0),
]

headers = ["item_id", "title", "category", "brand_model", "district", "image_urls", "condition_grade", "quoted_price"]

rows = []

# Generate 95 valid items
for i in range(1, 96):
    tmpl = valid_templates[(i - 1) % len(valid_templates)]
    item_id = f"REL-{i:03d}"
    title = f"{tmpl[0]} Spec #{i}"
    category = tmpl[1]
    brand_model = tmpl[2]
    district = tmpl[3]
    img = f"img_rel_{i}.jpg"
    grade = tmpl[5]
    price = tmpl[6]
    rows.append([item_id, title, category, brand_model, district, img, grade, price])

# Add 5 intentionally corrupted items to verify fault tolerance & skipped_items_log
# Corrupt 1: Empty category
rows.append(["REL-CORRUPT-01", "Corrupt Empty Category Item", "", "Samsung TV 55 Inch Crystal UHD 4K", "Smouha", "img_c1.jpg", "A", 15000.0])

# Corrupt 2: Missing image (empty image_urls)
rows.append(["REL-CORRUPT-02", "Corrupt Missing Image Item", "Electronics", "Apple iPhone 13 128GB Midnight", "Gleem", "", "A", 24500.0])

# Corrupt 3: Negative quoted price (quoted_price <= 0)
rows.append(["REL-CORRUPT-03", "Corrupt Negative Price Item", "Appliances", "Kiriazi Refrigerator 14ft Defrost", "El-Attarine", "img_c3.jpg", "D", -500.0])

# Corrupt 4: Zero quoted price (quoted_price <= 0)
rows.append(["REL-CORRUPT-04", "Corrupt Zero Price Item", "Furniture", "Modern L-Shaped Corner Sofa Velvet", "Sidi Beshr", "img_c4.jpg", "B", 0.0])

# Corrupt 5: Both missing image and empty category
rows.append(["REL-CORRUPT-05", "Corrupt Severe Malformed Item", "", "Unknown Broken Gadget", "Unknown", "", "D", -1200.0])

with open(out_path, mode="w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerow(headers)
    writer.writerows(rows)

print(f"Generated {len(rows)} items ({len(rows)-5} valid + 5 corrupt) at {out_path}")
