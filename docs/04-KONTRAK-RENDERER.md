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

### Resolusi internal (2026-10-29)

Kanvas internal naik dari **640×400** ke **1136×710** (`DENS = 1.775`) karena
referensi user berukuran 1135×711: dulu 1 px referensi hanya 0,56 px kanvas
sehingga detailnya hilang ~44%. Skala dunia tidak berubah (1 tile tetap 1
tile, kini 56,8 px internal), jadi semua koordinat objek lama tetap sah.
Final di tablet 2560×1600 = ×2,25.

Wajib dieksekusi persis dalam urutan ini. Nomor tidak boleh ditukar.

| # | Lapisan | Isi |
|---|---|---|
| 1 | Latar kanvas | isi seluruh kanvas `PAL.void` = `#12131f` |
| 2 | **Gambar latar** | `meta.latarGambar` ada → gambar dipetakan `isi` (cover) / `muat` (contain), `imageSmoothingEnabled = false`. **Bila terpasang, objek `latar: true` tidak digambar** (data tetap ada) |
| 3 | Ruangan bawaan | hanya bila `ROOM_VISIBLE` (kini **false**) |
| 4 | Dinding objek | `role === 'dinding'`, diurutkan: **latar dulu**, lalu sisanya |
| 5 | Overlay editor | grid/zona bantu — **tidak pernah** ikut ke APK |
| 6 | Lantai objek | `role === 'lantai'`, **latar dulu**, lalu sisanya |
| 7 | Balok LATAR | `latar === true` & bukan lantai/dinding |
| 8 | Balok `underlay` | `latar !== true && layer === 'underlay'` |
| 9 | Balok `main` | `latar !== true && layer === 'main'` |
| 10 | Balok `overlay` | `latar !== true && layer === 'overlay'` |
| 11 | Sorotan seleksi | hanya editor — **tidak** ikut ke APK |
| 12 | Pantulan | `pantulan !== false`, tanpa latar/underlay/lantai/dinding |
| 13 | HUD/chip | hanya editor — **tidak** ikut ke APK |

**Urutan di dalam setiap kelompok (8–11)** — `sortedObjects()`:

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

## 4a. Bentuk tambahan: silinder & kerucut

Field `bentuk` pada objek: `balok` (default) · `silinder` · `kerucut` · `bola` · `cakram` · `daun` · `profil`.

**Transparansi (`opasitas`).** Objek dengan `opasitas` < 1 digambar dengan alpha
`opasitas` (kanvas: `globalAlpha` dikalikan, lalu dipulihkan; renderer offline
`tools/render_scene.py` menggambar objek ke lapisan RGBA terpisah lalu
`alpha_composite`, supaya tumpang-tindih di dalam satu objek tidak menumpuk dua
kali). Kisaran sah 0.05–1, 2 desimal; nilai 1 = pekat dan tidak disimpan.

**Grid rotasi 15°.** Semua sudut objek disimpan sebagai kelipatan **15°** (`ROTASI_GRID = 15`,
`normalRotasi()` di `scene/types.ts`). Tombol di panel editor objek tetap melangkah **30°**
(`ROTASI_LANGKAH`), sedangkan tombol rotasi folder melangkah **15°** (`ROTASI_FOLDER`) — kalau grid
disimpan 30°, hasil rotasi folder 15° akan dibulatkan balik dan geometri melompat. Renderer wajib
memakai nilai `rotasi` apa adanya (derajat), tanpa membulatkan.

**Garis tepi (outline) — DIMATIKAN.** Permintaan user 2026-10-29: *"jangan
berikan outline untuk objek"*. Objek digambar **tanpa stroke sama sekali**
(`GARIS_TEPI = false` di `iso/box.ts`; renderer offline `tools/render_scene.py`
memakai nama yang sama). Yang MEMBEDAKAN bidang sekarang hanya tangga nada:
pita nada 26% di kaki tiap sisi tegak + warna `top`/`left`/`right` per wajah.
Field lama `tepi: true/false` tetap dibaca tetapi **tidak berpengaruh** — data
scene lama tidak perlu dimigrasi; APK nanti tidak boleh menggambar outline.
Dinding & lantai LATAR digambar `iso/room.ts` dan belum terpengaruh aturan ini.
`bentuk` HANYA mengubah cara menggambar; footprint (`size.e × size.w`) tetap
kotak pembatas, jadi hit-test, bbox, grup, tumpukan, dan kunci tidak berubah.

| Bentuk | Geometri | Gambar |
|---|---|---|
| `silinder` | alas & tutup elips (jari-jari `size.e/2`, `size.w/2`), tinggi `size.z` | 24 segmen trapesium + tutup elips |
| `kerucut` | alas elips, atas elips berskala `puncak` (default `0` = runcing) | 24 segmen trapesium, tutup atas hanya bila `puncak > 0` |
| `bola` | bulatan; jari-jari dunia $r = \min(size.e, size.w, size.z)/2$ | 3 lingkaran bertone: gelap (R), badan (0.86R, geser −0.1R), sorot (0.5R, geser −0.3R); R = 1.31·HW·r |
| `cakram` | bulatan **datar** menghadap ruangan (bidang e-z) — matahari, jam, hiasan | 24 titik dunia (re = size.e/2, rz = size.z/2) → poligon; 3 lapis tone (left → top 0.82 + geser, right 0.34 + geser) |
| `daun` | daun lonjong di bidang e-z | pangkal di `pos`; panjang = `size.e`, lebar = `size.z`, sumbu diputar `miring` derajat (90 = tegak, 0 = ke +e). Bentuk siluet dipilih `bulat` 0..1 (bawaan **0**): **0 = meruncing** `(size.z/2)·sin(πs)^0.75·(1−0.35s)`, **1 = elips membulat** `(size.z/2)·√(1−(2s−1)²)`; nilai antaranya campuran linear kedua rumus. 17 titik per sisi; badan tone `left`, sorotan `top` pada 0.5 lebar digeser (−1,−1) px. `bulat` hanya mengubah siluet — posisi/ukuran di JSON tidak berubah, dan nilai 0 tidak ditulis ke file |

Aturan wajib (harus identik di APK):

1. **Jumlah segmen = 24**, mulai sudut 0, langkah `2π/24`. Jangan diubah —
   jumlah segmen menentukan bentuk piksel.
2. Titik dihitung di **koordinat dunia** lalu diproyeksikan dengan §2 (jangan
   memakai elips layar yang "kira-kira").
3. Segmen digambar urut **belakang → depan** berdasarkan y rata-rata titik
   segmen (pengurutan painter).
4. Tone per segmen: normal keluar `(cos t, sin t)`; bila
   `cos t − sin t ≥ 0` pakai tone **right**, selain itu **left**.
   Tutup atas memakai tone **top**.
5. `refleksi: true` menukar tone left ⇄ right seperti balok.
6. `puncak` = perbandingan jari-jari atas terhadap alas: `0` runcing,
   `0.45` kap lampu, `1` sama dengan silinder, `1.15` pot bunga (melebar).
   Nilai dibulatkan ke 0.001 (sejak 2026-10-29; sebelumnya 0.01).
7. Pantulan objek silinder/kerucut memakai fungsi yang sama (tinggi ×0.6).

## 4e. Rotasi objek 30° (2026-10-29)

Permintaan user: *"rotasi pada editor objek buat dengan kelipatan 30 derajat"*.

Berbeda dari **orbit kamera** (docs/06, kelipatan 15°, memutar seluruh dunia),
`rotasi` memutar SATU objek pada poros vertikalnya sendiri.

1. `rotasi` = derajat, kelipatan 30, dibungkus ke `0..330` (`normalRotasi`).
   `rot: 0..3` (data lama) dibaca sebagai `rot*90` lalu ditulis sebagai `rotasi`.
2. Pusat footprint `C = (e + size.e/2, w + size.w/2)` **tidak berubah** oleh
   rotasi. Keempat sudut alas (lokal `(-he,-hw) (he,-hw) (he,hw) (-he,hw)`)
   diputar: `de' = de·cosθ − dw·sinθ`, `dw' = de·sinθ + dw·cosθ`.
3. Delapan titik sudut: 4 alas + 4 atas. Wajah = 4 sisi + atap (alas tidak
   pernah terlihat karena kamera selalu di atas).
4. Normal sisi ikut diputar. Wajah tampak bila `n·kamera > 0,001`; urutan
   gambar menurut rata-rata Y layar (jauh dulu). Warna wajah dipilih dari
   komponen normal yang **dominan** (`|ne| ≥ |nw|` → kanan/kiri), bukan ambang
   0,5 yang hanya benar untuk kelipatan 90°.
5. Pita nada 26% kaki objek & rim terang di rusuk atas memakai indeks sudut
   yang sama, jadi otomatis mengikuti rotasi.
6. Sprite PIXEL tidak pernah diputar 30°. Bila `rotasi % 90 ≠ 0`, objek
   digambar sebagai geometri EDIT (sprite muncul lagi saat kembali ke
   kelipatan 90°).

Paritas offline: `draw_box()` di `tools/render_scene.py` memakai rumus yang
sama; diuji oleh `prototype/tests/run-rotasi.mjs`.

> **ARSIP (ronde 17, 2026-10-29):** objek `jendela` dan seluruh preset di §4f–§4g
> sudah DIHAPUS dari katalog atas permintaan user ("kita buat sendiri saja").
> Bagian ini disimpan hanya sebagai catatan sejarah cara menulis objek; geometri
> dan aturan renderer di §4a–§4e tetap berlaku.

## 4f. Objek JENDELA (2026-10-29)

Permintaan user: *"buatkan objek jendela seperti pada gambar"*
(Screenshot_20261029_072237.jpg). Versi EDIT `jendela` ditulis ulang:

| bagian | material | keterangan |
| --- | --- | --- |
| kusen luar, palang tegak, palang datar, ambang, batang gorden, cincin, ujung bola | `kusen-putih` (`#eeeeee`, kolom abu baris 1) | putih bersih seperti gambar (dulu kayu jati) |
| 4 daun kaca | `kaca-langit` (`#81d6fb`) | langit biru |
| matahari | `matahari` (`#fde7b5`) bentuk `cakram` + anim `denyut` | bulat, menempel di kaca |
| awan | `pastel-awan` (`#eeeeee` rata) bentuk **`profil`** | siluet awan; tumpukan `cakram` selalu terbaca seperti "kacang" |
| tirai | `tirai-gorden` (`#dddddd`) + lipatan `tirai-lipat` (`#bbbbbb`, `tepi:false`) | diikat di tengah; `tepi:false` = tanpa garis tepi supaya lipatan halus |

Lapisan kedalaman (w, 0 = permukaan dinding): kusen `0,00–0,26` · kaca
`0,10–0,16` · hiasan kaca `0,16–0,20` · tirai `0,30–0,46` · batang `0,52`.
Tirai WAJIB di depan kusen, kalau tidak tirai "tenggelam" di dinding.

Catatan alat: `b()`/`bt()`/`bp()` (presets.ts) = balok · balok tanpa garis
tepi (`tepi:false`) · bentuk `profil` (siluet bebas). Semua koordinat `e`
preset harus ≥ 0 (diuji `run-kontrak.mjs`), karena itu seluruh jendela digeser
+0,40 dengan `lebar` 5,6 → 6,4.

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
| Paritas langit | `node tests/run-paritas.mjs` | `campur()`, `pitaHalus()` (5 fase) dan pita mendung (3 cuaca) **identik** antara `iso/langit.ts` dan `render_scene.py` |
| Visual | `docs/04-contoh-scene.json` | APK memuat scene contoh (96 objek: ruangan + semua preset) dan tampak sama dengan pratinjau web (uji berdampingan manual) |

## 4b. Animasi

Transform **hanya saat menggambar** (`ctx.save` → transform → gambar →
`ctx.restore`). Titik tumpu = proyeksi `(pos.e + se/2, pos.w + sw/2, pos.z)`.
`t = (performance.now()/1000) · laju · 2π + fase·2π`, `s = sin(t)`.

| `jenis` | Transform |
|---|---|
| `naik-turun` | `translate(0, −besar · 4 · DENS · (0.5 + 0.5s))` |
| `ayun` | `rotate(besar · 3.5° · s)` di titik tumpu |
| `denyut` | `scale(1 + besar · 0.05 · s)` di titik tumpu |
| `putar` | `rotate(besar · 8° · s)` di titik tumpu |
| `kedip` | bila `s < −0.55` objek **tidak digambar** (30% siklus) |

`DENS = 1.775` (lihat §0 di bawah). `refleksi` tetap memakai transform yang
sama, jadi pantulan ikut bergerak.

## 4b-1. Langit dinamis (diperhalus 2026-10-29)

Bidang kaca ber-`langit: true` digambar oleh `iso/langit.ts` (web) dan
`draw_langit()` (`tools/render_scene.py`). Permintaan user: **"bisakah buat
langit lebih realistis?"** — jawaban user: **semua aspek**, dan gradasi
**boleh mulus (blend)**.

| Elemen | Aturan (WAJIB sama di web & APK) |
|---|---|
| warna kendali | tetap **6 warna palet** per fase (§ langitFase); tidak ada warna baru sebagai kendali |
| gradasi | **14 pita**: `pitaHalus(kendali, 14)` = campuran linear dua kendali bersebelahan (`campur()` 0..1). Pita ke-1 dan ke-14 persis warna kendali |
| kabut horizon | warna pita bawah dicampur warna kabut, kekuatan `((v−0,55)/0,45)² × 0,55` (malam 0,30). Kabut: pagi/siang = campuran `pita[5]` + abu terang; fajar/senja = keemasan; malam = sisa cahaya kota |
| matahari | 4 lapis: halo luar (`campur(langit, inti, 0,30)`, r 0,135×0,235), halo dalam (`0,62`, 0,108×0,188), tepi (r 0,082×0,144), inti (0,058×0,102). Siang: tepi `warna(3,2)` inti `warna(3,1)`; fajar/senja: tepi `warna(2,4)` inti `warna(3,2)` |
| bulan | halo 2 lapis tipis + bola `warna(18,2)` + sorotan + **3 kawah** `warna(18,3)` |
| bintang | **34 butir**, ukuran & fase kedip berbeda; `besar > 0,55` diberi salib tipis; warna `warna(18,1)` / satu tingkat lebih gelap saat redup |
| awan | gumpalan kumulus: 3 elips lingkar (campuran awan→langit, tepi lembut) + alas rata gelap + 3 gumpalan terang + 1 puncak sorotan. Jumlah awan tetap dari `efekCuaca()` |
| kilat | **bercabang**: batang utama (10 titik) + 2 cabang, warna `warna(3,1)` |

Aturan anti-alias: **gradasi** langit boleh hasil blend warna (keputusan user),
tetapi semua **bentuk** (matahari, awan, bintang, kilat, kusen) tetap poligon
koordinat bulat tanpa anti-alias.

## 4c. Tema & elemen gambar (2026-10-29)

Palet dan aturan gaya: lihat `docs/05-TEMA-DIORAMA-HANGAT.md`. Yang WAJIB
ditiru renderer Kotlin (semua sudah ada di `render_scene.py`):

| Elemen | Aturan |
|---|---|
| outline | isi dicampur 42% ke tinta `#4a1e0a`, tebal 2 px internal, `lineJoin=round`, dimatikan oleh `tepi:false` |
| bibir terang | garis 2 px di dua sisi belakang bidang atas, warna isi dicampur 30% ke `#ffe8be` |
| dinding | pita nada di 0,11·Z (teduh 0,94) dan 0,045·Z (teduh 0,88); plint 0,26 z; cornice balok 0,5 z dengan rim 0,07 z + bayangan 0,05 z; tiang 0,42 tile di kedua ujung + pasak r = 0,96·DENS |
| lantai | bayangan ambient 3 pita (lebar 1,0/0,66/0,33 × min(1,8; 0,22·de; 0,22·dw), alpha 20/26/41 dari `rgba(74,33,12,·)`); deck = papan dengan sambungan tiap ~0,45 tile + bibir `#d98f4a` + dasar `#4a210c` |
| komposisi | `fitToScene()` (docs/05 §3), margin 0,95 |

## 4d. Orbit kamera (2026-10-29)

Kamera boleh mengelilingi diorama dalam langkah **15°**; objek tetap sejajar
grid. Rumus & aturan lengkap: `docs/06-ORBIT-15.md`. Yang WAJIB ditiru
renderer lain:

| Elemen | Aturan |
|---|---|
| proyeksi | `re=(e−CE)cosφ−(w−CW)sinφ`, `rw=(e−CE)sinφ+(w−CW)cosφ`, `x=OX+(re−rw)HW`, `y=CY+(re+rw)HW/2−z·ZH` |
| invers | putar balik dengan sudut −φ (bukan sekadar swap) |
| wajah balok | 6 wajah, tampak bila `normal·(cosφ+sinφ, cosφ−sinφ, 1) > 0`, gambar jauh→dekat |
| silinder | warna segmen = `hadap = ne·kameraE + nw·kameraW` (`≥0` kanan, selain itu kiri) |
| dinding | gambar hanya bila `kameraE > 0` (sisi kiri) / `kameraW > 0` (sisi kanan) |
| objek tempel | ikut disembunyikan bila `z ≥ 0,3` dan menempel dinding tersembunyi |
| bingkai | bbox proyeksi 8 sudut kotak pembungkus → zoom & geser (margin 0,95) |

**Hash acuan urutan gambar:** `b1d32a86ae59`
(dihitung dari urutan `meja,buku,lampu` pada scene uji di `tests/run-kontrak.mjs`).
Bila hash berubah, urutan gambar berubah — periksa dulu apakah disengaja,
baru perbarui angka di uji + dokumen ini bersamaan.

Bila salah satu uji gagal, **jangan** rilis APK: beda tafsir sudah terjadi.

## 4g. Penyegaran semua objek katalog (2026-10-29, ronde 16)

Permintaan user: *"perbaiki dulu semua objek dari referensi — saya ingin clean
dan lengkap."* Seluruh 14 preset ditulis ulang dengan konvensi yang sama.

**Aturan arah (WAJIB):** kamera isometrik melihat dari arah `+w` dan `+e`.
Muka yang dilihat pengguna (muka laci, papan tulis, layar kalkulator, layar
laptop bagian dalam) diletakkan di **sisi w besar**, bukan w kecil. Salah sisi
= detail tersembunyi di balik badan objek (bug yang diperbaiki di ronde ini).

**Skala acuan** (1 tile ≈ 0,5 m, tinggi meja 1,68 tile ≈ 0,84 m):

| Preset | lebar × dalam | Tinggi acuan |
|---|---|---|
| `meja-guru` | 4,8 × 2,0 | daun meja 1,52–1,68; pedestal 3 laci 0–1,28 |
| `kursi-putar` | 2,2 × 2,2 | dudukan 1,02; sandaran 1,06–1,96 |
| `papan-tulis` | 4,9 × 1,5 | papan 1,16–3,60; baki spidol 1,02 |
| `papan-gabus` | 2,9 × 0,2 | tempel dinding `dinding-kanan` |
| `rak-buku` | 4,2 × 1,0 | papan 0,18 / 1,62 / 3,22 |
| `jendela` | 6,4 × 0,7 | lihat §4f |
| `lampu-meja` | 1,2 × 1,2 | kap kerucut `puncak 0,42` di 1,56–2,08 |
| `rak-buku` | 3,0 × 0,6 (tinggi 4,82) | papan belakang 0,06 + 2 sekat 0,08 + alas & 2 papan 0,12 + papan atas 0,14 (`kayu-tua`/`kayu-meja`), 24 buku tebal 0,26–0,32 tinggi 1,06–1,30 di z 0,12 / 1,68 / 3,12; `pasang: dinding-kiri` (`e` = kedalaman, `w` = lebar) |
| `tanaman-pot` | 1,8 × 1,8 | pot 0–1,34 (`bata`), batang z 1,16–4,56, **18 daun membulat** (`bulat: 1`) dalam 3 tingkat: bawah z 2,38–2,55 (5), tengah z 3,32–3,52 (6), atas z 4,22–4,46 (7), ujung ±6,4 |
| `tempat-sampah` | 2,2 × 1,4 | tong 1,24 + 2 kertas remuk |
| `laptop` | 2,0 × 1,7 | 4×10 tombol + layar berisi 3 jendela |
| `tumpukan-buku` | 1,4 × 1,0 | 3 buku (teal / krem / bata) |
| `kalkulator` | 1,0 × 0,95 | 3×4 tombol, layar di sisi w kecil |
| `bingkai-foto` | 1,1 × 0,16 | foto langit + tanah + matahari |
| `gelas-pensil` | 0,7 × 0,7 | gelas 0,60 + 4 pensil (**baru**) |

**Kaidah "clean":** tidak ada bagian yang menutupi bagian lain secara tidak
sengaja (mis. pelat dalam papan gabus yang dulu menutup seluruh gabus), tidak
ada kotak yang menonjol keluar dari lingkarannya (bibir gelas kotak → silinder),
dan tidak ada material di luar palet (`docs/07-PALET-REFERENSI.md`).

Material baru: `papan-putih` (muka papan tulis `#ded1c9`), `perak`, `perak-tua`,
`abu`, `abu-tua`, `kayu-meja`, `kayu-tepi`, `kayu-gelap`, `buku-gelap`.
Total material: **74** (lihat `docs/04-palet.json`).
