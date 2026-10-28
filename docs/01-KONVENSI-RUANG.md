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

## 1a. Skala fisik (dikunci dari referensi ruangan)

| Besaran | Nilai dunia | Satuan kita |
|---|---|---|
| 1 tile lantai | 60 cm × 60 cm | 1 tile |
| 1 satuan tinggi | 50 cm | 1 z |
| Ruangan (DT × DB) | 6.0 m × 5.4 m (±32 m²) | **E = 10, W = 9** |
| Tinggi dinding | 3.25 m | **WALL_Z = 6.5** |
| Tinggi pintu | 2.0 m | 4 z |
| Tinggi meja kerja | 75 cm | 1.5 z |
| Tinggi rak buku berdiri | 1.8 m | 3.6 z |
| Tinggi lampu berdiri | 1.5 m | 3 z |

Proporsi ruangan mengikuti gambar referensi (ruang isometrik): dinding kanan (DT) lebih panjang dari kiri (DB), rasio ≈ 1.1 : 1, tinggi dinding ≈ 1.6× tinggi pintu.

## 1b. Framing kamera

| Zoom | Kegunaan |
|---|---|
| ×1 / ×1.625 | peta ruangan menyeluruh |
| **×2.5 (default)** | **framing referensi**: diorama, lebar penuh tepi-ke-tepi, slab lantai terlihat di bawah |
| ×4 / ×6 | pandangan dekat untuk presisi edit |

Catatan jujur: ruangan seukuran referensi (10 × 9 tile) tidak bisa full-bleed total di keempat tepi pada zoom wajar — sudut bawah memperlihatkan latar, persis seperti gambar referensi yang menampilkan ruangan sebagai diorama. Full-bleed penuh hanya mungkin di zoom ×6 (terlalu dekat untuk dijadikan default).

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

| Kode | Nama | Bentang | Sisi layar | Peruntukan (rencana) |
|---|---|---|---|---|
| **DT** | Dinding Timur | U → T | kanan | jendela, kalender |
| **DB** | Dinding Barat | U → B | kiri | papan jadwal, poster, jam digital |

Sisi **S tidak berdinding** (sisi kamera).

## 4. Koordinat lantai `(e, w)`

- `e` = jumlah tile dari pojok **U** ke arah **T** (sepanjang DT). Rentang `0..E`
- `w` = jumlah tile dari pojok **U** ke arah **B** (sepanjang DB). Rentang `0..W`
- Penulisan: `(e=6, w=2)` atau ringkas `(6, 2)`. Pecahan setengah tile boleh: `(6.5, 2)`
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
