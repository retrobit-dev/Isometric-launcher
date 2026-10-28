# PRD — Isometric Launcher (Isola)

> Peran: **Product Manager aplikasi Android**
> Versi dokumen: 1.0 · Status: Draft untuk review · Owner: Solo developer
> Nama produk: **Isometric Launcher** (kode internal: `Isola`)

---

## 1. Ringkasan Eksekutif

Isometric Launcher adalah *home screen replacement* untuk Android yang menampilkan ikon aplikasi dalam **grid isometrik pixel-art** (sudut 2:1, estetika 32-bit era SNES/PS1). Diferensiasinya bukan "lebih banyak fitur", melainkan **identitas visual yang kuat + performa kelas AOSP**.

Posisi pasar: **niche aesthetic launcher**. Kompetitor besar (Nova, Niagara, Smart) menang di fitur/ergonomi. Kita menang di *distinctiveness* — hal yang membuat orang screenshot dan share.

**One-liner:** *"Launcher Android paling ringan yang membuat home screen kamu terlihat seperti game 32-bit."*

---

## 2. Analisis Kompetitor

| Aspek | **Nova Launcher** | **Niagara Launcher** | **Peluang untuk Isola** |
|---|---|---|---|
| Posisi | Power-user, kustomisasi total | Minimalis, satu tangan, ergonomi | Belum ada yang menggarap **estetika retro/isometrik** |
| Grid ikon | Bebas (hingga 12×9), ikon statis | List vertikal 1 kolom | Grid isometrik 4×5 dengan **ikon di-render ulang sebagai tile pixel** |
| App drawer | Grid + folder + search | Alphabetical scroll + search | Drawer isometrik dengan *depth sorting* (baris belakang di-draw lebih dulu) |
| Widget | Dukungan penuh + resize | Sangat terbatas | **Dukungan widget penuh** = pembeda vs Niagara |
| Gestur | Sangat banyak (swipe, double-tap, pinch) | Fokus edge scroll | Gestur inti saja (3 gestur) → mudah dipelajari |
| Performa | Baik, tapi berat di setting kompleks | Sangat ringan | Target: **≤ 60 MB RSS idle, cold start ≤ 350 ms** |
| Monetisasi | Freemium (Prime $4.99) | Freemium (Pro subscription) | **Buy-once** tema pack + ikon pack |
| Kelemahan | UI terasa "kuno"/padat, kurva belajar tinggi | Terlalu minimalis, tidak ada widget, terasa membosankan | Kelemahan keduanya = **karakter visual + tetap fungsional** |

**Kesimpulan analisis:** Jangan bertarung di jumlah fitur. Nova sudah 12 tahun mengembangkan fitur; kita tidak akan menang. Bertarung di **(a) identitas visual yang tidak bisa ditiru cepat**, **(b) ringan setara AOSP**, **(c) onboarding 30 detik**.

---

## 3. Target Persona

### Persona A — "Retro Gamer Raka" (primer, 65% target)
- 18–28 tahun, Indonesia/SEA, Android mid-range (RAM 4–6 GB, Helio G / Snapdragon 6xx)
- Main emulator & game pixel-art, aktif di Discord/TikTok/Reddit r/AndroidThemes
- **Pain point:** launcher bawaan membosankan; Nova terlalu "bapak-bapak"; Niagara terlalu polos
- **Job to be done:** *"Bikin HP saya kelihatan unik dan bisa dipamerkan, tanpa bikin HP lemot."*
- **Willingness to pay:** Rp 15.000–45.000 untuk ikon/tema pack (buy-once)

### Persona B — "Aesthetic Minimalis Dina" (sekunder, 25%)
- 22–35 tahun, suka setup rapi, screenshot home screen untuk Instagram/Pinterest
- **Pain point:** ikon aplikasi berantakan warnanya; ingin konsisten tapi malas pakai icon pack manual
- **Job to be done:** *"Home screen rapi, konsisten, estetik, tanpa effort."*

### Anti-persona (jangan dilayani di MVP)
- Power user yang butuh 40 gestur, sub-grid, dock multi-row, badge kustom → **mereka akan tetap di Nova**. Jangan buang effort di sini.

---

## 4. Tiga Fitur Utama (MVP)

### F1 — Isometric Workspace & App Drawer
Grid ikon 4×5 (default) yang di-render sebagai **tile isometrik 2:1** dengan depth-sorting. Ikon aplikasi di-*resample* ke gaya pixel (nearest-neighbour) secara opsional, atau ditampilkan apa adanya di atas tile isometrik.
- **Acceptance criteria:**
  - Buka app drawer < 100 ms dari sentuhan, animasi 60 fps stabil (0 jank frame > 16 ms pada perangkat mid-range)
  - Semua aplikasi terinstal muncul, terurut A–Z, dengan pencarian
  - Long-press → shortcut menu (uninstall, app info, drag ke workspace)
- **Metrik:** 100% aplikasi terdeteksi, 0 ANR dalam 7 hari pemakaian internal

### F2 — Zero-Bloat Performance Core
Tidak ada service berjalan di background, tidak ada WakeLock, tidak ada polling. Refresh daftar aplikasi **event-driven** via `LauncherApps.Callback` + broadcast `PACKAGE_ADDED/REMOVED`.
- **Acceptance criteria:**
  - RSS idle ≤ 60 MB, cold start ≤ 350 ms (Pixel 6a & Redmi Note kelas menengah)
  - Battery usage tidak muncul di top-10 Battery settings setelah 24 jam
  - Tidak ada permission yang tidak perlu (maksimal 4 permission runtime)
- **Metrik:** crash-free session ≥ 99.5%, < 1% pengguna uninstall karena "lemot"

### F3 — 30-Second Onboarding + Setup Home Default
Alur pertama kali: pilih gaya tile → pilih grid → set sebagai Home default → selesai. Termasuk fallback otomatis ke launcher sebelumnya jika pengguna membatalkan.
- **Acceptance criteria:**
  - Median waktu selesai onboarding ≤ 30 detik
  - ≥ 70% pengguna baru berhasil set sebagai default Home pada percobaan pertama
  - Ada "Reset ke default" 1 tap di Settings
- **Metrik:** D1 retention ≥ 55%, D7 retention ≥ 35%

### Explicitly OUT of scope untuk MVP (jangan disentuh)
Widget penuh kustom resize, folder bersarang, theme engine pihak ketiga, backup cloud, gestur kustom > 3, multi-window layout, ikon pack .kwgt/Kustom. → masuk **v1.1+**.

> Catatan: dukungan **AppWidgetHost** dasar (1×1 sampai 4×2) tetap masuk MVP karena tanpa widget, launcher terasa "rusak" bagi persona A. Resize bebas ditunda ke v1.1.

---

## 5. Metrik Keberhasilan (KPI)

### North Star Metric
**Daily Active Home Sessions (DAHS)** — berapa kali pengguna kembali ke home screen Isola per hari. Menandakan launcher benar-benar dipakai, bukan cuma dipasang lalu ditinggal.

| Kategori | KPI | Target 30 hari pasca-rilis | Target 90 hari |
|---|---|---|---|
| Aktivasi | % install → set as default Home | ≥ 60% | ≥ 70% |
| Retensi | D1 / D7 / D30 retention | 55% / 35% / 22% | 60% / 42% / 30% |
| Engagement | Median app launches per user/day | ≥ 25 | ≥ 35 |
| Kualitas | Crash-free sessions | ≥ 99.3% | ≥ 99.6% |
| Kualitas | ANR rate (Play Console) | < 0.3% | < 0.15% |
| Kualitas | Rating Play Store | ≥ 4.3 | ≥ 4.5 |
| Performa | Cold start (P50) | ≤ 350 ms | ≤ 300 ms |
| Performa | Memory RSS idle (P50) | ≤ 60 MB | ≤ 50 MB |
| Monetisasi | Konversi free → paid theme | ≥ 2.5% | ≥ 5% |
| Distribusi | Organic install dari share/screenshot | ≥ 20% total install | ≥ 35% |

### Instrumentasi (wajib dipasang sejak alpha)
- Event: `onboarding_step`, `set_default_home_result`, `drawer_open`, `app_launched`, `grid_changed`, `tile_style_changed`, `crash_free_session`
- **Privacy stance:** analytics opsional, opt-in, tanpa PII, tanpa iklan. Ini jadi *selling point* vs kompetitor. Gunakan Firebase Analytics + Crashlytics dengan consent gate.

---

## 6. Milestone: Alpha → Play Store

| Fase | Durasi | Deliverable | Exit Criteria (gate) |
|---|---|---|---|
| **M0 — Fondasi** | Minggu 1 | Riset UX, wireframe, keputusan arsitektur, scaffold project, CI build | Wireframe disetujui; project build sukses di 2 device; manifest HOME terdaftar |
| **M1 — Alpha Internal** | Minggu 2–3 | Workspace + App Drawer + LauncherApps + launch app + dasar widget | 100% app terdeteksi; drawer 60 fps; cold start ≤ 500 ms; 0 crash di 3 hari pemakaian pribadi |
| **M2 — Alpha Tertutup** | Minggu 4 | Onboarding, set-default flow, 2 tema tile, pengaturan dasar, icon cache tuning | 20 tester eksternal; D1 ≥ 50%; ANR < 0.5%; memory ≤ 70 MB |
| **M3 — Beta Terbuka** | Minggu 5–6 | Polish animasi, gestur (3), search, folder dasar, lokalisasi id/en | Play Internal Testing → Open Testing; crash-free ≥ 99.3%; rating beta ≥ 4.2 |
| **M4 — Release Candidate** | Minggu 7 | Bug bash, audit permission & battery, ProGuard/R8, screenshot Play Store, privacy policy | Semua P0/P1 bug closed; APK ≤ 6 MB; battery audit lolos |
| **M5 — Play Store v1.0** | Minggu 8 | Rilis produksi + 1 tema pack berbayar | Lolos review Play; 500 install organik minggu pertama |

**Definition of Done (global):** fitur dianggap selesai hanya jika (1) lolos acceptance criteria, (2) ada test unit/integration untuk logika non-UI, (3) tidak menambah memory idle > 2 MB, (4) terdokumentasi di `docs/`.

---

## 7. Risiko Produk & Mitigasi

| Risiko | Dampak | Probabilitas | Mitigasi |
|---|---|---|---|
| Launcher di-uninstall karena crash saat jadi default (HP "terkunci") | Fatal | Sedang | Fallback: crash 2× beruntun → auto-disable mode isometrik & tampil grid standar; watchdog `SafeMode` |
| Estetika pixel dianggap "buram" di layar 120 Hz/1440p | Tinggi | Sedang | Render tile pada resolusi native dengan integer-scaling; sediakan opsi "Sharp/Smooth" |
| Google Play menolak karena permission sensitif | Tinggi | Rendah | Hanya pakai permission standar launcher; hindari `QUERY_ALL_PACKAGES` bila memungkinkan, gunakan `<queries>` + `LauncherApps` (lihat `docs/03-ANDROID-ARCHITECTURE.md`) |
| Nova meniru gaya isometrik | Sedang | Rendah | Kecepatan iterasi tema + komunitas; gaya pixel kami butuh pipeline ikon khusus |
| Widget API rumit & jadi sumber crash | Sedang | Tinggi | MVP hanya dukung widget host dasar, tanpa resize bebas; isolasi di modul terpisah |

---

## 8. Model Monetisasi (ringkas)

- **Free:** 1 gaya tile, 3 pilihan palet, fitur inti penuh, tanpa iklan selamanya.
- **Paid (buy-once, Rp 29.000):** tema pack tambahan (12 gaya tile), ikon pack pixel, kustomisasi grid bebas, export/import layout.
- Alasan buy-once > subscription: persona A menolak subscription untuk launcher; konversi lebih tinggi secara volume dan rating lebih baik.
