# 07 · Palet Referensi 342 Warna + Latar Hitam OLED

> ## ⚠ DIBATALKAN SEBAGIAN — RONDE 38 (2026-10-29)
>
> Dokumen ini mencatat **sejarah** palet 342 warna (ronde 13). Permintaan user
> *"untuk palette warna gunakan referensi ini saja"* **dicabut sendiri oleh
> user** di ronde 38, ketika ia memilih **ENDESGA 32** untuk gaya retro
> pixel-art. Palet yang berlaku sekarang: **`docs/08-PALET-RETRO-DITHER.md`**.
>
> Yang MASIH berlaku dari dokumen ini:
> * latar belakang = **hitam OLED `#000000`**;
> * grid 18 × 19 di bawah tetap dipakai sebagai **"niat desain"** (kolom hue,
>   baris kecerahan), tetapi setiap selnya kini dibulatkan ke palet Endesga
>   (`palet-referensi.ts` → `docs/04-palet-referensi.json`).

Permintaan user 2026-10-29:

> "untuk pallete warna gunakan referensi ini saja."
> "latar belakang buat hitam oled saja."

Dua gambar referensi dipakai:

| berkas | isi |
| --- | --- |
| `5cd0814252f356b311635d5c6067e48d.jpg` | poster asli **COLOR PALETTE — "Rainbow colors with brown and gray"** (grid lengkap: 18 kolom × 19 baris) |
| `949cadaf3bbd2181248bfacecc90cd5e.jpg` | versi ringkas (16 kolom × 12 baris) tanpa kolom cokelat/abu |

Palet final **diambil dari poster asli**, karena hanya poster itu yang punya
kolom **cokelat** dan **abu-abu** (persis seperti judulnya). Versi ringkas
dipakai sebagai pemeriksa silang.

---

## 1. Cara angkanya didapat (bukan dikira-kira)

`tools/ekstrak_palet.py` (lihat lampiran skrip di commit) melakukan:

1. deteksi grid: piksel yang bukan kertas putih dijadikan profil kolom/baris,
   sehingga ketemu pitch **33,06 px** (kolom) dan **25,6 px** (baris);
2. setiap kotak diambil **median** piksel di bagian tengahnya (bukan rata-rata),
   supaya gradasi/tepi JPEG tidak menggeser warna;
3. hasil: **342 warna, semuanya unik** — tidak ada satu pun yang kembar, jadi
   ini benar-benar palet referensi, bukan tafsiran.

Grid-nya disusun dua sumbu:

- **18 kolom = keluarga warna (hue)**, kiri → kanan:
  oranye, jingga, kuning, limo, hijau, toska, sian, biru-langit, biru,
  biru-ungu, ungu, magenta, merah-muda, rose, merah, bata, **cokelat**, **abu-abu**
- **19 baris = tingkat kecerahan**, atas paling terang (baris 1 hampir putih)
  sampai bawah paling gelap (baris 19 hampir hitam).

## 2. Di mana datanya tinggal

| berkas | peran |
| --- | --- |
| `prototype/src/iso/palet-referensi.ts` | **sumber tunggal** 342 warna + `kePalet()`, `gelap()`, `terang()`, `posisi()`, `OLED` |
| `docs/04-palet-referensi.json` | salinan untuk renderer offline & dokumentasi |
| `docs/04-palet.json` | material/lantai/dinding hasil kuantisasi (dipakai `tools/render_scene.py`) |

Regenerasi JSON setiap kali palet berubah:

```bash
cd prototype && node ../tools/gen_palet.mjs
```

## 3. Aturan pemakaian — semua warna harus dari palet

Sebelumnya tema "diorama hangat" memakai hex karangan sendiri dan mencampur
warna bebas untuk bayangan (`gelapkan` = campur tinta, `terangkan` = campur
putih). Itu menghasilkan warna di luar palet. Sekarang:

- **`kePalet(hex)`** memetakan warna apa pun ke palet. Pemetaannya mengikuti
  susunan paletnya sendiri: **hue → kolom**, **kecerahan → baris**.
  - saturasi sangat rendah → kolom **abu-abu** (18);
  - krem / cokelat pudar (hue hangat ±30°) → kolom **cokelat** (17);
  - selain itu → kolom pelangi yang hue-nya paling dekat.
  - Alasan bukan "jarak Lab terdekat": percobaan pertama memakai cara itu dan
    krem `#f7e6c4` justru jatuh ke putih-pink kolom 1, sehingga seluruh kayu
    diorama berubah **pink**. Cara hue+terang hasilnya stabil.
- **`gelap(hex, n)` / `terang(hex, n)`** tidak mencampur warna, tetapi turun/naik
  `n` tingkat **di kolom yang sama**, dan hasilnya dijaga benar-benar lebih
  gelap/terang (kolom cokelat & abu kadang tidak monoton karena hue bergeser).
  Jadi shading bergaya *cell-shading*: hanya 19 tingkat, bukan gradasi.
- **Garis tepi** sekarang satu tinta tetap `#341b10` (cokelat baris 18), bukan
  "warna gelap turunan". Sebelumnya tepi objek terang bisa berubah jadi pink.
- **Urutan nada material** dijamin `atas > kanan > kiri` (`left` diturunkan dari
  `right`, bukan dihitung sendiri dari `top`).

Warna `#ff00ff` (magenta) sengaja dibiarkan **di luar** palet: itu penanda gaya
tak dikenal supaya kesalahan data langsung terlihat, bukan bug tersembunyi.

## 4. Latar belakang hitam OLED

- kanvas: `PAL.void = #000000` (sebelumnya marun `#48100f`);
- UI: `html, body, #root`, bezel `.tablet`, `.screen`, `.cam` → `#000000`;
- konsekuensi di panel OLED: bingkai di sekitar diorama benar-benar mati, jadi
  yang tampak hanya diorama yang menyala (cocok untuk dipakai malam hari).

## 5. Hasil sekarang

Dari 342 warna, **99 warna** dipakai diorama (ruangan + material objek +
lantai/dinding). Sisanya tetap tersedia untuk pilihan warna objek di panel
PALET. Lembar pemeriksa: `/home/user/palet_referensi.png`;
hasil render: `/home/user/cek_palet.png`.

## 6. Uji

```bash
cd prototype && npx tsc --noEmit && node tests/run-palet.mjs
```

`run-palet.mjs` memeriksa: bentuk grid 18×19 = 342 unik, `gelap()/terang()`
monoton dan tidak keluar palet, pemetaan krem tetap hangat (bukan pink),
abu tetap abu, seluruh isi `PAL`/`MATERIALS`/`FLOOR_MATERIALS`/`WALL_MATERIALS`
berada di dalam palet (kecuali `#000000` dan penanda bug), serta
`docs/04-palet*.json` sama dengan modul TypeScript.
