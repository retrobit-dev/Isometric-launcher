# 02 — Arsitektur 3D (Decision Record)

> Status: **disepakati** · Mempengaruhi: prototipe web & aplikasi Android

## Keputusan

| # | Keputusan | Nilai |
|---|---|---|
| 1 | Jalur render | **A — 3D low-poly + render resolusi rendah (640×400) + upscale nearest ×4** = estetika 32-bit/PS1 autentik |
| 2 | Kamera default | **Isometrik ortografik 2:1** (isometrik adalah posisi kamera, bukan teknik gambar) |
| 3 | Kamera tambahan | **ORBIT** (drag satu jari memutar ruangan, tetap ortografik) |
| 4 | Transisi buka app | **Kamera zoom mendekati objek** target, kembali ke iso saat menutup |
| 5 | Render loop | **Dirty-flag**: render hanya saat ada perubahan/animasi; saat diam = frame statis (hemat baterai & OLED-friendly) |
| 6 | Geometri | **Prosedural dari kotak** (balok iso), semua sisi lengkap — tidak ada sisi bolong saat orbit |
| 7 | Cahaya fase 1 | Baked per sisi muka (3 tone: top/left/right). Cahaya dinamis (matahari jendela) masuk fase 3D lanjut |
| 8 | Stack prototipe | Three.js (kamera ortografik + render target rendah-res) setelah layout disepakati di canvas 2D |
| 9 | Stack Android | **libGDX** (Kotlin, OpenGL ES 3, tanpa Google Play Services — aman HarmonyOS 4.x) |
| 10 | Piksel | Semua langkah proyeksi integer; upscale nearest-neighbour; tanpa anti-aliasing |

## Alasan jalur A

Estetika 32-bit yang disepakati memang berasal dari era ketika 3D dirender di resolusi rendah lalu di-upscale — jalur ini mereproduksi cara pixel-art 3D asli dibuat, bukan menirunya. Koordinat `(e, w, z)` di docs/01 sudah koordinat 3D sejati, sehingga aturan Z-Info, Koridor, dan zona tetap berlaku tanpa perubahan.

## Rencana migrasi (bertahap, tanpa buang kerja)

1. **Sekarang**: skema scene + layout disepakati di renderer canvas 2D (murah, cepat dikomentari)
2. Renderer diganti Three.js ortografik; **data scene & layout pindah utuh** (skema docs/03)
3. Mode ORBIT + parallax giroskop (opsional, bisa dimatikan)
4. Transisi zoom-ke-objek
5. Port ke libGDX untuk APK; skema scene identik, dimuat dari file yang sama

## Aturan permanen fase 3D

- Setiap objek sejak awal berbentuk 3D (punya `z` dan ukuran 3 sumbu) — dilarang trik 2D yang rusak saat orbit
- Tekstur/warna hanya dari palet yang disepakati (docs/01 & palette.ts)
- Objek interaktif hanya di zona `t = 2..12` (lihat docs/03); zona `t > 13` dekoratif
