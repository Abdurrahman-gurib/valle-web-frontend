import os, re, numpy as np
SHARED_NPY = r'C:\Users\noorg\AppData\Local\Temp\claude\c--Users-noorg-Desktop-Official-Valle-New-Web\90c32d7f-7f34-44e3-8f91-c3635185eb75\scratchpad\shared.npy'
from PIL import Image, ImageFilter
os.chdir(r'C:\Users\noorg\Desktop\Official Valle New Web\Frontend')

# ---------------- quad map variants: no blur, only the loop strokes dimmed, shared stretch recoloured
q = Image.open(r'C:\Users\noorg\Desktop\map valle activities\Quad Buggy MAP.png').convert('RGBA')
al = np.asarray(q)[..., 3]; ys, xs = np.where(al > 10); m = int(q.width * 0.01)
qc = q.crop((max(0, xs.min() - m), max(0, ys.min() - m), min(q.width, xs.max() + m), min(q.height, ys.max() + m)))
canvas = Image.new('RGB', qc.size, (113, 89, 166)); canvas.paste(qc, (0, 0), qc)
arr = np.asarray(canvas).astype(float); r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
H, W = r.shape

def big_components(mask, frac=0.04):
    lab = np.zeros(mask.shape, np.int32); n = 0
    ys, xs = np.where(mask)
    for y0, x0 in zip(ys, xs):
        if lab[y0, x0]: continue
        n += 1; st = [(y0, x0)]; lab[y0, x0] = n
        while st:
            y, x = st.pop()
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    ny, nx = y + dy, x + dx
                    if 0 <= ny < H and 0 <= nx < W and mask[ny, nx] and not lab[ny, nx]:
                        lab[ny, nx] = n; st.append((ny, nx))
    sizes = np.bincount(lab.ravel())[1:]
    keep = [i + 1 for i, s in enumerate(sizes) if s > frac * sizes.sum()]
    return np.isin(lab, keep)

def dil(mk, k):
    im = Image.fromarray((mk * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(2 * k + 1))
    return np.asarray(im) > 0

yellow = big_components((r > 200) & (g > 200) & (b < 140))
red = big_components((r > 190) & (g < 130) & (b < 130))
print('yellow px', yellow.sum(), 'red px', red.sum())
# The red track runs under the yellow loop on the stretch between the split and the base:
# yellow pixels with red pixels on both sides of the stroke belong to both loops.
# Shared stretch: the yellow loop runs on top of the red track from the split (pin 1) to the base (Q).
# Take the shortest path through the yellow stroke between those two pins and widen it to the stroke.
import heapq
ms = open('src/data/maps.ts', encoding='utf-8').read()
def pin(code):
    m = re.search(r"n: '%s', px: ([\d.]+), py: ([\d.]+)" % code, ms); return (float(m.group(2)) / 100 * H, float(m.group(1)) / 100 * W)
def nearest(mask, pt):
    ys_, xs_ = np.where(mask); i = np.argmin((ys_ - pt[0]) ** 2 + (xs_ - pt[1]) ** 2); return (int(ys_[i]), int(xs_[i]))
yraw = (r > 200) & (g > 200) & (b < 140)
ywide = dil(yraw, 6)
a, bq = nearest(ywide, pin('1')), nearest(ywide, pin('Q'))
prev = {a: None}; pq = [(0.0, a)]; distm = {a: 0.0}
while pq:
    d, u = heapq.heappop(pq)
    if u == bq: break
    if d > distm[u]: continue
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            v = (u[0] + dy, u[1] + dx)
            if dy == dx == 0 or not (0 <= v[0] < H and 0 <= v[1] < W) or not ywide[v]: continue
            nd = d + (1.4142 if dy and dx else 1.0) * (1.0 if yraw[v] else 6.0)
            if nd < distm.get(v, 1e18): distm[v] = nd; prev[v] = u; heapq.heappush(pq, (nd, v))
path = np.zeros_like(yellow); c = bq
while c is not None: path[c] = True; c = prev.get(c)
print('pins', a, bq, 'path px', path.sum())
shared = yraw & dil(path, 20)
np.save(SHARED_NPY, shared)
print('shared px', shared.sum())
red_col = np.array([np.median(r[red]), np.median(g[red]), np.median(b[red])])
dark = np.array([58, 30, 120], float)

def save(im_arr, name):
    im = Image.fromarray(im_arr.astype(np.uint8)).filter(ImageFilter.UnsharpMask(radius=1.4, percent=70, threshold=2))
    im.save(f'public/images/{name}.webp', quality=95, method=6); print(name, im.size)

# ---- erase both printed loops (labels, icons and roads stay), so the drawn strokes are the only trails
def label_all(mask):
    lab = np.zeros(mask.shape, np.int32); n = 0
    ys, xs = np.where(mask)
    for y0, x0 in zip(ys, xs):
        if lab[y0, x0]: continue
        n += 1; st = [(y0, x0)]; lab[y0, x0] = n
        while st:
            y, x = st.pop()
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    ny, nx = y + dy, x + dx
                    if 0 <= ny < H and 0 <= nx < W and mask[ny, nx] and not lab[ny, nx]:
                        lab[ny, nx] = n; st.append((ny, nx))
    return lab, n
rawmask = (((r > 200) & (g > 200) & (b < 140)) | ((r > 190) & (g < 130) & (b < 130)))
# Protect the labelled places (photo pins with their label pills, the reception icons, the quad
# icon at the base, the Coloured Earth hatch): boxes around the map pins, everything else
# trail-coloured is erased.
protect = np.zeros_like(rawmask)
def box(code, up, down, half):
    py_, px_ = pin(code); protect[max(0, int(py_) - up):int(py_) + down, max(0, int(px_) - half):int(px_) + half] = True
for code, up, down, half in [('7', 60, 100, 70), ('6', 60, 95, 48), ('4', 60, 80, 55), ('5', 60, 80, 55), ('A', 50, 70, 90), ('Q', 55, 60, 75), ('AF', 30, 30, 30)]:
    box(code, up, down, half)
# small icons: the Kazmaël house pictogram and the parking sign (yellow car on green)
def rect(x0, y0, x1, y1): protect[y0:y1, x0:x1] = True
rect(446, 750, 482, 790); rect(985, 720, 1090, 830)
# the 23 Coloured Earth hatch is red-toned: keep it, but not the printed yellow loop around it
py3, px3 = pin('3'); b3 = np.zeros_like(rawmask); b3[int(py3) - 50:int(py3) + 50, int(px3) - 115:int(px3) + 115] = True
protect |= b3 & ~((r > 200) & (g > 200) & (b < 140))
erase = dil(rawmask & ~protect, 3) & ~protect
print('protected px', protect.sum())
img = arr.copy()
known = ~erase
for _ in range(60):                      # onion-peel inpaint from the surrounding pixels
    if known.all(): break
    grown = dil(known, 1) & ~known
    acc = np.zeros_like(img); cnt = np.zeros(known.shape, float)
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            if dy == dx == 0: continue
            sh_k = np.roll(np.roll(known, dy, 0), dx, 1); sh_i = np.roll(np.roll(img, dy, 0), dx, 1)
            acc += sh_i * sh_k[..., None]; cnt += sh_k
    fill = grown & (cnt > 0)
    img[fill] = acc[fill] / cnt[fill][:, None]
    known |= fill
# soften the filled area slightly so no stroke ghost remains
from PIL import ImageFilter as IF
soft = np.asarray(Image.fromarray(img.astype(np.uint8)).filter(IF.GaussianBlur(1.6))).astype(float)
img = np.where(dil(erase, 1)[..., None], soft, img)
Image.fromarray(img.astype(np.uint8)).filter(ImageFilter.UnsharpMask(radius=1.4, percent=70, threshold=2)).save('public/images/quad-map-trails-erased.webp', quality=95, method=6)
print('erased', erase.sum(), 'px')
