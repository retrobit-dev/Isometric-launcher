# 01 — Konvensi Ruang, Arah & Lokasi

> Status: **aktif** · Berlaku untuk: prototipe web DAN aplikasi Android nanti.
> Semua instruksi layout ("taruh meja di …", "geser rak ke …") memakai bahasa ini.

## 1. Resolusi & satuan

| Besaran | Nilai |
|---|---|
| Resolusi internal | 640 × 400 px |
| Resolusi final | × 4 = **2560 × 1600** (MatePad Mini, landscape) |
| 1 tile lantai | 32 × 16 px internal (rasio isometrik 2:1) |
| 1 satuan tinggi (`z`) | 16 px internal |

## 1a. Skala fisik — TIDAK ADA ATURAN (dihapus 2026-10-28)

> 🧹 **SEMUA ATURAN RUANGAN DIHAPUS** atas permintaan user:
> "Hapus semua aturan ruangan. nanti saya beri referensi baru untuk ruangan
> yang saya inginkan."
>
> Yang **tidak berlaku lagi**:
> - kunci dimensi ruangan (`ROOM_TEMP_UNLOCKED`, `ROOM_FIXED` sebagai pemaksa)
> - kunci zoom & posisi kamera (`VIEW_LOCKED`, `VIEW_FIXED` sebagai pemaksa)
> - aturan perpanjangan dinding/lantai (`EXT_E = 6`, `EXT_W = 7` → kini **0**)
> - amendemen #1 (+6 tile ke selatan) dan amendemen #2 sebagai aturan beku
>
> Yang **masih berlaku**: nilai-nilai di bawah hanya **nilai awal** (bawaan kode),
> bebas diubah kapan saja tanpa izin khusus. `scene.json` yang di-import boleh
> menentukan `room` sendiri (`ROOM_FROM_FILE = true`).
>
> Nilai awal saat ini (belum tentu final — menunggu referensi baru user):

| Besaran | Nilai awal | Satuan |
|---|---|---|
| Ruangan (DT × DB) | E = 20, W = 19 | tile |
| Tinggi dinding | WALL_Z = 12 | z |
| 1 tile lantai | 60 cm × 60 cm | 1 tile |
| 1 satuan tinggi | 50 cm | 1 z |
| Palet | `malam-biru` | — |
| Lantai | ubin persegi 1×1 tile, 3 tone, nat gelap | — |
| Dinding | navy datar + plint kayu 0.18 z | — |

Dinding tetap dirender melewati tepi atas layar (`zTop` dihitung otomatis) supaya
tidak ada ruang kosong di atas.

## 1b. Framing kamera

Zoom dikendalikan **pinch in/out** (kontinu, rentang ×0.5 – ×6); setiap nilai zoom
membulatkan langkah piksel ke integer agar pixel-art tetap tajam.
Tombol **ZOOM ×n** hanya menampilkan level saat ini dan **mereset ke default** saat diketuk.

| Zoom | Kegunaan |
|---|---|
| **×0.88 (acuan)** | komposisi terakhir dari user: HW 14, HH 7, pusat (−1.2, 1.3) — dipakai tombol ZOOM/TENGAH |
| ×0.5 – ×1.5 | peta diorama seluruh ruangan |
| ×3 – ×6 | pandangan dekat untuk presisi edit |

Komposisi default = gambar referensi user `Screenshot_20261028_203752.jpg`
(1122×706) diskalakan ke kanvas internal 640×400 (÷1.76): ubin 140×70 px di
referensi → **80×40 px** di kanvas (320×160 px di layar 2560), nat 1 px.
Karena internal 640×400 adalah tepat ¼ dari 2560×1600, seluruh komposisi ini
mendarat identik di panel MatePad Mini.

> **KAMERA: bebas, tanpa kunci.** Posisi kamera disimpan otomatis
> (`isola-kamera-v2`) dan dipulihkan saat halaman dibuka, jadi tidak kembali ke
> tengah. Tombol ZOOM & TENGAH mengembalikan ke komposisi acuan ×0.88 di
> (−1.2, 1.3) — sekadar titik awal, bukan kunci: pan & pinch bebas kapan saja.
> Kunci zoom/posisi (`VIEW_LOCKED`) **dihapus** bersama aturan ruangan lain.
> Komposisi dibekukan sebagai `VIEW_FIXED` (`iso/space.ts`): **Q = 2.5**
> (HW 40, HH 20, ZH 40), pusat kamera **(0.4, 0.5)**. Konsekuensinya:
> ZOOM/TENGAH, tombol reset, reload preview, dan aplikasi nanti **selalu**
> mendarat persis di komposisi ini. Pan & pinch masih boleh untuk bekerja,
> tetapi bersifat sementara dan **tidak pernah disimpan**. Mengubah angka
> komposisi = perubahan kode developer atas permintaan eksplisit user.
> Chip KOORDINAT menampilkan `view: terkunci ×2.5` sebagai penanda.
>
> Catatan: **kunci RUANGAN (dimensi)** masih dibuka sementara
> (`ROOM_TEMP_UNLOCKED`) menunggu keputusan akhir soal tinggi dinding.

## 2. Mata arah (nama arah utama)

```
                 U (0,0)          ← pojok belakang, pertemuan dua dinding
                /╲
           DB  /  ╲  DT
              /    ╲
        B (0,W)     (E,0) T
              ╲    ╱
               ╲  ╱
                S (E,W)           ← pojok depan, paling dekat kamera
```

| Arah | Posisi di layar |
|---|---|
| **U** (utara) | atas = pojok belakang |
| **T** (timur) | kanan = pojok kanan |
| **S** (selatan) | bawah = pojok depan / sisi kamera (terbuka, tanpa dinding) |
| **B** (barat) | kiri = pojok kiri |

## 3. Dinding

| Kode | Nama | Bentang | Sisi layar | Peruntukan (disepakati) |
|---|---|---|---|---|
| **DT** | Dinding Timur | U → T | kanan | **jendela, pintu**, kalender |
| **DB** | Dinding Barat | U → B | kiri | jam digital, poster, papan gabus |

Sisi **S tidak berdinding** (sisi kamera).

## 4. Koordinat lantai `(e, w)`

- `e` = jumlah tile dari pojok **U** ke arah **T** (sepanjang DT). Rentang `0..E`
- `w` = jumlah tile dari pojok **U** ke arah **B** (sepanjang DB). Rentang `0..W`
- Penulisan: `(e=6, w=2)` atau ringkas `(6, 2)`. Pecahan **kelipatan 0.1** boleh: `(6.5, 2.3)` — snap editor = 0.1
- Proyeksi ke layar: `x = OX + (e−w)×16` · `y = OY + (e+w)×8` · tinggi: `y −= z×16`
- Ukuran objek ditulis `panjang×lebar` dalam tile, contoh meja `3×1.5` = 3 tile searah e, 1.5 tile searah w

## 5. Posisi menempel dinding

| Notasi | Arti | Setara koordinat |
|---|---|---|
| `DT t=6` | nempel Dinding Timur, 6 tile dari pojok U | (e=6, w=0) |
| `DT t=6 s=1` | 1 tile menjauh dari Dinding Timur | (e=6, w=1) |
| `DB t=4` | nempel Dinding Barat, 4 tile dari pojok U | (e=0, w=4) |
| `DB t=4 s=2` | 2 tile menjauh dari Dinding Barat | (e=2, w=4) |

`t` = jarak sepanjang dinding dihitung dari U · `s` = jarak menjauh dari dinding.

## 6. Tinggi (`z`)

`z=0` = permukaan lantai · 1 z = 50 cm (docs/01 §1a). Contoh acuan: meja 1.5 z · lemari arsip 2.6 z · rak buku 3.6 z · lampu berdiri 3 z · puncak dinding 6.5 z.

## 7. Zona (instruksi kasar)

`U`, `T`, `S`, `B` = area dekat pojok bersangkutan · `TENGAH` = tengah ruangan.
Contoh: *"rak materi di zona B, menempel DB"*.

## 8. Tabel geser (untuk revisi layout)

| Perintah | Perubahan `(e, w)` | Efek di layar |
|---|---|---|
| ke T | (+1, 0) | diagonal kanan-bawah |
| ke B | (0, +1) | diagonal kiri-bawah |
| ke S | (+1, +1) | lurus ke bawah |
| ke U | (−1, −1) | lurus ke atas |
| ke kanan | (+1, −1) | lurus ke kanan |
| ke kiri | (−1, +1) | lurus ke kiri |

## 9. Penamaan objek (fase objek, nanti)

- **id** kebab-case bahasa Indonesia: `meja-guru`, `rak-materi`, `papan-jadwal`, `jam-dinding`, `lampu-baterai`, `jendela-dt`, `kalender-dt`, `lemari-arsip`, `kalkulator-meja`, `laptop-meja`
- Lokasi **terpisah** dari id: `meja-guru @ DT t=5.5 s=0, ukuran 3×1.5, z=0.9`
- Event interaksi: `tap:<id>`, `hold:<id>`, `hover:<id>`

## 10. Kontrol prototipe

- **G** = tampilkan/sembunyikan grid + label arah
- Arahkan kursor ke lantai → HUD menampilkan `(e, w)` + zona, supaya Anda bisa menyebut koordinat persis saat memberi instruksi layout

## 11. Contoh kalimat instruksi yang valid

- *"meja guru di DT t=5.5 s=0, ukuran 3×1.5, tinggi 0.9"*
- *"papan jadwal berdiri bebas di (2.5, 4), menghadap T"*
- *"geser rak-materi ke S satu tile"* → w+1, e+1
- *"jam dinding di DB t=2.5, z=3.5"*
