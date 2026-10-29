// KATALOG OBJEK (preset)
//
// 2026-10-29 — RONDE 17. Permintaan user: "hapus semua objek yang dibuat dari
// referensi, kita buat sendiri saja sesuai instruksi, gaya dan tema yang
// sesuai dengan aplikasi ini".
//
//   • SELURUH preset hasil jiplak gambar referensi DIHAPUS, termasuk VERSI
//     PIXEL/sprite-nya: rak-buku, meja-guru, kursi-putar, papan-tulis,
//     papan-gabus, jendela, lampu-meja, tanaman-pot, tempat-sampah, laptop,
//     tumpukan-buku, kalkulator, bingkai-foto, gelas-pensil.
//   • Ronde 18 (2026-10-29): katalog diisi lagi dari NOL dengan objek buatan
//     sendiri. Objek #1 = JENDELA (dinding kanan / DT). Setiap objek baru
//     mengikuti:
//       - tema   : docs/05-TEMA-DIORAMA-HANGAT.md (diorama hangat, garis tepi)
//       - palet  : docs/07-PALET-REFERENSI.md (warna wajib dari palet)
//       - kontrak: docs/04-KONTRAK-RENDERER.md (geometri & urutan gambar)
//
// PENTING saat menulis bagian yang tipis (lipatan kain, bayangan halus, awan):
// pakai bt() — garis tepi 2 px pada bidang setipis 0.05 akan MENELAN warna
// aslinya dan tampak seperti balok hitam. Pelajaran dari tirai jendela ronde 18.
//
// Alat bantu menulis objek baru (semua angka bebas sampai 3 desimal):
//   b(e, w, z, se, sw, sz, style, bentuk?, puncak?, miring?)
//       satu bagian = satu balok (default) atau bentuk lain
//   bt(...)  = bagian TANPA garis tepi (lipatan kain, bayangan halus)
//   bp(...)  = bentuk 'profil' dengan siluet bebas [[u, z], …] (0..1)
//   beranim(x, { jenis, laju, besar, fase }) = beri animasi pada bagian
//
// Bentuk yang didukung renderer: balok, silinder, kerucut, bola, cakram, daun,
// profil. Aturan angka: SEMUA bagian ditulis eksplisit (tanpa loop/angka acak)
// supaya prototipe web dan APK menghasilkan gambar yang sama.
//
// ARAH KAMERA (penting saat menulis objek): kamera isometrik melihat dari arah
// +e dan +w. Muka yang harus terlihat pengguna (muka laci, layar, dsb.)
// diletakkan di sisi w/e BESAR.

import { ukuranSah } from './types'
import type { Animasi, SceneObject } from './types'

type Bentuk = 'balok' | 'silinder' | 'kerucut' | 'bola' | 'cakram' | 'daun' | 'profil'

interface Bahan {
  e: number
  w: number
  z: number
  se: number
  sw: number
  sz: number
  style: string
  bentuk?: Bentuk
  puncak?: number
  miring?: number
  /** kebulatan daun 0..1 (bentuk 'daun': 0 meruncing, 1 elips membulat) */
  bulat?: number
  /** siluet bebas untuk bentuk 'profil' — [u, z] 0..1 */
  profil?: [number, number][]
  anim?: Animasi
  /** false = tanpa garis tepi (dipakai untuk lipatan kain supaya halus) */
  tepi?: boolean
  /** true = bidang KACA LANGIT dinamis (langit + cuaca mengikuti jam) */
  langit?: boolean
}

export interface Preset {
  id: string
  nama: string
  ket: string
  pasang: 'lantai' | 'dinding-kanan' | 'dinding-kiri'
  lebar: number
  dalam: number
  bagian: Bahan[]
}

const b = (
  e: number, w: number, z: number,
  se: number, sw: number, sz: number,
  style: string,
  bentuk?: Bentuk, puncak?: number, miring?: number,
): Bahan => ({
  e, w, z, se, sw, sz, style,
  ...(bentuk ? { bentuk } : {}),
  ...(puncak !== undefined ? { puncak } : {}),
  ...(miring !== undefined ? { miring } : {}),
})

/**
 * DAUN MEMBULAT (permintaan user 2026-10-29: "buat daun membulat saja").
 * Sama seperti b(...,'daun', ...) tetapi dengan `bulat: 1` sehingga siluetnya
 * ELIPS (tumpul di kedua ujung), bukan meruncing seperti rumput.
 */
const bd = (
  e: number, w: number, z: number,
  panjang: number, tebal: number, lebar: number,
  style: string, miring: number,
): Bahan => ({ ...b(e, w, z, panjang, tebal, lebar, style, 'daun', undefined, miring), bulat: 1 })

/** bagian tanpa garis tepi (lipatan kain, bayangan halus) */
const bt = (
  e: number, w: number, z: number,
  se: number, sw: number, sz: number,
  style: string,
  bentuk?: Bentuk, puncak?: number,
): Bahan => ({ ...b(e, w, z, se, sw, sz, style, bentuk, puncak), tepi: false })

/** bagian bentuk 'profil' (siluet bebas [u, z] 0..1) */
const bp = (
  e: number, w: number, z: number,
  se: number, sw: number, sz: number,
  style: string, titik: [number, number][],
): Bahan => ({ ...b(e, w, z, se, sw, sz, style, 'profil'), profil: titik })

/** bagian KACA LANGIT: digambar sebagai langit dinamis, bukan warna statis */
const bk = (
  e: number, w: number, z: number,
  se: number, sw: number, sz: number,
  style: string,
): Bahan => ({ ...b(e, w, z, se, sw, sz, style), langit: true })

/** beri animasi ke satu bagian */
const beranim = (x: Bahan, a: Animasi): Bahan => ({ ...x, anim: a })

/** katalog objek — objek buatan sendiri, ditulis satu per satu. */
export const PRESETS: Preset[] = [
  // ================================================================ JENDELA ==
  // RONDE 19 — versi SIMPEL sesuai permintaan user: "saya hanya ingin membuat
  // Jendela". Tanpa tirai, tanpa batang gorden, tanpa matahari/awan, tanpa
  // palang silang. Isi hanya:
  //   1) empat batang kusen kayu (kiri, kanan, atas, bawah)
  //   2) satu bidang kaca biru langit
  //   3) satu papan ambang di bawah jendela
  // Dipasang di DINDING KANAN (DT). Kamera melihat dari +e/+w, jadi tebal
  // jendela tumbuh ke +w (dari permukaan dinding ke dalam ruangan).
  {
    id: 'jendela', nama: 'JENDELA',
    ket: 'kusen kayu + kaca + ambang bawah. Dipasang di dinding kanan.',
    pasang: 'dinding-kanan', lebar: 4.2, dalam: 0.5,
    bagian: [
      // --- satu bidang kaca (paling belakang, digambar lebih dulu) ---
      // KACA LANGIT DINAMIS: warna & isi kaca mengikuti jam perangkat
      // (fajar/pagi/siang/senja/malam) dan cuaca (cerah s/d badai).
      bk(0.26, 0.12, 2.46, 3.68, 0.05, 3.88, 'kaca-langit'),
      // --- empat batang kusen (di depan kaca) ---
      b(0.00, 0.04, 2.20, 0.26, 0.30, 4.40, 'kayu-tepi'),    // tiang kiri
      b(3.94, 0.04, 2.20, 0.26, 0.30, 4.40, 'kayu-tepi'),    // tiang kanan
      b(0.00, 0.04, 6.34, 4.20, 0.30, 0.26, 'kayu-tepi'),    // ambang atas
      b(0.00, 0.04, 2.20, 4.20, 0.30, 0.26, 'kayu-tepi'),    // ambang bawah
      // --- papan ambang menjorok ke ruangan ---
      b(0.00, 0.00, 2.06, 4.20, 0.36, 0.14, 'kayu-tepi'),
    ],
  },

  // ============================================================= MEJA KERJA ==
  // Permintaan user 2026-10-29: "buatkan objek meja kerja".
  // Pilihan user: alas LEBAR 3,0 x 1,2 tile, kayu TERANG (kayu-meja), dipasang
  // di lantai (bukan menempel dinding).
  //
  // Bentuk (ronde kedua, setelah render pertama dinilai kurang terbaca):
  //   - alas meja 3,0 x 1,2, tebal 0,16
  //   - kaki kayu gelap di sisi KIRI (2 buah)
  //   - LEMARI LACI (pedestal) di sisi KANAN setinggi kolong meja, dengan DUA
  //     muka laci + gagang logam — ini yang membuatnya terbaca sebagai meja
  //     kerja, bukan bangku
  //   - lis depan & belakang antara kaki
  // Tinggi total 1,60 tile, masih DI BAWAH ambang jendela (z 2,06), jadi meja
  // bisa berdiri di depan jendela tanpa menutupi kaca.
  //
  // Sumbu: kamera melihat dari +e/+w, jadi muka yang harus tampak (muka laci)
  // diletakkan di sisi w BESAR. Angka ditulis eksplisit, urutan `bagian` =
  // urutan gambar: kaki & pedestal dulu, alas paling akhir (paling depan).
  {
    id: 'meja-kerja', nama: 'MEJA KERJA',
    ket: 'Meja kerja 3,0 x 1,2: alas kayu terang, 2 kaki kiri, lemari 2 laci di kanan.',
    pasang: 'lantai', lebar: 3.0, dalam: 1.2,
    bagian: [
      // --- kaki kiri (0,16 x 0,16 x 1,44) ---
      b(0.06, 0.06, 0.00, 0.16, 0.16, 1.44, 'kayu-gelap'),   // kaki belakang kiri
      b(0.06, 0.98, 0.00, 0.16, 0.16, 1.44, 'kayu-gelap'),   // kaki depan kiri
      // --- lemari laci di sisi KANAN ---
      b(2.34, 0.10, 0.00, 0.60, 0.90, 1.44, 'walnut'),       // badan lemari (gelap, biar laci kontras)
      // --- lis antara kaki (di bawah alas) ---
      b(0.22, 0.10, 1.18, 2.12, 0.10, 0.26, 'kayu-gelap'),   // lis belakang
      b(0.22, 0.98, 1.18, 2.12, 0.10, 0.26, 'kayu-gelap'),   // lis depan
      // --- dua muka laci (sisi depan, w 1,06..1,14) ---
      b(2.38, 1.00, 0.78, 0.52, 0.14, 0.56, 'kayu-meja'),    // muka laci atas
      b(2.38, 1.00, 0.16, 0.52, 0.14, 0.56, 'kayu-meja'),    // muka laci bawah
      // --- gagang logam tiap laci ---
      b(2.56, 1.14, 0.98, 0.16, 0.05, 0.07, 'metal'),        // gagang atas (kuningan)
      b(2.56, 1.14, 0.36, 0.16, 0.05, 0.07, 'metal'),        // gagang bawah (kuningan)
      // --- alas meja (paling atas, digambar terakhir) ---
      b(0.00, 0.00, 1.44, 3.00, 1.20, 0.16, 'kayu-meja'),
    ],
  },

  // ============================================================ TANAMAN POT ==
  // Permintaan user 2026-10-29: "bisa buatkan tanaman yang ada di pot".
  // Jawaban user: pot keramik (awalnya KREM), dipasang di sebelah kanan meja,
  // masuk katalog + langsung dipasang. Ronde lanjutan (masih 2026-10-29):
  // user minta "buat tanaman lebih tinggi, warna pot buat lebih gelap" ->
  // pot diganti `bata` (#b0501f, keramik tanah liat gelap) dan batang
  // ditinggikan 1,20 -> 2,60 dengan daun ikut dipanjangkan ±40 %. Jenis tanaman dipilih oleh saya atas
  // permintaan user ("sarankan yang paling mudah dan bagus untuk dibuat
  // animasi") -> PALANG / DRACAENA: daun panjang tumbuh dari batang pendek.
  //
  // KENAPA PALANG: satu daun = satu bagian (`bentuk:'daun'`), jadi tiap daun
  // bisa diberi animasi `ayun` dengan `fase` sendiri. Hasilnya daun bergoyang
  // BERGANTIAN seperti tertiup angin, tanpa mesin animasi baru dan tanpa
  // mengubah data scene (lihat docs/04 §4b).
  //
  // Bentuk (22 bagian, urutan = urutan gambar; daun jauh digambar dulu):
  //   1) pot: `profil` — siluet bebas, menyempit di bawah + bibir tebal di atas
  //   2) tanah: balok `walnut` yang menonjol 0,10 di atas bibir pot
  //   3) batang: balok `kayu-tua` 0,12 x 0,12, dari dalam tanah
  //   4-22) DELAPAN BELAS daun MEMBULAT `daun-sage` / `daun-gelap` dalam tiga
  //         tingkat (bawah/tengah/atas), semuanya beranim `ayun`
  // Tinggi total ±6,4 tile (pot 1,34 + batang 3,40 + daun terpanjang 2,10),
  // jadi lebih tinggi daripada meja kerja (1,60) dan dari ambang jendela
  // (2,06). Ronde lanjutan: "buat daun membulat saja, batang lebih panjang"
  // -> daun memakai helper bd() (bentuk 'daun' + `bulat: 1` = elips tumpul)
  // dan batang dinaikkan 2,60 -> 3,40. Lalu "buat daun lebih lebat" ->
  // daun 9 -> 18 (lima di tingkat bawah, enam tengah, tujuh atas).
  //
  // Arah `miring` (derajat): 90 = tegak lurus ke atas, <90 = condong ke +e
  // (depan-kanan), >90 = condong ke -e (belakang-kiri). Lebar daun tumbuh ke w.
  {
    id: 'tanaman-pot', nama: 'TANAMAN POT',
    ket: 'Tanaman tinggi berdaun MEMBULAT & lebat (18 daun, 3 tingkat) dalam pot keramik gelap.',
    pasang: 'lantai', lebar: 1.8, dalam: 1.8,
    bagian: [
      // --- 1. badan pot (siluet: alas sempit, melebar ke atas) ---
      bp(0.05, 0.05, 0.00, 1.30, 1.30, 1.10, 'bata', [
        [0.30, 0.00], [0.70, 0.00],   // alas pot (sempit)
        [0.88, 0.36], [0.94, 0.80],   // naik & melebar
        [1.00, 0.96], [1.00, 1.00],   // tepat di bawah bibir
        [0.00, 1.00], [0.00, 0.96],   // sisi kiri
        [0.06, 0.80], [0.12, 0.36],
      ]),
      // --- 2. bibir pot (sedikit lebih lebar, supaya bentuk pot terbaca) ---
      b(0.00, 0.00, 1.06, 1.40, 1.40, 0.18, 'bata'),
      // --- 3. tanah di dalam bibir pot ---
      b(0.12, 0.12, 1.04, 1.16, 1.16, 0.12, 'walnut'),
      // --- 4. batang lebih panjang lagi (pucuk di z 4,56) ---
      b(0.64, 0.64, 1.16, 0.14, 0.14, 3.40, 'kayu-tua'),
      // --- 5-22. daun MEMBULAT, tiga tingkat supaya tajuk LEBAT ---
      // Permintaan user 2026-10-29: "buat daun lebih lebat" -> 9 -> 18 daun
      // dalam tiga tingkat mengikuti batang:
      //   TINGKAT BAWAH (z 2,38–2,55) : 5 daun kecil, sudut lebar (turun ke
      //                                samping) supaya batang tidak gundul
      //   TINGKAT TENGAH (z 3,32–3,52): 6 daun sedang
      //   TINGKAT ATAS   (z 4,24–4,46): 7 daun besar, yang tertinggi tegak
      // Urutan gambar: tingkat bawah dulu, tiap tingkat dari BELAKANG
      // (`miring` besar, condong -e) ke DEPAN (`miring` kecil, condong +e).
      // Semua `bulat: 1` (elips tumpul) dan beranim `ayun` dengan fase
      // berjarak supaya daun bergoyang bergantian, bukan serempak.
      //
      // --- TINGKAT BAWAH ---
      beranim(bd(0.66, 0.58, 2.38, 1.40, 0.18, 0.74, 'daun-gelap', 148),
        { jenis: 'ayun', laju: 0.16, besar: 0.9, fase: 0.05 }),
      beranim(bd(0.80, 0.70, 2.50, 1.25, 0.18, 0.68, 'daun-sage', 96),
        { jenis: 'ayun', laju: 0.16, besar: 0.9, fase: 0.28 }),
      beranim(bd(0.74, 0.80, 2.42, 1.30, 0.18, 0.70, 'daun-sage', 124),
        { jenis: 'ayun', laju: 0.16, besar: 0.9, fase: 0.46 }),
      beranim(bd(0.60, 0.86, 2.48, 1.22, 0.18, 0.66, 'daun-gelap', 28),
        { jenis: 'ayun', laju: 0.16, besar: 0.9, fase: 0.64 }),
      beranim(bd(0.52, 0.62, 2.55, 1.45, 0.18, 0.78, 'daun-sage', 52),
        { jenis: 'ayun', laju: 0.16, besar: 0.9, fase: 0.82 }),
      // --- TINGKAT TENGAH ---
      beranim(bd(0.62, 0.54, 3.32, 1.65, 0.20, 0.88, 'daun-gelap', 140),
        { jenis: 'ayun', laju: 0.17, besar: 0.85, fase: 0.12 }),
      beranim(bd(0.72, 0.78, 3.38, 1.58, 0.20, 0.86, 'daun-sage', 118),
        { jenis: 'ayun', laju: 0.17, besar: 0.85, fase: 0.34 }),
      beranim(bd(0.82, 0.64, 3.40, 1.52, 0.20, 0.82, 'daun-sage', 102),
        { jenis: 'ayun', laju: 0.17, besar: 0.85, fase: 0.52 }),
      beranim(bd(0.70, 0.86, 3.52, 1.48, 0.20, 0.80, 'daun-gelap', 20),
        { jenis: 'ayun', laju: 0.17, besar: 0.85, fase: 0.70 }),
      beranim(bd(0.60, 0.88, 3.44, 1.58, 0.20, 0.88, 'daun-sage', 66),
        { jenis: 'ayun', laju: 0.17, besar: 0.85, fase: 0.88 }),
      beranim(bd(0.52, 0.66, 3.50, 1.72, 0.20, 0.94, 'daun-gelap', 44),
        { jenis: 'ayun', laju: 0.17, besar: 0.85, fase: 0.24 }),
      // --- TINGKAT ATAS ---
      beranim(bd(0.70, 0.62, 4.30, 1.90, 0.20, 0.98, 'daun-gelap', 132),
        { jenis: 'ayun', laju: 0.18, besar: 0.8, fase: 0.55 }),
      beranim(bd(0.64, 0.76, 4.24, 1.70, 0.20, 0.90, 'daun-sage', 146),
        { jenis: 'ayun', laju: 0.18, besar: 0.8, fase: 0.70 }),
      beranim(bd(0.62, 0.58, 4.40, 2.00, 0.20, 1.04, 'daun-gelap', 110),
        { jenis: 'ayun', laju: 0.18, besar: 0.8, fase: 0.85 }),
      // daun tegak paling tinggi (ujung ±6,4)
      beranim(bd(0.62, 0.72, 4.46, 2.10, 0.20, 1.10, 'daun-sage', 92),
        { jenis: 'ayun', laju: 0.18, besar: 0.8, fase: 0.00 }),
      beranim(bd(0.68, 0.82, 4.32, 1.80, 0.20, 0.96, 'daun-gelap', 120),
        { jenis: 'ayun', laju: 0.18, besar: 0.8, fase: 0.30 }),
      beranim(bd(0.58, 0.74, 4.38, 1.85, 0.20, 1.00, 'daun-sage', 74),
        { jenis: 'ayun', laju: 0.18, besar: 0.8, fase: 0.15 }),
      beranim(bd(0.62, 0.80, 4.26, 1.50, 0.20, 0.86, 'daun-sage', 40),
        { jenis: 'ayun', laju: 0.18, besar: 0.8, fase: 0.42 }),
    ],
  },

  // ============================================================== RAK BUKU ==
  // Permintaan user 2026-10-29: "Continue" atas saran saya — dinding KIRI (DB)
  // masih kosong total padahal semua isi ruangan menumpuk di kanan (jendela,
  // meja, tanaman). Rak buku mengisi dinding kiri sekaligus jadi objek pertama
  // yang "berfungsi": rencana pemetaan objek->aplikasi menyebut rak buku/materi
  // = materi matematika SMA.
  //
  // PASANG DI DINDING KIRI (`pasang: 'dinding-kiri'`). Konsekuensi sumbu
  // (lihat App.tsx tambahPreset): untuk dinding kiri, `e` = KEDALAMAN menjorok
  // ke ruangan (0..0,60) dan `w` = LEBAR rak menyusuri dinding (0..3,00).
  // Kamera melihat dari +e/+w, jadi muka rak yang terlihat = sisi e besar.
  //
  // Bentuk (31 bagian, urutan = urutan gambar):
  //   1) papan belakang penuh (menempel dinding)
  //   2) dua sekat samping + alas bawah + dua papan tengah + papan atas
  //   3) BUKU sebagai bagian tersendiri — tinggi, tebal, dan warna berbeda
  //      (bata, biru, zaitun, krem, lav, salmon, gelap) supaya rak tidak
  //      tampak sebagai kotak kosong. Buku BERDIRI rapat di tiga papan
  //      (z 0,12 / 1,68 / 3,12) dan di tiap papan ada satu celah berisi
  //      TUMPUKAN buku berbaring (3 buah) — jadi rak terlihat terisi, bukan
  //      deretan balok berjarak.
  // Tinggi total 4,82 tile = di atas meja kerja (1,60) dan di bawah plafon.
  {
    id: 'rak-buku', nama: 'RAK BUKU',
    ket: 'Rak buku 3 tingkat di dinding kiri, 17 buku berwarna; pasang dinding-kiri.',
    pasang: 'dinding-kiri', lebar: 3.0, dalam: 0.6,
    bagian: [
      // --- 1. papan belakang (menempel dinding, digambar paling dulu) ---
      b(0.00, 0.00, 0.00, 0.06, 3.00, 4.82, 'kayu-tua'),
      // --- 2. rangka: sekat samping & papan ---
      b(0.00, 0.00, 0.00, 0.60, 0.08, 4.82, 'kayu-tua'),   // sekat kiri
      b(0.00, 2.92, 0.00, 0.60, 0.08, 4.82, 'kayu-tua'),   // sekat kanan
      b(0.00, 0.08, 0.00, 0.60, 2.84, 0.12, 'kayu-meja'),  // alas bawah
      b(0.00, 0.08, 1.56, 0.60, 2.84, 0.12, 'kayu-meja'),  // papan tingkat 1
      b(0.00, 0.08, 3.00, 0.60, 2.84, 0.12, 'kayu-meja'),  // papan tingkat 2
      b(0.00, 0.00, 4.68, 0.62, 3.00, 0.14, 'kayu-meja'),  // papan atas
      // --- 3. BUKU: tiga papan diisi PENUH, berdiri rapat ---
      // Angka ditulis eksplisit (tanpa loop) supaya renderer APK bisa meniru persis.
      b(0.10, 0.14, 0.12, 0.36, 0.30, 1.30, 'buku-bata'),
      b(0.10, 0.46, 0.12, 0.36, 0.26, 1.16, 'buku-biru'),
      b(0.10, 0.74, 0.12, 0.36, 0.28, 1.24, 'buku-zaitun'),
      b(0.10, 1.04, 0.12, 0.36, 0.32, 1.06, 'buku-krem'),
      b(0.10, 1.38, 0.12, 0.36, 0.27, 1.20, 'buku-lav'),
      b(0.10, 1.67, 0.12, 0.36, 0.29, 1.12, 'buku-salmon'),
      b(0.10, 1.98, 0.12, 0.36, 0.30, 1.28, 'buku-gelap'),
      b(0.10, 2.30, 0.12, 0.36, 0.26, 1.18, 'buku-bata'),
      b(0.10, 0.14, 1.68, 0.36, 0.28, 1.24, 'buku-zaitun'),
      b(0.10, 0.44, 1.68, 0.36, 0.32, 1.06, 'buku-krem'),
      b(0.10, 0.78, 1.68, 0.36, 0.27, 1.20, 'buku-lav'),
      b(0.10, 1.07, 1.68, 0.36, 0.29, 1.12, 'buku-salmon'),
      b(0.10, 1.38, 1.68, 0.36, 0.30, 1.28, 'buku-gelap'),
      b(0.10, 1.70, 1.68, 0.36, 0.26, 1.18, 'buku-bata'),
      b(0.10, 1.98, 1.68, 0.36, 0.28, 1.30, 'buku-biru'),
      b(0.10, 2.28, 1.68, 0.36, 0.32, 1.16, 'buku-zaitun'),
      b(0.10, 0.14, 3.12, 0.36, 0.26, 1.16, 'buku-biru'),
      b(0.10, 0.42, 3.12, 0.36, 0.28, 1.24, 'buku-zaitun'),
      b(0.10, 0.72, 3.12, 0.36, 0.32, 1.06, 'buku-krem'),
      b(0.10, 1.06, 3.12, 0.36, 0.27, 1.20, 'buku-lav'),
      b(0.10, 1.35, 3.12, 0.36, 0.29, 1.12, 'buku-salmon'),
      b(0.10, 1.66, 3.12, 0.36, 0.30, 1.28, 'buku-gelap'),
      b(0.10, 1.98, 3.12, 0.36, 0.26, 1.18, 'buku-bata'),
      b(0.10, 2.26, 3.12, 0.36, 0.28, 1.30, 'buku-biru'),
    ],
  },
]

/**
 * Gaya (material) yang dipakai bagian LANGIT pada katalog.
 * Dipakai migrasi scene lama: objek yang tersimpan SEBELUM fitur langit ada
 * belum punya field `langit`, jadi kacanya tergambar biru statis tanpa
 * matahari/awan. normalisasiScene() memakai daftar ini untuk menyalakannya.
 */
export function gayaLangit(): Set<string> {
  const out = new Set<string>()
  for (const p of PRESETS) for (const b of p.bagian) if (b.langit) out.add(b.style)
  return out
}

export function presetOf(id: string): Preset | undefined {
  return PRESETS.find(p => p.id === id)
}

const snap = (v: number) => Math.round(v * 1000) / 1000

/** pecah satu preset menjadi objek-objek scene (satu objek per bagian) */
export function buatPreset(opts: {
  preset: Preset
  e: number
  w: number
  z: number
  grup: string
  nama: string
  urutanAwal: number
  idAwal: string
}): SceneObject[] {
  const { preset, grup, nama, urutanAwal, idAwal } = opts
  const e0 = snap(opts.e)
  const w0 = snap(opts.w)
  const z0 = snap(opts.z)
  return preset.bagian.map((bag, i) => ({
    id: `${idAwal}-${i + 1}`,
    label: `${nama} ${i + 1}`,
    pos: { e: snap(e0 + bag.e), w: snap(w0 + bag.w), z: snap(z0 + bag.z) },
    size: {
      e: ukuranSah(bag.se),
      w: ukuranSah(bag.sw),
      z: ukuranSah(bag.sz),
    },
    style: bag.style,
    ...(bag.bentuk ? { bentuk: bag.bentuk } : {}),
    ...(bag.puncak !== undefined ? { puncak: bag.puncak } : {}),
    ...(bag.miring !== undefined ? { miring: bag.miring } : {}),
    ...(bag.bulat !== undefined ? { bulat: bag.bulat } : {}),
    ...(bag.profil ? { profil: bag.profil } : {}),
    ...(bag.anim ? { anim: bag.anim } : {}),
    ...(bag.tepi === false ? { tepi: false } : {}),
    ...(bag.langit ? { langit: true } : {}),
    preset: preset.id,
    app: null,
    layer: 'main' as const,
    grup,
    grupNama: nama,
    urutan: urutanAwal + i,
  }))
}

// Alat bantu di atas dipakai saat menambah objek baru; `b`/`bt`/`bp`/`beranim`
// sengaja tetap ada walau katalog kosong supaya penulisan preset berikutnya
// tidak perlu mengubah kontrak file ini.
export type { Bahan, Bentuk }
