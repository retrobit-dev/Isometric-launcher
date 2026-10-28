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

## 1a. Skala fisik (dikunci dari referensi malam-biru)

> **RUANGAN TERKUNCI PERMANEN** sejak kesepakatan terakhir: nilai di bawah beku.
> Editor/import/reset tidak dapat mengubahnya; perubahan hanya lewat kode developer
> atas permintaan eksplisit user (docs/03 §0).
>
> 🔒 **ZOOM + POSISI TERKUNCI — 2026-10-28 (permintaan user: "tetap kunci").
> `VIEW_LOCKED = true` di `iso/space.ts`, komposisi dari pengaturan user:
> **zoom ×0.88 (HW 14, HH 7) di pusat (−1.2, 1.3)**. Saat kunci kode aktif,
> `VIEW_FIXED` **selalu menang** atas localStorage → tampilan identik di semua
> perangkat & setelah reload.
> Selama kunci aktif: pan, pinch, roda tetikus, tombol ZOOM, dan TENGAH **tidak
> memindahkan atau memperbesar ruangan**. Editor objek tetap berfungsi.
> **Kunci ruangan (dimensi/palet) juga dibuka sementara** (`ROOM_TEMP_UNLOCKED = true`)
> untuk fase penyamaan dengan referensi.
> Catatan: posisi kamera tetap disimpan otomatis (`isola-kamera-v1`) supaya
> hot-reload tidak menggeser apa pun, tetapi selama `VIEW_LOCKED = true` nilai
> itu tidak dipakai.
>
> **PERPANJANGAN DINDING + LANTAI (permintaan user 2026-10-28):** "perpanjang
> dinding untuk menutup area kosong, lantai mengikuti dinding, sehingga hasil
> akhirnya adalah area kosong kecil di sudut kiri bawah." Konstanta `EXT_E = 6`
> dan `EXT_W = 7` (`iso/space.ts`): dinding & lantai **digambar** sampai
> 26 × 26 (E+6, W+7), sedangkan **ruangan sebenarnya tetap 20 × 19** untuk
> penempatan objek, grid, dan zona. Pada komposisi terkunci, void turun dari
> **17,8 % → 0,08 %** dan yang tersisa hanya segitiga kecil di sudut kiri bawah.
>
> **Amendemen #1 (permintaan eksplisit user):** ruangan diperpanjang +6 tile ke selatan
> menjadi 20 × 19 — **tetap berlaku**.
> **Amendemen #2:** volume balok (slab tebal 1.5 z + dinding bervolume 0.4 tile)
> **dibatalkan atas permintaan user** — slab & dinding tipis kembali seperti semula.
> Nilai di tabel ini beku kembali.

| Besaran | Nilai dunia | Satuan kita |
|---|---|---|
| 1 tile lantai | 60 cm × 60 cm | 1 tile |
| 1 satuan tinggi | 50 cm | 1 z |
| Ruangan (DT × DB) | 12.0 m × 11.4 m (±137 m²) | **E = 20, W = 19** |
| Tinggi dinding | 6.0 m (loft sangat tinggi, sesuai permintaan) | **WALL_Z = 12** |
| Tinggi pintu | 2.0 m | 4 z |
| Tinggi meja kerja | 75 cm | 1.5 z |
| Tinggi rak buku berdiri | 1.8 m | 3.6 z |
| Tinggi lampu berdiri | 1.5 m | 3 z |

Referensi berupa **crop** (kamera di dalam ruangan), sehingga ukuran total ruangan adalah keputusan desain: 20 × 19 tile agar (a) lantai memotong tepi bawah seperti referensi, dan (b) densitas slot app cukup untuk launcher. Skala tile-vs-furnitur tetap mengikuti referensi: meja ≈ 3.5 tile, rak ≈ 2.5 tile.

**Palet ruangan: `malam-biru`** (diekstrak langsung dari `Screenshot_20261028_203752.jpg`) — dinding **navy datar** (kiri `#232e48` sisi teduh, kanan `#2a3552` sisi cahaya), **plint kayu** (`#5e4038` / `#7d5140`, tinggi 0.18 z) seperti di referensi, lantai **ubin persegi 1×1 tile** (bukan papan) 3 tone `#4e557d / #4a5178 / #565b86` dengan nat gelap `#373a5e`, slab diorama hampir hitam (`#171a2b / #1d2134`). Dinding dirender selalu melewati tepi atas layar (tidak ada ruang kosong di atas); tinggi fungsional untuk objek tetap 12 z. Seluruh warna ruangan & 22 material objek terlihat di tombol **PALET** pada preview.

## 1b. Framing kamera

Zoom dikendalikan **pinch in/out** (kontinu, rentang ×0.5 – ×6); setiap nilai zoom
membulatkan langkah piksel ke integer agar pixel-art tetap tajam.
Tombol **ZOOM ×n** hanya menampilkan level saat ini dan **mereset ke default** saat diketuk.

| Zoom | Kegunaan |
|---|---|
| **×2.5 (default)** | **komposisi gambar referensi user**: puncak belakang lantai di (324,182) ≈ (0.51 W, 0.455 H), ubin diamond 80×40 px, dasar dinding memotong tepi kiri y≈344 & kanan y≈340, lantai memotong tepi bawah |
| ×0.5 – ×1.5 | peta diorama seluruh ruangan |
| ×3 – ×6 | pandangan dekat untuk presisi edit |

Komposisi default = gambar referensi user `Screenshot_20261028_203752.jpg`
(1122×706) diskalakan ke kanvas internal 640×400 (÷1.76): ubin 140×70 px di
referensi → **80×40 px** di kanvas (320×160 px di layar 2560), nat 1 px.
Karena internal 640×400 adalah tepat ¼ dari 2560×1600, seluruh komposisi ini
mendarat identik di panel MatePad Mini.

> **POSISI KAMERA: TERKUNCI (zoom & posisi).** Urutan posisi saat halaman dibuka:
> (1) posisi terkunci (`isola-posisi-terkunci-v1`), (2) posisi kamera terakhir
> (`isola-kamera-v1`), (3) `VIEW_FIXED` (Q 2.5, pusat 0.4/0.5). Saat kunci kode
> aktif dan belum ada posisi tersimpan, posisi terakhir otomatis direkam sebagai
> posisi terkunci — jadi tidak perlu screenshot. Tombol ZOOM & TENGAH hanya
> mengembalikan ke posisi terkunci (tidak membuat zoom/geser baru).
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
