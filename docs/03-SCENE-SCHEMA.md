# 03 — Skema Scene & Editor (kontrak preview ↔ aplikasi)

> Status: **disepakati** · File pertukaran: `scene.json`
> Prinsip: **satu skema, tiga editor** — editor preview (web), Setting di dalam app (Android), dan file aset bawaan. Ketiganya membaca/menulis JSON yang sama, sehingga layout yang Anda susun di preview berlaku identik di aplikasi.

## 1. Skema `scene.json` (versi 1)

```json
{
  "version": 1,
  "room": { "e": 22, "w": 22, "wallZ": 6.5, "palette": "linoleum-dado" },
  "objects": [
    {
      "id": "meja-guru",
      "label": "Meja Guru",
      "pos":  { "e": 6, "w": 2, "z": 0 },
      "size": { "e": 3, "w": 1.5, "z": 0.9 },
      "style": "wood",
      "app": null
    }
  ]
}
```

| Field | Tipe | Aturan |
|---|---|---|
| `id` | string | kebab-case, unik (docs/01 §9) |
| `label` | string | nama tampil untuk tooltip/panel |
| `pos.e / pos.w` | number | koordinat grid (docs/01 §4), kelipatan 0.5 |
| `pos.z` | number | tinggi dasar dari lantai, satuan z |
| `size.e / size.w / size.z` | number | ukuran dalam tile & z, minimum 0.5 |
| `style` | string \| {top,left,right} | nama material (daftar §2) atau 3 warna eksplisit |
| `app` | string \| null | binding tindakan/app (null = dekorasi); diisi fase app |

## 2. Material bawaan

`wood`, `wood-dark`, `metal`, `paper`, `teal`, `cream`, `amber`, `slate`, `crimson`, `sage`
(masing-masing = 3 tone: top / left / right, sesuai arah cahaya dari jendela DT)

## 3. Aturan zona (disepakati)

- **Zona interaktif: `t = 2..12`** sepanjang DT/DB dan area tengah与之 — semua objek ber-`app` wajib di sini
- **Zona dekoratif: `t > 13`** — objek tanpa `app` (tanaman, tumpukan buku, bayangan)
- Editor menampilkan **batas zona amber putus-putus** di `e = 12.5` dan `w = 12.5` sebagai pengingat
- Alasan: area `t > 13` berada di luar bidang layar kamera full-bleed; app yang ditaruh sana tidak terlihat tanpa orbit

## 4. Fitur editor (preview web — sudah ada)

| Aksi | Cara |
|---|---|
| Ubah layout | Mode EDIT → **seret objek** (snap 0.5 tile) atau stepper ±0.5 di panel |
| Tambah objek | Tombol **TAMBAH** (balok baru 2×1×1 di tengah zona interaktif) |
| Edit objek | Ketuk objek → panel: posisi, ukuran, material (cycle), label |
| Hapus / duplikat | Tombol di panel objek |
| Import / Export | Tombol toolbar: export = unduh + salin `scene.json`; import = tempel JSON |
| Reset | Kembalikan ke scene kosong bawaan |
| Persistensi | `localStorage` preview — perubahan bertahan saat reload |

## 5. Spesifikasi fitur Setting di aplikasi Android (Track B)

Menu **Setting → Editor Ruang** dengan kemampuan identik:
1. **Ubah layout**: drag objek di layar (snap 0.5), atau stepper untuk presisi
2. **Tambah objek**: dari template (meja, rak, lemari, papan, tanaman…) atau balok kosong
3. **Edit objek**: posisi, ukuran, material, label, binding app/shortcut
4. **Hapus & duplikat** objek
5. **Import/Export `scene.json`** (berbagi layout antar perangkat / dari preview web)
6. **Reset ke bawaan**
7. **Undo satu langkah** (minimum), konfirmasi sebelum hapus
Persistensi app: file `scene.json` di internal storage; aset bawaan di-bundle sebagai fallback.
Mode edit di app hanya reachable dari Setting (bukan dari home) agar layar home tetap bersih.

## 6. Kontrak penerapan preview → aplikasi

1. Susun layout di preview (Mode EDIT)
2. **EXPORT** → dapat file `scene.json`
3. Aplikasi membaca file itu: saat development diletakkan di `assets/scene.json`; setelah app jadi, lewat Setting → Import
4. Renderer apa pun (canvas 2D sekarang, Three.js/libGDX nanti) wajib mematuhi skema ini — tidak ada field liar di luar `style` objek
