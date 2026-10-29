# 04 — Kontrak Renderer (prototipe web ⇄ APK)

> Status: **normatif** · Ditulis 2026-10-29 · Berlaku untuk renderer web
> (`prototype/src/iso/*`) **dan** renderer APK nanti.
>
> Tujuan dokumen ini: APK **tidak boleh beda tafsir** dengan prototipe. Semua
> yang tampil di kanvas harus bisa diproduksi ulang persis oleh renderer APK
> dari `scene.json` yang sama. Bila ada keraguan, **dokumen ini yang menang**;
> bila renderer web menyimpang dari dokumen ini, renderer web yang diperbaiki.

---

## 0. Sumber kebenaran

| Hal | Sumber |
|---|---|
| Data ruangan | `scene.json` (skema: docs/03) — satu-satunya input renderer |
| Daftar warna | `prototype/src/iso/palette.ts` (nama material → 3 tone) |
| Geometri/proyeksi | dokumen ini, §2 |
| Urutan gambar | dokumen ini, §3 |
| Objek katalog | `prototype/src/scene/presets.ts` (komposisi balok) |

Renderer **tidak** boleh punya data sendiri: tidak ada warna hard-code, tidak
ada ukuran objek hard-code, tidak ada daftar objek di kode APK. Semua datang
dari `scene.json` + tabel warna yang dibekukan bersama APK (hasil ekspor
`palette.ts`, lihat §6).

---

## 1. Satuan

| Satuan | Definisi | Nilai |
|---|---|---|
| `e`, `w` | 1 satuan = 1 tile lantai | — |
| `z` | 1 satuan = 1 tinggi balok standar | — |
| `HW` (half width) | setengah lebar tile di layar | `clamp(round(16 × Q), 8, 160)` px |
| `HH` (half height) | setengah tinggi tile | `HW / 2` px |
| `ZH` | tinggi 1 satuan z di layar | `HW` px |
| `Q` | zoom kamera | `0.5 … 6`, default `1` |
| Kanvas internal | resolusi render | **640 × 400** px |
| Skala tampil | upscale **nearest neighbour** | **×4** → 2560 × 1600 |

`Q = 1` ⇒ `HW = 16`, `HH = 8`, `ZH = 16`.

**Aturan angka scene:** semua `pos` dan `size` kelipatan **0.1**; `size`
minimal **0.1**. Nilai di luar itu dinormalisasi sebelum keluar dari editor
(§7) — APK boleh menganggap input selalu bersih, tetapi tetap wajib
memvalidasi (tolak/bulatkan, jangan crash).

---

## 2. Proyeksi (eksak)

Untuk titik dunia `(e, w, z)` dan kamera `(CE, CW, Q)`:

```
HW = clamp(round(16 × Q), 8, 160)
HH = HW / 2
ZH = HW

x = 320 + ((e − CE) − (w − CW)) × HW
y = 200 + ((e − CE) + (w − CW)) × HH − z × ZH
```

Aturan wajib:

1. **Semua langkah proyeksi menghasilkan integer** sebelum menggambar
   (`Math.round` / pembulatan ke bawah yang sama di semua sisi). Dilarang
   memakai koordinat pecahan untuk posisi piksel.
2. **Tidak ada anti-aliasing**: `ctx.imageSmoothingEnabled = false`,
   `image-rendering: pixelated`, dan garis digambar tanpa `lineWidth` pecahan.
3. **Crispify**: setelah semua balok digambar, renderer web menjalankan
   `crispify()` (ambang alpha) supaya tepi tetap tajam; APK wajib meniru
   efek yang sama atau menggambar garis tepi secara eksplisit (lihat §5).
4. Kamera **selalu mulai** `Q = 1, CE = 0, CW = 0`; kamera tidak pernah
   disimpan di `scene.json`.

---

## 3. Urutan gambar (algoritma bernomor)

Wajib dieksekusi persis dalam urutan ini. Nomor tidak boleh ditukar.

| # | Lapisan | Isi |
|---|---|---|
| 1 | Latar kanvas | isi seluruh kanvas `PAL.void` = `#12131f` |
| 2 | Ruangan bawaan | hanya bila `ROOM_VISIBLE` (kini **false**) |
| 3 | Dinding objek | `role === 'dinding'`, diurutkan: **latar dulu**, lalu sisanya |
| 4 | Overlay editor | grid/zona bantu — **tidak pernah** ikut ke APK |
| 5 | Lantai objek | `role === 'lantai'`, **latar dulu**, lalu sisanya |
| 6 | Balok LATAR | `latar === true` & bukan lantai/dinding |
| 7 | Balok `underlay` | `latar !== true && layer === 'underlay'` |
| 8 | Balok `main` | `latar !== true && layer === 'main'` |
| 9 | Balok `overlay` | `latar !== true && layer === 'overlay'` |
| 10 | Sorotan seleksi | hanya editor — **tidak** ikut ke APK |
| 11 | Pantulan | `pantulan !== false`, tanpa latar/underlay/lantai/dinding |
| 12 | HUD/chip | hanya editor — **tidak** ikut ke APK |

**Urutan di dalam setiap kelompok (6–9)** — `sortedObjects()`:

```
bila kedua objek punya `urutan`:  naik  = urutan lebih besar digambar lebih akhir (lebih depan)
                                  seri  = bandingkan depth (bawah)
bila hanya satu punya `urutan`:   yang punya `urutan` digambar lebih akhir
bila tak ada yang punya:          bandingkan depth

depth(obj) = pos.e + se/2 + pos.w + sw/2
(se = size.e, sw = size.w; bila rot ganjil → se = size.w, sw = size.e)
```

Dinding (langkah 3) dan lantai (langkah 5) memakai aturan yang sama, tetapi
hanya mengurutkan latar lebih dulu.

**Pantulan** (langkah 11): alpha `0.12`, tinggi objek dipadatkan `×0.6`,
posisi z dicerminkan `−(pos.z + 0.6·size.z)`, dipotong (clip) tepat ke bentuk
objek lantai.

---

## 4. Bentuk dasar & warna

Hanya ada **tiga bentuk**: balok, bidang lantai, bidang dinding.

| Bentuk | Cara gambar |
|---|---|
| Balok | 3 sisi terlihat: atas, kiri (e−), kanan (w−) + sisi belakang tidak perlu (isometrik tetap) |
| Lantai | poligon datar pada `z = pos.z`, pola dari `style` (`lantai-kayu*` = papan 4×1 selang-seling, `lantai-ubin` = ubin 1×1, `lantai-pastel-*`) |
| Dinding | poligon vertikal: sisi `kiri` = bidang `e = pos.e`, sisi `kanan` = bidang `w = pos.w`, ditambah plint kayu 0.18 z |

**Warna** hanya dari material berikut (`palette.ts`, 3 tone):
`top` = sisi atas, `left` = sisi e−, `right` = sisi w−.

Aturan wajib:

- **Dilarang** menginterpolasi, menggelapkan, atau memberi tint tambahan pada
  warna material. Efek cahaya sudah "dibakar" ke ketiga tone.
- **Dilarang** menambah bayangan otomatis (drop shadow) selain pantulan §3.
- `refleksi: true` = **tukar** tone `left` ⇄ `right` (cermin objek), bukan
  membalik geometri.
- Warna di luar palet hanya boleh lewat `style: {top, left, right}` eksplisit
  di `scene.json`.

---

## 5. Yang TIDAK boleh dilakukan APK (sumber beda tafsir)

1. Mengganti algoritma pengurutan (mis. mengurutkan ulang berdasarkan z saja).
2. Menambah anti-aliasing, blur, glow, atau bloom.
3. Memakai font/palet sistem untuk menggambar objek.
4. Menggambar **per grup** — grup hanyalah pengelompokan editor; renderer
   selalu menggambar **per balok**.
5. Menghormati `latar` bila objek latar justru ditampilkan sebagai perabot
   biasa (latar selalu paling belakang, tidak pernah memantul).
6. Membaca `meta.locked` sebagai larangan render — itu hanya status editor.
7. Menyimpan kamera/zoom ke `scene.json`.

---

## 6. Tabel warna dibekukan

`palette.ts` diekspor ke `docs/04-palet.json` (nama material → `{top,left,right}`
dan tabel lantai/dinding). APK memuat file itu **apa adanya**; menambah warna =
menambah berkas + versi kontrak baru, bukan mengubah kode renderer.

---

## 7. Normalisasi scene (sebelum ditulis/ekspor)

`normalisasiScene()` dijalankan pada setiap penulisan file, EXPORT, dan SALIN
JSON:

1. `pos` dan `size` dibulatkan ke **0.1**; `size` minimal **0.1**.
2. `id` unik (duplikat diberi akhiran), `label` tidak boleh kosong.
3. `urutan` dibulatkan ke bilangan bulat.
4. Array `objects` diurutkan: **latar dulu**, lalu `urutan` menaik.
5. `meta` hanya berisi `locked`, `savedAt`, `latarMigrasi`.

APK **boleh** menganggap semua ini sudah beres, tetapi tetap wajib memvalidasi
dan tidak boleh crash pada data lama.

---

## 8. Uji kesetaraan (dijalankan tiap perubahan)

| Uji | Alat | Lulus bila |
|---|---|---|
| Tipe & build | `npx tsc --noEmit`, `npx vite build` | tanpa error |
| Skema + katalog + urutan | `node tests/run-kontrak.mjs` | semua baris `OK` |
| Tabel warna | `node tests/export-palet.mjs` | `docs/04-palet.json` diperbarui |
| Visual | `docs/04-contoh-scene.json` | APK memuat scene contoh (96 objek: ruangan + semua preset) dan tampak sama dengan pratinjau web (uji berdampingan manual) |

**Hash acuan urutan gambar:** `b1d32a86ae59`
(dihitung dari urutan `meja,buku,lampu` pada scene uji di `tests/run-kontrak.mjs`).
Bila hash berubah, urutan gambar berubah — periksa dulu apakah disengaja,
baru perbarui angka di uji + dokumen ini bersamaan.

Bila salah satu uji gagal, **jangan** rilis APK: beda tafsir sudah terjadi.
