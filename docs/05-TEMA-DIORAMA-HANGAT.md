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
   tetap pixel-art tajam saat diperbesar ×2,25 ke 2560×1600.

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
