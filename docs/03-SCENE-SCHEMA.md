# 03 — Skema Scene & Editor (kontrak preview ↔ aplikasi)

> Status: **disepakati** · File pertukaran: `scene.json`
> Prinsip: **satu skema, tiga editor** — editor preview (web), Setting di dalam app (Android), dan file aset bawaan. Ketiganya membaca/menulis JSON yang sama, sehingga layout yang Anda susun di preview berlaku identik di aplikasi.

## 0. Ruangan — TIDAK ADA ATURAN (dihapus 2026-10-28)

Atas permintaan user ("hapus semua aturan ruangan, nanti saya beri referensi
baru"), seluruh penguncian ruangan dihapus:

- `ROOM_FIXED` **bukan lagi pemaksa** — hanya nilai bawaan. Import `scene.json`
  boleh menentukan `room` sendiri (`ROOM_FROM_FILE = true`, tetap divalidasi:
  angka positif, palet dari konstanta).
- Kunci zoom/posisi kamera (`VIEW_LOCKED`) dihapus; kamera bebas dan tersimpan
  otomatis di localStorage (`isola-kamera-v2`).
- Perpanjangan visual dinding/lantai (`EXT_E`/`EXT_W`) diset **0**.
- **Kunci objek** (`meta.locked`, §0a) **tetap ada** — itu fitur terpisah.

Nilai awal saat ini (bebas diubah, menunggu referensi baru):
`E = 20`, `W = 19`, `WALL_Z = 12`, palet `malam-biru`.

**RUANGAN DIHAPUS DARI TAMPILAN** (`ROOM_VISIBLE = false`, permintaan user
2026-10-28 "hapus juga ruangan ini"): lantai, dinding, plint, slab, dan refleksi
tidak digambar — kanvas kosong siap menerima referensi ruangan baru. Objek,
grid, dan editor tetap berfungsi. Set `ROOM_VISIBLE = true` untuk memunculkan
kembali.

## 0a. Kunci objek (SEMENTARA)

Tombol **SIMPAN & KUNCI** mengunci **objek saja**: layout beku untuk diterapkan ke aplikasi, tetapi kunci selalu bisa dibuka lagi (preview: tombol 🔒; aplikasi: Setting → Editor Ruang). `meta.locked` + `meta.savedAt` mencatat status kunci objek.

```json
{
  "version": 1,
  "room": { "e": 22, "w": 22, "wallZ": 6.5, "palette": "kayu-nude" },
  "objects": [
    {
      "id": "meja-guru",
      "label": "Meja Guru",
      "pos":  { "e": 6, "w": 2, "z": 0 },
      "size": { "e": 3, "w": 1.5, "z": 0.9 },
      "style": "wood",
      "app": null
    }
  ],
  "meta": { "locked": true, "savedAt": "2026-10-28T12:00:00.000Z" }
}
```

| Field | Tipe | Aturan |
|---|---|---|
| `room` | objek | **baca-saja / terkunci permanen** (docs/03 §0); nilai dari import diabaikan & diganti `ROOM_FIXED` |
| `id` | string | kebab-case, unik (docs/01 §9) |
| `label` | string | nama tampil untuk tooltip/panel |
| `pos.e / pos.w` | number | koordinat grid (docs/01 §4), kelipatan 0.1 |
| `pos.z` | number | tinggi dasar dari lantai, satuan z, kelipatan 0.1 |
| `size.e / size.w / size.z` | number | ukuran dalam tile & z, minimum 0.1, kelipatan 0.1 |
| `style` | string \| {top,left,right} | nama material (daftar §2) atau 3 warna eksplisit |
| `app` | string \| null | binding tindakan/app (null = dekorasi); diisi fase app |
| `layer` | `underlay` \| `main` \| `overlay` | urutan gambar: underlay = di bawah objek main (karpet, bayangan, decal lantai); main = default, urutan kedalaman normal; overlay = di atas semua (lampu gantung, balok plafon, tanaman menjulang). Tiap layer tetap diurutkan kedalaman isometrik internal |
| `meta.locked` | boolean | **true = OBJEK terkunci (sementara)** dan sah diterapkan ke aplikasi; false = draf objek. Ruangan tidak terpengaruh field ini (selalu terkunci) |
| `meta.savedAt` | string \| null | timestamp ISO saat SIMPAN & KUNCI terakhir |

## 1. Seed default objek — "balok8" (fase placeholder)

Draft baru / tombol RESET memuat 8 kelompok balok placeholder dari daftar objek
user (file `prototype/src/scene/seed.ts`). Posisi & ukuran = **usulan** dalam
kelipatan 0.1, dikoreksi user lewat editor; material dipakai sebagai pembeda.

| Kelompok | id | Posisi (e, w, z) | Ukuran (e×w×z) | Material | app |
|---|---|---|---|---|---|
| Meja guru | `meja-guru` | 9, 8.5, 0 | 3.5×2×1.2 | night-wood | — |
| Laptop | `laptop-meja` | 10, 9, 1.2 | 1×0.7×0.3 | slate | komputer |
| Kalkulator | `kalkulator-meja` | 11.5, 8.7, 1.2 | 0.6×0.4×0.2 | metal-light | kalkulator-grafik |
| Rak materi | `rak-materi` | 0, 4, 0 | 0.8×3×4.5 | wood-dark | materi-matematika |
| Papan jadwal | `papan-jadwal` | 0, 10, 4.5 | 0.3×6×3 | board | jadwal-mengajar |
| Lemari arsip | `lemari-arsip` | 0, 15, 0 | 1.2×3.5×4 | wood | arsip-nilai |
| Jam digital | `jam-digital` | 0, 2, 8.5 | 0.2×2×0.8 | slate | jam-countdown |
| Kalender | `kalender-dt` | 16, 0, 4.5 | 1.5×0.2×1.5 | paper-night | kalender |
| Jendela | `jendela-dt` | 5, 0, 4 | 4×0.3×3.5 | metal-light | cuaca |
| Tirai | `tirai-dt` | 4.4, 0.1, 3.6 | 0.6×0.3×4.4 | curtain | — |
| Pintu | `pintu-dt` | 18, 0, 0 | 1.8×0.3×4 | wood-dark | — |
| Lampu baterai | `lampu-baterai` | 13, 7, 0 | 0.6×0.6×4 | lamp-amber | baterai |

DT = dinding kanan (bidang w=0), DB = dinding kiri (bidang e=0). Jendela, tirai,
pintu, dan kalender menempel di DT sesuai kesepakatan; jam digital, papan jadwal,
rak, dan lemari di DB. Penyimpanan draft naik ke key `isola-draft-v3` /
`isola-locked-v3` agar seed termuat (draft v2 lama diabaikan).

## 2. Material bawaan

`wood`, `wood-dark`, `metal`, `paper`, `teal`, `cream`, `amber`, `slate`, `crimson`, `sage`
(masing-masing = 3 tone: top / left / right, sesuai arah cahaya dari jendela DT)

## 3. Aturan zona (disepakati, direvisi sesuai skala referensi)

- **Strip dinding `t < 1.5`** sepanjang DT/DB: khusus objek menempel dinding (jam, kalender, poster, jendela, papan) dan dekor — editor menandai batasnya dengan garis amber putus-putus di `t = 1.5`
- **Zona interaktif app: `t ≥ 1.5`** sampai dinding seberang — karena framing default (×2.5) memperlihatkan seluruh ruangan, tidak ada area yang tersembunyi di luar layar
- Objek ber-`app` wajib di zona interaktif; objek dinding ber-`app` (jam, kalender) exempt karena statusnya menempel dinding dan selalu terlihat

## 4. Fitur editor (preview web — sudah ada)

| Aksi | Cara |
|---|---|
| Ubah layout | Mode EDIT → **seret objek** (snap 0.1 tile) atau stepper ±0.1 di panel |
| Tambah objek | Tombol **TAMBAH** (balok baru 2×1×1 di tengah zona interaktif) |
| Edit objek | Ketuk objek → panel: posisi, ukuran, material (cycle), label, **layer (cycle UNDER/MAIN/OVER)** |
| Hapus / duplikat | Tombol di panel objek |
| **Peran objek** | Tombol **JADIKAN LANTAI** di panel objek: objek digambar sebagai **ubin datar** seluas `pos e..e+size.e × w..w+size.w` (bukan balok), `z` otomatis 0, memakai palet lantai + nat + slab. Tombol yang sama mengembalikannya jadi balok. Field `role: 'lantai'` disimpan di `scene.json` |
| **Input angka** | Posisi (e, w, z) dan ukuran (panjang, lebar, tinggi) bisa **diketik langsung** di panel objek: ketuk field, ketik angka, **Enter** = terapkan (Esc = batal, ↑/↓ = ±0.1). Nilai dibulatkan ke kelipatan **0.1**; tombol −/+ tetap ada |
| **SALIN JSON** | Di modal EXPORT: satu ketuk menyalin seluruh `scene.json` ke clipboard (fallback `execCommand` bila Clipboard API diblokir), label berubah `TERSALIN ✓` |
| **Zoom in/out** | **Pinch in/out** di layar (kontinu ×0.5 – ×6, langkah piksel tetap integer). Tombol **ZOOM ×n** = indikator level + ketuk untuk reset ke komposisi terkunci ×2.5 (`VIEW_FIXED` + `VIEW_LOCKED`, docs/01 §1b) |
| **Pan kamera** | Seret area kosong (mode apa pun) menggeser tengah kamera **tanpa batas — ruangan boleh dibawa ke mana pun di kanvas**; **TENGAH** mengembalikan pandangan default |
| **SIMPAN & KUNCI** | Mengunci scene: edit dinonaktifkan, `meta.locked=true` + `savedAt` dicatat. **Hanya scene terkunci yang sah diterapkan ke aplikasi** |
| Buka kunci | Tombol 🔒 → kembali ke draf untuk diedit (versi terkunci tetap tersimpan) |
| **Refleksi lantai** | Tombol **REFLEKSI** (default AKTIF): pantulan cermin objek main & overlay di permukaan lantai, alpha 12%, tinggi dipadatkan 60%, dipotong persis ke bentuk lantai. Objek layer underlay tidak dipantulkan |
| Import / Export | Toolbar: export = unduh + salin `scene.json` (nama file menandai draf/terkunci); import = tempel JSON |
| Reset | Kembalikan ke scene kosong bawaan + pandangan default |
| Persistensi | Draf & scene terkunci disimpan terpisah di `localStorage` — reload tidak menghilangkan keduanya |

## 5. Spesifikasi fitur Setting di aplikasi Android (Track B)

Menu **Setting → Editor Ruang** dengan kemampuan identik:
1. **Ubah layout**: drag objek di layar (snap 0.5), atau stepper untuk presisi
2. **Tambah objek**: dari template (meja, rak, lemari, papan, tanaman…) atau balok kosong
3. **Edit objek**: posisi, ukuran, material, label, binding app/shortcut
4. **Hapus & duplikat** objek
5. **Import/Export `scene.json`** (berbagi layout antar perangkat / dari preview web)
6. **Reset ke bawaan**
7. **Undo satu langkah** (minimum), konfirmasi sebelum hapus
8. **Zoom & pan**: pinch-zoom kontinu + tombol ZOOM (indikator & reset), drag satu jari di area kosong = pan, tombol TENGAH = reset pandangan
9. **SIMPAN & KUNCI (objek saja, sementara)**: setelah disimpan, home mengunci layout objek (edit hanya dari Setting); badge jam simpan tampil di Editor Ruang; kunci selalu bisa dibuka lagi dari Setting; aplikasi menolak memuat scene dengan `meta.locked=false`. Ruangan tidak pernah bisa diedit dari aplikasi (docs/03 §0)
Persistensi app: file `scene.json` di internal storage; aset bawaan di-bundle sebagai fallback.
Mode edit di app hanya reachable dari Setting (bukan dari home) agar layar home tetap bersih.

## 6. Kontrak penerapan preview → aplikasi

1. Susun layout di preview (Mode EDIT), bebas zoom/pan untuk presisi
2. **SIMPAN & KUNCI** → scene ditandai `meta.locked = true` (+ `savedAt`)
3. **EXPORT** → dapat file `scene-terkunci.json`
4. Aplikasi **menolak** file dengan `meta.locked = false`; file terkunci dimuat: saat development via `assets/scene.json`, setelah app jadi lewat Setting → Import
5. Renderer apa pun (canvas 2D sekarang, Three.js/libGDX nanti) wajib mematuhi skema ini — tidak ada field liar di luar `style` objek
