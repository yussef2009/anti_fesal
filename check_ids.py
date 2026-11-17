import re
from pathlib import Path

js_text = Path("frontend/app.js").read_text(encoding="utf-8")
html_text = Path("frontend/index.html").read_text(encoding="utf-8")

js_ids = set(re.findall(r"getElementById\(['\"]([a-zA-Z0-9_\-]+)['\"]", js_text))
html_ids = set(re.findall(r'id=["\']([a-zA-Z0-9_\-]+)["\']', html_text))

missing = sorted(list(js_ids - html_ids))
print(f"Total IDs referenced in app.js: {len(js_ids)}")
print(f"Total IDs in index.html: {len(html_ids)}")
print(f"Missing in HTML ({len(missing)}):")
for m in missing:
    print(f"  - {m}")
