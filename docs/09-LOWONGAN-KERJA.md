# 09 — LOWONGAN KERJA: 2 PERAN INTI PROYEK "ISOMETRIC LAUNCHER"

Disusun 2026-10-29 · dokumen internal Tech HR & Product Owner
Status: **draf untuk disetujui** (bagian bertanda `[ISI TIM]` harus diputuskan pemilik produk)

---

## 0. Ringkasan proyek (konteks yang WAJIB dibaca pelamar)

Kami membangun **launcher Android** untuk tablet **HUAWEI MatePad Mini** (8,8" OLED,
**2560×1600**, 120 Hz, HarmonyOS **4.3.0**, Kirin 9010B, RAM 12 GB, **landscape-only**).
Launcher ini menampilkan ruang kerja guru matematika sebagai **diorama isometrik
pixel-art 32-bit**: bukan wallpaper, bukan grid ikon biasa — melainkan satu ruangan
isometrik yang bisa diklik (rak buku = materi, jendela = jam/cuaca, meja = permukaan
kerja, dsb.).

Produk hibrida **aplikasi + game**, sehingga dua jalur dikembangkan paralel:

| Jalur | Teknologi | Peran |
| --- | --- | --- |
| **A. Prototipe web** | Vite + React + TypeScript + **Canvas 2D** | tempat desain & uji cepat (localhost) |
| **B. APK Android** | **Kotlin** (bukan HarmonyOS NEXT — HarmonyOS 4.x masih menerima APK), build via **GitHub Actions** | produk akhir di tablet |
| **C. Renderer pembanding** | Python + Pillow (`tools/render_scene.py`) | pembuktian bahwa kontrak gambar bisa ditiru renderer lain (nanti: Kotlin) |

**Angka arsitektur yang mengikat kedua peran** (bukan usulan, ini sudah berjalan):

| Parameter | Nilai pasti |
| --- | --- |
| Kanvas internal | **1136 × 710 px** (`640×400 × DENS 1,775`) |
| Skala ke layar | **×2,25** (2560 / 1136) — integer-friendly upscale, tanpa interpolasi |
| Tile isometrik | **2:1** · `TILE_W = 32 × 1,775 = 56,8 px` · `TILE_H = 16 × 1,775 = 28,4 px` |
| Satuan tinggi (z) | `Z_PX = 16 × 1,775 = 28,4 px` per 1 unit z |
| Palet | **51 warna tetap**, 10 tangga nada (ramp), *tidak boleh* ada warna di luar itu (kecuali latar `#000000` OLED dan overlay editor semi-transparan) |
| Dithering | **Bayer 4×4**, satu sel = blok **2×2 px** internal → ubin pola 8×8 px internal = **18×18 px** di layar |
| Outline | **1 px internal** (= 2,25 px layar), warna = versi gelap dari warna isi (`tinta()`), **bukan** hitam rata |
| Rotasi objek | kelipatan **30°** · kamera orbit kelipatan **15°** |
| Presisi data | langkah tombol editor **0,1**; nilai yang diketik **0,001** |
| Skema scene | JSON `version: 1`, 71 objek saat ini, disimpan ke `/api/scene` + cadangan browser |
| Uji otomatis | **16 suite Node** + `tsc --noEmit` + `vite build` (wajib hijau sebelum merge) |

Berkas acuan yang akan dibaca kandidat pada hari pertama: `docs/01-KONVENSI-RUANG.md`,
`docs/03-SCENE-SCHEMA.md`, `docs/04-KONTRAK-RENDERER.md`, `docs/08-PALET-RETRO-DITHER.md`.

---

# PERAN 1 — UI/UX APP DEVELOPER (Canvas 2D / 2.5D + Integrasi OS)

**Tipe**: kontrak proyek (remote) · `[ISI TIM: 3–6 bulan, opsi perpanjangan]`
**Level**: Menengah–Senior (bukan junior; harus pernah mengirim aplikasi ke perangkat nyata)
**Laporan ke**: Product Owner · **Rekan kerja**: 1 spesialis pixel-art & UI (Peran 2)

### 1.1 Misi peran ini

Menjaga agar **satu kanvas 1136×710** bisa menampilkan diorama isometrik yang penuh
objek, 60 fps stabil di tablet 120 Hz, hemat RAM sebagai launcher yang **selalu hidup
di latar belakang**, sekaligus menjadi aplikasi Android sungguhan yang bisa dipilih
sebagai **HOME / launcher bawaan**.

### 1.2 Tanggung jawab utama

1. **Mesin gambar isometrik (Canvas 2D)**
   - Render proyeksi 2:1 dengan rumus tetap `x = (e − w) × HW`, `y = (e + w) × HH − z × ZH`;
     tidak boleh ada pembulatan yang membuat tepi objek "bergetar" saat pan/zoom.
   - Urutkan kedalaman (`e + w`) benar untuk ratusan objek berlapis
     (`underlay → main → overlay`, plus lapisan `LATAR` paling belakang).
   - Pertahankan **tanpa anti-aliasing**: `imageSmoothingEnabled = false`,
     garis di `Math.round(x) + 0,5`, dan *threshold pass* `getImageData` untuk tepi kotak.
   - Pasang dither Bayer 4×4 lewat `CanvasPattern` yang **di-cache** — dilarang membuat
     ulang pattern per frame.
2. **Strategi performa & RAM**
   - Pisahkan **lapisan statis** (dinding, lantai, tekstur dasar) ke *offscreen canvas*
     dan gambar ulang hanya saat gaya/waktu berubah, bukan tiap frame.
   - Target: **p95 frame ≤ 16 ms** dengan 200 objek + langit dinamis di tablet;
     tanpa *GC pause* > 8 ms; alokasi objek per frame ≈ 0.
   - Ukur dan laporkan: `Chrome DevTools Performance`, `Android Studio Profiler`
     (CPU/GPU/memory), `adb shell dumpsys meminfo`, GPU overdraw.
3. **Integrasi API sistem operasi (Android / HarmonyOS 4.x)**
   - Daftar sebagai **HOME launcher**: `CATEGORY_HOME`, `HOME` intent-filter, uji
     "set as default launcher", tangani tombol HOME dari aplikasi lain.
   - Ambil daftar aplikasi terpasang (`PackageManager`), muat & cache ikon
     (jangan simpan Bitmap ukuran penuh), dukung `QUERY_ALL_PACKAGES`.
   - Jam & tanggal perangkat (`ACTION_TIME_TICK`), status baterai/pengisian,
     orientasi terkunci **landscape**, immersive mode (tanpa status bar).
   - Cuaca: HTTP ke **Open-Meteo**, lokasi perangkat lebih dulu lalu kota pilihan
     (default **REMBANG**), cache + fallback offline, refresh lewat `WorkManager`,
     tanpa memblokir main thread (no ANR).
4. **Persistensi data yang tidak boleh kehilangan pekerjaan user**
   - Simpan/muat `scene.json` (skema versi 1) dengan **migrasi** untuk data lama.
   - Autosave + snapshot riwayat untuk fitur **PULIHKAN** (pemulihan objek yang hilang).
   - Aturan "mana yang lebih baru": bandingkan cap waktu (`meta.updatedAt`), bukan
     jumlah objek — tab/perangkat lama tidak boleh menimpa pekerjaan baru.
5. **Editor dalam aplikasi (tanpa keyboard)**
   - Panel editor melayang, bisa digeser, translusen, **tidak menutupi** area tablet,
     hanya bisa ditutup lewat tombol ✕ (bukan modal peredup).
   - Semua kontrol = **tombol sentuh**; tombol ± melangkah tepat **0,1**; *hold to repeat*.
   - Gestur: **pinch zoom** saja (tanpa tombol zoom), pan bebas tanpa clamp.
   - UNDO/REDO, REFRESH (kembali ke zoom ×1 dan kamera (0,0)), duplikat, grup,
     sub-folder, kunci per objek & per grup, opasitas 0,05–1.
6. **Kontrak lintas-renderer**
   - Setiap perubahan visual harus **identik** dengan `tools/render_scene.py`
     (dokumen `docs/04-KONTRAK-RENDERER.md`). Kalau TS berubah, Python ikut berubah
     di commit yang sama — ada uji paritas otomatis yang menahan kalau tidak.
7. **Rilis & CI**
   - Jaga `cd prototype && npx tsc --noEmit`, ke-16 suite Node, dan `vite build` tetap hijau.
   - Bantu jalur **GitHub Actions → artifact APK** untuk di-*sideload* ke tablet.

### 1.3 Syarat keahlian teknis (konkret, bisa diuji)

**Wajib — gambar & performa**

- ≥ 3 tahun produksi dengan **Canvas 2D API**: `Path2D`, `clip`, `save/restore`,
  `globalAlpha`, `createPattern`, `drawImage` dengan offscreen canvas.
- Paham beda **CSS px vs device px vs px internal**, dan pernah menangani
  **`devicePixelRatio`** serta upscale integer tanpa blur.
- Pernah mengoptimasi render loop: *dirty rect*, pengurangan `fillStyle` switch,
  batch path, hindari `getImageData` di dalam loop frame.
- Bisa menjelaskan (dan membuktikan dengan profil) kenapa sebuah frame turun dari
  60 → 30 fps dan apa yang diperbaiki.

**Wajib — aplikasi hybrid / OS**

- Minimal satu dari **Tauri / Electron / Flutter** dikuasai untuk aplikasi desktop
  atau mobile (memahami jembatan JS ⇄ native, IPC, izin, dan paket rilis).
- **Kotlin/Android**: Activity & Intent, `PackageManager`, `WallpaperManager`,
  `WorkManager`, `ForegroundService`, izin runtime, `onTrimMemory`.
- Pernah membuat/merawat **launcher, live wallpaper, atau widget** — ini nilai plus besar.
- Git disiplin (branch per fitur, commit kecil, PR), bukan "zip file".

**Wajib — data & mutu**

- TypeScript **strict**, React fungsional + hooks; state kompleks (undo/redo,
  grup bersarang) tanpa library berat.
- Skema JSON berversi + migrasi + validasi; tidak pernah merusak data user.
- Tes otomatis: pernah menulis uji untuk **paritas dua implementasi** (bukan hanya snapshot).

**Nilai plus**

- Pengalaman **WebGL/WebGPU atau PixiJS** (untuk jalur upgrade render ke depan).
- Paham **pixel-art rendering**: nearest-neighbour, grid snapping, atlas.
- Pernah menangani **GitHub Actions** + signing APK.
- Pengalaman launcher HarmonyOS 4.x / perangkat Huawei (AppGallery, HMS Core).

**Yang otomatis gugur**

- Hanya bisa React/UI web tanpa pernah menyentuh perangkat nyata.
- Terbiasa memakai gradien/blur/anti-alias untuk menyelesaikan masalah visual.
- Tidak bisa menunjukkan angka performa (fps, memori, waktu muat) dari proyek sebelumnya.

### 1.4 Uji teknis (dikerjakan ≤ 3 hari, dibayar `[ISI TIM]`)

Buat repo kecil: kanvas **1136×710**, grid isometrik 20×20, 200 kotak isometrik
berwarna dari palet yang diberikan, garis tepi 1 px, satu gradasi langit ber-dither
Bayer 4×4 (sel 2×2 px). Lalu:

1. Simpan/muat scene dari JSON + tombol UNDO. 2. Pan + pinch zoom. 3. Ukur & laporkan
`p95 frame time`, memori, dan jumlah alokasi per frame. **Lulus bila**: p95 ≤ 16 ms
di Chrome (mode CPU 4× slowdown), memori stabil (tidak naik) setelah 5 menit.

---

# PERAN 2 — ISOMETRIC PIXEL ART & UI SPECIALIST

**Tipe**: kontrak proyek (remote) · `[ISI TIM: 3–6 bulan]`
**Level**: Menengah–Senior · portofolio wajib, bukan opsional
**Rekan kerja**: 1 developer (Peran 1)

### 2.1 Misi peran ini

Membuat diorama isometrik **dan** antarmuka launcher terasa satu karya: aset pixel-art
yang **matematis pas** dengan grid mesin (bukan gambar tempelan), plus ikon/tombol/HUD
yang enak disentuh di layar 8,8" 343 ppi.

### 2.2 Tanggung jawab utama

1. **Aset isometrik 2:1 yang presisi grid**
   - Semua aset digambar pada grid `TILE_W 56,8 : TILE_H 28,4` (rasio 2:1) dengan
     tinggi per unit `Z_PX 28,4`; sudut dan alas objek harus jatuh tepat di grid
     supaya bisa ditempel di koordinat `(e, w, z)` tanpa geser subpiksel.
   - Serahkan aset sebagai **spesifikasi yang bisa dirender kode**: nama bentuk
     (`balok`, `silinder`, `kerucut`, `bola`, `cakram`, `daun`, `profil`), ukuran
     `e/w/z`, material/palet, plus PNG 1× dan 2,25× untuk pembanding.
   - Sediakan template grid (Aseprite/Krita) dengan penanda tinggi z, garis alas,
     dan area bayangan.
2. **Disiplin palet 51 warna**
   - Tidak boleh ada warna di luar palet (kecuali `#000000` latar OLED).
   - Tidak ada gradien halus: peralihan nada = **dither Bayer 4×4** (sel 2×2 px).
   - Outline **1 px** di setiap objek, warna = versi gelap warna isi (aturan
     `tinta()`: turun ≥ 2 langkah tangga sampai luma ≤ 55%), **bukan** hitam rata.
   - Tiap material memakai **3 nada dari satu tangga**: atas paling terang, kanan
     1 langkah turun, kiri 2 langkah turun.
3. **Arah gaya: diorama Tudor**
   - Dinding **plester krem** (`#f1e1bb` teduh / `#f7f2cd` terang) dengan **rangka
     balok kayu** (`#5f3d28` / `#8a5a3a`), lantai **papan kayu terang + batu krem**.
   - Referensi: diorama rumah Tudor + desa jembatan batu (diberikan saat onboarding).
   - Target rasa: **16-bit**, bukan "3D modern dengan filter pixel".
4. **UI/UX launcher**
   - Ikon set bergaya pixel (outline 1 px), **state lengkap**: normal / hover /
     tekan / aktif / nonaktif / terkunci. Ukuran gambar kecil tapi **area sentuh
     ≥ 44 dp**; tidak boleh ada teks < 11 px internal (≈ 25 px layar) di 343 ppi.
   - Panel editor: melayang, translusen, bisa digeser, tidak menutupi tablet,
     tombol ± kecil dengan umpan balik tekan yang jelas.
   - Kontras teks/ikon diuji terhadap 51 warna (mis. HUD `#fff9e3` di atas
     `#5f3d28`), termasuk saat latar langit malam/gelap.
5. **Layering dekorasi ruangan**
   - Menentukan urutan lapisan: `latar (gambar) → lantai → dinding →
     underlay → main → overlay`, plus pengurutan kedalaman `e + w`.
   - Menandai objek mana yang memantul (refleksi lantai), mana yang menempel
     dinding, dan bagaimana objek tertutup dinding saat kamera orbit 15°.
   - Menjaga konsistensi bayangan (ambient occlusion) di kaki dinding & lantai.
6. **Dokumentasi aset**
   - Lembar palet, lembar ikon + state, peta lapisan, dan "acceptance proof"
     berupa render 1136×710 serta versi ×2,25 yang **cocok** dengan hasil
     `tools/render_scene.py`.

### 2.3 Syarat keahlian teknis (konkret, bisa diuji)

**Wajib — seni isometrik**

- Portofolio **≥ 5 karya isometrik 2:1** (bukan 2:1 "kira-kira"; sudut harus bisa
  diukur), termasuk minimal 1 interior dengan objek bertumpuk.
- Bisa menggambar pada grid 32×16 px (atau kelipatannya) **tanpa anti-alias**,
  tanpa soft brush, tanpa opacity blending.
- Paham **sumbu z**: objek setinggi 1 unit vs 3 unit punya perbedaan tepat
  16 px (×DENS), bukan "dikira-kira".

**Wajib — disiplin palet & dither**

- Pernah bekerja dengan **palet terbatas ≤ 64 warna** (sebutkan jumlah dan buktinya).
- Bisa membuat **ramp 4–8 langkah** per keluarga warna dan menjelaskan aturan
  peralihan antar langkah.
- Bisa meniru pola **Bayer 4×4** secara manual (dither terlihat sebagai blok 2×2).

**Wajib — UI/UX aplikasi**

- Pernah merancang **set ikon aplikasi lengkap** (≥ 12 ikon) dengan state
  normal/hover/tekan/nonaktif, dikemas dalam sprite sheet atau file terpisah.
- Paham **hit area vs visual size**, target sentuh 44 dp, jarak antar tombol,
  dan hierarki visual pada panel kecil.
- Bisa membuat spesifikasi UI berupa angka (posisi px, ukuran, warna hex),
  bukan hanya mockup cantik.
- Mengerti dasar kontras aksesibilitas (WCAG AA untuk teks kecil).

**Nilai plus**

- Bisa menulis/membaca **JSON spesifikasi scene** dan memvalidasi hasilnya
  dengan renderer Python.
- Bisa membuat animasi pixel (idle objek, awan, hujan) 2–6 frame, loop mulus.
- Pengalaman game isometrik (SimCity-like / Stardew-like) atau diorama 3D
  yang di-*render* jadi pixel.
- Bisa memakai Git dan menyerahkan aset dalam struktur folder yang rapi.

**Yang otomatis gugur**

- Portofolio memakai gradien halus, glow, blur, atau "pixel filter" di atas 3D.
- Aset tidak presisi grid (sudut 26,57° "kira-kira", tepi tidak jatuh di px bulat).
- Hanya bisa UI modern flat/glassmorphism tanpa kemampuan pixel-art.

### 2.4 Uji teknis (≤ 3 hari, dibayar `[ISI TIM]`)

Serahkan: (1) satu **mock diorama 1136×710** memakai palet 51 warna yang diberikan
(dinding Tudor + lantai papan/batu + minimal 5 objek), (2) **6 ikon toolbar** × 4 state,
(3) **peta lapisan** ruangan, (4) file `.aseprite`/`.krita` + PNG 1× & 2,25× + JSON
spesifikasi. **Lulus bila**: tidak ada warna di luar palet, outline 1 px konsisten,
alas objek tepat di grid 2:1, dan ikon tetap terbaca di 2,25×.

---

## 3. Proses seleksi (sama untuk kedua peran)

| Tahap | Isi | Durasi |
| --- | --- | --- |
| 1 | Saring portofolio/repo — **wajib ada bukti angka** (fps, memori) atau bukti grid & palet | 15 menit |
| 2 | Wawancara teknis 60 menit: bedah karya + 2 studi kasus | 1 jam |
| 3 | Uji teknis terbayar (di atas) | ≤ 3 hari |
| 4 | Sesi berpasangan 90 menit dengan Peran 1/2 (kerja nyata di repo) | 1,5 jam |
| 5 | Penawaran | — |

**Rubrik penilaian** (bobot): ketepatan teknis 40% · bukti angka/bukti grid 25% ·
cara berpikir & komunikasi 20% · kerja sama lintas peran 10% · kemandirian Git 5%.

**Pertanyaan penentu** (dipakai di tahap 2):

- Peran 1: "Kanvas 1136×710 di-upscale ×2,25. Ada objek yang tepinya bergetar saat pan —
  apa penyebab dan perbaikanmu?" · "Launcher-mu dibunuh sistem setelah 20 menit idle.
  Apa yang kamu ubah?" · "Kenapa renderer Python harus menghasilkan piksel identik
  dengan TS, dan bagaimana kamu menjaga dua implementasi tetap sinkron?"
- Peran 2: "Mengapa outline 1 px lebih baik daripada hitam rata di ruangan dominan
  krem?" · "Kamu punya 51 warna, harus membuat bayangan bertangga — tunjukkan
  langkahnya." · "Bagaimana kamu menaruh 5 ikon toolbar di tablet 8,8" tanpa
  menutupi diorama?"

## 4. Cara melamar

Kirim ke `[ISI TIM: email/kanal]` dengan subjek
**`[ISOLA-CHR] <Peran> — <Nama>`**, berisi: CV 1 halaman, portofolio/repo,
serta 5 baris jawaban: "proyek paling mirip yang pernah saya kerjakan, dan angka
hasilnya". Berkas contoh (`.aseprite`, PNG spesifikasi, atau dump profil) lebih
bernilai daripada daftar teknologi.

## 5. Hal administratif

- Zona waktu: `[ISI TIM: WIB/UTC+7, overlap ≥ 3 jam]`; rapat sinkron 2×/minggu.
- Alat kerja: tablet uji **wajib disediakan tim** (atau kandidat memakai perangkat
  sendiri dengan kompensasi `[ISI TIM]`) — pekerjaan ini tidak bisa diverifikasi
  tanpa perangkat 2560×1600.
- Kekayaan intelektual: seluruh aset & kode menjadi milik produk (`[ISI TIM: klausul]`).
- Kompensasi: `[ISI TIM: rentang per peran, basis proyek atau bulanan]`.

---

### Lampiran A — "Kamus" singkat agar istilah dipakai seragam

| Istilah | Arti di proyek ini |
| --- | --- |
| `DENS` | pengali kerapatan 1,775 (kanvas 640×400 → 1136×710) |
| `e`, `w`, `z` | koordinat ruang: dua sumbu lantai + tinggi |
| `LATAR` | objek/gambar paling belakang (bukan wallpaper OS) |
| `underlay / main / overlay` | tiga lapis objek; `NAIKKAN`/`TURUNKAN` memindahkannya |
| `tinta()` | pembuat warna outline dari warna isi |
| `SKALA` | ukuran sel pola dither = 2×2 px internal |
| `gaya` | nama material/palet yang dipakai sebuah objek (`lantai-papan-batu`, `dinding-tudor`, …) |

### Lampiran B — Berkas yang dibaca kandidat hari pertama

`docs/01-KONVENSI-RUANG.md` · `docs/03-SCENE-SCHEMA.md` · `docs/04-KONTRAK-RENDERER.md` ·
`docs/08-PALET-RETRO-DITHER.md` · `prototype/src/iso/space.ts` (geometri) ·
`prototype/src/iso/palet-retro.ts` (51 warna + tangga nada) ·
`prototype/src/iso/dither.ts` (Bayer) · `tools/render_scene.py` (renderer pembanding).
