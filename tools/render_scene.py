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

from PIL import Image, ImageChops, ImageDraw

AKAR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PALET = json.load(open(os.path.join(AKAR, 'docs', '04-palet.json')))
# Grid DESAIN 18x19 (warna referensi ronde 13) yang sudah dibulatkan ke palet
# Endesga — cermin PALET_REF di iso/palet-referensi.ts. Hanya dipakai untuk
# posisi desain (kolom/tingkat), BUKAN sebagai daftar warna sah.
REF = json.load(open(os.path.join(AKAR, 'docs', '04-palet-referensi.json')))
_BARIS = REF['baris']
_TINGKAT = REF['tingkat']
# PALET RETRO ENDESGA 32 (ronde 38) — cermin iso/palet-retro.ts
RETRO = json.load(open(os.path.join(AKAR, 'docs', '04-palet-retro.json')))
SEMUA = RETRO['palet']
SEMUA_SET = set(SEMUA)
TANGGA = RETRO['tangga']
GELAP_MAKS = RETRO['gelapMaks']
SATU_SET = set(SEMUA)
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
YAW = float(os.environ.get('YAW', '0'))      # orbit kamera, kelipatan 15
_Y = math.radians(YAW)
_KOS = (math.cos(_Y), math.sin(_Y))
TAU = math.pi * 2
SEGMEN = 24
INK = (0x4A, 0x1E, 0x0A)
CAMPUR = 0.42
SKALA = 1

scene = json.load(open('/tmp/ruang.json'))['scene']


def arah_kamera():
    """vektor arah kamera di ruang dunia (sama dengan arahKamera() di space.ts)"""
    c, sn = _KOS
    return (c + sn, c - sn, 1.0)


def putar_relatif(de, dw):
    c, sn = _KOS
    return (de * c - dw * sn, de * sn + dw * c)


def px(e, w, z=0.0):
    re, rw = putar_relatif(e - CE, w - CW)
    return (IW / 2 + (re - rw) * HW, IH / 2 + (re + rw) * HH - z * ZH)


def fit_scene(objs, margin=0.95):
    """Sama dengan fitToScene() di iso/space.ts: bbox hasil proyeksi."""
    global HW, HH, ZH, CE, CW
    if not objs:
        return
    e0 = min(o['pos']['e'] for o in objs)
    e1 = max(o['pos']['e'] + o['size']['e'] for o in objs)
    w0 = min(o['pos']['w'] for o in objs)
    w1 = max(o['pos']['w'] + o['size']['w'] for o in objs)
    zmax = max(o['pos']['z'] + o['size']['z'] for o in objs)
    ce0, cw0 = (e0 + e1) / 2, (w0 + w1) / 2
    c, sn = _KOS
    xmin = ymin = 1e9
    xmax = ymax = -1e9
    for ex in (e0 - ce0, e1 - ce0):
        for wx in (w0 - cw0, w1 - cw0):
            for zz in (0.0, zmax):
                re = ex * c - wx * sn
                rw = ex * sn + wx * c
                x = re - rw
                y = (re + rw) / 2 - zz
                xmin, xmax = min(xmin, x), max(xmax, x)
                ymin, ymax = min(ymin, y), max(ymax, y)
    hw = min((IW * margin) / max(1e-3, xmax - xmin), (IH * margin) / max(1e-3, ymax - ymin))
    HW, HH, ZH = hw, hw / 2, hw
    dx = ((xmin + xmax) / 2) * hw
    dy = ((ymin + ymax) / 2) * hw
    d_re = (dx / hw + dy / (hw / 2)) / 2
    d_rw = (dy / (hw / 2) - dx / hw) / 2
    CE = ce0 + (d_re * c + d_rw * sn)
    CW = cw0 + (-d_re * sn + d_rw * c)


fit_scene(scene['objects'])

im = Image.new('RGB', (IW, IH), BASE['void'])
d = ImageDraw.Draw(im)
AO_LAP = Image.new('RGBA', (IW, IH), (0, 0, 0, 0))
AO = ImageDraw.Draw(AO_LAP)


def _hex(c):
    c = c.lstrip('#')
    return int(c[0:2], 16), int(c[2:4], 16), int(c[4:6], 16)


def _hexstr(c):
    """terima hex atau tuple RGB -> selalu hex 6 digit"""
    if isinstance(c, tuple):
        return '#%02x%02x%02x' % tuple(int(v) for v in c[:3])
    return c


# --- palet ENDESGA 32: warna terdekat + tangga nada (paritas iso/palet-retro.ts) --
def _rgb(c):
    return _hex(c)


def jarak_warna(a, b):
    """jarak 'redmean' — sama persis dengan jarakWarna() di palet-retro.ts"""
    r1, g1, b1 = _rgb(a)
    r2, g2, b2 = _rgb(b)
    rmean = (r1 + r2) / 2
    dr, dg, db = r1 - r2, g1 - g2, b1 - b2
    return (2 + rmean / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rmean) / 256) * db * db


_CACHE = {}


def ke_palet(warna):
    """warna Endesga terdekat (warna yang sudah anggota palet tidak diubah)"""
    if not (isinstance(warna, str) and len(warna) == 7 and warna.startswith('#')):
        return warna
    w = warna.lower()
    if w in SATU_SET:
        return w
    if w in _CACHE:
        return _CACHE[w]
    jarak, terbaik = 1e18, SEMUA[0]
    for c in SEMUA:
        dd = jarak_warna(w, c)
        if dd < jarak:
            jarak, terbaik = dd, c
    _CACHE[w] = terbaik
    return terbaik


def _tangga_dari(warna):
    c = ke_palet(warna)
    for i, ramp in enumerate(TANGGA):
        if c in ramp:
            return i, ramp.index(c)
    return 0, 0


def _posisi(warna):
    # 1-based, sama persis dengan posisi() di iso/palet-referensi.ts
    c = ke_palet(warna)
    for t in range(_TINGKAT):
        k = _BARIS[t].index(c) if c in _BARIS[t] else -1
        if k >= 0:
            return k + 1, t + 1
    return 1, 1


def _warna(kolom, tingkat):
    # 1-based; 18 kolom != 19 tingkat -> batasi per dimensi (sama dengan TS)
    k = max(0, min(len(_BARIS[0]) - 1, int(kolom) - 1))
    t = max(0, min(len(_BARIS) - 1, int(tingkat) - 1))
    return _BARIS[t][k]


def _luma(hexs):
    r, g, b = _hex(hexs)
    return r * 0.299 + g * 0.587 + b * 0.114


def gelap(warna, n=1):
    i, k = _tangga_dari(warna)
    k -= max(0, int(round(n)))
    if k < 0:
        return GELAP_MAKS
    return TANGGA[i][k]


def terang(warna, n=1):
    i, k = _tangga_dari(warna)
    k = min(len(TANGGA[i]) - 1, k + max(0, int(round(n))))
    return TANGGA[i][k]


# ---------------------------------------------------------------------------
# DITHERING (cermin iso/dither.ts) — pola Bayer 4x4
# ---------------------------------------------------------------------------
BAYER4 = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]


def ambang_bayer(x, y):
    return BAYER4[y % 4][x % 4] + 0.5


def piksel_kedua(x, y, level):
    return ambang_bayer(x, y) < level * 16


def dither(a, b, level):
    """spesifikasi isian berpola: warna `b` menimpa `a` sesuai level 0..1"""
    return ('dither', a, b, max(0.0, min(1.0, level)))


def bayang(warna, level):
    """spesifikasi isian berpola: `warna` di atas bidang yang sudah ada"""
    return ('bayang', warna, warna, max(0.0, min(1.0, level)))


_POLA = {}


def _lapis_pola(spec):
    """(gambar RGB penuh, topeng alpha penuh) untuk satu spesifikasi dither"""
    mode = spec[0]
    # gelapkan()/terangkan() mengembalikan tuple RGB, sedangkan dither() bekerja
    # dengan hex — normalkan dulu supaya keduanya bisa dipakai campur.
    warna1 = _hexstr(spec[1])
    warna2 = _hexstr(spec[2])
    level = spec[3]
    kunci = (mode, warna1, warna2, round(level * 16))
    if kunci in _POLA:
        return _POLA[kunci]
    per = max(0, min(16, round(level * 16)))
    dasar = (0, 0, 0, 0) if mode == 'bayang' else _hex(warna1) + (255,)
    tint = _hex(warna2) + (255,)
    ubin = Image.new('RGBA', (4, 4), dasar)
    up = ubin.load()
    for y in range(4):
        for x in range(4):
            if per and piksel_kedua(x, y, per / 16):
                up[x, y] = tint
    baris = Image.new('RGBA', (IW, 4), dasar)
    for x0 in range(0, IW, 4):
        baris.paste(ubin, (x0, 0))
    penuh = Image.new('RGBA', (IW, IH), dasar)
    for y0 in range(0, IH, 4):
        penuh.paste(baris, (0, y0))
    hasil = (penuh.convert('RGB'), penuh.split()[3])
    _POLA[kunci] = hasil
    return hasil


def _isi_pola(pts, spec):
    p = [(round(x), round(y)) for x, y in pts]
    if len(p) < 3:
        return
    lapis, alpha = _lapis_pola(spec)
    topeng = Image.new('L', (IW, IH), 0)
    ImageDraw.Draw(topeng).polygon(p, fill=255)
    if spec[0] == 'bayang':
        topeng = ImageChops.multiply(topeng, alpha)
    im.paste(lapis, (0, 0), topeng)


def _elips_pola(box, spec):
    lapis, alpha = _lapis_pola(spec)
    topeng = Image.new('L', (IW, IH), 0)
    ImageDraw.Draw(topeng).ellipse([round(v) for v in box], fill=255)
    if spec[0] == 'bayang':
        topeng = ImageChops.multiply(topeng, alpha)
    im.paste(lapis, (0, 0), topeng)


TINTA = BASE.get('tinta') or '#341b10'   # cokelat sangat tua dari palet


def gelapkan(warna, f=CAMPUR):
    if not (isinstance(warna, str) and len(warna) == 7 and warna.startswith('#')):
        return None
    if f >= 0.4:                       # garis tepi: tinta tetap
        return _hex(TINTA)
    return _hex(gelap(warna, max(1, round(f * 5))))


def terangkan(warna, f=0.30):
    if not (isinstance(warna, str) and len(warna) == 7 and warna.startswith('#')):
        return None
    return _hex(terang(warna, max(1, round(f * 4))))


# Permintaan user: "jangan berikan outline untuk objek" -> semua objek polos.
GARIS_TEPI = False


def poly(pts, warna, garis=True):
    # `warna` boleh berupa spesifikasi DITHER (tuple 'dither'/'bayang') — ciri
    # pixel-art ronde 38 — atau warna hex biasa.
    if isinstance(warna, tuple) and warna and isinstance(warna[0], str):
        _isi_pola(pts, warna)
        return
    p = [(round(x), round(y)) for x, y in pts]
    d.polygon(p, fill=warna)
    if garis and GARIS_TEPI:
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


def sudut_objek(o):
    """rotasi objek dalam radian; `rotasi` (kelipatan 30°) atau `rot` lama (0..3)."""
    deg = o.get('rotasi')
    if deg is None:
        deg = (o.get('rot') or 0) * 90
    return math.radians(deg % 360)


def footing(o):
    deg = (o.get('rotasi') if o.get('rotasi') is not None else (o.get('rot') or 0) * 90) % 360
    se, sw = (o['size']['w'], o['size']['e']) if deg % 180 == 90 else (o['size']['e'], o['size']['w'])
    return se, sw


def tepi(o):
    return GARIS_TEPI and o.get('tepi') is not False


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
    if abs(sudut_objek(o) * 180 / math.pi) % 90 > 1e-6:
        return draw_box(o)      # sprite tidak diputar 30° (tetap tajam)
    e, w, z = o['pos']['e'], o['pos']['w'], o['pos']['z']
    se, sw = footing(o)
    lebar = max(2, (se + sw) * HW)
    skala = lebar / img.width
    tinggi = img.height * skala
    kaki = px(e + se, w + sw, z)
    tengah = px(e + se / 2, w + sw / 2, z)
    kecil = img.resize((max(1, round(lebar)), max(1, round(tinggi))), Image.NEAREST)
    im.paste(kecil, (round(tengah[0] - lebar / 2), round(kaki[1] - tinggi)), kecil)


def warnai_wajah(c, ne, nw, nz):
    if nz > 0.5:
        return c['top']
    if abs(ne) >= abs(nw):
        return c['right'] if ne > 0 else (gelapkan(c['left'], 0.22) or c['left'])
    return c['left'] if nw > 0 else (gelapkan(c['left'], 0.22) or c['left'])


def draw_box(o):
    e, w, z = o['pos']['e'], o['pos']['w'], o['pos']['z']
    sz = o['size']['z']
    c = tone(o)
    g = tepi(o)
    kam = arah_kamera()

    # footprint SETELAH rotasi objek (kelipatan 30°)
    he, hw = o['size']['e'] / 2, o['size']['w'] / 2
    ce, cw = e + he, w + hw
    th = sudut_objek(o)
    co, si = math.cos(th), math.sin(th)
    sudut_lokal = [(-he, -hw), (he, -hw), (he, hw), (-he, hw)]
    alas = [(ce + de * co - dw * si, cw + de * si + dw * co) for de, dw in sudut_lokal]

    def V(i, zf=1.0):
        ae, aw = alas[i & 3]
        return px(ae, aw, z + (sz * zf if i >= 4 else 0))

    normal_lokal = [(0, -1), (1, 0), (0, 1), (-1, 0)]
    normal = [(de * co - dw * si, de * si + dw * co) for de, dw in normal_lokal]

    wajah = [([k, (k + 1) % 4, 4 + (k + 1) % 4, 4 + k], normal[k][0], normal[k][1], 0)
             for k in range(4)]
    wajah.append(([4, 5, 6, 7], 0, 0, 1))
    tampak = [x for x in wajah if x[1] * kam[0] + x[2] * kam[1] + x[3] * kam[2] > 0.001]
    tampak.sort(key=lambda x: sum(V(i)[1] for i in x[0]) / 4.0)

    for idx, ne, nw, nz in tampak:
        poly([V(i) for i in idx], warnai_wajah(c, ne, nw, nz), g)

    if sz > 0.02:
        for idx, ne, nw, nz in tampak:
            if nz != 0:
                continue
            atas = warnai_wajah(c, ne, nw, nz)
            bawah = gelapkan(atas, 0.28) or c['left']
            poly([V(i, 0.26) for i in idx], bawah, False)
            # batas pita nada BER-DITHER (cermin box.ts ronde 38)
            tipis = min(0.16, 0.42 / max(0.25, sz))
            pita = [V(idx[0], 0.26), V(idx[1], 0.26),
                    V(idx[1], 0.26 + tipis), V(idx[0], 0.26 + tipis)]
            poly(pita, dither(atas, bawah, 0.5), False)

    if sz > 0.02 and g:
        warna = terangkan(c['top'])
        if warna:
            for k in range(4):
                ne, nw = normal[k]
                if ne * kam[0] + nw * kam[1] > 0:
                    continue
                d.line([tuple(map(round, V(4 + k))), tuple(map(round, V(4 + (k + 1) % 4)))],
                       fill=warna, width=2)


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
    kam = arah_kamera()
    for i in range(SEGMEN):
        j = (i + 1) % SEGMEN
        ty = (bawah[i][1] + bawah[j][1] + atas[i][1] + atas[j][1]) / 4
        ne = (math.cos(sudut[i]) + math.cos(sudut[j])) / 2
        nw = (math.sin(sudut[i]) + math.sin(sudut[j])) / 2
        hadap = ne * kam[0] + nw * kam[1]
        # batas terang/gelap dibuat BER-DITHER (cermin drawSilinder di box.ts)
        if hadap > 0.3:
            warna = c['right']
        elif hadap > 0:
            warna = dither(c['right'], c['left'], 0.3)
        elif hadap > -0.3:
            warna = dither(c['right'], c['left'], 0.7)
        else:
            warna = c['left']
        seg.append((ty, i, j, warna))
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
    for rad, warna, dx, dy in (
        (R, c['right'], 0, 0),
        (R * 0.86, dither(c['left'], c['top'], 0.22), -0.1, -0.1),
        (R * 0.72, dither(c['left'], c['top'], 0.52), -0.18, -0.18),
        (R * 0.56, dither(c['left'], c['top'], 0.78), -0.22, -0.22),
        (R * 0.40, c['top'], -0.3, -0.3),
    ):
        x0, y0 = cx + dx * R - rad, cy + dy * R - rad
        kotak_elips = [x0, y0, x0 + 2 * rad, y0 + 2 * rad]
        if isinstance(warna, tuple) and isinstance(warna[0], str):
            _elips_pola(kotak_elips, warna)
        else:
            d.ellipse(kotak_elips, fill=warna)
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
    # KEBULATAN daun (0..1): 0 = meruncing, 1 = elips membulat.
    bulat = min(1.0, max(0.0, float(o.get('bulat', 0) or 0)))

    def titik(s, skala):
        along = s * L
        # campuran dua siluet: meruncing (0) .. elips membulat (1)
        runcing = (math.sin(math.pi * s) ** 0.75) * (1 - 0.35 * s)
        elips = math.sqrt(max(0.0, 1 - (2 * s - 1) ** 2))
        lebar = (Wd / 2) * ((1 - bulat) * runcing + bulat * elips) * skala
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


# --------------------------------------------------------------------------- #
# LANGIT DINAMIS (cermin iso/langit.ts) — dipakai objek ber-langit: true
# --------------------------------------------------------------------------- #
JAM = float(os.environ.get('JAM', '12'))
CUACA = os.environ.get('CUACA', 'cerah')


# CATATAN: dulu ada _warna KEDUA di sini yang menimpa versi 0-based di atas.
# Perbedaan indeks membuat gelap() bergeser satu kolom: cokelat #c57946
# (kolom 17) menjadi merah-muda #fc4e8a (kolom 16) — muncul garis PINK di tepi
# objek kayu. Sekarang hanya ada SATU _warna (1-based), sama dengan TS.


def fase_dari_jam(j):
    j = j % 24
    if 4.5 <= j < 6:
        return 'fajar'
    if 6 <= j < 10:
        return 'pagi'
    if 10 <= j < 15:
        return 'siang'
    if 15 <= j < 18:
        return 'senja'
    return 'malam'


def fase_warna(f):
    """6 pita langit (cermin langitFase di iso/langit.ts) — palet Endesga."""
    if f == 'fajar':
        return (['#262b44', '#3a4466', '#5a6988', '#b55088', '#d77643', '#feae34'],
                'matahari', False, '#e8b796')
    if f == 'pagi':
        return (['#124e89', '#0099db', '#2ce8f5', '#c0cbdc', '#ead4aa', '#e8b796'],
                'matahari', False, '#ffffff')
    if f == 'siang':
        return (['#124e89', '#0099db', '#0099db', '#2ce8f5', '#c0cbdc', '#ead4aa'],
                'matahari', False, '#ffffff')
    if f == 'senja':
        return (['#3a4466', '#68386c', '#be4a2f', '#f77622', '#feae34', '#fee761'],
                'matahari', False, '#f6757a')
    return (['#181425', '#181425', '#262b44', '#262b44', '#3a4466', '#5a6988'],
            'bulan', True, '#5a6988')


def efek_cuaca(c):
    """(awan, hujan, kilat, pelangi, mendung 6 pita|None)"""
    if c == 'berawan':
        return (3, 0, False, False, None)
    if c == 'gerimis':
        return (4, 20, False, True,
                ['#8b9bb4', '#8b9bb4', '#5a6988', '#5a6988', '#3a4466', '#3a4466'])
    if c == 'hujan':
        return (5, 46, False, False,
                ['#5a6988', '#5a6988', '#3a4466', '#3a4466', '#262b44', '#262b44'])
    if c == 'badai':
        return (6, 70, True, False,
                ['#3a4466', '#3a4466', '#262b44', '#262b44', '#181425', '#181425'])
    return (1, 0, False, False, None)


def _acak(i, garam=0.0):
    x = math.sin(i * 12.9898 + garam * 78.233) * 43758.5453
    return x - math.floor(x)


def _titik(k, u, v):
    ax = k[0][0] + (k[1][0] - k[0][0]) * u
    ay = k[0][1] + (k[1][1] - k[0][1]) * u
    bx = k[3][0] + (k[2][0] - k[3][0]) * u
    by = k[3][1] + (k[2][1] - k[3][1]) * u
    return (ax + (bx - ax) * v, ay + (by - ay) * v)


def _isi(pts, warn):
    # boleh warna hex maupun spesifikasi dither (tuple 'dither'/'bayang')
    if isinstance(warn, tuple) and warn and isinstance(warn[0], str):
        _isi_pola(pts, warn)
        return
    d.polygon([(round(x), round(y)) for x, y in pts], fill=warn)


def _kotak(k, u0, v0, du, dv, warn):
    # dipotong di tepi kaca supaya awan/hujan tidak menimpa kusen
    u = max(0.0, min(1.0, u0))
    v = max(0.0, min(1.0, v0))
    du = min(du, 1.0 - u)
    dv = min(dv, 1.0 - v)
    if du <= 0 or dv <= 0:
        return
    _isi([_titik(k, u, v), _titik(k, u + du, v), _titik(k, u + du, v + dv), _titik(k, u, v + dv)], warn)


TINGGI_DITHER = 0.028


def _rencana_langit(kendali):
    """(pita, dither) — cermin rencanaLangit() di iso/langit.ts.

    pita  : [(v0, v1, warna)]  -> 6 pita keras
    dither: [(v0, v1, a, b, level)] -> 2 jalur per batas pita
    """
    n = len(kendali)
    pita = [(i / n, (i + 1) / n, kendali[i]) for i in range(n)]
    dither_ = []
    for i in range(n - 1):
        vc = (i + 1) / n
        dither_.append((vc - TINGGI_DITHER, vc, kendali[i], kendali[i + 1], 0.25))
        dither_.append((vc, vc + TINGGI_DITHER, kendali[i], kendali[i + 1], 0.75))
    return pita, dither_


def _cakram(k, u, v, ru, rv, warn, seg=12):
    """bulatan/elips di koordinat bidang kaca, tepi tetap tajam (tanpa AA)"""
    pts = []
    for i in range(seg):
        a = (i / seg) * 6.283185307
        pts.append(_titik(k, u + math.cos(a) * ru, v + math.sin(a) * rv))
    _isi(pts, warn)


def _awan_satu(k, u, v, lebar, skala, atas, bawah, lingkar):
    """awan kumulus: alas rata + 3 gumpalan elips (cermin awanSatu() di TS)"""
    h = 0.075 * skala
    dasar = v + h * 0.55
    _cakram(k, u + lebar * 0.30, dasar - h * 0.10, lebar * 0.26, h * 0.55, lingkar)
    _cakram(k, u + lebar * 0.58, dasar - h * 0.18, lebar * 0.30, h * 0.60, lingkar)
    _cakram(k, u + lebar * 0.82, dasar - h * 0.05, lebar * 0.22, h * 0.50, lingkar)
    _kotak(k, u + lebar * 0.10, dasar - h * 0.35, lebar * 0.80, h * 0.40, bawah)
    _cakram(k, u + lebar * 0.30, dasar - h * 0.40, lebar * 0.24, h * 0.56, atas)
    _cakram(k, u + lebar * 0.60, dasar - h * 0.46, lebar * 0.29, h * 0.62, atas)
    _cakram(k, u + lebar * 0.84, dasar - h * 0.34, lebar * 0.20, h * 0.48, atas)
    _cakram(k, u + lebar * 0.50, dasar - h * 0.72, lebar * 0.17, h * 0.40, atas)


def bidang_kaca(o):
    e, w, z = o['pos']['e'], o['pos']['w'], o['pos']['z']
    se, sw = footing(o)
    kam = arah_kamera()
    if abs(kam[1]) >= abs(kam[0]):
        ww = w + sw if kam[1] >= 0 else w
        a, b = px(e, ww, z), px(e + se, ww, z)
    else:
        ee = e + se if kam[0] >= 0 else e
        a, b = px(ee, w, z), px(ee, w + sw, z)
    if a[0] > b[0]:
        a, b = b, a
    if abs(b[0] - a[0]) < 1 or o['size']['z'] <= 0:
        return None
    dz = o['size']['z'] * ZH
    return [(a[0], a[1] - dz), (b[0], b[1] - dz), b, a]


def draw_langit(o):
    k = bidang_kaca(o)
    if not k:
        return draw_box(o)
    fase = fase_dari_jam(JAM)
    pita_warna, benda, bintang, awan_warna = fase_warna(fase)
    jml_awan, jml_hujan, kilat, pelangi, mendung = efek_cuaca(CUACA)
    warna_pita = mendung if mendung else pita_warna

    # 1) LANGIT: 6 pita KERAS + peralihan BER-DITHER (cermin drawLangit TS)
    pita_rencana, dither_rencana = _rencana_langit(warna_pita)
    warnaLangit = list(warna_pita)
    for v0, v1, warn in pita_rencana:
        _isi([_titik(k, 0, v0), _titik(k, 1, v0), _titik(k, 1, v1), _titik(k, 0, v1)], warn)
    for v0, v1, a, b, lvl in dither_rencana:
        v0 = max(0.0, v0)
        v1 = min(1.0, v1)
        _isi([_titik(k, 0, v0), _titik(k, 1, v0), _titik(k, 1, v1), _titik(k, 0, v1)],
             dither(a, b, lvl))

    def langit_di(v):
        i = max(0, min(len(warnaLangit) - 1, int(round(v * (len(warnaLangit) - 1)))))
        return warnaLangit[i]

    # 2) bintang: 34 butir, tiga ukuran, salib untuk yang paling terang
    if bintang and not mendung:
        redup = gelap('#ffffff', 1)
        for i in range(34):
            u = _acak(i, 7)
            v = _acak(i, 8) * 0.78
            besar = _acak(i, 13)
            wb = '#ffffff' if besar > 0.55 else redup
            w = 0.008 + besar * 0.010
            h = 0.018 + besar * 0.026
            _kotak(k, u, v, w, h, wb)
            if besar > 0.55:
                _kotak(k, u - w * 0.9, v + h * 0.35, w * 2.8, h * 0.28, wb)
                _kotak(k, u + w * 0.1, v - h * 0.35, w * 0.85, h * 1.7, wb)

    if pelangi and fase in ('pagi', 'siang'):
        # busur setengah lingkaran, tiga pita (sama dengan pelangi() di TS)
        SEG = 9
        for pi, c in enumerate(['#f6757a', '#fee761', '#2ce8f5']):
            rl = 0.62 - pi * 0.05
            rd = rl - 0.045
            pts = []
            for i in range(SEG + 1):
                a = math.pi - (i / SEG) * math.pi
                pts.append(_titik(k, 0.5 + math.cos(a) * rl, 1.05 - math.sin(a) * rl * 1.7))
            for i in range(SEG, -1, -1):
                a = math.pi - (i / SEG) * math.pi
                pts.append(_titik(k, 0.5 + math.cos(a) * rd, 1.05 - math.sin(a) * rd * 1.7))
            _isi(pts, c)

    # 3) MATAHARI / BULAN + HALO berlapis (cermin drawLangit di iso/langit.ts)
    if fase == 'malam':
        t = (JAM - 18) / 11 if JAM >= 18 else (JAM + 6) / 11
        u, v = 0.14 + 0.72 * t, 0.62 - 0.42 * math.sin(math.pi * t)
        sekitar = langit_di(v)
        _cakram(k, u, v, 0.128, 0.225, dither(sekitar, '#c0cbdc', 0.18), 20)
        _cakram(k, u, v, 0.104, 0.182, dither(sekitar, '#c0cbdc', 0.48), 20)
        _cakram(k, u, v, 0.082, 0.142, '#8b9bb4')
        _cakram(k, u - 0.012, v - 0.018, 0.058, 0.100, '#c0cbdc')
        # kawah
        _cakram(k, u + 0.021, v + 0.017, 0.014, 0.025, '#5a6988', 8)
        _cakram(k, u - 0.016, v + 0.045, 0.010, 0.018, '#5a6988', 8)
        _cakram(k, u + 0.004, v - 0.042, 0.008, 0.014, '#5a6988', 8)
    elif not mendung or jml_hujan == 0:
        t = min(1.0, max(0.0, (JAM - 5) / 13))
        u, v = 0.14 + 0.72 * t, 0.62 - 0.46 * math.sin(math.pi * t)
        hangat = fase in ('fajar', 'senja')
        tepi = '#f77622' if hangat else '#feae34'
        inti = '#feae34' if hangat else '#fee761'
        sekitar = langit_di(v)
        # halo SEMPIT berlapis BER-DITHER (cermin iso/langit.ts)
        _cakram(k, u, v, 0.138, 0.238, dither(sekitar, tepi, 0.14), 20)
        _cakram(k, u, v, 0.110, 0.190, dither(sekitar, tepi, 0.42), 20)
        _cakram(k, u, v, 0.082, 0.144, tepi)
        _cakram(k, u - 0.010, v - 0.016, 0.058, 0.102, inti)

    # 4) awan gumpal (bukan tumpukan kotak)
    if mendung:
        awan_dasar = gelap(awan_warna, 5 if CUACA == 'badai' else 4 if CUACA == 'hujan' else 3)
    else:
        awan_dasar = awan_warna
    for i in range(jml_awan):
        lebar = 0.24 + _acak(i, 3) * 0.16
        skala = 0.85 + _acak(i, 9) * 0.45
        vv = 0.10 + _acak(i, 4) * 0.40
        uu = _acak(i, 5)
        atas = awan_dasar if i % 2 == 0 else gelap(awan_dasar, 1)
        bawah = gelap(awan_dasar, 2)
        lingkar = dither(atas, bawah, 0.5)
        _awan_satu(k, uu, vv, lebar, skala, atas, bawah, lingkar)

    # hujan (kerangka diam supaya PNG dapat diulang)
    if jml_hujan:
        lebat = jml_hujan > 40
        tinggi = 0.07 if lebat else 0.045
        lebar_tetes = 0.010 if lebat else 0.008
        warna_hujan = '#8b9bb4' if mendung else '#c0cbdc'
        for i in range(jml_hujan):
            uu = _acak(i, 11)
            fasa = _acak(i, 12)
            _kotak(k, uu, fasa * (1 - tinggi), lebar_tetes, tinggi, warna_hujan)

    if kilat:
        # KILAT BERCABANG: batang utama + dua cabang (cermin iso/langit.ts)
        petir = [
            [(0.56, 0.02), (0.49, 0.20), (0.55, 0.24), (0.46, 0.46), (0.52, 0.50),
             (0.42, 0.72), (0.45, 0.50), (0.40, 0.45), (0.48, 0.23), (0.44, 0.19)],
            [(0.53, 0.24), (0.46, 0.34), (0.40, 0.40), (0.47, 0.30), (0.51, 0.26)],
            [(0.52, 0.50), (0.58, 0.58), (0.62, 0.62), (0.57, 0.54), (0.51, 0.47)],
        ]
        for bentuk in petir:
            _isi([_titik(k, u, v) for u, v in bentuk], '#fee761')


def draw_obj(o):
    # KACA LANGIT dinamis
    if o.get('langit'):
        return draw_langit(o)
    # TRANSPARANSI (permintaan user 2026-10-29): objek dengan opasitas < 1
    # digambar ke lapisan terpisah lalu dicampur, supaya warnanya benar-benar
    # tembus pandang (paritas dengan iso/box.ts di prototipe web).
    op = o.get('opasitas')
    if isinstance(op, (int, float)) and 0.05 <= op < 0.999:
        draw_obj_alpha(o, float(op))
        return
    draw_obj_pekat(o)


def draw_obj_alpha(o, op):
    global d, im
    simpan = d
    lapis = Image.new('RGBA', (IW, IH), (0, 0, 0, 0))
    d = ImageDraw.Draw(lapis)
    draw_obj_pekat(o)
    d = simpan
    lapis.putalpha(lapis.getchannel('A').point(lambda v: int(v * op)))
    im = Image.alpha_composite(im.convert('RGBA'), lapis).convert('RGB')
    d = ImageDraw.Draw(im)


def draw_obj_pekat(o):
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

    # BAYANGAN di kaki dinding = DITHER Bayer 4x4 (ronde 38, cermin room.ts).
    # Dulu rgba semi-transparan -> warna di luar palet.
    leb = min(1.8, (e1 - e0) * 0.22, (w1 - w0) * 0.22)
    if leb > 0.15:
        for f, kuat in ((1.0, 0.14), (0.66, 0.34), (0.33, 0.60)):
            dalam = max(0.0, leb * f - leb * 0.33)
            pola = bayang(grout, kuat)
            poly([px(e0, w0, z), px(e0, w1, z),
                  px(e0 + dalam, w1, z), px(e0 + dalam, w0, z)], pola, False)
            poly([px(e0, w0, z), px(e1, w0, z),
                  px(e1, w0 + dalam, z), px(e0, w0 + dalam, z)], pola, False)

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
    kam = arah_kamera()
    # dinding disembunyikan bila muka DALAMnya membelakangi kamera
    if (kam[0] if sisi == 'kiri' else kam[1]) <= 0.001:
        return
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
    # batas pita nada BER-DITHER (ronde 38, cermin room.ts)
    # PENTING: pakai gelap() (tangga nada palet), bukan gelapkan() — gelapkan()
    # adalah pembuat garis tepi (f >= 0,4 selalu jadi tinta gelap).
    nadaB = gelap(face, 1)
    nadaC = gelap(face, 2)
    tipis = max(0.05, sz * 0.035)
    kotak(0, 1, sz * 0.11 + tipis, sz * 0.11 - tipis, dither(face, nadaB, 0.5))
    kotak(0, 1, sz * 0.11, 0, nadaB)
    kotak(0, 1, sz * 0.045 + tipis * 0.7, sz * 0.045 - tipis * 0.7,
          dither(nadaB, nadaC, 0.5))
    kotak(0, 1, sz * 0.045, 0, nadaC)
    teduh = gelap(face, 1)

    plint = min(0.26, sz * 0.5)
    kotak(0, 1, plint, 0, trim)
    # kaki dinding: tiga pita bayangan BER-DITHER (makin rapat ke bawah) —
    # cermin kakiDinding() di iso/room.ts
    for z0b, z1b, kuat in ((0.0, 0.22, 0.44), (0.22, 0.55, 0.26), (0.55, 1.05, 0.14)):
        if plint + z1b < sz:
            kotak(0, 1, plint + z1b, plint + z0b, bayang(teduh, kuat))
    kotak(0, 1, plint, plint - min(0.05, plint * 0.3), BASE['beamDark'])

    if sz > 1.8:
        zd = min(1.15, sz * 0.4)
        kotak(0, 1, zd, plint, gelap(face, 1))
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

def menempel_tersembunyi(o):
    if o.get('role') in ('lantai', 'dinding') or o['pos']['z'] < 0.3:
        return False
    kam = arah_kamera()
    if kam[0] <= 0.001 and o['pos']['e'] < 1.2:
        return True
    if kam[1] <= 0.001 and o['pos']['w'] < 1.2:
        return True
    return False


solid = [o for o in biasa if o.get('role') not in ('lantai', 'dinding') and not menempel_tersembunyi(o)]
latar_solid = [o for o in latar if o.get('role') not in ('lantai', 'dinding')]
for o in sorted(latar_solid + solid,
                key=lambda o: (o.get('urutan') is None, o.get('urutan') or 0, o['pos']['e'] + o['pos']['w'])):
    draw_obj(o)

out = os.environ.get('OUT', '/home/user/ruang_objek.png')
im.resize((IW * SKALA, IH * SKALA), Image.NEAREST).save(out)
print('ok', im.size, '->', out)
