import re
from pathlib import Path

html_text = Path("frontend/index.html").read_text(encoding="utf-8")
js_text = Path("frontend/app.js").read_text(encoding="utf-8")

onclicks = re.findall(r'onclick=["\']([a-zA-Z0-9_]+)\(', html_text)
print("Unique onclick functions in index.html:", len(set(onclicks)))

for fn in sorted(set(onclicks)):
    # Check if fn is defined in JS
    in_js = (f"function {fn}" in js_text) or (f"window.{fn}" in js_text) or (f"{fn} =" in js_text)
    if not in_js:
        print(f"  MISSING IN JS: {fn}")
    else:
        print(f"  OK: {fn}")
