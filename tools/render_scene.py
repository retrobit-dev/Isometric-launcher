"""Renderer offline — cermin Python dari iso/box.ts + iso/room.ts.

Dipakai untuk memeriksa hasil TANPA browser, dan untuk memastikan kontrak
docs/04-KONTRAK-RENDERER.md benar-benar bisa ditiru renderer lain (APK Kotlin).

Pakai:
    node tools/gen_ruang.mjs            # scene versi EDIT
    PIXEL=1 node tools/gen_ruang.mjs    # scene versi PIXEL (sprite)
    python3 tools/render_scene.py       # -> /home/user/ruang_objek.png
    OUT=/tmp/x.png python3 tools/render_scene.py
"""
import json
import math
import os
import sys

from PIL import Image, ImageDraw

AKAR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PALET = json.load(open(os.path.join(AKAR, 'docs', '04-palet.json')))
MAT = PALET['materi']
FLOOR = PALET['lantai']
WALL = PALET['dinding']
BASE = PALET['warnaDasar']
ASET = os.path.join(AKAR, 'prototype', 'public', 'aset')

DENS = 1.775
IW, IH = round(640 * DENS), round(400 * DENS)
HW = 16 * DENS
HH = HW / 2
ZH = HW
CE, CW = 10.0, 10.0
TAU = math.pi * 2
SEGMEN = 24
INK = (0x4A, 0x1E, 0x0A)
CAMPUR = 0.42
SKALA = 1

scene = json.load(open('/tmp/ruang.json'))['scene']


def fit_scene(objs, margin=0.95):
    """Sama dengan fitToScene() di iso/space.ts."""
    global HW, HH, ZH, CE, CW
    if not objs:
        return
    e0 = min(o['pos']['e'] for o in objs)
    e1 = max(o['pos']['e'] + o['size']['e'] for o in objs)
    w0 = min(o['pos']['w'] for o in objs)
    w1 = max(o['pos']['w'] + o['size']['w'] for o in objs)
    zmax = max(o['pos']['z'] + o['size']['z'] for o in objs)
    de, dw = max(0.5, e1 - e0), max(0.5, w1 - w0)
    hw = min((IW * margin) / (de + dw), (IH * margin) / ((de + dw) / 2 + zmax))
    HW, HH, ZH = hw, hw / 2, hw
    CE = (e0 + e1) / 2 - zmax / 2
    CW = (w0 + w1) / 2 - zmax / 2


fit_scene(scene['objects'])

im = Image.new('RGB', (IW, IH), BASE['void'])
d = ImageDraw.Draw(im)
AO_LAP = Image.new('RGBA', (IW, IH), (0, 0, 0, 0))
AO = ImageDraw.Draw(AO_LAP)


def px(e, w, z=0.0):
    return (IW / 2 + ((e - CE) - (w - CW)) * HW, IH / 2 + ((e - CE) + (w - CW)) * HH - z * ZH)


def _hex(c):
    c = c.lstrip('#')
    return int(c[0:2], 16), int(c[2:4], 16), int(c[4:6], 16)


def gelapkan(warna, f=CAMPUR):
    if not (isinstance(warna, str) and len(warna) == 7 and warna.startswith('#')):
        return None
    r, g, b = _hex(warna)
    mix = lambda a, b2: round(a + (b2 - a) * f)
    return (mix(r, INK[0]), mix(g, INK[1]), mix(b, INK[2]))


def terangkan(warna, f=0.30):
    if not (isinstance(warna, str) and len(warna) == 7 and warna.startswith('#')):
        return None
    r, g, b = _hex(warna)
    mix = lambda a, b2: round(a + (b2 - a) * f)
    return (mix(r, 255), mix(g, 232), mix(b, 190))


def poly(pts, warna, garis=True):
    p = [(round(x), round(y)) for x, y in pts]
    d.polygon(p, fill=warna)
    if garis:
        g = gelapkan(warna)
        if g:
            d.line(p + [p[0]], fill=g, width=2)


def colors(style):
    if isinstance(style, dict):
        return style
    return MAT.get(style, {'top': '#ff00ff', 'left': '#cc00cc', 'right': '#990099'})


def tone(o):
    c0 = colors(o['style'])
    if o.get('refleksi'):
        return {'top': c0['top'], 'left': c0.get('right', c0['left']), 'right': c0.get('left', c0['right'])}
    return {'top': c0['top'], 'left': c0.get('left', c0['left']), 'right': c0.get('right', c0.get('left'))}


def footing(o):
    rot = o.get('rot', 0)
    se, sw = (o['size']['w'], o['size']['e']) if rot % 2 == 1 else (o['size']['e'], o['size']['w'])
    return se, sw


def tepi(o):
    return o.get('tepi') is not False


# --------------------------------------------------------------------------- #
# SPRITE (versi pixel) — potongan langsung dari gambar referensi
# --------------------------------------------------------------------------- #
_SPRITE = {}


def sprite_img(nama):
    if nama in _SPRITE:
        return _SPRITE[nama]
    path = os.path.join(ASET, f'{nama}.png')
    img = Image.open(path).convert('RGBA') if os.path.exists(path) else None
    _SPRITE[nama] = img
    return img


def draw_sprite(o):
    img = sprite_img(o['sprite'])
    if img is None:
        return draw_box(o)
    e, w, z = o['pos']['e'], o['pos']['w'], o['pos']['z']
    se, sw = footing(o)
    lebar = max(2, (se + sw) * HW)
    skala = lebar / img.width
    tinggi = img.height * skala
    kaki = px(e + se, w + sw, z)
    tengah = px(e + se / 2, w + sw / 2, z)
    kecil = img.resize((max(1, round(lebar)), max(1, round(tinggi))), Image.NEAREST)
    im.paste(kecil, (round(tengah[0] - lebar / 2), round(kaki[1] - tinggi)), kecil)


def draw_box(o):
    e, w, z = o['pos']['e'], o['pos']['w'], o['pos']['z']
    se, sw = footing(o)
    sz = o['size']['z']
    c = tone(o)
    g = tepi(o)
    t00, t10 = px(e, w, z + sz), px(e + se, w, z + sz)
    t11, t01 = px(e + se, w + sw, z + sz), px(e, w + sw, z + sz)
    b10, b11, b01 = px(e + se, w, z), px(e + se, w + sw, z), px(e, w + sw, z)
    poly([t01, t11, b11, b01], c['left'], g)
    poly([t10, t11, b11, b10], c['right'], g)
    poly([t00, t10, t11, t01], c['top'], g)
    if g and sz > 0.02:
        kb = 0.74
        l0 = (t01[0] + (b01[0] - t01[0]) * kb, t01[1] + (b01[1] - t01[1]) * kb)
        l1 = (t11[0] + (b11[0] - t11[0]) * kb, t11[1] + (b11[1] - t11[1]) * kb)
        r1 = (t10[0] + (b10[0] - t10[0]) * kb, t10[1] + (b10[1] - t10[1]) * kb)
        poly([l0, l1, b11, b01], gelapkan(c['left'], 0.28) or c['left'], False)
        poly([r1, l1, b11, b10], gelapkan(c['right'], 0.28) or c['right'], False)
    if g:
        hi = terangkan(c['top'])
        if hi:
            for a, b in ((t00, t10), (t00, t01)):
                d.line([tuple(map(round, a)), tuple(map(round, b))], fill=hi, width=2)


def cincin(o):
    e, w, z = o['pos']['e'], o['pos']['w'], o['pos']['z']
    se, sw = footing(o)
    ce, cw = e + se / 2, w + sw / 2
    re, rw = se / 2, sw / 2
    bawah, atas, sudut = [], [], []
    for i in range(SEGMEN):
        t = (i / SEGMEN) * TAU
        ee, ww = ce + re * math.cos(t), cw + rw * math.sin(t)
        bawah.append(px(ee, ww, z))
        atas.append(px(ee, ww, z + o['size']['z']))
        sudut.append(t)
    return bawah, atas, sudut, ce, cw, re, rw


def _segi(bawah, atas, sudut, c, g, tutup=True):
    seg = []
    for i in range(SEGMEN):
        j = (i + 1) % SEGMEN
        ty = (bawah[i][1] + bawah[j][1] + atas[i][1] + atas[j][1]) / 4
        kanan = (math.cos(sudut[i]) + math.cos(sudut[j])) - (math.sin(sudut[i]) + math.sin(sudut[j]))
        seg.append((ty, i, j, c['right'] if kanan >= 0 else c['left']))
    for ty, i, j, warna in sorted(seg):
        poly([bawah[i], bawah[j], atas[j], atas[i]], warna, False)
    if tutup:
        poly(atas, c['top'], g)
    gr = gelapkan(c['left'])
    if gr and g:
        for k in range(0, SEGMEN, 6):
            d.line([atas[k], bawah[k]], fill=gr, width=2)


def draw_silinder(o):
    bawah, atas, sudut, *_ = cincin(o)
    _segi(bawah, atas, sudut, tone(o), tepi(o))


def draw_kerucut(o):
    bawah, _, sudut, ce, cw, re, rw = cincin(o)
    z = o['pos']['z'] + o['size']['z']
    rasio = max(0.0, o.get('puncak', 0) or 0)
    if rasio == 0:
        atas = [px(ce, cw, z)] * SEGMEN
    else:
        atas = [px(ce + re * rasio * math.cos(t), cw + rw * rasio * math.sin(t), z) for t in sudut]
    _segi(bawah, atas, sudut, tone(o), tepi(o), tutup=rasio > 0)


def draw_bola(o):
    e, w, z = o['pos']['e'], o['pos']['w'], o['pos']['z']
    se, sw = footing(o)
    r = min(se, sw, o['size']['z']) / 2
    if r <= 0:
        return
    cx, cy = px(e + se / 2, w + sw / 2, z + o['size']['z'] / 2)
    R = r * HW * 1.31
    c = tone(o)
    for rad, warna, dx, dy in ((R, c['right'], 0, 0), (R * 0.86, c['left'], -0.1, -0.1), (R * 0.5, c['top'], -0.3, -0.3)):
        x0, y0 = cx + dx * R - rad, cy + dy * R - rad
        d.ellipse([x0, y0, x0 + 2 * rad, y0 + 2 * rad], fill=warna)
    g = gelapkan(c['right'])
    if g and tepi(o):
        d.ellipse([cx - R, cy - R, cx + R, cy + R], outline=g, width=2)


def draw_cakram(o):
    e, w, z = o['pos']['e'], o['pos']['w'], o['pos']['z']
    se, sw = footing(o)
    ce, cw = e + se / 2, w + sw / 2
    cz = z + o['size']['z'] / 2
    re, rz = se / 2, o['size']['z'] / 2
    c = tone(o)

    def titik(r1, r2, de=0.0, dz=0.0):
        out = []
        for i in range(SEGMEN):
            t = (i / SEGMEN) * TAU
            out.append(px(ce + de + r1 * math.cos(t), cw, cz + dz + r2 * math.sin(t)))
        return out

    poly(titik(re, rz), c['left'], tepi(o))
    poly(titik(re * 0.82, rz * 0.82, -re * 0.08, rz * 0.1), c['top'], False)
    poly(titik(re * 0.34, rz * 0.34, -re * 0.3, rz * 0.3), c['right'], False)


def draw_daun(o):
    P0 = o['pos']
    L, Wd = o['size']['e'], o['size']['z']
    if L <= 0 or Wd <= 0:
        return
    t = math.radians(o.get('miring', 90))
    ct, st = math.cos(t), math.sin(t)
    N = 16
    c = tone(o)

    def titik(s, skala):
        along = s * L
        lebar = (Wd / 2) * (math.sin(math.pi * s) ** 0.75) * (1 - 0.35 * s) * skala
        return px(P0['e'] + along * ct - lebar * st, P0['w'] + lebar * ct, P0['z'] + along * st)

    def badan(skala):
        kiri = [titik(i / N, skala) for i in range(N + 1)]
        kanan = [titik(i / N, -skala) for i in range(N + 1)]
        return kiri + kanan[::-1]

    poly(badan(1), c['left'], tepi(o))
    poly([(x - 1, y - 1) for x, y in badan(0.5)], c['top'], False)


def draw_profil(o):
    titik = o.get('profil') or []
    if len(titik) < 3:
        return draw_box(o)
    e, w, z = o['pos']['e'], o['pos']['w'], o['pos']['z']
    se, sw = footing(o)
    sz = o['size']['z']
    c = tone(o)
    g = tepi(o)
    P = lambda u, zz, ww: px(e + u * se, ww, z + zz * sz)
    dpn = [P(u, zz, w + sw) for u, zz in titik]
    blk = [P(u, zz, w) for u, zz in titik]
    n = len(titik)
    poly(blk, gelapkan(c['left'], 0.35) or c['left'], False)
    luas = 0.0
    for i in range(n):
        ua, za = titik[i]
        ub, zb = titik[(i + 1) % n]
        luas += ua * zb - ub * za
    arah = 1 if luas > 0 else -1
    for i in range(n):
        ua, za = titik[i]
        ub, zb = titik[(i + 1) % n]
        du, dz = ub - ua, zb - za
        if abs(du) < 1e-6 and abs(dz) < 1e-6:
            continue
        ne, nz = dz * arah, -du * arah
        if ne * 0.707 + nz * 0.707 <= 0.02:
            continue
        warna = c['top'] if abs(nz) >= abs(ne) else c['right']
        poly([dpn[i], dpn[(i + 1) % n], blk[(i + 1) % n], blk[i]], warna, g)
    poly(dpn, c['left'], g)


def draw_obj(o):
    if o.get('sprite'):
        return draw_sprite(o)
    b = o.get('bentuk')
    if b == 'silinder':
        return draw_silinder(o)
    if b == 'kerucut':
        return draw_kerucut(o)
    if b == 'bola':
        return draw_bola(o)
    if b == 'cakram':
        return draw_cakram(o)
    if b == 'daun':
        return draw_daun(o)
    if b == 'profil':
        return draw_profil(o)
    return draw_box(o)


def draw_floor(o):
    e0, w0, z = o['pos']['e'], o['pos']['w'], o['pos']['z']
    e1, w1 = e0 + o['size']['e'], w0 + o['size']['w']
    mat = FLOOR.get(o['style'], FLOOR[PALET.get('lantaiBawaan', 'lantai-terakota')])
    tones, grout = mat['tones'], mat.get('grout', '#a8541c')
    poly([px(e0, w0, z), px(e1, w0, z), px(e1, w1, z), px(e0, w1, z)], tones[0], False)
    ee, n = e0, 0
    while ee < e1 - 1e-6:
        ww = w0
        while ww < w1 - 1e-6:
            a, b = px(ee, ww, z), px(min(ee + 1, e1), ww, z)
            c, dd = px(min(ee + 1, e1), min(ww + 1, w1), z), px(ee, min(ww + 1, w1), z)
            poly([a, b, c, dd], tones[(n + int(ww)) % len(tones)], False)
            n += 1
            ww += 1
        ee += 1
    ee = e0
    while ee <= e1 + 1e-6:
        d.line([px(ee, w0, z), px(ee, w1, z)], fill=grout, width=1)
        ee += 1
    ww = w0
    while ww <= w1 + 1e-6:
        d.line([px(e0, ww, z), px(e1, ww, z)], fill=grout, width=1)
        ww += 1

    leb = min(1.8, (e1 - e0) * 0.22, (w1 - w0) * 0.22)
    if leb > 0.15:
        for f, al in ((1.0, 20), (0.66, 26), (0.33, 41)):
            warna = (74, 33, 12, al)
            AO.polygon([tuple(map(round, px(e0, w0, z))), tuple(map(round, px(e0, w1, z))),
                        tuple(map(round, px(e0 + leb * f, w1, z))), tuple(map(round, px(e0 + leb * f, w0, z)))], fill=warna)
            AO.polygon([tuple(map(round, px(e0, w0, z))), tuple(map(round, px(e1, w0, z))),
                        tuple(map(round, px(e1, w0 + leb * f, z))), tuple(map(round, px(e0, w0 + leb * f, z)))], fill=warna)

    SK = 10
    bL, bR, tR = px(e0, w1, z), px(e1, w1, z), px(e1, w0, z)
    bawah = lambda p: (p[0], p[1] + SK)
    poly([bL, bR, bawah(bR), bawah(bL)], mat.get('skirtL', BASE['skirtL']), False)
    poly([tR, bR, bawah(bR), bawah(tR)], mat.get('skirtR', BASE['skirtR']), False)

    def papan(p0, p1):
        panjang = math.hypot(p1[0] - p0[0], p1[1] - p0[1])
        n = max(1, round(panjang / (0.55 * (32 * DENS) / math.sqrt(2) * 1.15)))
        for i in range(1, n):
            t = i / n
            x = round(p0[0] + (p1[0] - p0[0]) * t) + 0.5
            y = round(p0[1] + (p1[1] - p0[1]) * t) + 0.5
            d.line([(x, y), (x, y + SK - 1)], fill=BASE.get('deckSeam', '#8f4a1b'), width=1)

    papan(bL, bR)
    papan(tR, bR)
    d.line([tuple(map(round, bL)), tuple(map(round, bR))], fill=BASE.get('deckLight', '#d98f4a'), width=1)
    d.line([tuple(map(round, tR)), tuple(map(round, bR))], fill=BASE.get('deckLight', '#d98f4a'), width=1)
    d.line([tuple(map(round, bawah(bL))), tuple(map(round, bawah(bR)))], fill=BASE.get('beamDark', '#4a210c'), width=1)
    d.line([tuple(map(round, bawah(tR))), tuple(map(round, bawah(bR)))], fill=BASE.get('beamDark', '#4a210c'), width=1)


def wall_warna(style, sisi):
    wm = WALL.get(style) if isinstance(style, str) else None
    if wm:
        return ((wm['kiri'] if sisi == 'kiri' else wm['kanan']),
                (wm['trimKiri'] if sisi == 'kiri' else wm['trimKanan']))
    m = MAT.get(style) if isinstance(style, str) else None
    if m:
        return (m['left'] if sisi == 'kiri' else m['top']), m['right']
    if not style or style in ('dinding-kiri', 'dinding-kanan'):
        return ((BASE['wallB'] if sisi == 'kiri' else BASE['wallT']),
                (BASE['trimB'] if sisi == 'kiri' else BASE['trimT']))
    return '#ff00ff', '#990099'


def draw_wall(o):
    e, w, z = o['pos']['e'], o['pos']['w'], o['pos']['z']
    se, sw, sz = o['size']['e'], o['size']['w'], o['size']['z']
    if sz <= 0:
        return
    sisi = 'kanan' if o.get('side') == 'kanan' else 'kiri'
    face, trim = wall_warna(o['style'], sisi)
    if sisi == 'kiri':
        a, b, panj = px(e, w, z), px(e, w + sw, z), sw
    else:
        a, b, panj = px(e, w, z), px(e + se, w, z), se
    if panj <= 0.2:
        return

    def at(t, dz=0.0):
        return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - dz * ZH)

    def kotak(t0, t1, zA, zB, warna):
        poly([at(t0, zA), at(t1, zA), at(t1, zB), at(t0, zB)], warna, False)

    kotak(0, 1, sz, 0, face)
    kotak(0, 1, sz * 0.11, 0, gelapkan(face, 0.94) or face)
    kotak(0, 1, sz * 0.045, 0, gelapkan(face, 0.88) or face)

    plint = min(0.26, sz * 0.5)
    kotak(0, 1, plint, 0, trim)
    kotak(0, 1, plint, plint - min(0.05, plint * 0.3), BASE['beamDark'])

    if sz > 1.8:
        zd = min(1.15, sz * 0.4)
        kotak(0, 1, zd, plint, gelapkan(face, 0.90) or face)
        kotak(0, 1, zd + 0.09, zd, BASE['beam'])
        kotak(0, 1, zd + 0.09, zd + 0.07, BASE['beamTop'])
        kotak(0, 1, zd, zd - 0.04, BASE['beamDark'])

    hb = min(0.5, sz * 0.4)
    if sz > 1:
        kotak(0, 1, sz, sz - hb, BASE['beam'])
        kotak(0, 1, sz, sz - min(0.07, hb * 0.3), BASE['beamTop'])
        kotak(0, 1, sz - hb, sz - hb - min(0.05, hb * 0.2), BASE['beamDark'])

    tp = min(0.5, 0.42 / panj)
    for t0, t1 in ((0, tp), (1 - tp, 1)):
        kotak(t0, t1, sz, 0, BASE['post'])
        kotak(t0, t0 + (t1 - t0) * 0.45, sz, 0, BASE['postLit'])
        d.line([tuple(map(round, at(t1, sz))), tuple(map(round, at(t1, 0)))], fill=BASE['beamDark'], width=1)
        if sz > 1.2:
            p = at((t0 + t1) / 2, sz - min(0.75, sz * 0.35))
            r = 1.6 * DENS * 0.6
            d.ellipse([p[0] - r, p[1] - r, p[0] + r, p[1] + r], fill=BASE['peg'])

    d.line([tuple(map(round, at(0, 0))), tuple(map(round, at(1, 0)))], fill=BASE['beamDark'], width=1)


obj = scene['objects']
latar = [o for o in obj if o.get('latar')]
biasa = [o for o in obj if not o.get('latar')]

for o in sorted([x for x in latar if x.get('role') == 'dinding'], key=lambda x: x.get('urutan', 0)):
    draw_wall(o)
for o in sorted([x for x in latar if x.get('role') == 'lantai'], key=lambda x: x.get('urutan', 0)):
    draw_floor(o)
im = Image.alpha_composite(im.convert('RGBA'), AO_LAP).convert('RGB')
d = ImageDraw.Draw(im)

solid = [o for o in biasa if o.get('role') not in ('lantai', 'dinding')]
latar_solid = [o for o in latar if o.get('role') not in ('lantai', 'dinding')]
for o in sorted(latar_solid + solid,
                key=lambda o: (o.get('urutan') is None, o.get('urutan') or 0, o['pos']['e'] + o['pos']['w'])):
    draw_obj(o)

out = os.environ.get('OUT', '/home/user/ruang_objek.png')
im.resize((IW * SKALA, IH * SKALA), Image.NEAREST).save(out)
print('ok', im.size, '->', out)
