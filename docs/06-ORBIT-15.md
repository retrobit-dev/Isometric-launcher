# 06 — ORBIT KAMERA 15°

Ditulis 2026-10-29 atas permintaan user: *"apakah rotasi bisa dibuat dengan
kelipatan 15 derajat?"* → dipilih opsi **A**: kamera mengelilingi diorama,
objek tetap sejajar grid.

## 1. Prinsipnya

Yang berputar adalah **kamera**, bukan objek. Koordinat objek di `scene.json`
tidak berubah sama sekali, jadi:

- grup, kunci, urutan tumpukan, animasi, refleksi, JSON, dan APK tetap aman;
- objek yang menempel dinding tetap menempel (dindingnya ikut berputar);
- objek tidak pernah "miring sendiri" di lantai — lantai tetap datar.

## 2. Rumus

`space.ts` — satu-satunya tempat proyeksi. Semua gambar (objek, dinding,
lantai, sorotan, hit-test) lewat `px()` / `unpx()`, jadi perubahan yaw cukup
di dua fungsi itu:

```
φ   = YAW (derajat, kelipatan 15)
re  = (e − CE)·cosφ − (w − CW)·sinφ
rw  = (e − CE)·sinφ + (w − CW)·cosφ
x   = OX + (re − rw)·HW
y   = CY + (re + rw)·HW/2 − z·ZH
```

`unpx()` memakai invers rotasi, jadi memilih/menggeser objek tetap tepat di
sudut mana pun (diuji: galat < 1e-15 tile).

Arah kamera di dunia: `(cosφ + sinφ, cosφ − sinφ, 1)`. Pada 0° hasilnya
`(1,1,1)` — sama dengan renderer lama, jadi sudut 0 tidak berubah sedikit pun.

## 3. Yang ikut menyesuaikan

| Bagian | Aturan |
|---|---|
| balok | **6 wajah**; wajah tampak bila `normal · kamera > 0`, digambar jauh→dekat. Warna: atas = `top`, +e = `right`, +w = `left`, sisi belakang = `left` digelapkan 22% |
| silinder / kerucut | warna tiap segmen dipilih dari arah kamera (dulu memakai aturan tetap yang hanya benar di 0°) |
| dinding | disembunyikan bila muka dalamnya membelakangi kamera (`dindingTersembunyi()`) — kalau tidak, ruangan tertutup seperti melihat kotak dari luar |
| objek tempel dinding | ikut disembunyikan bersama dindingnya (`menempelDindingTersembunyi()`), supaya tidak melayang |
| `fitToScene` | memproyeksikan 8 titik sudut kotak pembungkus, ukur bbox layar, pilih zoom & geser dari bbox itu → isi selalu masuk bingkai di sudut mana pun |
| sprite VERSI PIXEL | **tidak** ikut berputar 15° (gambar sudah dipanggang dari satu sudut). Pada sudut bukan kelipatan 90°, gunakan VERSI EDIT |

## 4. Batas yang disengaja

- Pada **0/90/180/270** tampilan tetap grid isometrik 2:1 yang tajam — tidak
  ada yang berubah dari sebelumnya.
- Pada sudut lain, ubin tidak lagi 2:1: garis nat jadi bertangga dan lebar
  tile berubah-ubah. Ini konsekuensi matematis, bukan bug, dan sengaja tidak
  dihaluskan (anti-alias dilarang oleh gaya pixel-art). Chip kamera
  menampilkan peringatan `orbit N° — grid bukan 2:1`.
- Di 45° ruangan tampak seperti "koridor": kamera menyusur diagonal lantai,
  sehingga dinding yang satu sejajar pandangan. Itu geometri yang benar,
  bukan kesalahan gambar.

## 5. Kendali di preview

- tombol `⟲ 15°` / `15° ⟳` → putar satu langkah,
- tombol `⟳ REFRESH` → kembali ke 0° + bingkai ulang seluruh diorama,
- chip koordinat menampilkan `kamera ×Z (e, w) · N°`.

## 6. Uji

`prototype/tests/run-orbit.mjs`:

1. normalisasi sudut (15/345/−15/7/23, `putarKamera`),
2. proyeksi ↔ invers konsisten di 24 sudut (galat < 1e-6),
3. pada 0/90/180/270 langkah tile tetap 1 : 0,5,
4. `fitToScene` menaruh seluruh isi di dalam bingkai di 24 sudut.

Jalankan: `cd prototype && node tests/run-orbit.mjs`.
