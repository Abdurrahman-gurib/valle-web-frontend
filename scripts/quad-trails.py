"""Quad trail centrelines as a shortest-path tree from the quad base: each chain is traced after
its parent, so the loop grows outward from the base. Output: src/data/quadTrails.ts"""
import os, json, math, heapq, numpy as np
from PIL import Image, ImageDraw
os.chdir(r'C:\Users\noorg\Desktop\Official Valle New Web\Frontend')
S = r'C:\Users\noorg\AppData\Local\Temp\claude\c--Users-noorg-Desktop-Official-Valle-New-Web\90c32d7f-7f34-44e3-8f91-c3635185eb75\scratchpad'
exec(open(S + '/trails.py', encoding='utf-8').read().split('result = {}')[0].split("q = Image.open")[0])  # imports only
q = Image.open(r'C:\Users\noorg\Desktop\map valle activities\Quad Buggy MAP.png').convert('RGBA')
bg = (113, 89, 166)
canvas = Image.new('RGB', q.size, bg); canvas.paste(q, (0, 0), q)
a = np.asarray(canvas).astype(int); r, g, b = a[..., 0], a[..., 1], a[..., 2]
W, H = q.size
masks = {
    'discovery': (r > 200) & (g > 200) & (b < 140),
    'adventure': (r > 190) & (g < 130) & (b < 130),
}
BASE = (0.713 * W, 0.576 * H)
src = open(S + '/trails.py', encoding='utf-8').read()
# reuse helpers
ns = {}
exec(src[src.index('def dilate'):src.index('result = {}')], globals())

SHARED = r'C:\Users\noorg\AppData\Local\Temp\claude\c--Users-noorg-Desktop-Official-Valle-New-Web\90c32d7f-7f34-44e3-8f91-c3635185eb75\scratchpad\shared.npy'
NB8 = [(dy, dx, math.hypot(dy, dx)) for dy in (-1, 0, 1) for dx in (-1, 0, 1) if (dy, dx) != (0, 0)]
result = {}
arrows_by_loop = {}
dbg = canvas.copy(); dd = ImageDraw.Draw(dbg)
masks['adventure'] = masks['adventure'] | np.load(SHARED)
for name, m in masks.items():
    m = dilate(m, 3); m = erode(m, 3); m = dilate(m, 4)
    lab, n = components(m)
    sizes = np.bincount(lab.ravel())[1:]
    keep = [i + 1 for i, s in enumerate(sizes) if s > 0.04 * sizes.sum()]
    m = np.isin(lab, keep)
    sk = zhang_suen(m)
    pts = set(zip(*np.where(sk)))
    # connected pixel components of the skeleton; bridge the others to the main one at their
    # closest pixels (the red trail is cut where the yellow one is drawn over it, and vice versa)
    seen = set(); comps = []
    for p0 in pts:
        if p0 in seen: continue
        st = [p0]; seen.add(p0); comp = {p0}
        while st:
            y, x = st.pop()
            for dy, dx, _ in NB8:
                p = (y + dy, x + dx)
                if p in pts and p not in seen: seen.add(p); comp.add(p); st.append(p)
        comps.append(comp)
    comps.sort(key=len, reverse=True)
    main = set(comps[0]); rest = [c for c in comps[1:] if len(c) > 15]
    extra = {}   # pixel -> [(pixel, weight)]
    while rest:
        A = np.array(list(main)); best = None
        for ci, c in enumerate(rest):
            B = np.array(list(c))
            d = np.sqrt(((A[:, None, :] - B[None, :, :]) ** 2).sum(-1))
            i, j = np.unravel_index(d.argmin(), d.shape)
            if best is None or d[i, j] < best[0]: best = (d[i, j], ci, tuple(A[i]), tuple(B[j]))
        dmin, ci, pa, pb = best
        if dmin > 60: print('  dropping component', len(rest[ci]), 'px at', dmin); rest.pop(ci); continue
        extra.setdefault(pa, []).append((pb, float(dmin))); extra.setdefault(pb, []).append((pa, float(dmin)))
        main |= rest.pop(ci)
    pts = main
    # Dijkstra from the skeleton pixel nearest the base
    root = min(pts, key=lambda p: math.hypot(p[1] - BASE[0], p[0] - BASE[1]))
    dist = {root: 0.0}; pred = {}; pq = [(0.0, root)]
    while pq:
        d, u = heapq.heappop(pq)
        if d > dist[u]: continue
        nbrs = [((u[0] + dy, u[1] + dx), w) for dy, dx, w in NB8] + extra.get(u, [])
        for v, w in nbrs:
            if v in pts and d + w < dist.get(v, 1e18):
                dist[v] = d + w; pred[v] = u; heapq.heappush(pq, (d + w, v))
    children = {}
    for v, u in pred.items(): children.setdefault(u, []).append(v)
    # chains: start at root and after every branch point
    chains = []
    def walk(parent, first):
        ch = [parent, first]; cur = first
        while len(children.get(cur, [])) == 1:
            cur = children[cur][0]; ch.append(cur)
        return ch, cur
    stack = [root]
    while stack:
        p = stack.pop()
        for c in children.get(p, []):
            ch, end = walk(p, c)
            chains.append(ch)
            if len(children.get(end, [])) > 1: stack.append(end)
    # drop tiny leaf spurs (skeleton noise, arrowheads)
    def is_leaf(p): return not children.get(p)
    # prune short dead-end spurs, but never a chain whose end meets another part of the trail
    # (that is where a loop was cut into two branches; dropping it would open a gap)
    def closes_loop(ch):
        own = set(ch[-6:]); y, x = ch[-1]
        return any((y + dy, x + dx) in pts and (y + dy, x + dx) not in own for dy in range(-4, 5) for dx in range(-4, 5))
    spurs = [ch for ch in chains if is_leaf(ch[-1]) and dist[ch[-1]] - dist[ch[0]] < 70 and not closes_loop(ch)]
    chains = [ch for ch in chains if not (is_leaf(ch[-1]) and dist[ch[-1]] - dist[ch[0]] < 70 and not closes_loop(ch))]
    # ---- arrowheads: the printed map draws chevrons on the loops; after skeletonisation each one is a
    # short spur (or a pair) leaving the centreline at a junction. Direction of travel = from the spur
    # tip(s) towards the junction, projected onto the trail's tangent there.
    main_pts = set(p_ for ch in chains for p_ in ch)
    def tangent_at(j):
        near = [q for q in main_pts if abs(q[0] - j[0]) <= 10 and abs(q[1] - j[1]) <= 10]
        if len(near) < 4: return None
        ys_ = np.array([q[0] for q in near], float); xs_ = np.array([q[1] for q in near], float)
        ys_ -= ys_.mean(); xs_ -= xs_.mean()
        cov = np.array([[ (xs_ * xs_).sum(), (xs_ * ys_).sum()], [(xs_ * ys_).sum(), (ys_ * ys_).sum()]])
        w, v = np.linalg.eigh(cov); t = v[:, int(np.argmax(w))]   # (dx, dy)
        return t / (np.hypot(*t) or 1)
    raw = []
    for ch in spurs:
        j = ch[0]; tip = ch[-1]
        if dist[tip] - dist[j] < 8: continue
        t = tangent_at(j)
        if t is None: continue
        v = np.array([j[1] - tip[1], j[0] - tip[0]], float)      # tip -> junction (dx, dy)
        sgn = 1.0 if float(v @ t) >= 0 else -1.0
        raw.append((j[1], j[0], t[0] * sgn, t[1] * sgn))
    # merge the two halves of one chevron (same junction) and drop near-duplicates
    arrows = []
    for x, y, dx, dy in raw:
        for a in arrows:
            if abs(a[0] - x) <= 14 and abs(a[1] - y) <= 14:
                a[2] += dx; a[3] += dy; a[4] += 1; break
        else:
            arrows.append([x, y, dx, dy, 1])
    arrow_out = []
    for x, y, dx, dy, n in arrows:
        L_ = np.hypot(dx, dy)
        if L_ < 0.3: continue
        arrow_out.append({'x': round(x / W * 100, 2), 'y': round(y / H * 100, 2), 'a': round(float(np.degrees(np.arctan2(dy / L_, dx / L_))), 1)})
    arrows_by_loop[name] = arrow_out
    print(name, 'arrowheads', len(arrow_out), 'from', len(spurs), 'spurs')
    # ---- timeline: one pen rides the loop. Chains form a tree from the root; the two deepest root
    # branches (A, B) are the two halves of the loop. A is drawn outward; B is drawn from its far end
    # back to the root so the pen comes home. Side spurs light up when the pen passes their junction.
    by_start = {}
    for ch in chains: by_start.setdefault(ch[0], []).append(ch)
    def subtree(ch):  # all chains under ch (inclusive)
        out = [ch]; st = [ch]
        while st:
            c = st.pop()
            for k in by_start.get(c[-1], []): out.append(k); st.append(k)
        return out
    def depth(ch): return dist[ch[-1]]
    roots = sorted(by_start.get(root, []), key=lambda c: -max(depth(k) for k in subtree(c)))
    A = roots[0] if roots else None; B = roots[1] if len(roots) > 1 else None
    timing = {}   # id(ch) -> (t0, reversed)
    def draw_outward(ch, t0):
        timing[id(ch)] = (t0, False)
        for k in by_start.get(ch[-1], []): draw_outward(k, t0 + (dist[ch[-1]] - dist[ch[0]]))
    T = 0.0
    for c in roots:
        if c is B: continue
        draw_outward(c, T)
        if c is A: T += max(depth(k) for k in subtree(c)) - dist[root]
    if B is not None:
        # trunk = path from root to the deepest chain end in B
        subB = subtree(B); deepest = max(subB, key=depth)
        parent_of = {id(k): c for c in subB for k in by_start.get(c[-1], [])}
        trunk = set(); c = deepest
        while True:
            trunk.add(id(c)); c = parent_of.get(id(c))
            if c is None: break
        D = depth(deepest)
        def draw_B(ch, t_junction):
            if id(ch) in trunk:
                t0 = T + (D - dist[ch[-1]]); timing[id(ch)] = (t0, True)
                for k in by_start.get(ch[-1], []): draw_B(k, T + (D - dist[ch[-1]]))
            else:
                timing[id(ch)] = (t_junction, False)
                for k in by_start.get(ch[-1], []): draw_B(k, t_junction + (dist[ch[-1]] - dist[ch[0]]))
        draw_B(B, T + (D - dist[root]))
    out = []
    for ch in chains:
        t0, rev = timing.get(id(ch), (0.0, False))
        pts_xy = [(x, y) for y, x in ch]
        if rev: pts_xy = pts_xy[::-1]
        for _ in range(2):
            if len(pts_xy) < 3: break
            out2 = [pts_xy[0]]
            for (x0, y0), (x1, y1) in zip(pts_xy, pts_xy[1:]):
                out2.append((0.75 * x0 + 0.25 * x1, 0.75 * y0 + 0.25 * y1)); out2.append((0.25 * x0 + 0.75 * x1, 0.25 * y0 + 0.75 * y1))
            out2.append(pts_xy[-1]); pts_xy = out2
        simp = rdp(pts_xy, 0.9)
        L = dist[ch[-1]] - dist[ch[0]]
        out.append({'d0': round(t0, 1), 'len': round(L, 1), 'pts': [[round(x / W * 100, 2), round(y / H * 100, 2)] for x, y in simp]})
        dd.line([(x, y) for x, y in simp], fill=(255, 255, 255) if name == 'discovery' else (0, 255, 255), width=3)
    result[name] = out
    print(name, 'chains', len(out), 'points', sum(len(e['pts']) for e in out), 'total px', round(sum(e['len'] for e in out)), 'reach', round(max(e['d0'] + e['len'] for e in out)))
dbg.save(S + '/trails_debug.png')
ts = "// Generated from the official Quad & Buggy map (scratchpad/trails2.py): trail centrelines as a\n// shortest-path tree from the quad base. `pts` are % of the map image, `d0` = trail distance (px)\n// from the base to the chain start, `len` = chain length (px), so each loop traces outward from the base.\n"
ts += "export interface TrailEdge { d0: number; len: number; pts: [number, number][] }\n"
ts += "export const QUAD_TRAILS: Record<string, TrailEdge[]> = " + json.dumps(result, separators=(',', ':')) + ";\n"
ts += "/** Direction arrows recovered from the map's printed chevrons: position in % and angle in degrees (0 = east, clockwise). */\n"
ts += "export interface TrailArrow { x: number; y: number; a: number }\n"
ts += "export const QUAD_ARROWS: Record<string, TrailArrow[]> = " + json.dumps(arrows_by_loop, separators=(',', ':')) + ";\n"
open('src/data/quadTrails.ts', 'w', encoding='utf-8').write(ts)
print('written', os.path.getsize('src/data/quadTrails.ts') // 1024, 'KB')
