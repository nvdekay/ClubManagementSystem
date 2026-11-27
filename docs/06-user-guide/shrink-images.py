"""Reduces the guide screenshots to a 256-colour palette so the repo and GUIDE_BOOK.html stay light.

Run after `npm run guide:screenshots`: python3 docs/06-user-guide/shrink-images.py
Needs Pillow (pip install Pillow). Already-reduced images (palette mode) are left as they are.
"""
from pathlib import Path

from PIL import Image

root = Path(__file__).resolve().parent / 'images'
before = after = 0
for path in sorted(root.glob('*.png')):
    image = Image.open(path)
    size = path.stat().st_size
    before += size
    if image.mode == 'P':
        after += size
        continue
    image.convert('RGB').quantize(colors=256, method=Image.Quantize.MEDIANCUT).save(path, optimize=True)
    after += path.stat().st_size
print(f'{len(list(root.glob("*.png")))} images: {before // 1024} KB -> {after // 1024} KB')
