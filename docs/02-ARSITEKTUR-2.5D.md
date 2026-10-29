# 02 — Arsitektur 2.5D (Decision Record)

> Status: **disepakati** · Mempengaruhi: prototipe web & aplikasi Android

## Keputusan

| # | Keputusan | Nilai |
|---|---|---|
| 1 | Jalur render | **A — 2.5D: geometri 3 sumbu digambar sebagai proyeksi isometrik 2:1, resolusi internal rendah + upscale nearest** = estetika 32-bit/PS1 autentik |
| 2 | Kamera default | **Isometrik ortografik 2:1** (isometrik adalah posisi kamera, bukan teknik gambar) |
| 3 | Kamera tambahan | **ORBIT** (drag satu jari memutar ruangan, tetap ortografik) |
| 4 | Transisi buka app | **Kamera zoom mendekati objek** target, kembali ke iso saat menutup |
| 5 | Render loop | **Dirty-flag**: render hanya saat ada perubahan/animasi; saat diam = frame statis (hemat baterai & OLED-friendly) |
| 6 | Geometri | **Prosedural dari kotak** (balok iso), semua sisi lengkap — tidak ada sisi bolong saat orbit |
| 7 | Cahaya fase 1 | Baked per sisi muka (3 tone: top/left/right). Cahaya dinamis (matahari jendela) masuk fase 2.5D lanjut |
| 8 | Stack prototipe | Three.js (kamera ortografik + render target rendah-res) setelah layout disepakati di canvas 2D |
| 9 | Stack Android | **libGDX** (Kotlin, OpenGL ES 3, tanpa Google Play Services — aman HarmonyOS 4.x) |
| 10 | Piksel | Semua langkah proyeksi integer; upscale nearest-neighbour; tanpa anti-aliasing |

## Alasan jalur A

Estetika 32-bit yang disepakati berasal dari era ketika ruang 3D *dirender* sebagai gambar 2D resolusi rendah lalu di-upscale — jalur ini mereproduksi cara pixel-art itu dibuat, bukan menirunya. **Proyek ini 2.5D**: bukan mesh/poligon, bukan engine 3D, melainkan proyeksi isometrik 2:1 dari koordinat `(e, w, z)` yang digambar langsung ke Canvas 2D. Koordinat `(e, w, z)` di docs/01 tetap punya tiga sumbu sejati, sehingga aturan Z-Info, Koridor, dan zona tetap berlaku tanpa perubahan.

## Rencana migrasi (bertahap, tanpa buang kerja)

1. **Sekarang**: skema scene + layout disepakati di renderer canvas 2D (murah, cepat dikomentari)
2. Renderer diganti Three.js ortografik; **data scene & layout pindah utuh** (skema docs/03)
3. Mode ORBIT + parallax giroskop (opsional, bisa dimatikan)
4. Transisi zoom-ke-objek
5. Port ke libGDX untuk APK; skema scene identik, dimuat dari file yang sama

## Aturan permanen fase 2.5D

- Setiap objek sejak awal punya tiga sumbu (`e`, `w`, `z`) — dilarang trik 2D tempelan yang rusak saat orbit
- Tekstur/warna hanya dari palet yang disepakati (docs/01 & palette.ts)
- Objek interaktif hanya di zona `t = 2..12` (lihat docs/03); zona `t > 13` dekoratif
