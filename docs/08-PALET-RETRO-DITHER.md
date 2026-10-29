# 08 — PALET RETRO ENDESGA 32 + DITHERING (ronde 38)

Ditulis 2026-10-29 atas permintaan user:

> "untuk semuanya bisakah style nya dan palette warna nya dibuat lebih ke
> arah retro pixel art?"

Jawaban user saat ditanya (tiga pilihan):

| Pertanyaan | Jawaban user |
| --- | --- |
| ciri khas retro yang diinginkan | **DITHERING** (pola kotak untuk peralihan warna) |
| palet warna | **ENDESGA 32** (32 warna, gaya 16-bit) |
| cakupan | **SEMUA bagian** — ruangan, 4 preset objek, langit & cuaca |

> ⚠ **Aturan ronde 13 ("untuk palette warna gunakan referensi ini saja" = 342
> warna) DIBATALKAN oleh user di ronde 38.** Yang tetap berlaku dari ronde 13:
> latar luar = **hitam OLED `#000000`**.

---

## 1. Palet: 32 warna, tidak lebih

| # | Hex | Nama | # | Hex | Nama |
| --- | --- | --- | --- | --- | --- |
| 1 | `#be4a2f` | bata | 17 | `#124e89` | biru tua |
| 2 | `#d77643` | terakota | 18 | `#0099db` | biru langit |
| 3 | `#ead4aa` | krem | 19 | `#2ce8f5` | sian |
| 4 | `#e4a672` | tan | 20 | `#ffffff` | putih |
| 5 | `#b86f50` | cokelat muda | 21 | `#c0cbdc` | abu terang |
| 6 | `#733e39` | cokelat | 22 | `#8b9bb4` | abu |
| 7 | `#3e2731` | cokelat tua | 23 | `#5a6988` | abu biru |
| 8 | `#a22633` | merah tua | 24 | `#3a4466` | biru arang |
| 9 | `#e43b44` | merah | 25 | `#262b44` | biru malam |
| 10 | `#f77622` | oranye | 26 | `#181425` | hampir hitam |
| 11 | `#feae34` | kuning oranye | 27 | `#ff0044` | pink pekat |
| 12 | `#fee761` | kuning | 28 | `#68386c` | ungu tua |
| 13 | `#63c74d` | hijau muda | 29 | `#b55088` | ungu muda |
| 14 | `#3e8948` | hijau | 30 | `#f6757a` | salmon |
| 15 | `#265c42` | hijau tua | 31 | `#e8b796` | krem hangat |
| 16 | `#193c3e` | hijau arang | 32 | `#c28569` | cokelat pasir |

Sumber kebenaran: `prototype/src/iso/palet-retro.ts`.
Salinan JSON (dipakai renderer offline): `docs/04-palet-retro.json`.

### 1a. Tangga nada (ramp)

`gelap()` / `terang()` **tidak mencampur warna**. Keduanya menggeser 1–3
langkah di **tangga nada** berikut (gelap → terang). Kalau ujung tangga
tercapai, dipakai `GELAP_MAKS = #181425`.

| Tangga | Urutan |
| --- | --- |
| kayu | `#3e2731` `#733e39` `#b86f50` `#c28569` `#e4a672` `#e8b796` `#ead4aa` |
| merah | `#a22633` `#e43b44` `#f6757a` |
| oranye | `#be4a2f` `#d77643` `#f77622` `#feae34` `#fee761` |
| hijau | `#193c3e` `#265c42` `#3e8948` `#63c74d` |
| biru | `#181425` `#262b44` `#3a4466` `#5a6988` `#8b9bb4` `#c0cbdc` `#ffffff` |
| sian | `#124e89` `#0099db` `#2ce8f5` |
| ungu | `#68386c` `#b55088` |
| pink | `#ff0044` |

Setiap material objek memakai **tiga nada dari satu tangga**: `top` (terang),
`right` (satu langkah turun), `left` (dua langkah turun). Urutan ini diuji
otomatis (`top > right >= left`, `tests/run-tema.mjs`).

### 1b. Grid desain lama (342 warna) masih dipakai sebagai "niat desain"

`docs/04-palet-referensi.json` + `palet-referensi.ts` tetap ada: grid
18 kolom × 19 baris (hue × kecerahan) dari gambar referensi ronde 13. Setiap
selnya sekarang **sudah dibulatkan** ke palet Endesga, jadi:

* nama material lama (`kayu-meja`, `buku-zaitun`, …) tetap sah;
* file `scene.json` lama tetap terbaca;
* tidak ada satu piksel pun di luar 32 warna.

Warna sembarang dipetakan dengan jarak **"redmean"** (lebih dekat ke persepsi
mata daripada RGB mentah, dan murni bilangan bulat sehingga Python bisa
menghitung hasil yang **persis sama**).

---

## 2. Dithering: cara membuat gradasi dengan 32 warna

Campuran dua warna palet menghasilkan warna **di luar palet** → tidak boleh.
Penggantinya pola **Bayer 4×4**: 4×4 piksel internal, `level` 0..1 menentukan
berapa banyak piksel warna kedua.

```
matriks ambang (0..15)          level 25%          level 50%
  0  8  2 10                    . X . .            . X . X
 12  4 14  6                    X . X .            X . X .
  3 11  1  9                    . X . X            . X . X
 15  7 13  5                    X . X .            X . X .
```

* `level` dibulatkan ke **1/16** → pola sama di semua perangkat.
* Ukuran 4×4 piksel internal = kotak **9×9 px** di layar (kanvas diperbesar
  ×2,25) → tegas, bukan gradasi buram.
* Modul: `prototype/src/iso/dither.ts`
  * `polaDither(ctx, a, b, level)` — isian dua warna (boleh jadi `fillStyle`).
  * `polaBayang(ctx, warna, level)` — dither **bertumpuk** (sebagian piksel
    transparan) untuk menggelapkan bidang yang sudah berwarna (lantai berubin,
    muka dinding).
  * `pikselB(x, y, level)` — aturan piksel, dipakai juga oleh uji.
* Cermin Python: `dither()`, `bayang()`, `_isi_pola()`, `_elips_pola()`.

### 2a. Di mana dithering dipasang

| Bagian | Perilaku |
| --- | --- |
| kaki dinding | 3 pita `polaBayang` makin rapat ke bawah (tinggi 0,22 / 0,33 / 0,50 z) |
| bayangan lantai | 3 pita `polaBayang` warna nat material, di kaki kedua dinding |
| pita nada dinding | batas terang → teduh diberi jalur dither 50% |
| balok objek | batas pita nada 26% diberi jalur dither selebar ±0,42 z |
| silinder | batas terang/gelap: 3 zona (`30%` dan `70%`) di sekitar terminator |
| bola | 4 lapis konsentris 22% / 52% / 78% / sorot |
| langit | 6 pita keras + 2 jalur dither (25% lalu 75%) di setiap batas pita |
| halo matahari/bulan | 2 cakram dither (14–18% lalu 42–48%) sebelum tepi pekat |
| awan | lingkar luar = dither antara nada terang & perut awan |

### 2b. Rencana langit (dipakai DUA renderer)

```
rencanaLangit(kendali[6]):
  pita[i]      = { v0: i/6, v1: (i+1)/6, warna: kendali[i] }
  dither[2i]   = { v0: vc-h, v1: vc, a: kendali[i], b: kendali[i+1], level: 0,25 }
  dither[2i+1] = { v0: vc,   v1: vc+h, …                        , level: 0,75 }
  vc = (i+1)/6 ; h = TINGGI_DITHER = 0,028
```

Warna kendali tiap fase (atas → horizon):

| Fase | 6 pita |
| --- | --- |
| fajar | `#262b44` `#3a4466` `#5a6988` `#b55088` `#d77643` `#feae34` |
| pagi | `#124e89` `#0099db` `#2ce8f5` `#c0cbdc` `#ead4aa` `#e8b796` |
| siang | `#124e89` `#0099db` `#0099db` `#2ce8f5` `#c0cbdc` `#ead4aa` |
| senja | `#3a4466` `#68386c` `#be4a2f` `#f77622` `#feae34` `#fee761` |
| malam | `#181425` `#181425` `#262b44` `#262b44` `#3a4466` `#5a6988` |

Mendung: gerimis `#8b9bb4 ×2 #5a6988 ×2 #3a4466 ×2` · hujan `#5a6988 ×2
#3a4466 ×2 #262b44 ×2` · badai `#3a4466 ×2 #262b44 ×2 #181425 ×2`.

---

## 3. Uji yang menjaga

| Uji | Yang dijaga |
| --- | --- |
| `tests/run-palet.mjs` | 32 warna unik, tangga nada monoton, semua warna `palette.ts` ∈ palet, pola Bayer 16 ambang, JSON sinkron |
| `tests/run-retro.mjs` | dithering terpasang di dinding/lantai/objek/langit; **tidak ada `rgba()`** dan **tidak ada `campur()`** di jalur gambar; Python memakai matriks & rencana yang sama |
| `tests/run-tema.mjs` | urutan nada `top > right >= left`, latar OLED, material tema tetap hangat |
| `tests/run-langit.mjs` | 6 pita + 10 jalur dither per langit, semua warna ∈ palet |
| `tests/run-paritas.mjs` | `langitFase`, `efekCuaca`, `rencanaLangit`, `gelap/terang`, `kePalet` **identik** TS ⇄ Python |

Hasil render uji: `python3 tools/render_scene.py` (lihat `docs/04` §6).
