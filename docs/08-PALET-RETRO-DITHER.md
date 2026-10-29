# 08 — PALET REFERENSI 51 WARNA + DITHERING (ronde 39)

Ditulis ulang 2026-10-29 (ronde 39). Menggantikan versi Endesga 32 (ronde 38).

Permintaan user:

> "Saya rasa masih terlihat terlalu modern, bisa buat seperti referensi untuk
> Style dan warnanya?"

Dengan dua gambar referensi diorama pixel-art (rumah Tudor beratap bata di tanah
mint; desa jembatan batu dengan air toska).

Jawaban user saat ditanya (empat pertanyaan):

| Pertanyaan | Jawaban user |
| --- | --- |
| palet warna | **PALET BARU** — 51 warna hasil ekstrak kedua gambar referensi |
| outline objek | **YA** (membatalkan aturan ronde 19 "jangan beri outline") |
| latar di luar ruangan | **tetap HITAM OLED `#000000`** (aturan ronde 13 tidak dicabut) |
| gaya dinding | **TUDOR** — plester krem + rangka balok kayu |

> ⚠ Palet **Endesga 32** (ronde 38) **tidak dipakai lagi**. Palet 342 warna
> (ronde 13) juga tetap dibatalkan. Yang tetap berlaku dari ronde 13: latar luar
> = **hitam OLED** dan grid desain 18x19 hanya sebagai "niat desain".

---

## 1. Palet: 51 warna, tidak lebih

Sumber kebenaran: `prototype/src/iso/palet-retro.ts` (`PALET_RETRO`).
Salinan JSON untuk renderer offline: `docs/04-palet-retro.json`.
Palet ini disusun sebagai **10 tangga nada**; tiap baris di bawah = satu tangga,
urut **gelap -> terang**.

| Tangga | Warna |
| --- | --- |
| 0 | `#2b1a12` `#391d0b` `#452d1e` `#5f3d28` `#8a5a3a` `#a8764f` `#c99b6a` `#e4b98a` |
| 1 | `#3d432a` `#574d36` `#8e8a6d` `#c5c7a4` `#dadab8` `#f1e1bb` `#f7f2cd` `#fff9e3` |
| 2 | `#833422` `#a8412b` `#c95b3f` `#ee734c` `#fb836b` |
| 3 | `#a05a2a` `#d8894a` `#ef9762` `#f0ce92` `#fdd792` |
| 4 | `#1a3121` `#1c5e40` `#2f8a52` `#4cb45c` `#7ad46f` `#a3ed75` |
| 5 | `#566b32` `#9aa84e` `#c9dd41` |
| 6 | `#0f4f42` `#1b865f` `#2fa56e` `#70c297` `#8dd8a5` `#befae4` `#cef4e5` |
| 7 | `#2e4a63` `#3f7fa3` `#66b6cf` `#a9e0ea` |
| 8 | `#2b8fa8` `#51dce1` `#a9f3f2` |
| 9 | `#f4fefb` `#ffffff` |

Jumlah: **51 warna**, semuanya unik, dan **setiap warna masuk tepat satu tangga**.

### 1a. Tangga nada (ramp)

| Nama | Panjang | Urutan (gelap -> terang) |
| --- | --- | --- |
| kayu/cokelat | 8 | `#2b1a12` `#391d0b` `#452d1e` `#5f3d28` `#8a5a3a` `#a8764f` `#c99b6a` `#e4b98a` |
| batu/krem | 8 | `#3d432a` `#574d36` `#8e8a6d` `#c5c7a4` `#dadab8` `#f1e1bb` `#f7f2cd` `#fff9e3` |
| bata/merah | 5 | `#833422` `#a8412b` `#c95b3f` `#ee734c` `#fb836b` |
| oranye | 5 | `#a05a2a` `#d8894a` `#ef9762` `#f0ce92` `#fdd792` |
| hijau | 6 | `#1a3121` `#1c5e40` `#2f8a52` `#4cb45c` `#7ad46f` `#a3ed75` |
| zaitun | 3 | `#566b32` `#9aa84e` `#c9dd41` |
| mint/toska | 7 | `#0f4f42` `#1b865f` `#2fa56e` `#70c297` `#8dd8a5` `#befae4` `#cef4e5` |
| langit | 4 | `#2e4a63` `#3f7fa3` `#66b6cf` `#a9e0ea` |
| air | 3 | `#2b8fa8` `#51dce1` `#a9f3f2` |
| putih | 2 | `#f4fefb` `#ffffff` |

`gelap(hex, n)` / `terang(hex, n)` **tidak mencampur warna** — keduanya
menggeser 1..3 langkah di tangga yang sama. Kalau ujung gelap tercapai, dipakai
`GELAP_MAKS = #2b1a12`.

Setiap material objek memakai **tiga nada dari satu tangga**: `top` (terang),
`right` (1 langkah turun), `left` (2 langkah turun). Urutan ini diuji otomatis
(`top > right >= left`, `tests/run-tema.mjs`).

### 1b. Outline 1 px (kembali sejak ronde 39)

Di gambar referensi **setiap bidang punya garis tepi tipis yang lebih gelap dari
isinya** — bukan hitam rata. Aturannya:

```
tinta(hex):
  c      = warna palet terdekat dari hex
  target = luma(c) * 0,55
  k      = tingkat(c) - 2            # minimal 2 langkah lebih gelap
  selama k > 0 dan luma(ramp[k]) > target: k -= 1
  hasil  = ramp[k]
```

* Tebal **2 px internal** = 9 px di tablet (ronde 40; dulu 1 px).
* Warna = `tinta()` dari warna isian, jadi tepi di atas krem tetap kecokelatan
  dan tepi di atas hijau tetap hijau gelap (tidak jadi hitam semua).
* Dipasang di `prototype/src/iso/box.ts` (`poly(..., garis)`), silinder, kerucut,
  bola, dan cermin Python `tools/render_scene.py` (`poly`, `tinta()`).
* Bisa dimatikan per objek lewat field lama `tepi: false` (data lama tetap sah).

### 1c. Grid desain lama (342 warna) masih dipakai sebagai "niat desain"

`docs/04-palet-referensi.json` + `palet-referensi.ts` tetap ada: grid 18 kolom x
19 baris (hue x kecerahan) dari gambar referensi ronde 13. Setiap selnya **sudah
dibulatkan** ke palet 51 warna, jadi:

* nama material lama (`kayu-meja`, `buku-zaitun`, ...) tetap sah;
* file `scene.json` lama tetap terbaca;
* tidak ada satu piksel pun di luar 51 warna.

Warna sembarang dipetakan dengan jarak **"redmean"** (murni bilangan bulat,
sehingga Python menghitung hasil yang **persis sama**).

### 1d. Gaya ruangan ronde 39 (Tudor)

| Bagian | Nilai |
| --- | --- |
| dinding Tudor | plester `#f1e1bb` (teduh) / `#f7f2cd` (cahaya), rangka balok `#5f3d28` / `#8a5a3a` |
| rangka balok | tiang tegak tiap 1/4 lebar dinding + lis mendatar tiap 5 z + cornice 0,5 z |
| lantai `lantai-papan-batu` | papan `#c99b6a` / `#e4b98a`, nat `#8a5a3a`, papan 4 tile |
| lantai batu `lantai-batu` | batu `#dadab8` / `#c5c7a4` / `#f1e1bb`, nat `#8e8a6d` |
| latar luar | `#000000` (OLED, tetap) |

`WALL_DEFAULT = 'dinding-tudor'` dan `FLOOR_DEFAULT = 'lantai-papan-batu'`.
Gaya Endesga ronde 38 (`dinding-bata`, `lantai-kayu-gelap`) tetap ada di katalog
sebagai pilihan, tetapi bukan bawaan lagi.

---

## 2. Dithering: cara membuat gradasi dengan 51 warna

Campuran dua warna palet menghasilkan warna **di luar palet** -> tidak boleh.
Penggantinya pola **Bayer 4x4**: 4x4 piksel internal, `level` 0..1 menentukan
berapa banyak piksel warna kedua.

```
matriks ambang (0..15)          level 25%          level 50%
  0  8  2 10                    . X . .            . X . X
 12  4 14  6                    X . X .            X . X .
  3 11  1  9                    . X . X            . X . X
 15  7 13  5                    X . X .            X . X .
(tiap . / X = blok SKALAxSKALA piksel internal)
```

* `level` dibulatkan ke **1/16** -> pola sama di semua perangkat.
* Satu sel matriks digambar sebagai **blok `SKALA`x`SKALA` piksel internal**.
  `SKALA = 3` (ronde 40 — "rasa retronya masih kurang berasa") -> ubin pola
  **12x12 piksel internal** = **54x54 px di layar** (kanvas internal 568x355
  diperbesar x4,5). Ronde 38-39 memakai `SKALA = 2` (8x8 internal).
  Nilai ini ada di `dither.ts` (`SKALA`) dan `render_scene.py` (`SKALA_DITHER`)
  dan **harus sama**.
* Modul: `prototype/src/iso/dither.ts`
  * `polaDither(ctx, a, b, level)` — isian dua warna (boleh jadi `fillStyle`).
  * `polaBayang(ctx, warna, level)` — dither **bertumpuk** (sebagian piksel
    transparan) untuk menggelapkan bidang yang sudah berwarna.
  * `pikselB(x, y, level)` — aturan piksel, dipakai juga oleh uji.
* Cermin Python: `dither()`, `bayang()`, `_isi_pola()`, `_elips_pola()`.

### 2a. Di mana dithering dipasang

| Bagian | Perilaku |
| --- | --- |
| kaki dinding | 3 pita `polaBayang` makin rapat ke bawah (0,22 / 0,33 / 0,50 z) |
| bayangan lantai | 3 pita `polaBayang` warna nat material, di kaki kedua dinding |
| pita nada dinding | batas terang -> teduh diberi jalur dither 50% |
| balok objek | batas pita nada 26% diberi jalur dither selebar +-0,42 z |
| silinder | batas terang/gelap: 3 zona (30% dan 70%) di sekitar terminator |
| bola | 4 lapis konsentris 22% / 52% / 78% / sorot |
| langit | 6 pita keras + 2 jalur dither (25% lalu 75%) di setiap batas pita |
| halo matahari/bulan | 2 cakram dither (14-18% lalu 42-48%) sebelum tepi pekat |
| awan | lingkar luar = dither antara nada terang & perut awan |

**Pantulan di lantai dihapus 2026-10-29** — tidak ada lagi lapisan bayangan
cermin, jadi dithering lantai hanya untuk ambient occlusion.

### 2b. Rencana langit (dipakai DUA renderer)

```
rencanaLangit(kendali[6]):
  pita[i]      = { v0: i/6, v1: (i+1)/6, warna: kendali[i] }
  dither[2i]   = { v0: vc-h, v1: vc, a: kendali[i], b: kendali[i+1], level: 0,25 }
  dither[2i+1] = { v0: vc,   v1: vc+h, ...                        , level: 0,75 }
  vc = (i+1)/6 ; h = TINGGI_DITHER = 0,028
```

Warna kendali tiap fase (atas -> horizon), semuanya dari 51 warna:

| Fase | 6 pita |
| --- | --- |
| fajar | `#2e4a63` `#3f7fa3` `#66b6cf` `#c95b3f` `#ef9762` `#f0ce92` |
| pagi | `#2e4a63` `#3f7fa3` `#66b6cf` `#a9e0ea` `#f1e1bb` `#fdd792` |
| siang | `#2e4a63` `#3f7fa3` `#66b6cf` `#a9e0ea` `#cef4e5` `#fff9e3` |
| senja | `#3f7fa3` `#2e4a63` `#833422` `#ee734c` `#ef9762` `#fdd792` |
| malam | `#1a3121` `#1a3121` `#2e4a63` `#2e4a63` `#3f7fa3` `#66b6cf` |

Mendung: gerimis `#8e8a6d x2 #574d36 x2 #3d432a x2` · hujan `#574d36 x2
#3d432a x2 #2b1a12 x2` · badai `#3d432a x2 #2b1a12 x2 #1a3121 x2`.

---

## 3. Uji yang menjaga

| Uji | Yang dijaga |
| --- | --- |
| `tests/run-palet.mjs` | 51 warna unik, 10 tangga nada monoton, semua warna `palette.ts` di dalam palet, pola Bayer 16 ambang, JSON sinkron |
| `tests/run-retro.mjs` | dithering terpasang di dinding/lantai/objek/langit; **tidak ada `rgba()`** dan **tidak ada `campur()`** di jalur gambar; Python memakai matriks & rencana yang sama |
| `tests/run-tema.mjs` | urutan nada `top > right >= left`, latar OLED, bawaan `dinding-tudor` + `lantai-papan-batu` |
| `tests/run-langit.mjs` | 6 pita + 10 jalur dither per langit, semua warna di dalam palet |
| `tests/run-paritas.mjs` | `langitFase`, `efekCuaca`, `rencanaLangit`, `gelap/terang`, `kePalet` **identik** TS <-> Python |

Hasil render uji: `python3 tools/render_scene.py` (lihat `docs/04` §6).
