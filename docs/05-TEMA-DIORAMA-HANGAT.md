# 05 — TEMA "DIORAMA HANGAT" (pixel-art, 32-bit)

> **PEMBARUAN RONDE 38 — 2026-10-29 (berlaku sekarang).**
> Permintaan user: *"untuk semuanya bisakah style nya dan palette warna nya
> dibuat lebih ke arah retro pixel art?"* Jawaban user saat ditanya:
> **ciri = DITHERING · palet = ENDESGA 32 · cakupan = SEMUA bagian**.
>
> Akibatnya:
> 1. Aturan ronde 13 ("palet referensi 342 warna saja") **DIBATALKAN user**.
>    Sekarang hanya **32 warna Endesga** yang boleh muncul di kanvas
>    (`docs/08-PALET-RETRO-DITHER.md`, `docs/04-palet-retro.json`).
> 2. Gradasi halus (campuran warna) **dihapus** dari jalur gambar, karena
>    campuran menghasilkan warna di luar palet. Penggantinya **dithering
>    Bayer 4×4** antara dua warna palet (`prototype/src/iso/dither.ts`).
> 3. Latar luar tetap **hitam OLED `#000000`** (aturan ronde 13 tidak dicabut).
> 4. Tanpa outline objek (aturan ronde 19) **masih berlaku**.
>
> Hex "diorama hangat" di bawah tinggal catatan niat desain; warna yang
> dipakai sekarang ada di `prototype/src/iso/palette.ts`.

Ditulis 2026-10-29 atas permintaan user: *"saya ingin style dan gaya dan tema
pixelnya seperti pada gambar referensi"* (`6d39f1fadb95515d53d2f48449d4c809.jpg`
— tiga diorama: toko roti, toko ramuan, kedai).

Referensi itu menentukan **cara menggambar**. Referensi sebelumnya
(`Screenshot_20261029_072237.jpg`) tetap menentukan **objek apa** yang ada di
ruangan guru. Jadi: objek tidak berubah, gayanya yang berubah.

---

## 1. Warna

Semua warna diambil dari piksel gambar referensi (kuantisasi median-cut), lalu
disusun menjadi SATU keluarga oranye–cokelat. Tidak ada biru/ungu dingin di
bangunan; warna dingin hanya boleh muncul sebagai aksen kecil (kaca jendela,
daun, satu-dua punggung buku).

| Peran | Warna (Endesga 32) | Catatan |
|---|---|---|
| latar (void) | `#000000` | hitam OLED murni (tetap) |
| dinding teduh (DB) | `#b86f50` | muka kiri |
| dinding cahaya (DT) | `#e4a672` | muka kanan |
| sorot dinding | `#ead4aa` | krem |
| plint / kaki dinding | `#733e39` · `#b86f50` | |
| ubin lantai | `#d77643` `#b86f50` `#c28569` | nat `#733e39` |
| tepi slab (deck) | `#733e39` · `#3e2731` | bibir `#e4a672` |
| balok atas & tiang | `#733e39` · `#b86f50` · `#3e2731` | pasak `#e8b796` |
| tinta gelap (tidak dipakai: outline mati) | `#3e2731` | dahulu `#4a1e0a` |
| sorot / kertas | `#ead4aa` · `#e8b796` | |

Warna objek memakai **tangga nada** yang sama supaya bayangan tetap satu
keluarga: cokelat `#3e2731 → #733e39 → #b86f50 → #c28569 → #e4a672 → #e8b796
→ #ead4aa`, oranye `#be4a2f → #d77643 → #f77622 → #feae34 → #fee761`, hijau
`#193c3e → #265c42 → #3e8948 → #63c74d`, biru `#181425 → #262b44 → #3a4466 →
#5a6988 → #8b9bb4 → #c0cbdc → #ffffff`, sian `#124e89 → #0099db → #2ce8f5`,
merah `#a22633 → #e43b44 → #f6757a`, ungu `#68386c → #b55088`.

Sumber kebenaran warna: `prototype/src/iso/palette.ts`. Salinan untuk renderer
offline & APK: `docs/04-palet.json` — dibuat dengan `node gen_palet.mjs` dan
**diuji sama** oleh `tests/run-tema.mjs` (jadi tidak bisa lagi berbeda diam-diam).

## 2. Aturan gambar (yang membuat terasa "diorama")

1. **DITHERING** — peralihan antar nada digambar sebagai **pola kotak Bayer
   4×4** (mis. 25% lalu 75%), bukan gradasi warna. Dipasang di: kaki dinding,
   bayangan lantai di kaki dinding, batas pita nada dinding & objek, batas
   terang/gelap silinder, badan bola, pita langit, halo matahari/bulan, tepi
   awan. Modul: `prototype/src/iso/dither.ts` (+ cermin di `render_scene.py`).
   **Tidak ada outline objek** (aturan ronde 19 tetap).
2. **Bibir terang** di dua sisi belakang bidang atas setiap balok — membuat
   objek terasa kena cahaya, bukan datar.
3. **Tiga nada per material**: `top` terang, `right` sedang, `left` teduh.
   Urutan ini diuji otomatis (`top > right >= left`).
4. **Dinding**: pita nada (bukan gradien halus) — terang di atas, teduh di
   bawah; plint kayu di kaki; **cornice** balok kayu di puncak; **tiang** kayu
   di kedua ujung + pasak bundar. Ini ciri paling khas referensi.
5. **Lantai**: ubin persakota besar, nat tipis, **bayangan ambient 3 pita
   ber-dither** di kaki dinding, dan **tepi slab = papan kayu** (sambungan
   vertikal + bibir terang).
6. **Komposisi**: diorama digambar UTUH dalam bingkai (tepi papan & balok atas
   kelihatan), tidak dipotong tepi layar. Lihat §3.
7. Semua tepi dibulatkan ke piksel dan alpha di-threshold (`crispify`) supaya
   tetap pixel-art tajam saat diperbesar ×4,5 ke 2560×1600.

## 3. Komposisi otomatis (`fitToScene`)

Dulu kamera selalu ×1 di (0,0) sehingga yang terlihat hanya sudut ruangan.
Sekarang, **saat aplikasi dibuka**, kamera menghitung sendiri dari isi scene.
Tombol **⟳ REFRESH** tidak memakai cara ini lagi: sejak 2026-10-29 REFRESH
mengembalikan kamera ke **acuan ×1 di (0,0)** (permintaan user), karena
memanggil fit ulang saat kamera sudah ter-fit membuat tombol itu terasa
"tidak berfungsi" — hasilnya identik dengan keadaan semula.

Perhitungan saat dibuka:

- kotak pembungkus semua objek → `de × dw` dan tinggi maksimum `zmax`;
- `HW = min( IW·0,95/(de+dw), IH·0,95/((de+dw)/2 + zmax) )`;
- titik tengah = pusat kotak, digeser `zmax/2` supaya bagian dinding tetap
  di tengah bingkai.

Hasilnya deterministik (bukan angka mati) dan sama di web maupun renderer
offline (`fit_scene()` di `render_scene.py`). Pan & pinch tetap bebas.

## 4. Yang sudah / belum

Sudah: palet, outline, bibir terang, dinding (pita + plint + cornice + tiang +
pasak), lantai (ubin + ambient + deck papan), komposisi utuh, UI panel hangat.

Belum (butuh iterasi bentuk per objek): meja guru masih terbaca sebagai
"konter L", kursi putar kecil dan tertutup meja, tirai jendela terlalu tipis,
warna punggung buku masih terlalu biru, dan ruangan masih terasa lengang
dibanding referensi yang padat perabot.


---

## Ronde 41 — tema aktif: interior POKÉMON NDS

Tema "diorama hangat" dan "Tudor" digantikan arahan user 2026-10-29: *"saya
hanya ingin style, warna, dan tema seperti gambar referensi atau buat saja
seperti game Pokémon NDS"*. Yang dipakai sekarang: plester krem rata, wainscot
kayu, lantai papan, batas nada keras, outline 2 px, kanvas 568×355.
Lihat `docs/08` §4.

---

## Ronde 42 — latar diulang dari nol, lantai diganti ubin

User 2026-10-29: *"Hapus semua objek dan buat ulang latar, saya tidak suka
lantainya."* Tindakan:

- 71 objek lama (meja kerja, rak buku, tanaman pot, jendela) **dihapus**. Scene
  sekarang hanya 3 objek latar: `lantai` (20×20, z 0.2), `dinding-db` (0.2×20,
  z 25), `dinding-dt` (20×0.2, z 25).
- Lantai papan (`lantai-papan-batu`) **ditolak**; diganti material baru
  **`lantai-ubin-nds`**: `pattern:'ubin'`, nada `#f1e1bb / #e4b98a / #dadab8`,
  nat `#c99b6a`, `pola:'cek'`, `ubinUkuran:2` → papan catur 10×10 ubin besar
  (bukan 20×20 yang terlalu ramai di 568 px). Ubin aksen dihapus.
- Material baru ini jadi `FLOOR_DEFAULT`; `render_scene.py` ikut menghormati
  `pola` + `ubinUkuran` supaya pratinjau Python identik dengan aplikasi.
- `meta.paksaMuat` ditambahkan agar scene kosong dari file menang atas draf
  lama di tab browser yang masih terbuka.
- Yang **tidak** berubah: ukuran kanvas 568×355, `PIKSEL`, `DENS`, `SCALE`,
  serta seluruh sistem koordinat (`TILE_W/H`, `Z_PX`, origin `(e,w,z)`).

---

## Ronde 44 — tampilan diperbaiki, semua alat tetap

Arahan user: *"pertahankan semua alat di sandbox, perbaiki tampilannya saja."*
Tidak ada fitur yang dibuang; yang berubah hanya rupa ruangan.

1. **Proyeksi datar** (`PROYEKSI_DATAR` di `space.ts`): nat lantai mendatar &
   tegak seperti interior Pokémon NDS; dinding belakang satu bidang tegak.
   Satu saklar untuk kembali ke isometrik lama.
2. **Dinding disederhanakan**: percobaan ronde 41–43 (wainscot berpapan +
   tiang + pasak) terbaca seperti *pagar*, bukan dinding kamar. Sekarang:
   bidang polos + plint kayu + garis nada tipis + garis puncak.
3. **Lantai** `lantai-kayu-nds`: papan panjang (8 ubin) satu nada
   `#8a5a3a`, nat `#5f3d28`, tanpa garis serat — sebelumnya terbaca seperti
   bata karena papan pendek dan garis serat menumpuk.
4. **Bayangan kaki dinding** dipersempit ke 1 ubin dan hanya di tepi belakang
   (di proyeksi datar pita samping terbaca sebagai garis gelap).
5. Scene: 3 objek latar (lantai 14×20 + dinding belakang + dinding samping).
   Perabot, tokoh, dan hiasan sengaja belum ada — tinggal ditambah dari panel
   editor.

---

## Ronde 45 — kembali ke isometrik

Arahan user 2026-10-29: *"buat isometric seperti sebelumnya"*. Percobaan
proyeksi datar (ronde 43–44) dibatalkan; kode proyeksi isometrik 2:1 dipulihkan
persis seperti commit `d876b4d`. Percobaan datar tetap tersimpan di riwayat git
(`df55185`) bila suatu saat ingin dicoba lagi.

Yang tetap dipakai dari ronde 43–44:
- material **`lantai-kayu-nds`** (papan kayu panjang satu nada) tetap ada di
  daftar material lantai, jadi bisa dipilih kapan saja;
- dukungan **scene kosong** (0 objek) di aplikasi dan penyimpanan;
- `tools/render_scene.py` kini menggambar objek ber-peran lantai/dinding
  walaupun tanda `latar` tidak ada — dulu PNG uji bisa kosong padahal layar
  berisi ruangan.

---

## Ronde 46 — langit malam cerah dan "titik air"

User: *"untuk malam cerah kenapa ada titik-titik air?"* Jawabannya: itu **bintang**,
tetapi cara menggambarnya salah sehingga terbaca seperti embun/rintik:

| Masalah | Sebelum | Sesudah |
|---|---|---|
| jumlah bintang | 34 butir tersebar rata seluruh bidang | 12 butir, hanya di 62% atas |
| ukuran | kotak 1–2 px menyala terus | 1 px, sebagian besar berkedip padam |
| warna | `#ffffff` (bukan anggota palet 51) | `#fff9e3` terang / `#dadab8` redup |
| halo bulan | dither 18% + 48% (bintik putih di sekitar bulan) | dither 10% + 30% |
| pita langit malam | `#1a3121` (hijau) di zenith, `#66b6cf` (biru terang) di horizon | `#2b1a12` → `#2e4a63` → `#3f7fa3` |

Akibatnya kaca jendela pada malam cerah sekarang gelap dan tenang, bukan
bertabur titik putih. Cuaca lain (gerimis/hujan/badai) tidak berubah.
