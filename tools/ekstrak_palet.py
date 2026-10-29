"""Ekstrak 342 warna palet referensi dari poster "COLOR PALETTE".

    python3 tools/ekstrak_palet.py                    # poster asli (18x19)
    python3 tools/ekstrak_palet.py --ringkas           # versi ringkas (16x12)
    python3 tools/ekstrak_palet.py --json /tmp/x.json  # simpan hasil

Kenapa median, bukan rata-rata: kotak swatch dikelilingi tepi JPEG yang
gradasinya lebih gelap/terang. Median dari bagian tengah kotak membuat warna
yang diambil = warna asli kotak itu.

Kenapa koordinatnya di-hardcode: grid pada poster tidak rata sempurna (pitch
kolom 33,06 px, pitch baris 25,6 px), dan deteksi otomatis penuh gagal karena
kotak paling atas hampir putih. Nilai di bawah didapat dari deteksi profil
piksel (lihat docs/07-PALET-REFERENSI.md §1) lalu diverifikasi manual:
342 warna, semuanya unik.
"""
import argparse
import json
import statistics
import sys

from PIL import Image

# poster asli "Rainbow colors with brown and gray": 18 kolom x 19 baris
POSTER = {
    'berkas': '/tmp/arena-coding-uploads/5cd0814252f356b311635d5c6067e48d.jpg',
    'x0': 69.0, 'pitch_x': 33.06, 'kolom': 18,
    'y0': 190.0, 'pitch_y': 25.6, 'baris': 19,
}
# versi ringkas tanpa kolom cokelat/abu: 16 kolom x 12 baris
RINGKAS = {
    'berkas': '/tmp/arena-coding-uploads/949cadaf3bbd2181248bfacecc90cd5e.jpg',
    'x0': 86.0, 'pitch_x': 35.55, 'kolom': 16,
    'y0': 24.0, 'pitch_y': 34.4, 'baris': 12,
}


def ambil(im, cfg):
    px = im.load()
    kisi = []
    for t in range(cfg['baris']):
        baris = []
        for k in range(cfg['kolom']):
            cx = cfg['x0'] + cfg['pitch_x'] * (k + 0.5)
            cy = cfg['y0'] + cfg['pitch_y'] * (t + 0.5)
            warna = []
            for dy in range(-5, 6):
                for dx in range(-5, 6):
                    warna.append(px[int(round(cx + dx)), int(round(cy + dy))])
            m = [statistics.median(c[i] for c in warna) for i in range(3)]
            baris.append('#%02x%02x%02x' % tuple(int(round(v)) for v in m))
        kisi.append(baris)
    return kisi


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--ringkas', action='store_true', help='pakai gambar versi ringkas')
    ap.add_argument('--json', default='', help='tulis hasil ke berkas JSON')
    a = ap.parse_args()

    cfg = RINGKAS if a.ringkas else POSTER
    im = Image.open(cfg['berkas']).convert('RGB')
    kisi = ambil(im, cfg)
    semua = [c for baris in kisi for c in baris]
    unik = len(set(semua))
    print(f"{cfg['kolom']} kolom x {cfg['baris']} baris = {len(semua)} warna, unik {unik}")
    for t, baris in enumerate(kisi):
        print(f'{t + 1:2d}', ' '.join(baris))
    if a.json:
        json.dump(kisi, open(a.json, 'w'))
        print('tersimpan:', a.json)
    if unik != len(semua):
        print('PERINGATAN: ada warna kembar — periksa geometri grid', file=sys.stderr)


if __name__ == '__main__':
    main()
