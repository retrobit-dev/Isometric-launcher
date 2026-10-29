"""Ekstrak SPRITE dari gambar referensi user (Screenshot_20261029_072237.jpg).

Hasil: prototype/public/aset/<id>.png  (RGBA, latar dibuang dengan flood-fill)
       prototype/public/aset/manifest.json  (ukuran asli tiap sprite)

Cara kerja:
  1. potong kotak objek dari referensi,
  2. buang latar (dinding/lantai) dengan BFS dari tepi potongan, toleransi warna,
  3. rapikan tepi: warna di-quantize (menghilangkan noise JPEG), alpha di-threshold,
  4. potong tepi kosong, simpan.

Jalankan: python3 ekstrak_sprite.py [--debug]
"""
import colorsys
import json
import os
import sys
from collections import deque

from PIL import Image

AKAR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))   # .../Isometric-launcher
REF = os.environ.get('REF', '/tmp/arena-coding-uploads/Screenshot_20261029_072237.jpg')
OUT = os.path.join(AKAR, 'prototype', 'public', 'aset')
DEBUG = '--debug' in sys.argv

# id : (x0, y0, x1, y1)  — koordinat di gambar referensi 1135x711
# EKSTRA: warna/rect yang HARUS dibuang (milik objek lain yang ikut terpotong)
EKSTRA = {
    # rect pembuang (koordinat REFERENSI): bayangan/sinar lantai, dinding, dan
    # bagian objek lain yang menempel. Ditulis satu per satu hasil pemeriksaan
    # visual — bukan ditebak.
    'rak-buku':      {'rect': [(40, 630, 300, 711), (296, 370, 340, 660), (180, 590, 300, 700)]},
    'kursi-putar':   {'rect': [(540, 560, 720, 711), (520, 470, 566, 640)]},
    'tanaman-pot':   {'rect': [(900, 380, 1080, 424), (900, 620, 1135, 711), (1040, 560, 1135, 660), (860, 480, 924, 620)]},
    'papan-tulis':   {'rect': [(520, 380, 1135, 560), (240, 40, 300, 200)]},
    'papan-gabus':   {'rect': [(0, 200, 240, 240), (0, 386, 240, 440), (196, 240, 240, 400)]},
    'bingkai-foto':  {'rect': [(280, 40, 304, 200)]},
    'jendela':       {'rect': [(770, 380, 900, 470), (900, 250, 1010, 420), (1090, 200, 1135, 420)]},
    'tempat-sampah': {'rect': [(100, 400, 160, 711), (0, 660, 140, 711)]},
    'laptop':        {'rect': [(680, 330, 706, 400), (680, 236, 706, 300), (620, 330, 706, 420)]},
    'kalkulator':    {'rect': [(740, 330, 900, 376), (740, 434, 900, 480)]},
    'tumpukan-buku': {'rect': [(560, 300, 606, 400), (660, 250, 720, 320)]},
    'lampu-meja':    {'rect': [(640, 290, 780, 360), (600, 470, 700, 560)]},
}

KOTAK = {
    'meja-guru':     (566, 244, 1004, 548),
    'rak-buku':      (62, 396, 298, 642),
    'kursi-putar':   (556, 356, 700, 586),
    'tanaman-pot':   (920, 402, 1080, 622),
    'papan-tulis':   (290, 106, 556, 500),
    'papan-gabus':   (60, 284, 216, 392),
    'bingkai-foto':  (300, 60, 350, 146),
    'jendela':       (790, 30, 1110, 400),
    'tempat-sampah': (4, 550, 106, 676),
    'laptop':        (700, 264, 832, 356),
    'kalkulator':    (772, 378, 860, 432),
    'tumpukan-buku': (600, 262, 690, 350),
    'lampu-meja':    (664, 184, 746, 302),
}

TOL_SEED = 34     # selisih warna maksimum terhadap warna latar awal (per kanal)
TOL_NEIGH = 12    # selisih maksimum terhadap piksel tetangga (menelusuri gradasi)


def luminance(im):
    w, h = im.size
    px = im.load()
    L = [[0] * w for _ in range(h)]
    for y in range(h):
        for x in range(w):
            c = px[x, y]
            L[y][x] = int(0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2])
    return L


def blur(L, rad=3):
    w, h = len(L[0]), len(L)
    out = [[0] * w for _ in range(h)]
    for y in range(h):
        for x in range(w):
            s = 0
            n = 0
            for dy in range(-rad, rad + 1):
                for dx in range(-rad, rad + 1):
                    X, Y = x + dx, y + dy
                    if 0 <= X < w and 0 <= Y < h:
                        s += L[Y][X]
                        n += 1
            out[y][x] = s // n
    return out


def pisahkan(im, kotak):
    """Pisahkan objek dari latar memakai GARIS TEPI GELAP sebagai penghalang.

    Warna objek di referensi sama dengan warna dinding/lantai (cokelat di
    dinding cokelat), jadi kunci warna MUSTAHIL dipakai. Yang membedakan objek
    adalah garis luarnya yang lebih gelap: latar dipenuhi dari tepi potongan
    dan berhenti di garis gelap, sehingga seluruh isi objek ikut tersimpan.
    """
    w, h = im.size
    L = luminance(im)

    def L_(x, y):
        return L[min(max(y, 0), h - 1)][min(max(x, 0), w - 1)]

    # penghalang = piksel ber-gradient tinggi (garis tepi) atau sangat gelap
    kasar = [[False] * w for _ in range(h)]
    for y in range(h):
        for x in range(w):
            g = abs(L_(x + 1, y) - L_(x - 1, y)) + abs(L_(x, y + 1) - L_(x, y - 1))
            kasar[y][x] = g > 26 or L[y][x] < 66
    # DILATASI 1 px: menutup celah 1 px pada garis tepi (kalau bocor, seluruh
    # bagian dalam objek akan ikut terhapus).
    penghalang = [[False] * w for _ in range(h)]
    for y in range(h):
        for x in range(w):
            if kasar[y][x]:
                for dy in (-1, 0, 1):
                    for dx in (-1, 0, 1):
                        X, Y = x + dx, y + dy
                        if 0 <= X < w and 0 <= Y < h:
                            penghalang[Y][X] = True
    px = im.load()
    latar = [[False] * w for _ in range(h)]
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            q.append((x, y))
    while q:
        x, y = q.popleft()
        if x < 0 or y < 0 or x >= w or y >= h:
            continue
        if latar[y][x] or penghalang[y][x]:
            continue
        latar[y][x] = True
        q.append((x + 1, y)); q.append((x - 1, y))
        q.append((x, y + 1)); q.append((x, y - 1))

    # ISI LUBANG: latar yang TIDAK tersambung ke tepi potongan sesungguhnya
    # bagian dalam objek (warnanya sama dengan dinding, jadi fill bisa bocor
    # masuk lewat celah garis tepi). Kembalikan sebagai objek.
    luar = [[False] * w for _ in range(h)]
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            q.append((x, y))
    while q:
        x, y = q.popleft()
        if x < 0 or y < 0 or x >= w or y >= h or luar[y][x] or not latar[y][x]:
            continue
        luar[y][x] = True
        q.append((x + 1, y)); q.append((x - 1, y))
        q.append((x, y + 1)); q.append((x, y - 1))

    keluar = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    kp = keluar.load()
    for y in range(h):
        for x in range(w):
            if not luar[y][x]:
                c = px[x, y]
                kp[x, y] = (c[0], c[1], c[2], 255)
    return keluar


def buang_warna(img, daftar, tol=26):
    if not daftar:
        return img
    px = img.load()
    target = [tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) for h in daftar]
    for y in range(img.height):
        for x in range(img.width):
            c = px[x, y]
            if c[3] == 0:
                continue
            if any(dekat(c, t, tol) for t in target):
                px[x, y] = (0, 0, 0, 0)
    return img


def buang_rect(img, kotak, asal):
    if not kotak:
        return img
    px = img.load()
    x0c, y0c = asal
    for (x0, y0, x1, y1) in kotak:
        for y in range(max(0, y0 - y0c), min(img.height, y1 - y0c)):
            for x in range(max(0, x0 - x0c), min(img.width, x1 - x0c)):
                px[x, y] = (0, 0, 0, 0)
    return img


def hanya_komponen_utama(img, ambang=0.04):
    """sisakan komponen terhubung terbesar (+ komponen yang menempel padanya)"""
    w, h = img.size
    px = img.load()
    tanda = [[-1] * w for _ in range(h)]
    komponen = []
    for y in range(h):
        for x in range(w):
            if px[x, y][3] == 0 or tanda[y][x] != -1:
                continue
            nomor = len(komponen)
            q = deque([(x, y)])
            tanda[y][x] = nomor
            isi = []
            while q:
                cx, cy = q.popleft()
                isi.append((cx, cy))
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = cx + dx, cy + dy
                    if 0 <= nx < w and 0 <= ny < h and tanda[ny][nx] == -1 and px[nx, ny][3] > 0:
                        tanda[ny][nx] = nomor
                        q.append((nx, ny))
            komponen.append(isi)
    if not komponen:
        return img
    terbesar = max(len(k) for k in komponen)
    # bbox komponen terbesar — komponen yang jauh di luar ini biasanya garis
    # bayangan / sinar lantai yang tidak ikut terhapus
    utama = max(komponen, key=len)
    ux0 = min(p[0] for p in utama); ux1 = max(p[0] for p in utama)
    uy0 = min(p[1] for p in utama); uy1 = max(p[1] for p in utama)
    M = 8
    simpan = []
    for i, k in enumerate(komponen):
        if len(k) < terbesar * ambang:
            continue
        # garis tipis: luas kecil dibanding bbox-nya
        kx0 = min(p[0] for p in k); kx1 = max(p[0] for p in k)
        ky0 = min(p[1] for p in k); ky1 = max(p[1] for p in k)
        kepadatan = len(k) / max(1, (kx1 - kx0 + 1) * (ky1 - ky0 + 1))
        if len(k) < 400 and kepadatan < 0.30:
            continue
        if kx1 < ux0 - M or kx0 > ux1 + M or ky1 < uy0 - M or ky0 > uy1 + M:
            continue
        simpan.append(i)
    for y in range(h):
        for x in range(w):
            n = tanda[y][x]
            if n == -1 or n not in simpan:
                px[x, y] = (0, 0, 0, 0)
    return img


def hangatkan(img):
    """Geser warna sprite ke TEMA HANGAT (docs/05).

    Sprite berasal dari referensi ruang guru yang berwarna dingin (dinding
    kelabu, lantai ungu). Kalau ditempel apa adanya di ruangan bertema
    diorama hangat, hasilnya belang. Fungsi ini memetakan:
      • kelabu/abu-abu        -> cokelat-kelabu hangat
      • biru / ungu / lavender-> oranye terakota (rona 18-38°)
      • warna hangat lain     -> dibiarkan (hanya sedikit dijenuhkan)
    Kecerahan dipertahankan, jadi bentuk & bayangan objek tetap terbaca.
    """
    px = img.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            h, l, sat = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
            deg = h * 360
            if sat < 0.13:                      # kelabu
                h2, s2 = 30 / 360, 0.10
            elif 190 <= deg <= 330:             # biru / ungu / lavender
                h2 = (18 + (deg - 190) / 140 * 20) / 360
                s2 = min(1.0, sat * 0.92)
            else:                               # sudah hangat
                h2 = h
                s2 = min(1.0, sat * 1.06)
            r2, g2, b2 = colorsys.hls_to_rgb(h2, l, s2)
            px[x, y] = (round(r2 * 255), round(g2 * 255), round(b2 * 255), a)
    return img


def buka_morfologi(img):
    """OPENING 3x3 pada alpha: menghapus garis/bayangan tipis yang tertinggal
    (mis. garis bayangan lantai 1-2 px) tanpa menggerus badan objek."""
    w, h = img.size
    px = img.load()

    def a(x, y):
        return 0 <= x < w and 0 <= y < h and px[x, y][3] > 0

    erosi = [[a(x, y) and a(x - 1, y) and a(x + 1, y) and a(x, y - 1) and a(x, y + 1)
              for x in range(w)] for y in range(h)]
    for y in range(h):
        for x in range(w):
            if not erosi[y][x]:
                px[x, y] = (0, 0, 0, 0)
    isi = [(x, y) for y in range(h) for x in range(w) if px[x, y][3] > 0]
    for (x, y) in isi:
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                X, Y = x + dx, y + dy
                if 0 <= X < w and 0 <= Y < h and px[X, Y][3] == 0:
                    px[X, Y] = px[x, y]
    return img


def pixelkan(img, faktor=0.40, warna=24):
    """Jadikan gambar ini PIXEL-ART (bukan ilustrasi halus).

    Referensi ruang guru dibuat sebagai ilustrasi isometrik halus, sedangkan
    tema yang dipilih user adalah pixel-art. Sprites diperkecil ke grid piksel
    lebih kasar lalu warnanya dibatasi (quantize), sehingga saat digambar
    diperbesar tampil sebagai blok piksel — bentuknya tetap persis referensi.
    """
    w = max(8, round(img.width * faktor))
    h = max(8, round(img.height * faktor))
    kecil = img.resize((w, h), Image.NEAREST)
    alfa = kecil.getchannel('A').point(lambda v: 255 if v > 110 else 0)
    kecil = kecil.convert('RGB').quantize(colors=warna, method=Image.MEDIANCUT).convert('RGBA')
    kecil.putalpha(alfa)
    return kecil


def rapikan(img):
    """quantize warna (halus, menghapus noise JPEG) + potong tepi kosong"""
    alfa = img.getchannel('A').point(lambda v: 255 if v > 128 else 0)
    rgb = img.convert('RGB').quantize(colors=40, method=Image.MEDIANCUT).convert('RGB')
    out = rgb.convert('RGBA')
    out.putalpha(alfa)
    kotak = out.getbbox()
    return out.crop(kotak) if kotak else out


def main():
    os.makedirs(OUT, exist_ok=True)
    im = Image.open(REF).convert('RGB')
    print(f'referensi {im.size}')
    manifes = {}
    for nama, kotak in KOTAK.items():
        # beri margin 10 px supaya garis tepi objek tidak menyentuh batas potongan
        m = 6
        kk = (max(0, kotak[0] - m), max(0, kotak[1] - m),
              min(im.width, kotak[2] + m), min(im.height, kotak[3] + m))
        kp = pisahkan(im.crop(kk), kk)
        ek = EKSTRA.get(nama, {})
        kp = buang_rect(kp, ek.get('rect', []), (kk[0], kk[1]))
        kp = hanya_komponen_utama(kp, 0.10)
        kp = rapikan(kp)
        kp = buka_morfologi(kp)
        if os.environ.get('DINGIN') != '1':
            kp = hangatkan(kp)
        if os.environ.get('HALUS') != '1':
            kp = pixelkan(kp)
        kotak2 = kp.getbbox()
        if kotak2:
            kp = kp.crop(kotak2)
        kp.save(os.path.join(OUT, f'{nama}.png'))
        manifes[nama] = {'w': kp.width, 'h': kp.height, 'kotak': list(kotak),
                         'rasio': round(kp.width / kp.height, 4)}
        print(f'  {nama:15s} {kp.width:4d} x {kp.height:4d}  rasio {kp.width / kp.height:.2f}')
        if DEBUG:
            bg = Image.new('RGB', kp.size, (72, 16, 15))
            bg.paste(kp, (0, 0), kp)
            bg.save(f'/tmp/dbg_{nama}.png')
    with open(os.path.join(OUT, 'manifest.json'), 'w') as f:
        json.dump(manifes, f, indent=1)
    print(f'{len(manifes)} sprite -> {OUT}')


if __name__ == '__main__':
    main()
