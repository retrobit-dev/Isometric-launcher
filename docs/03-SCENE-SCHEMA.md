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
| `pos.e / pos.w` | number | koordinat grid (docs/01 §4). **Bebas, maks 3 desimal** — aturan kelipatan 0.1 dihapus 2026-10-29 |
| `pos.z` | number | tinggi dasar dari lantai, satuan z, maks 3 desimal |
| `size.e / size.w / size.z` | number | ukuran dalam tile & z, **minimum 0.001**, kelipatan **0.001** (3 desimal) |
| `anim` | object / tidak ada | **animasi tampilan** (lihat §0e): `{ jenis, laju?, besar?, fase? }`. Tidak mengubah posisi/ukuran di data |
| `style` | string \| {top,left,right} | nama material (daftar §2) atau 3 warna eksplisit |
| `app` | string \| null | binding tindakan/app (null = dekorasi); diisi fase app |
| `layer` | `underlay` \| `main` \| `overlay` | urutan gambar: underlay = di bawah objek main (karpet, bayangan, decal lantai); main = default, urutan kedalaman normal; overlay = di atas semua (lampu gantung, balok plafon, tanaman menjulang). Tiap layer tetap diurutkan kedalaman isometrik internal |
| `urutan` | number | **posisi tumpukan** di dalam lapisan yang sama (semakin besar = semakin ke depan). Objek baru & duplikat otomatis mendapat nilai teratas. Bila tidak diisi, urutan mengikuti kedalaman isometrik otomatis (perilaku lama). Diatur lewat tombol ▲ NAIKKAN / ▼ TURUNKAN; LATAR tidak ikut tumpukan |
| `latar` | boolean | **true = objek ini bagian LATAR (background kanvas)**: digambar paling belakang, tidak muncul di DAFTAR OBJEK, tidak bisa dipilih/diubah/dihapus, dan tidak tersentuh UNDO/REDO/IMPORT/PULIHKAN. Tetap tersimpan & ter-export di `scene.json` |
| `meta.locked` | boolean | **true = OBJEK terkunci (sementara)** dan sah diterapkan ke aplikasi; false = draf objek. Ruangan tidak terpengaruh field ini (selalu terkunci) |
| `meta.updatedAt` | string ISO / null | **cap waktu simpan terakhir.** Dipakai saat aplikasi dibuka untuk memilih mana yang lebih baru: draf browser atau file `scene.json`. Tanpa ini, tab lama yang baru dibuka bisa menimpa file dengan scene usang |
| `meta.latarGambar` | string / null | **token gambar latar** (background kanvas). Berkas gambarnya TIDAK disimpan di `scene.json` — lihat §0d |
| `meta.latarMode` | `"isi"` \| `"muat"` | cara gambar latar dipetakan ke kanvas 640×400. `isi` (bawaan) = memenuhi kanvas, sisi lebih terpotong · `muat` = gambar utuh di tengah |
| `meta.savedAt` | string \| null | timestamp ISO saat SIMPAN & KUNCI terakhir |
| `meta.latarMigrasi` | string \| null | penanda migrasi LATAR (`latar-v1`). Bila terisi, editor tidak lagi memindahkan objek lama ke latar secara otomatis — sehingga "BUKA LATAR" tidak dibalik saat halaman dibuka ulang |

## 0d. Gambar latar (background kanvas) — 2026-10-29

User membuat gambar ruangan sendiri (Paint / aplikasi lain) lalu memasangnya
sebagai **lapisan latar kanvas**. Objek perabot tidak berubah dan tetap di
atasnya.

**Pemisahan data (penting):**

| Apa | Di mana | Kenapa |
|---|---|---|
| `meta.latarGambar` (token) + `meta.latarMode` | di dalam `scene.json` | scene tetap kecil & bisa dibaca mesin |
| berkas gambarnya | `.isola-latar.png` di samping scene (preview) · `assets/latar.png` (APK) | PNG 2560×1600 bisa 4–6 MB; menaruhnya sebagai base64 di scene akan membengkakkan file, localStorage, dan payload APK |

**Aturan render:** gambar digambar **paling bawah** (tepat di atas warna `void`),
sebelum semua objek. Selama gambar latar terpasang, objek ber-`latar: true`
(dinding & lantai bawaan) **tidak digambar** karena gambarnya sudah memuat
ruangan — datanya tetap utuh dan muncul lagi begitu gambar latar dihapus.

**Endpoint preview (dev-server, bukan bagian APK):**

| Metode | Arti |
|---|---|
| `GET /api/latar` | byte gambar · `204` bila belum ada |
| `POST /api/latar` | `{ "dataUrl": "data:image/png;base64,..." }` → `{ ok, token }` |
| `DELETE /api/latar` | hapus gambar latar |

Batas ukuran unggah 16 MB base64 (≈12 MB gambar); UI preview menolak berkas
> 8 MB lebih dulu.

## 0d. Presisi ukuran — 2026-10-29

Permintaan user: *"yang 0.001 itu ... ukuran objek"*. Minukuran objek turun
dari `0.01` menjadi **`0.001` tile** dan semua angka ukuran selalu kelipatan
`0.001` (3 desimal).

- `0.001` tile = **0,057 px** internal saat zoom ×1 (0,128 px di tablet
  2560×1600). Jadi ini presisi DATA, bukan tombol berukuran piksel: nilainya
  bisa disetel halus, tetapi secara fisik tetap di bawah satu piksel.
- Aturan dipusatkan di `scene/types.ts`: `UKURAN_MIN`, `GEOMETRI_DESIMAL`,
  `bulatkan3()`, `ukuranSah()` — dipakai store, katalog preset, panel editor,
  dan handler geser/ubah ukuran, jadi tidak ada lagi angka `0.01` yang
  berserakan.
- Panel editor menampilkan 3 desimal; tombol ± melangkah `0.001`.
- Nilai lebih kecil dari `0.001` (termasuk 0 dan negatif) otomatis dinaikkan
  ke `0.001` saat normalisasi, jadi file lama tetap aman.

Diuji oleh `prototype/tests/run-ukuran.mjs`.

## 0e. Animasi objek — 2026-10-29

Permintaan user: *"objek bisa diedit dan ditambahkan animasi"*. Animasi
**tidak mengubah data**: `pos`/`size` di JSON tetap sama, renderer hanya
menggeser/memutar saat menggambar. Jadi hit-test, bbox, grup, kunci, unduh
JSON, dan APK tidak terpengaruh — objek tetap bisa diedit seperti biasa.

```json
{ "anim": { "jenis": "ayun", "laju": 0.22, "besar": 1, "fase": 0.14 } }
```

| Field | Arti |
|---|---|
| `jenis` | `naik-turun` · `ayun` · `denyut` · `kedip` · `putar` |
| `laju` | getaran per detik, `0.05`–`5` (bawaan `0.5`) |
| `besar` | pengali amplitudo, `0.1`–`5` (bawaan `1`) |
| `fase` | geser fase `0`–`1` supaya bagian serupa tidak bergerak serempak |

Di preview, panel editor objek punya baris **ANIMASI** (tombol siklus
MATI → NAIK-TURUN → AYUN → DENYUT → KEDIP → PUTAR) dan **LAJU**
(LAMBAT/CEPAT). Katalog preset sudah memakai animasi: bola lampu berdenyut,
7 daun tanaman berayun dengan fase berbeda, matahari berdenyut, awan
naik-turun, 4 bagian tirai berayun.


## 1. Kondisi awal scene (seed DIHAPUS)

Tidak ada seed / data contoh lagi (permintaan user 2026-10-28: "hapus semua seed
dan tombol seed"). File `prototype/src/scene/seed.ts` beserta tombol **SEED** di
toolbar sudah dihapus, jadi:

- **versi draf naik ke `isola-draft-v7`** (2026-10-29): draf `v6` yang masih
  berisi jendela versi balok sengaja ditinggalkan, supaya jendela lama tidak
  muncul lagi setelah bentuk silinder/kerucut ditambahkan
- draft baru / localStorage kosong -> **scene KOSONG** (tanpa objek sama sekali)
- objek dibuat lewat **+ DINDING**, **+ TAMBAH**, atau **IMPORT** `scene.json`
  (tombol **+ LANTAI** dan **+ DINDING** dihapus 2026-10-28; objek yang sudah ada
  tetap utuh dan bisa digandakan lewat DUPLIKAT)

Tidak ada lagi daftar posisi/material contoh yang perlu diselaraskan. Skema
objek di bawah ini tetap berlaku untuk objek yang Anda buat/import sendiri.

## 2. Material bawaan

Daftar resmi ada di **`docs/04-palet.json`** (dibangkitkan dari
`prototype/src/iso/palette.ts` dengan `node tools/gen_palet.mjs`):
**74 material**, 11 material lantai, 13 material dinding. Setiap material =
3 tone (`top` / `left` / `right`) mengikuti arah cahaya dari jendela DT.

Keluarga material yang tersedia untuk objek buatan sendiri (2026-10-29):

| Keluarga | Nama |
|---|---|
| kayu | `kayu-meja`, `kayu-tepi`, `kayu-gelap`, `kayu-terakota`, `jati-muda` |
| putih / kertas | `kusen-putih`, `papan-putih`, `kertas-putih`, `papan-krem` |
| logam | `perak`, `perak-tua`, `metal-light` |
| abu | `abu`, `abu-tua` |
| buku | `buku-gelap`, `buku-krem`, `buku-biru`, `buku-bata`, `buku-zaitun`, `buku-lav`, `buku-salmon` |
| tanaman | `daun-sage`, `daun-gelap` |
| jendela | `kaca-langit`, `kaca-terang`, `matahari`, `tirai-gorden`, `tirai-lipat`, `pastel-awan` |
| cahaya | `lamp-amber` |

`style` yang tidak dikenal tetap dirender **magenta** (`#ff00cc`) sebagai
penanda bug — jangan dipakai untuk warna sah.

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
| **GRUP** | Field `grup: string` (mis. `grup-1a2b`) + `grupNama: string` (nama folder). Objek bergrup sama: mengetuk salah satu menyorot seluruh anggota, menyeretnya menggeser SEMUA anggota dengan jarak relatif tetap. Ukuran/warna/rotasi tetap per objek. Dibuat dari DAFTAR OBJEK: centang ≥2 objek → **GABUNG n**; **LEPAS** mengeluarkan objek bercetang dari grup. Duplikat objek bergrup otomatis lepas dari grup |
| **DUPLIKAT** | Salinan berdiri sendiri (lepas dari grup & kunci asal) dan SELALU masuk layer **overlay** supaya langsung terlihat di atas objek lain (permintaan user 2026-10-28); turunkan ke main lewat baris LAYER bila perlu |
| **KLIK OBJEK = INFO SAJA** | Klik/ketuk objek di kanvas **tidak memilih dan tidak menggeser** apa pun — hanya muncul kartu info: nama objek, peran (balok/lantai/dinding kiri|kanan), ukuran, dan posisi e/w/z. Kartu hilang sendiri setelah 4 detik. Seleksi objek HANYA lewat tombol **OBJEK** (daftar), dan pemindahan objek lewat angka e/w di panel editor |
| **PEMILIHAN OBJEK** | Semua aksi edit dimulai dari daftar **OBJEK n** → ketuk baris (folder dibuka dulu bila objek bergrup) → panel editor terbuka |
| **PENYIMPANAN TAHAN RESTART** | Scene ditulis ke localStorage DAN ke file `.isola-scene.json` lewat `GET/POST /api/scene` (plugin dev-server). Saat dibuka, bila file lebih lengkap, scene dipulihkan dari file dan banner `scene dipulihkan dari file (n objek)` tampil. Scene KOSONG tidak pernah boleh menimpa file: klien tidak mengirim kosong, dan server menolak dengan HTTP 409 (`kept: n`) |
| **KONFIRMASI HAPUS** | Semua penghapusan WAJIB lewat dialog konfirmasi (`ui/Confirm.tsx`): judul ⚠ KONFIRMASI HAPUS OBJEK, nama objek, peran/layer/posisi, peringatan bila objek anggota grup ("objek lain TIDAK ikut terhapus") dan bila objek terakhir ("scene akan menjadi kosong"). Tombol **BATAL** di kiri, tombol merusak **YA, HAPUS** berwarna merah. Berlaku untuk tombol HAPUS di panel editor maupun 🗑 di DAFTAR OBJEK (konfirmasi 2 ketukan lama dihapus) |
| **URUNGKAN** | Setelah hapus atau import yang menimpa scene, muncul toast di bawah kanvas berisi nama objek + tombol **URUNGKAN** (berlaku 8 detik) yang memasang kembali scene persis sebelum aksi itu |
| **KONFIRMASI IMPORT** | IMPORT yang akan mengganti scene berisi objek menampilkan peringatan `n objek → m objek`, menyoroti jumlah objek yang akan hilang, dan menandai tombolnya merah bila jumlahnya menyusut |
| **PULIHKAN (⟲)** | Tombol ⟲ di DAFTAR OBJEK memindai semua sumber yang bisa dipulihkan: cadangan `isola-cadangan-v1` (scene non-kosong terakhir, tidak pernah tertimpa scene kosong), riwayat `isola-riwayat-v1` (12 cuplikan), scene terkunci, draf aktif, draf lama v5/v4, dan **semua key localStorage lain** yang berisi array `objects` (penyelamatan). Satu ketuk = scene dipasang kembali. Saat scene kosong (OBJEK 0) panel ini otomatis terbuka |
| **FOLDER / GRUP di daftar** | Objek bergrup tampil sebagai **satu folder** di DAFTAR OBJEK, bukan baris-baris lepas. Ketuk folder = buka/tutup isinya (▸/▾); objek di dalamnya tampil menjorok dengan garis kiri. Nama folder = `grupNama` (default `FOLDER n`) dan bisa di-rename lewat tombol ✎ (Enter = simpan, Esc = batal); rename berlaku untuk semua anggota |
| **BENTUK OBJEK (silinder / kerucut)** | Field `bentuk` (`balok` default, `silinder`, `kerucut`) + `puncak` (0 = runcing … 1 = silinder … 1.15 = melebar seperti pot). Dipakai preset: alas/batang/tiang kursi & lampu, pot tanaman, keranjang sampah, batang tirai, kaki papan tulis. Aturan gambar ada di docs/04 §4a |
| **GESER / HAPUS SELURUH FOLDER** | Di DAFTAR OBJEK, tiap baris folder punya **✥** (geser semua anggota: e/w −1 · −0.1 · +0.1 · +1, termasuk sub-folder; objek terkunci tidak ikut) dan **🗑** (hapus semua anggota folder + sub-folder, wajib konfirmasi, bisa URUNGKAN ±8 detik) |
| **TOMBOL − / + BISA DITAHAN** | Di panel editor objek: ketuk = satu langkah 0.1; tahan > 320 ms = berulang otomatis tiap 70 ms (berhenti saat jari diangkat/keluar). Nilai bebas (maks 3 desimal) dan tunduk pada batas minimum tiap field |
| **KATALOG OBJEK (+ TAMBAH)** | Tombol **+ TAMBAH** membuka pemilih objek (`ui/PresetPicker.tsx`). Ronde 17 (2026-10-29) menghapus seluruh preset hasil jiplak gambar referensi, termasuk versi PIXEL/sprite. Sejak **ronde 19** katalog berisi objek **buatan sendiri yang sengaja SIMPEL**, satu per satu. Isi sekarang: 1 preset — **JENDELA** (`jendela`, **6 bagian**, lebar 4.2, dalam 0.5, `pasang: dinding-kanan`) = satu bidang kaca + empat batang kusen kayu + papan ambang bawah. TANPA tirai, batang gorden, palang silang, matahari atau awan (dihapus atas permintaan user: "saya hanya ingin membuat Jendela"). Objek baru ditulis di `scene/presets.ts` (array `PRESETS`) memakai helper `b/bt/bp/beranim`; satu preset = satu folder grup. Angka bebas sampai 3 desimal, tanpa angka acak, sehingga renderer APK bisa mereproduksinya persis (docs/04). URUTAN `bagian` = urutan gambar: bagian yang harus tampak di depan ditulis TERAKHIR (kaca dulu, baru kusen, paling akhir ambang) |
| **TUMPUKAN (naikkan / turunkan)** | Urutan gambar eksplisit per objek (`urutan`). **NAIKKAN** = objek digambar di ATAS objek sebelumnya (jadi overlay terhadapnya); **TURUNKAN** = digambar di BAWAH objek berikutnya (underlay terhadapnya). Tempat: panel editor objek baris **tumpukan** (menampilkan posisi, mis. `3 / 6`, plus tombol ▲ NAIKKAN ▼ TURUNKAN) dan DAFTAR OBJEK (tombol ↑ ↓ di tiap baris). **Objek baru dari + TAMBAH dan hasil DUPLIKAT otomatis berada paling atas.** Tombol hanya menukar dengan tetangga terdekat di lapisan yang sama — di ujung tumpukan tombol tidak berefek. `urutan` lama dirapikan otomatis (0..n-1) saat pertama kali diubah. Baris **layer** (underlay/main/overlay) tidak lagi bisa diubah dari UI; nilainya tetap dibaca untuk scene lama, tetapi duplikat kini memakai `urutan` (bukan dipaksa overlay). Objek **LATAR** selalu paling belakang dan tidak ikut tumpukan |
| **LATAR (background kanvas)** | Lapisan background terpisah dari perabot (permintaan user 2026-10-29: kelima objek lama — lantai, dinding DB, dinding DT, dan 2 balok dasar — masuk latar). Objek latar (`latar: true`): digambar **paling belakang** (sebelum underlay), **tidak muncul** di DAFTAR OBJEK, tidak bisa dipilih/diubah/dihapus, tidak ikut pantulan, dan **tidak tersentuh** UNDO/REDO, IMPORT, maupun PULIHKAN (`gabungLatar()` selalu mengembalikan set latar aktif). Kontrol di DAFTAR OBJEK: baris **LATAR n objek · terkunci** dengan tombol **JADIKAN LATAR** (objek bercetang → latar) dan **BUKA** (semua latar kembali jadi objek biasa). Perabot baru dari **+ TAMBAH** selalu menjadi objek biasa, bukan latar |
| **KACA LANGIT & CUACA** | Field `langit: true` pada satu bagian membuat bagian itu digambar sebagai **langit dinamis**, bukan warna bidang statis. Preset `jendela` memakai ini untuk bidang kacanya. Yang menentukan gambar: (a) **jam perangkat** → fase **fajar 04.30–06**, **pagi 06–10**, **siang 10–15**, **senja 15–18**, **malam 18–04.30**; tiap fase punya **6 pita** warna langit bertangga (bukan gradasi) + warna awan; (b) **cuaca** → cerah / berawan / gerimis / hujan / badai, masing-masing mengatur jumlah awan, butir hujan, langit mendung, kilat, dan pelangi. Matahari/bulan bergerak di busur sesuai jam (bulan di malam, bintang berkedip). SEMUA warna tetap dari palet referensi 342 warna. Cuaca diambil dari **Open-Meteo** (kode WMO) bila mode OTOMATIS; mode MANUAL memilih sendiri. **Lokasi**: sumber
`PERANGKAT` meminta izin lokasi (bila ditolak → kota pilihan), sumber `KOTA` selalu memakai kota pilihan; bawaan
**REMBANG** (−6.7082, 111.3416) — bukan Semarang, karena jarak ±106 km membuat cuaca bisa berbeda. Kartu ⚙ CUACA
mengatur sumber + kota (Rembang, Pati, Lasem, Kudus, Jepara, Semarang, Yogyakarta, Surabaya, Jakarta). Cache cuaca
disimpan **per koordinat**, jadi ganti kota langsung mengambil data baru. Tombol toolbar menampilkan `☀/☾ FASE · CUACA` dan menyiklus OTOMATIS → CERAH → BERAWAN → GERIMIS → HUJAN → BADAI → OTOMATIS. Kode: `iso/langit.ts` (gambar + fase + cuaca), `scene/cuaca.ts` (jam perangkat, Open-Meteo, cache 10 menit), diuji `tests/run-langit.mjs` |
| **TRANSPARANSI (objek & folder)** | Field `opasitas` **0.05–1** (1 atau tidak diisi = pekat). Diatur dari panel editor objek (baris **transparansi**, kolom angka + tombol −/+ 0,1) dan dari kartu FOLDER (semua anggota langsung dapat nilai yang sama). Nilai dibulatkan 2 desimal; nilai 1 TIDAK ditulis ke file. Transparansi hanya mengubah cara menggambar — posisi, ukuran, grup, kunci, hit-test, dan tumpukan tidak berubah. Logika folder ada di `scene/folder.ts` (`opasitasFolder`, `opasitasRata`), normalisasi di `scene/store.ts`, penggambaran di `iso/box.ts` (`opasitasOf` → `ctx.globalAlpha`, dipulihkan setelah objek selesai) |
| **KUNCI per objek** | Field `kunci: 'warna' \| 'semua'`. `'warna'` = posisi/ukuran/tinggi/rotasi/refleksi/sisi/layer/hapus/geser DIKUNCI, hanya **material (warna)** yang bisa diubah. `'semua'` = terkunci total termasuk warna. Tidak diisi = bebas. Diubah lewat baris **KUNCI** di panel editor (BEBAS → WARNA SAJA → TOTAL) atau tombol kunci di DAFTAR OBJEK. Grup yang salah satu anggotanya terkunci tidak bisa digeser sama sekali supaya susunannya tidak pecah |
| **DAFTAR OBJEK** | Tombol `OBJEK n` di toolbar membuka panel daftar semua objek (bisa digeser). Tiap baris: kotak warna material, nama, tag peran (`B` balok / `L` lantai / `DK` dinding kiri / `DT` dinding kanan), tag layer (`U`/`M`/`O`), posisi `e,w`. Ketuk baris = pilih objek, **◎** = bidik kamera, **hapus** = 2 ketukan dalam 2,5 detik, ikon kunci = ubah status kunci. Panel **PALET dihapus** bersama tombolnya |
| **FOLDER (posisi · ukuran · rotasi)** | Tombol **✥** pada baris folder membuka kartu **FOLDER**, disamakan dengan panel editor objek (permintaan user 2026-10-29: "bisakah fiturnya disamakan dengan editor objek?"). Isinya: **POSISI e/w/z** (angka bisa diketik, tombol −/+ melangkah **0,1**), **UKURAN panjang/lebar/tinggi** (mengubah seluruh isi folder sebagai satu kesatuan), dan **ROTASI ⟲ 15° / 15° ⟳**. Arti angka posisi = koordinat SUDUT MINIMUM kotak pembatas folder; arti angka ukuran = ukuran kotak pembatas folder (bukan ukuran satu bagian). Semua anggota (termasuk sub-folder bersarang) bergerak/di-skala dengan faktor sama dari sudut minimum sebagai jangkar, jadi susunan di dalam folder tidak berubah. Objek `latar` dan objek **terkunci** tidak ikut. Sumbu z: bagian yang akan menembus lantai (z < 0) dilewati saat digeser. ROTASI folder memutar seluruh isi mengelilingi poros tengahnya: posisi tiap anggota mengorbit poros dan `rotasi` tiap anggota ikut +15°, jadi bentuk folder tetap utuh. Logika murni ada di `scene/folder.ts` (`anggotaFolder`, `bboxFolder`, `pindahFolder`, `skalaFolder`, `putarFolder`, `duplikatFolder`, `hapusFolder`) dan diuji `tests/run-folder.mjs`. Kartu juga punya **DUPLIKAT** dan **HAPUS** yang berlaku untuk SEMUA objek dalam folder: DUPLIKAT menyalin seluruh anggota (sub-folder ikut, id grup baru, digeser +1 e/w, kunci dilepas, ditaruh paling atas); HAPUS menghapus seluruh anggota termasuk sub-folder setelah konfirmasi, dengan tombol URUNGKAN |
| **Material dinding** | Objek `role: 'dinding'` membaca `style` dan menerjemahkannya lewat `wallColors(style, side)`: (a) **palet dinding** `dinding-navy` (default), `dinding-krem`, `dinding-kayu`, `dinding-teal`, `dinding-bata`, `dinding-kertas` — masing-masing punya muka teduh (DB) & muka cahaya (DT) + plint kayu; (b) **material balok** apa pun (wood, metal, paper, …) dipakai sebagai muka/plint. Style tak dikenal → **magenta** (`#ff00cc`) sebagai penanda bug, tidak lagi diam-diam jadi kayu |
| **Role dinding** | Field `role: 'dinding'` + `side: 'kiri' \| 'kanan'`. Digambar tepat seperti palet ruangan: sisi teduh/cahaya (`#232e48` / `#2a3552`) + plint kayu 0.18 z. Dinding tidak pernah ikut dikonversi jadi lantai dan tidak dipantulkan |
| **Palet/pola lantai** | Objek ber-role lantai memakai field `style` dari **`FLOOR_MATERIALS`** (`iso/palette.ts`), di siklus lewat tombol **POLA**: `lantai-kayu` (papan **4×1** dengan sambungan digeser 2 tile tiap baris, 3 tone `#b98a58/#b3824e/#bf9060`, nat tipis `#8f6a44`, serat kayu `#a1743f`), `lantai-kayu-terang`, `lantai-kayu-gelap`, `lantai-ubin` (ubin persegi 1×1 palet malam-biru). Default palet saat lantai dibuat = `lantai-kayu` |
| **Hapus RESET** | Tombol **RESET** di toolbar preview **dihapus** (permintaan user 2026-10-28). Scene tidak bisa dikosongkan dari UI; pembersihan hanya lewat IMPORT `scene.json` |
| **Input angka** | Posisi (e, w, z) dan ukuran (panjang, lebar, tinggi) bisa **diketik langsung** di panel objek: ketuk field, ketik angka, **Enter** = terapkan (Esc = batal, ↑/↓ = ±0.1). Nilai dibulatkan ke kelipatan **0.1**; tombol −/+ tetap ada |
| **Palet pastel lembut** | Ditambahkan sebagai pilihan BARU (palet malam-biru & kayu tetap ada): lantai `lantai-pastel-krem/-sakura/-mint/-lavender/-biru/-ijo` (papan 4x1, nat & serat lembut), dinding `dinding-pastel-krem/-sakura/-mint/-lavender/-biru/-kuning` (muka teduh+cahaya & plint), objek `pastel-mint/-peach/-lavender/-blue/-butter/-rose/-sage/-clay` (3 tone dengan selisih cukup agar isometrik tetap terbaca). Dipilih lewat tombol pola/material yang sudah ada |
| **Arah papan lantai 90°** | Baris **arah papan** di panel editor (muncul hanya untuk lantai ber-pola kayu): `polaRot: 0` = papan membentang sepanjang sumbu **e** (bawaan), `polaRot: 1` = diputar **90°** sehingga membentang sepanjang sumbu **w** — nat, serat kayu, dan sambungan ujung ikut berputar karena semua koordinat dipetakan lewat satu fungsi `at(r,p)`. Ubin persegi tidak terpengaruh |
| **REFLEKSI (cermin) per objek** | Baris **refleksi objek** (`refleksi: true`, default OFF): OBJEK INI dicerminkan — warna sisi kiri & kanan bertukar sehingga arah cahaya/bentuknya terbalik (`drawBox`, bukan efek kamera). **PANTULAN** (`pantulan`, default ON) tetap terpisah di baris **pantulan**: bayangan cermin objek di permukaan lantai. Tombol global REFLEKSI di toolbar preview **dihapus** — pengaturan per objek |
| **ROTASI per objek (2026-10-29)** | Stepper **⟲ 30° / angka° / 30° ⟳** di panel editor objek (bukan toolbar). Field `rotasi` = derajat kelipatan **30** (0..330, 12 posisi); mengetuk angka mengembalikan ke 0°. Footprint (4 sudut alas) benar-benar diputar di dunia, jadi bbox, kedalaman, pita nada, dan rim ikut menyesuaikan. Data lama `rot: 0..3` (= 90° per langkah) otomatis dimigrasi ke `rotasi` saat dimuat. Sprite versi PIXEL hanya digambar pada 0/90/180/270 — sudut lain memakai geometri EDIT supaya tepi bitmap tidak bergerigi |
| **Panel editor** | Panel objek **transparan** (latar 58% + blur) agar objek di belakangnya tetap terlihat, dan bisa **digeser** dengan menyeret judul panel (ikon ⠿). Ukuran panel: lebar **268 px**, tinggi maksimum **layar − 12 px** (`100dvh`), isi panel bisa **digulir** (`.pbody`) sehingga semua baris terjangkau tanpa terpotong; header dan footer tidak ikut tergulir. Posisi panel selalu di-clamp agar utuh di dalam layar (juga setelah layar diputar/di-resize) |
| **💾 SIMPAN PERUBAHAN (panel editor)** | Tombol penuh di footer panel editor objek: menyimpan perubahan objek yang sedang diedit **saat itu juga** ke draf browser + file `scene.json` (tidak menunggu autosave 600 ms) dan mencatat satu langkah riwayat UNDO. Angka yang sedang diketik ikut di-commit. Label berubah **oranye ●** bila ada perubahan belum disimpan, lalu **hijau TERSIMPAN ✓** selama 2 detik. Tombol ini **tidak mengunci scene** — kunci tetap hanya lewat **SIMPAN & KUNCI** |
| **SALIN JSON** | Di modal EXPORT: satu ketuk menyalin seluruh `scene.json` ke clipboard (fallback `execCommand` bila Clipboard API diblokir), label berubah `TERSALIN ✓` |
| **Zoom in/out** | **Pinch in/out** di layar (kontinu ×0.5 – ×6, langkah piksel tetap integer) — satu-satunya kendali zoom. **Tombol ZOOM sudah dihapus**; level zoom hanya bisa dibaca di chip koordinat yang sekarang SELALU tampil. Kamera selalu mulai ×1 di (0,0) dan tidak disimpan (`VIEW_FIXED`, docs/01 §1b) |
| **Pan kamera** | Seret area kosong (mode apa pun) menggeser tengah kamera **tanpa batas — ruangan boleh dibawa ke mana pun di kanvas**. Kembali ke acuan dilakukan dengan tombol **⟳ REFRESH** (lihat baris berikut) |
| **⟳ REFRESH (kamera)** | Tombol **⟳ REFRESH** di toolbar (di bawah layar tablet, sebelum EXPORT): mengembalikan kamera ke **posisi (0,0) dengan zoom ×1**. Catatan 2026-10-29: saat halaman dibuka kamera masih di-`fitToScene` (docs/05 §3), jadi REFRESH memang mengubah komposisi; sebelumnya tombol ini juga memanggil fit sehingga hasilnya sama dengan keadaan awal dan terlihat tidak berfungsi. Tidak menyimpan apa pun (kamera tetap tidak pernah dipersist, docs/01 §1b) dan tidak menyentuh objek/scene |
| **↶ UNDO / ↷ REDO** | Tombol **↶ UNDO** dan **↷ REDO** di toolbar (sebelum EXPORT). Riwayat menyimpan **posisi scene** (objek + grup + meta), kedalaman **80 langkah**. Perubahan beruntun dalam **350 ms** digabung menjadi satu langkah (mis. menggeser ganda atau mengetik angka e/w tidak membanjiri riwayat). Aksi baru setelah UNDO **menghapus cabang redo**. UNDO/REDO mengosongkan pilihan objek aktif. Riwayat hanya di memori (tidak ditulis ke file/localStorage) dan mulai kosong setiap kali halaman dibuka — pemulihan data permanen tetap lewat 💾 SIMPAN & KUNCI dan cadangan/riwayat di panel ⟲ |
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
8. **Zoom & pan**: pinch-zoom kontinu (tanpa tombol zoom), drag satu jari di area kosong = pan, kamera selalu mulai ×1 (0,0) setiap halaman dimuat
9. **SIMPAN & KUNCI (objek saja, sementara)**: setelah disimpan, home mengunci layout objek (edit hanya dari Setting); badge jam simpan tampil di Editor Ruang; kunci selalu bisa dibuka lagi dari Setting; aplikasi menolak memuat scene dengan `meta.locked=false`. Ruangan tidak pernah bisa diedit dari aplikasi (docs/03 §0)
Persistensi app: file `scene.json` di internal storage; aset bawaan di-bundle sebagai fallback.
Mode edit di app hanya reachable dari Setting (bukan dari home) agar layar home tetap bersih.

## 6. Kontrak penerapan preview → aplikasi

1. Susun layout di preview (Mode EDIT), bebas zoom/pan untuk presisi
2. **SIMPAN & KUNCI** → scene ditandai `meta.locked = true` (+ `savedAt`)
3. **EXPORT** → dapat file `scene-terkunci.json`
4. Aplikasi **menolak** file dengan `meta.locked = false`; file terkunci dimuat: saat development via `assets/scene.json`, setelah app jadi lewat Setting → Import
5. Renderer apa pun (canvas 2D sekarang, Three.js/libGDX nanti) wajib mematuhi skema ini — tidak ada field liar di luar `style` objek
