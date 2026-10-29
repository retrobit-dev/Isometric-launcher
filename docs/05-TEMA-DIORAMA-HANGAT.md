# 05 — TEMA "DIORAMA HANGAT" (pixel-art, 32-bit)

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

| Peran | Warna | Catatan |
|---|---|---|
| latar (void) | `#48100f` | marun-tua hangat, 27–37% luas gambar referensi |
| dinding teduh (DB) | `#dd8b3f` | muka kiri |
| dinding cahaya (DT) | `#f2c17b` | muka kanan |
| plint / kaki dinding | `#8d4a1d` · `#a85f26` | |
| ubin lantai | `#e08a3a` `#d47c2c` `#da8434` | nat `#a8541c` |
| tepi slab (deck) | `#c07933` · `#9a5622` | sambungan `#8f4a1b`, bibir `#d98f4a` |
| balok atas & tiang | `#7d4318` · `#a85f26` · `#8d4a1d` | pasak `#d9944a` |
| tinta / outline | `#4a1e0a` | dicampur 42% ke warna isi |
| sorot | `#f7dfae` · `#faddab` | kertas, kain, bibir bidang |

Sumber kebenaran warna: `prototype/src/iso/palette.ts`. Salinan untuk renderer
offline & APK: `docs/04-palet.json` — dibuat dengan `node gen_palet.mjs` dan
**diuji sama** oleh `tests/run-tema.mjs` (jadi tidak bisa lagi berbeda diam-diam).

## 2. Aturan gambar (yang membuat terasa "diorama")

1. **Garis tepi gelap** di setiap bidang (outline). Warna = isi dicampur 42%
   ke tinta `#4a1e0a`, tebal 2 px internal. Matikan per objek dengan `tepi:false`.
2. **Bibir terang** di dua sisi belakang bidang atas setiap balok — membuat
   objek terasa kena cahaya, bukan datar.
3. **Tiga nada per material**: `top` terang, `right` sedang, `left` teduh.
   Urutan ini diuji otomatis (`top > right >= left`).
4. **Dinding**: pita nada (bukan gradien halus) — terang di atas, teduh di
   bawah; plint kayu di kaki; **cornice** balok kayu di puncak; **tiang** kayu
   di kedua ujung + pasak bundar. Ini ciri paling khas referensi.
5. **Lantai**: ubin persakota besar, nat tipis, bayangan ambient 3 pita di kaki
   dinding, dan **tepi slab = papan kayu** (sambungan vertikal + bibir terang).
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
