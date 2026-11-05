"""
Smaller copies of the site photos for responsive <img srcset>.

For every raster under public/images wider than 640 px this writes
<name>-<w>w.<ext> next to the original for each width in WIDTHS that is
narrower than the original (same format: webp stays webp, avif stays avif),
keeps a copy only when it is clearly lighter than the next wider file, and
lists the originals (relative to /images/) as [original width, copy widths]
in src/data/imageVariants.json.
The Img component reads that list to add srcset; originals are kept, so a
missing variant only means the full-size file is served.

    python scripts/image-variants.py          # only what is missing
    python scripts/image-variants.py --force  # re-encode everything

Needs Pillow 11+ (AVIF and WebP support).
"""
import json
import os
import re
import sys
from PIL import Image, ImageOps

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
IMAGES = os.path.join(ROOT, 'public', 'images')
OUT = os.path.join(ROOT, 'src', 'data', 'imageVariants.json')
WIDTHS = [640, 960, 1440, 1920]
VARIANT = re.compile(r'-\d+w\.(webp|avif|jpe?g|png)$', re.I)
FORCE = '--force' in sys.argv


def save(im, path, ext):
    if ext == 'webp':
        im.save(path, 'WEBP', quality=76, method=6)
    elif ext == 'avif':
        im.save(path, 'AVIF', quality=52, speed=6)
    elif ext in ('jpg', 'jpeg'):
        im.convert('RGB').save(path, 'JPEG', quality=80, optimize=True, progressive=True)
    else:
        im.save(path, 'PNG', optimize=True)


manifest = {}
made = 0
for dirpath, _, names in os.walk(IMAGES):
    for name in sorted(names):
        ext = name.rsplit('.', 1)[-1].lower()
        if ext not in ('webp', 'avif', 'jpg', 'jpeg', 'png') or VARIANT.search(name):
            continue
        src = os.path.join(dirpath, name)
        try:
            with Image.open(src) as im0:
                width = im0.size[0]
                if width <= WIDTHS[0]:
                    continue
                # keys are relative to /images/ to keep the list small in the bundle
                url = os.path.relpath(src, IMAGES).replace(os.sep, '/')
                im = None
                kept = []
                # widest first: a copy is kept only when it is clearly lighter than the
                # next wider file (some originals are already squeezed hard)
                ceiling = os.path.getsize(src)
                for w in sorted((w for w in WIDTHS if w < width), reverse=True):
                    dst = src[: -len(ext) - 1] + f'-{w}w.{ext}'
                    if FORCE or not os.path.exists(dst):
                        if im is None:
                            im = ImageOps.exif_transpose(im0)
                            if im.mode not in ('RGB', 'RGBA'):
                                im = im.convert('RGBA' if 'A' in im.getbands() else 'RGB')
                        h = round(im.size[1] * w / im.size[0])
                        save(im.resize((w, h), Image.LANCZOS), dst, ext)
                        made += 1
                    size = os.path.getsize(dst)
                    if size > ceiling * 0.8:
                        os.remove(dst)
                        continue
                    kept.append(w)
                    ceiling = size
                if kept:
                    # [original width, copy widths...]
                    manifest[url] = [width] + sorted(kept)
        except Exception as e:  # a broken file keeps its original only
            print('skip', src, e)

with open(OUT, 'w', encoding='utf8', newline='\n') as f:
    json.dump(dict(sorted(manifest.items())), f, separators=(',', ':'))
    f.write('\n')
print(f'{len(manifest)} images with variants, {made} files written -> {os.path.relpath(OUT, ROOT)}')
