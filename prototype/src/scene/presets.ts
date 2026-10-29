// KATALOG OBJEK (preset) — dibangun ulang dari referensi user 2026-10-29
// (Screenshot_20261029_072237.jpg: ruang kerja guru isometrik pastel).
//
// 2026-10-29 (permintaan user "hapus aturan 32 piksel ... objek dibuat identik"):
//   • ATURAN 32 PIKsel DIHAPUS. Dulu semua angka dipaksa kelipatan 0.1 tile
//     (= 3.2 px, karena 1 tile = 32 px) sehingga detail kecil tidak mungkin.
//     Sekarang angka BEBAS sampai 3 desimal (0.001 tile ≈ 0.03 px).
//   • Semua preset ditulis ulang: proporsi diukur dari gambar referensi
//     (1 tile = 32 px internal = 56.7 px di gambar referensi).
//   • Preset boleh memakai kelima bentuk renderer: balok, silinder, kerucut,
//     bola, cakram (+ daun), dan garis tepi 1px yang meniru outline referensi.
//
// Aturan angka: SEMUA bagian ditulis eksplisit (tanpa loop/angka acak) supaya
// prototipe web dan APK menghasilkan gambar yang sama
// (lihat docs/04-KONTRAK-RENDERER.md).

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
  /** siluet bebas untuk bentuk 'profil' — [u, z] 0..1 */
  profil?: [number, number][]
  anim?: Animasi
  /** false = tanpa garis tepi (dipakai untuk lipatan tirai supaya halus) */
  tepi?: boolean
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

/** siluet awan (alas rata, tiga gumpalan) — dipakai dua kali di jendela */
const AWAN: [number, number][] = [
  [0.00, 0.10], [0.04, 0.30], [0.12, 0.40], [0.16, 0.66], [0.28, 0.82],
  [0.42, 0.86], [0.48, 1.00], [0.62, 0.98], [0.72, 0.80], [0.84, 0.72],
  [0.92, 0.50], [0.98, 0.24], [0.94, 0.08], [0.70, 0.02], [0.40, 0.00],
  [0.14, 0.02],
]

/** beri animasi ke satu bagian */
const beranim = (x: Bahan, a: Animasi): Bahan => ({ ...x, anim: a })

/** satu buku berdiri di rak */
const buku = (e: number, z: number, tebal: number, tinggi: number, style: string, w = 0.2): Bahan =>
  b(e, w, z, tebal, 0.62, tinggi, style)

export const PRESETS: Preset[] = [

  // ================================================================ RAK BUKU ==
  {
    id: 'rak-buku', nama: 'RAK BUKU',
    ket: 'rak kayu terbuka 2 tingkat, buku berdiri rata bawah',
    pasang: 'lantai', lebar: 4.2, dalam: 1.0,
    bagian: [
      b(0, 0, 0, 0.18, 0.95, 3.40, 'kayu-tepi'),           // dinding kiri
      b(4.02, 0, 0, 0.18, 0.95, 3.40, 'kayu-tepi'),        // dinding kanan
      b(0, 0, 3.22, 4.20, 0.95, 0.18, 'kayu-meja'),        // papan atas
      b(0, 0, 0, 4.20, 0.95, 0.18, 'kayu-meja'),           // alas bawah
      b(0.14, 0.12, 0.12, 3.92, 0.06, 3.12, 'kayu-gelap'),// panel belakang
      b(0.18, 0.02, 1.62, 3.84, 0.90, 0.14, 'kayu-meja'), // papan tengah
      b(0.18, 0.00, 1.56, 3.84, 0.06, 0.10, 'kayu-gelap'),// bibir papan tengah
      b(0.34, 0.22, 0.18, 0.26, 0.6, 0.94, 'buku-krem'),
      b(0.63, 0.22, 0.18, 0.3, 0.6, 1.06, 'buku-gelap'),
      b(0.96, 0.22, 0.18, 0.24, 0.6, 0.88, 'buku-zaitun'),
      b(1.23, 0.22, 0.18, 0.32, 0.6, 1.1, 'buku-biru'),
      b(1.58, 0.22, 0.18, 0.26, 0.6, 0.96, 'buku-krem'),
      b(1.87, 0.22, 0.18, 0.28, 0.6, 0.9, 'buku-krem'),
      b(2.18, 0.22, 0.18, 0.3, 0.6, 1.02, 'buku-gelap'),
      b(2.51, 0.22, 0.18, 0.26, 0.6, 0.92, 'buku-krem'),
      b(2.8, 0.22, 0.18, 0.32, 0.6, 1.04, 'buku-zaitun'),
      b(3.15, 0.22, 0.18, 0.24, 0.6, 0.88, 'buku-biru'),
      b(0.34, 0.22, 1.76, 0.28, 0.6, 1.14, 'buku-gelap'),
      b(0.65, 0.22, 1.76, 0.24, 0.6, 0.98, 'buku-krem'),
      b(0.92, 0.22, 1.76, 0.32, 0.6, 1.22, 'buku-biru'),
      b(1.27, 0.22, 1.76, 0.26, 0.6, 1.06, 'buku-zaitun'),
      b(1.56, 0.22, 1.76, 0.3, 0.6, 1.16, 'buku-krem'),
      b(1.89, 0.22, 1.76, 0.24, 0.6, 0.96, 'buku-gelap'),
      b(2.16, 0.22, 1.76, 0.28, 0.6, 1.08, 'buku-krem'),
      b(2.47, 0.22, 1.76, 0.32, 0.6, 1.2, 'buku-krem'),
      b(2.82, 0.22, 1.76, 0.24, 0.6, 1, 'buku-biru'),
      b(3.09, 0.22, 1.76, 0.28, 0.6, 1.1, 'buku-gelap'),
    ],
  },

  // ============================================================== MEJA GURU ==
  // Meja kayu: daun tebal, 2 kaki kiri, pedestal laci kanan (3 laci + tarikan).
  {
    id: 'meja-guru', nama: 'MEJA GURU',
    ket: 'meja kayu, dua kaki kiri, pedestal 3 laci di kanan',
    pasang: 'lantai', lebar: 4.8, dalam: 1.9,
    bagian: [
      b(0, 0, 1.52, 4.80, 2.00, 0.16, 'kayu-meja'),        // daun meja
      b(0, 1.90, 1.28, 4.80, 0.10, 0.24, 'kayu-tepi'),     // apron depan
      b(0, 0.00, 1.28, 4.80, 0.10, 0.24, 'kayu-tepi'),     // apron belakang
      b(0, 0.06, 1.28, 0.10, 1.94, 0.24, 'kayu-tepi'),     // apron kiri
      b(0.12, 0.12, 0, 0.22, 0.22, 1.28, 'kayu-gelap'),    // kaki depan-kiri
      b(0.12, 1.66, 0, 0.22, 0.22, 1.28, 'kayu-gelap'),    // kaki belakang-kiri
      b(3.30, 0.10, 0, 1.40, 1.80, 1.28, 'kayu-meja'),     // badan pedestal kanan
      b(3.34, 1.80, 0.08, 1.32, 0.10, 0.36, 'kayu-tepi'),  // muka laci 1
      b(3.34, 1.80, 0.48, 1.32, 0.10, 0.36, 'kayu-tepi'),  // muka laci 2
      b(3.34, 1.80, 0.88, 1.32, 0.10, 0.34, 'kayu-tepi'),  // muka laci 3
      b(3.76, 1.90, 0.22, 0.44, 0.06, 0.07, 'perak'),      // tarikan 1
      b(3.76, 1.90, 0.62, 0.44, 0.06, 0.07, 'perak'),      // tarikan 2
      b(3.76, 1.90, 1.00, 0.44, 0.06, 0.07, 'perak'),      // tarikan 3
      b(4.60, 0.10, 0, 0.10, 1.80, 1.28, 'kayu-gelap'),    // sisi kanan pedestal
    ],


  },

  // =========================================================== KURSI PUTAR ==
  // Kursi kerja gelap: 4 lengan beroda, tiang, dudukan, sandaran membulat.
  {
    id: 'kursi-putar', nama: 'KURSI PUTAR',
    ket: 'kursi kerja gelap: kaki beroda, tiang, dudukan, sandaran',
    pasang: 'lantai', lebar: 2.2, dalam: 2.2,
    bagian: [
      b(1.05, 0.10, 0.14, 0.22, 1.95, 0.10, 'abu-tua'),             // lengan kaki (arah w)
      b(0.10, 1.05, 0.14, 1.95, 0.22, 0.10, 'abu-tua'),             // lengan kaki (arah e)
      b(0.92, 0.10, 0, 0.36, 0.24, 0.16, 'abu-tua', 'silinder'),    // roda depan
      b(0.92, 1.82, 0, 0.36, 0.24, 0.16, 'abu-tua', 'silinder'),    // roda belakang
      b(0.10, 0.92, 0, 0.24, 0.36, 0.16, 'abu-tua', 'silinder'),    // roda kiri
      b(1.82, 0.92, 0, 0.24, 0.36, 0.16, 'abu-tua', 'silinder'),    // roda kanan
      b(1.05, 1.05, 0.12, 0.24, 0.24, 0.74, 'abu-tua', 'silinder'), // tiang gas
      b(0.97, 0.97, 0.80, 0.40, 0.40, 0.14, 'abu', 'silinder'),     // cakra dudukan
      b(0.44, 0.52, 0.88, 1.28, 1.24, 0.14, 'abu-tua'),             // bantalan dudukan
      b(0.48, 0.56, 1.02, 1.20, 1.16, 0.08, 'abu'),                 // permukaan dudukan
      b(0.90, 0.36, 1.00, 0.36, 0.30, 0.40, 'abu-tua'),             // penopang sandaran
      b(0.54, 0.26, 1.06, 1.24, 0.20, 0.88, 'abu-tua'),             // sandaran
      b(0.63, 0.25, 1.92, 1.06, 0.22, 0.10, 'abu-tua'),             // puncak membulat
      b(0.63, 0.44, 1.24, 1.06, 0.04, 0.10, 'abu'),                 // garis empuk
    ],



  },

  // ============================================================= PAPAN TULIS ==
  // Papan putih berbingkai perak, kaki berdiri + palang, baki spidol.
  {
    id: 'papan-tulis', nama: 'PAPAN TULIS',
    ket: 'papan putih bingkai perak, kaki berdiri + palang, baki spidol',
    pasang: 'lantai', lebar: 4.9, dalam: 1.5,
    bagian: [
      b(0.30, 0.40, 1.30, 4.30, 0.10, 2.20, 'papan-putih'),  // muka papan
      b(0.24, 0.36, 3.46, 4.42, 0.18, 0.14, 'perak'),        // bingkai atas
      b(0.24, 0.36, 1.16, 4.42, 0.18, 0.14, 'perak'),        // bingkai bawah
      b(0.24, 0.36, 1.16, 0.14, 0.18, 2.44, 'perak'),        // bingkai kiri
      b(4.52, 0.36, 1.16, 0.14, 0.18, 2.44, 'perak'),        // bingkai kanan
      b(0.30, 0.34, 1.22, 4.30, 0.16, 0.06, 'perak-tua'),   // garis dalam bawah
      b(0.34, 0.24, 1.02, 4.22, 0.30, 0.10, 'perak'),        // baki spidol
      b(0.70, 0.26, 1.12, 0.60, 0.10, 0.08, 'buku-bata'),    // spidol merah
      b(1.36, 0.26, 1.12, 0.50, 0.10, 0.08, 'buku-biru'),    // spidol biru
      b(0.66, 0.46, 0, 0.16, 0.18, 1.30, 'perak'),           // kaki kiri
      b(4.18, 0.46, 0, 0.16, 0.18, 1.30, 'perak'),           // kaki kanan
      b(0.34, 0.42, 0, 4.30, 0.24, 0.12, 'perak'),           // palang bawah
      b(0.40, 0.44, 0.12, 0.56, 0.20, 0.06, 'perak-tua'),    // tapak kiri
      b(3.94, 0.44, 0.12, 0.56, 0.20, 0.06, 'perak-tua'),    // tapak kanan
    ],
  },

  // ============================================================= PAPAN GABUS ==
  // Papan gabus berbingkai putih tipis; kertas catatan + peniti warna.
  {
    id: 'papan-gabus', nama: 'PAPAN GABUS',
    ket: 'papan gabus bingkai putih, kertas catatan + peniti',
    pasang: 'dinding-kanan', lebar: 2.9, dalam: 0.2,
    bagian: [
      b(0, 0, 0, 2.90, 0.14, 2.10, 'gabus-tanah'),        // permukaan gabus
      b(0, 0, 0, 0.12, 0.18, 2.10, 'kusen-putih'),        // bingkai kiri
      b(2.78, 0, 0, 0.12, 0.18, 2.10, 'kusen-putih'),     // bingkai kanan
      b(0, 0, 1.98, 2.90, 0.18, 0.12, 'kusen-putih'),     // bingkai atas
      b(0, 0, 0, 2.90, 0.18, 0.12, 'kusen-putih'),        // bingkai bawah
      b(0.30, 0.14, 1.06, 0.72, 0.02, 0.72, 'kertas-putih'),
      b(1.22, 0.14, 1.18, 0.62, 0.02, 0.60, 'kertas-putih'),
      b(2.06, 0.14, 0.98, 0.66, 0.02, 0.66, 'kertas-putih'),
      b(0.92, 0.14, 0.32, 0.60, 0.02, 0.50, 'buku-krem'),
      b(1.98, 0.14, 0.24, 0.52, 0.02, 0.42, 'kertas-putih'),
      b(0.62, 0.12, 1.70, 0.08, 0.04, 0.08, 'buku-bata', 'bola'),
      b(1.50, 0.12, 1.70, 0.08, 0.04, 0.08, 'buku-biru', 'bola'),
      b(2.36, 0.12, 1.56, 0.08, 0.04, 0.08, 'buku-zaitun', 'bola'),
      b(1.20, 0.12, 0.74, 0.08, 0.04, 0.08, 'buku-bata', 'bola'),
      b(2.22, 0.12, 0.60, 0.08, 0.04, 0.08, 'buku-biru', 'bola'),
    ],
  },

  // ================================================================ JENDELA ==
  // Sesuai gambar referensi (Screenshot_20261029_072237.jpg):
  //   kusen PUTIH tebal, dua daun kaca dipisah palang tegak, palang datar di
  //   sepertiga atas, langit biru + matahari & awan, ambang putih menonjol,
  //   tirai putih diikat di tengah, batang gorden putih dengan cincin.
  //
  // LAPISAN KEDALAMAN (sumbu w, 0 = permukaan dinding):
  //   w 0,00–0,26 kusen · 0,10–0,16 kaca · 0,30–0,46 tirai · 0,34–0,48 batang
  //   0,26–0,70 ambang. Tirai HARUS di depan kusen (w > 0,26), kalau tidak
  //   tirai "tenggelam" di dalam dinding dan tampak sebagai papan gepeng.
  {
    id: 'jendela', nama: 'JENDELA',
    ket: 'kusen putih, langit biru + matahari & awan, tirai putih diikat, batang + cincin',
    pasang: 'dinding-kanan', lebar: 6.4, dalam: 0.7,
    bagian: [
      // ---- kusen luar PUTIH ------------------------------------------------
      b(0.4, 0, 2.30, 0.28, 0.26, 4.70, 'kusen-putih'),
      b(5.72, 0, 2.30, 0.28, 0.26, 4.70, 'kusen-putih'),
      b(0.4, 0, 6.76, 5.60, 0.26, 0.24, 'kusen-putih'),
      b(0.4, 0, 2.30, 5.60, 0.26, 0.24, 'kusen-putih'),
      // ---- palang tegak tengah + palang datar sepertiga atas ---------------
      b(3.1, 0.04, 2.54, 0.20, 0.20, 4.22, 'kusen-putih'),
      b(0.68, 0.04, 5.62, 5.04, 0.20, 0.18, 'kusen-putih'),

      // ---- kaca: empat daun ------------------------------------------------
      b(0.68, 0.10, 5.80, 2.42, 0.06, 0.96, 'kaca-langit'),
      b(3.3, 0.10, 5.80, 2.42, 0.06, 0.96, 'kaca-langit'),
      b(0.68, 0.10, 2.54, 2.42, 0.06, 3.08, 'kaca-langit'),
      b(3.3, 0.10, 2.54, 2.42, 0.06, 3.08, 'kaca-langit'),

      // ---- matahari + awan (bentuk 'cakram' = bulatan pada bidang dinding) --
      // 'cakram' digambar di bidang e-z pada w tetap, jadi tepat untuk hiasan
      // yang menempel di kaca. w 0,18 = sedikit di depan kaca (0,16).
      beranim(b(1.26, 0.18, 5.92, 0.76, 0.02, 0.76, 'matahari', 'cakram'),
        { jenis: 'denyut', laju: 0.18, besar: 1, fase: 0 }),
      // awan kiri: siluet bebas (bentuk 'profil'), bukan tumpukan bulatan —
      // tumpukan cakram selalu terbaca seperti "kacang", siluet tidak.
      bp(1.6, 0.16, 4.30, 1.02, 0.04, 0.56, 'pastel-awan', AWAN),
      // awan kecil di daun kanan
      bp(3.82, 0.16, 3.52, 0.82, 0.04, 0.46, 'pastel-awan', AWAN),

      // ---- ambang jendela PUTIH menonjol ke dalam --------------------------
      b(0.3, 0.26, 2.14, 5.80, 0.46, 0.16, 'kusen-putih'),
      b(0.34, 0.62, 2.04, 5.72, 0.10, 0.10, 'kusen-putih'),

      // ---- TIRAI PUTIH diikat (di DEPAN kusen, w 0,30-0,46) ----------------
      // kiri: lebar di atas -> menyempit di ikatan -> lebar lagi di bawah
      beranim(b(0.3, 0.30, 4.90, 1.16, 0.16, 2.14, 'tirai-gorden'),
        { jenis: 'ayun', laju: 0.13, besar: 0.7, fase: 0.1 }),
      b(0.56, 0.30, 4.46, 0.54, 0.16, 0.44, 'tirai-gorden'),      // ikatan
      bt(0.53, 0.28, 4.52, 0.60, 0.20, 0.12, 'tirai-lipat'),      // pita ikat
      beranim(b(0.32, 0.30, 1.86, 1.12, 0.16, 2.60, 'tirai-gorden'),
        { jenis: 'ayun', laju: 0.13, besar: 0.7, fase: 0.1 }),
      // lipatan (tanpa garis tepi supaya halus, bukan seperti kisi-kisi)
      bt(0.5, 0.29, 4.90, 0.16, 0.14, 2.14, 'tirai-lipat'),
      bt(0.7, 0.29, 4.90, 0.16, 0.14, 2.14, 'tirai-lipat'),
      bt(0.52, 0.29, 1.86, 0.16, 0.14, 2.60, 'tirai-lipat'),
      bt(0.72, 0.29, 1.86, 0.16, 0.14, 2.60, 'tirai-lipat'),
      // kanan (cermin)
      beranim(b(4.94, 0.30, 4.90, 1.16, 0.16, 2.14, 'tirai-gorden'),
        { jenis: 'ayun', laju: 0.13, besar: 0.7, fase: 0.6 }),
      b(5.3, 0.30, 4.46, 0.54, 0.16, 0.44, 'tirai-gorden'),
      bt(5.27, 0.28, 4.52, 0.60, 0.20, 0.12, 'tirai-lipat'),
      beranim(b(4.96, 0.30, 1.86, 1.12, 0.16, 2.60, 'tirai-gorden'),
        { jenis: 'ayun', laju: 0.13, besar: 0.7, fase: 0.6 }),
      bt(5.14, 0.29, 1.86, 0.16, 0.14, 2.60, 'tirai-lipat'),
      bt(5.32, 0.29, 1.86, 0.16, 0.14, 2.60, 'tirai-lipat'),
      bt(5.12, 0.29, 4.90, 0.16, 0.14, 2.14, 'tirai-lipat'),
      bt(5.3, 0.29, 4.90, 0.16, 0.14, 2.14, 'tirai-lipat'),

      // ---- batang gorden PUTIH, di DEPAN & DI ATAS tirai -------------------
      b(0.16, 0.52, 7.26, 6.08, 0.12, 0.12, 'kusen-putih', 'silinder'),
      b(0.06, 0.50, 7.22, 0.18, 0.18, 0.18, 'kusen-putih', 'bola'),
      b(6.18, 0.50, 7.22, 0.18, 0.18, 0.18, 'kusen-putih', 'bola'),
      // cincin: 5 kiri + 5 kanan, menggantung di bawah batang
      bt(0.38, 0.54, 7.12, 0.10, 0.14, 0.16, 'kusen-putih', 'silinder'),
      bt(0.56, 0.54, 7.12, 0.10, 0.14, 0.16, 'kusen-putih', 'silinder'),
      bt(0.74, 0.54, 7.12, 0.10, 0.14, 0.16, 'kusen-putih', 'silinder'),
      bt(0.92, 0.54, 7.12, 0.10, 0.14, 0.16, 'kusen-putih', 'silinder'),
      bt(1.1, 0.54, 7.12, 0.10, 0.14, 0.16, 'kusen-putih', 'silinder'),
      bt(5.14, 0.54, 7.12, 0.10, 0.14, 0.16, 'kusen-putih', 'silinder'),
      bt(5.32, 0.54, 7.12, 0.10, 0.14, 0.16, 'kusen-putih', 'silinder'),
      bt(5.5, 0.54, 7.12, 0.10, 0.14, 0.16, 'kusen-putih', 'silinder'),
      bt(5.68, 0.54, 7.12, 0.10, 0.14, 0.16, 'kusen-putih', 'silinder'),
      bt(5.86, 0.54, 7.12, 0.10, 0.14, 0.16, 'kusen-putih', 'silinder'),
    ],
  },

  // ============================================================== LAMPU MEJA ==
  // Lampu kerja gelap: alas bulat, tiang, kap kerucut menghadap meja.
  {
    id: 'lampu-meja', nama: 'LAMPU MEJA',
    ket: 'lampu kerja gelap: alas bulat, tiang, kap kerucut, bohlam hangat',
    pasang: 'lantai', lebar: 1.2, dalam: 1.2,
    bagian: [
      b(0.16, 0.16, 0, 0.88, 0.88, 0.10, 'abu-tua', 'silinder'),  // alas
      b(0.40, 0.40, 0.08, 0.40, 0.40, 0.06, 'abu', 'silinder'),   // cakra alas
      b(0.53, 0.53, 0.10, 0.14, 0.14, 1.44, 'abu-tua'),           // tiang
      b(0.48, 0.48, 1.48, 0.24, 0.24, 0.10, 'abu-tua', 'silinder'), // sendi
      b(0.10, 0.10, 1.56, 0.90, 0.90, 0.52, 'abu-tua', 'kerucut', 0.42), // kap
      b(0.16, 0.16, 1.56, 0.78, 0.78, 0.04, 'abu', 'silinder'),   // bibir kap
      b(0.44, 0.44, 1.34, 0.22, 0.22, 0.24, 'lamp-amber', 'bola'),// bohlam
      beranim(b(0.36, 0.36, 1.30, 0.30, 0.30, 0.30, 'lamp-amber', 'bola'),
        { jenis: 'denyut', laju: 0.4, besar: 1.4, fase: 0 }), // bohlam
    ],
  },

  // ============================================================= TANAMAN POT ==
  {
    id: 'tanaman-pot', nama: 'TANAMAN POT',
    ket: 'pot terakota + daun panjang hijau',
    pasang: 'lantai', lebar: 1.9, dalam: 1.9,
    bagian: [
      b(0.22, 0.22, 0, 1.46, 1.46, 1.16, 'kayu-terakota', 'kerucut', 1.18), // badan pot
      b(0.12, 0.12, 1.12, 1.66, 1.66, 0.18, 'kayu-tepi', 'silinder'),      // bibir pot
      b(0.26, 0.26, 1.26, 1.38, 1.38, 0.08, 'kayu-gelap', 'silinder'),     // tanah
      beranim(b(0.94, 0.94, 1.30, 2.05, 0.42, 1.18, 'daun-sage', 'daun', undefined, 96),
      { jenis: 'ayun', laju: 0.22, besar: 1, fase: 0 }),
      beranim(b(0.94, 0.94, 1.30, 2.05, 0.42, 1.18, 'daun-sage', 'daun', undefined, 74),
      { jenis: 'ayun', laju: 0.22, besar: 1, fase: 0.14 }),
      beranim(b(0.94, 0.94, 1.30, 2.05, 0.42, 1.18, 'daun-sage', 'daun', undefined, 118),
      { jenis: 'ayun', laju: 0.22, besar: 1, fase: 0.29 }),
      beranim(b(0.94, 0.94, 1.30, 2.05, 0.42, 1.18, 'daun-sage', 'daun', undefined, 52),
      { jenis: 'ayun', laju: 0.22, besar: 1, fase: 0.43 }),
      beranim(b(0.94, 0.94, 1.30, 2.05, 0.42, 1.18, 'daun-sage', 'daun', undefined, 140),
      { jenis: 'ayun', laju: 0.22, besar: 1, fase: 0.57 }),
      beranim(b(0.94, 0.94, 1.30, 2.05, 0.42, 1.18, 'daun-sage', 'daun', undefined, 88),
      { jenis: 'ayun', laju: 0.22, besar: 1, fase: 0.71 }),
      beranim(b(0.94, 0.94, 1.30, 2.05, 0.42, 1.18, 'daun-sage', 'daun', undefined, 30),
      { jenis: 'ayun', laju: 0.22, besar: 1, fase: 0.85 }),
      beranim(b(0.94, 0.94, 1.30, 1.60, 0.42, 1.00, 'daun-gelap', 'daun', undefined, 62),
      { jenis: 'ayun', laju: 0.22, besar: 1, fase: 0.36 }),
      beranim(b(0.94, 0.94, 1.30, 1.80, 0.42, 1.10, 'daun-gelap', 'daun', undefined, 128),
      { jenis: 'ayun', laju: 0.22, besar: 1, fase: 0.64 }),
    ],
  },

  // =========================================================== TEMPAT SAMPAH ==
  {
    id: 'tempat-sampah', nama: 'TEMPAT SAMPAH',
    ket: 'tong abu + kertas remuk di lantai',
    pasang: 'lantai', lebar: 2.2, dalam: 1.4,
    bagian: [
      b(0.14, 0.14, 0, 0.92, 0.92, 1.24, 'abu', 'kerucut', 1.10),   // badan tong
      b(0.08, 0.08, 1.16, 1.04, 1.04, 0.14, 'abu-tua', 'silinder'),// bibir tong
      b(0.16, 0.16, 1.20, 0.88, 0.88, 0.04, 'abu-tua', 'silinder'),// lubang
      b(1.34, 0.26, 0, 0.32, 0.32, 0.32, 'kertas-putih', 'bola'),  // kertas remuk
      b(1.62, 0.52, 0, 0.26, 0.26, 0.26, 'kertas-putih', 'bola'),
    ],
  },

  // ================================================================= LAPTOP ==
  {
    id: 'laptop', nama: 'LAPTOP',
    ket: 'laptop terbuka: bodi perak, papan tombol gelap, layar terang',
    pasang: 'lantai', lebar: 2.0, dalam: 1.7,
    bagian: [
      b(0, 0.20, 0, 1.70, 1.18, 0.10, 'perak'),                     // bodi bawah
      b(0.06, 0.26, 0.10, 1.58, 1.02, 0.03, 'abu-tua'),            // alas papan tombol
      b(0.160, 0.340, 0.13, 0.11, 0.11, 0.025, 'abu'),
      b(0.305, 0.340, 0.13, 0.11, 0.11, 0.025, 'abu'),
      b(0.450, 0.340, 0.13, 0.11, 0.11, 0.025, 'abu'),
      b(0.595, 0.340, 0.13, 0.11, 0.11, 0.025, 'abu'),
      b(0.740, 0.340, 0.13, 0.11, 0.11, 0.025, 'abu'),
      b(0.885, 0.340, 0.13, 0.11, 0.11, 0.025, 'abu'),
      b(1.030, 0.340, 0.13, 0.11, 0.11, 0.025, 'abu'),
      b(1.175, 0.340, 0.13, 0.11, 0.11, 0.025, 'abu'),
      b(1.320, 0.340, 0.13, 0.11, 0.11, 0.025, 'abu'),
      b(1.465, 0.340, 0.13, 0.11, 0.11, 0.025, 'abu'),
      b(0.160, 0.485, 0.13, 0.11, 0.11, 0.025, 'abu'),
      b(0.305, 0.485, 0.13, 0.11, 0.11, 0.025, 'abu'),
      b(0.450, 0.485, 0.13, 0.11, 0.11, 0.025, 'abu'),
      b(0.595, 0.485, 0.13, 0.11, 0.11, 0.025, 'abu'),
      b(0.740, 0.485, 0.13, 0.11, 0.11, 0.025, 'abu'),
      b(0.885, 0.485, 0.13, 0.11, 0.11, 0.025, 'abu'),
      b(1.030, 0.485, 0.13, 0.11, 0.11, 0.025, 'abu'),
      b(1.175, 0.485, 0.13, 0.11, 0.11, 0.025, 'abu'),
      b(1.320, 0.485, 0.13, 0.11, 0.11, 0.025, 'abu'),
      b(1.465, 0.485, 0.13, 0.11, 0.11, 0.025, 'abu'),
      b(0.160, 0.630, 0.13, 0.11, 0.11, 0.025, 'abu'),
      b(0.305, 0.630, 0.13, 0.11, 0.11, 0.025, 'abu'),
      b(0.450, 0.630, 0.13, 0.11, 0.11, 0.025, 'abu'),
      b(0.595, 0.630, 0.13, 0.11, 0.11, 0.025, 'abu'),
      b(0.740, 0.630, 0.13, 0.11, 0.11, 0.025, 'abu'),
      b(0.885, 0.630, 0.13, 0.11, 0.11, 0.025, 'abu'),
      b(1.030, 0.630, 0.13, 0.11, 0.11, 0.025, 'abu'),
      b(1.175, 0.630, 0.13, 0.11, 0.11, 0.025, 'abu'),
      b(1.320, 0.630, 0.13, 0.11, 0.11, 0.025, 'abu'),
      b(1.465, 0.630, 0.13, 0.11, 0.11, 0.025, 'abu'),
      b(0.160, 0.775, 0.13, 0.11, 0.11, 0.025, 'abu'),
      b(0.305, 0.775, 0.13, 0.11, 0.11, 0.025, 'abu'),
      b(0.450, 0.775, 0.13, 0.11, 0.11, 0.025, 'abu'),
      b(0.595, 0.775, 0.13, 0.11, 0.11, 0.025, 'abu'),
      b(0.740, 0.775, 0.13, 0.11, 0.11, 0.025, 'abu'),
      b(0.885, 0.775, 0.13, 0.11, 0.11, 0.025, 'abu'),
      b(1.030, 0.775, 0.13, 0.11, 0.11, 0.025, 'abu'),
      b(1.175, 0.775, 0.13, 0.11, 0.11, 0.025, 'abu'),
      b(1.320, 0.775, 0.13, 0.11, 0.11, 0.025, 'abu'),
      b(1.465, 0.775, 0.13, 0.11, 0.11, 0.025, 'abu'),
      b(0.54, 1.00, 0.13, 0.62, 0.24, 0.02, 'perak-tua'),           // papan sentuh
      b(0, 0.14, 0.10, 1.70, 0.10, 1.14, 'perak'),                  // bodi layar
      b(0.10, 0.10, 0.20, 1.50, 0.04, 0.94, 'abu-tua'),             // bingkai dalam layar
      b(0.14, 0.09, 0.24, 1.42, 0.03, 0.86, 'kusen-putih'),         // muka layar terang
      b(0.26, 0.08, 0.34, 0.70, 0.02, 0.16, 'abu-tua'),             // jendela aplikasi 1
      b(0.26, 0.08, 0.64, 0.46, 0.02, 0.12, 'abu-tua'),             // jendela aplikasi 2
      b(0.26, 0.08, 0.90, 0.58, 0.02, 0.10, 'abu-tua'),             // jendela aplikasi 3
      b(0.92, 0.08, 0.34, 0.56, 0.02, 0.66, 'perak-tua'),           // panel kanan
      b(0.06, 0.18, 0, 1.58, 0.14, 0.06, 'abu-tua'),                // engsel
    ],
  },

  // ============================================================ TUMPUKAN BUKU ==
  {
    id: 'tumpukan-buku', nama: 'TUMPUKAN BUKU',
    ket: 'tiga buku menumpuk: teal, krem, bata',
    pasang: 'lantai', lebar: 1.4, dalam: 1.0,
    bagian: [
      b(0.06, 0.06, 0, 1.14, 0.82, 0.16, 'buku-biru'),    // buku bawah
      b(0.20, 0.18, 0.16, 0.84, 0.46, 0.06, 'buku-krem'),
      b(0.02, 0.10, 0.22, 1.18, 0.80, 0.18, 'buku-krem'),// buku tengah
      b(0.16, 0.22, 0.40, 0.90, 0.44, 0.06, 'buku-krem'),
      b(0.12, 0.06, 0.46, 1.04, 0.84, 0.16, 'buku-bata'),// buku atas
      b(0.26, 0.18, 0.62, 0.76, 0.48, 0.05, 'buku-krem'),
    ],
  },

  // ============================================================= KALKULATOR ==
  {
    id: 'kalkulator', nama: 'KALKULATOR',
    ket: 'kalkulator gelap: layar + tombol abu',
    pasang: 'lantai', lebar: 1.0, dalam: 0.95,
    bagian: [
      b(0, 0, 0, 0.92, 0.80, 0.09, 'perak'),                      // bodi
      b(0.05, 0.06, 0.09, 0.82, 0.24, 0.02, 'perak-tua'),          // bingkai layar
      b(0.08, 0.08, 0.10, 0.76, 0.18, 0.02, 'abu-tua'),            // kaca layar
      b(0.12, 0.10, 0.11, 0.28, 0.04, 0.02, 'perak'),              // angka
      b(0.46, 0.10, 0.11, 0.20, 0.04, 0.02, 'perak'),              // angka
      b(0.100, 0.340, 0.09, 0.20, 0.08, 0.02, 'abu-tua'),
      b(0.350, 0.340, 0.09, 0.20, 0.08, 0.02, 'abu-tua'),
      b(0.600, 0.340, 0.09, 0.20, 0.08, 0.02, 'buku-bata'),
      b(0.100, 0.440, 0.09, 0.20, 0.08, 0.02, 'abu-tua'),
      b(0.350, 0.440, 0.09, 0.20, 0.08, 0.02, 'abu-tua'),
      b(0.600, 0.440, 0.09, 0.20, 0.08, 0.02, 'abu-tua'),
      b(0.100, 0.540, 0.09, 0.20, 0.08, 0.02, 'abu-tua'),
      b(0.350, 0.540, 0.09, 0.20, 0.08, 0.02, 'abu-tua'),
      b(0.600, 0.540, 0.09, 0.20, 0.08, 0.02, 'abu-tua'),
      b(0.100, 0.640, 0.09, 0.20, 0.08, 0.02, 'abu-tua'),
      b(0.350, 0.640, 0.09, 0.20, 0.08, 0.02, 'perak'),
      b(0.600, 0.640, 0.09, 0.20, 0.08, 0.02, 'abu-tua'),
    ],

  },

  // ============================================================ BINGKAI FOTO ==
  {
    id: 'bingkai-foto', nama: 'BINGKAI FOTO',
    ket: 'bingkai kayu terang, mat krem, foto pemandangan',
    pasang: 'dinding-kanan', lebar: 1.1, dalam: 0.16,
    bagian: [
      b(0, 0, 0, 1.10, 0.12, 1.30, 'kayu-tepi'),        // papan belakang
      b(0, 0.10, 0, 0.14, 0.06, 1.30, 'kayu-meja'),     // bingkai kiri
      b(0.96, 0.10, 0, 0.14, 0.06, 1.30, 'kayu-meja'),  // bingkai kanan
      b(0, 0.10, 1.16, 1.10, 0.06, 0.14, 'kayu-meja'),  // bingkai atas
      b(0, 0.10, 0, 1.10, 0.06, 0.14, 'kayu-meja'),     // bingkai bawah
      b(0.13, 0.06, 0.13, 0.84, 0.03, 1.04, 'kertas-putih'), // mat krem
      b(0.20, 0.05, 0.20, 0.70, 0.02, 0.90, 'kaca-langit'),  // langit foto
      b(0.20, 0.04, 0.20, 0.70, 0.02, 0.34, 'daun-gelap'),   // tanah foto
      b(0.58, 0.03, 0.78, 0.16, 0.02, 0.16, 'lamp-amber', 'bola'), // matahari
      b(0.28, 0.03, 0.24, 0.20, 0.02, 0.22, 'daun-sage', 'kerucut', 0.1), // pohon
      b(0.52, 0.03, 0.24, 0.16, 0.02, 0.16, 'daun-sage', 'kerucut', 0.1),
    ],
  },

  // ============================================================ GELAS PENSIL ==
  // Ada di referensi: gelas putih berisi pensil & pulpen di meja.
  {
    id: 'gelas-pensil', nama: 'GELAS PENSIL',
    ket: 'gelas putih berisi pensil & pulpen',
    pasang: 'lantai', lebar: 0.7, dalam: 0.7,
    bagian: [
      b(0.16, 0.16, 0, 0.38, 0.38, 0.60, 'kusen-putih', 'kerucut', 1.08), // gelas
      b(0.21, 0.21, 0.58, 0.30, 0.30, 0.02, 'perak-tua', 'silinder'),        // lubang gelas
      b(0.24, 0.30, 0.56, 0.07, 0.07, 0.56, 'buku-bata'),                // pensil merah
      b(0.36, 0.26, 0.56, 0.07, 0.07, 0.62, 'buku-zaitun'),              // pensil zaitun
      b(0.30, 0.38, 0.56, 0.06, 0.06, 0.52, 'buku-biru'),                // pulpen
      b(0.40, 0.36, 0.56, 0.06, 0.06, 0.44, 'perak-tua'),                // pensil pendek
    ],
  },
]

export function presetOf(id: string): Preset | undefined {
  return PRESETS.find(p => p.id === id)
}

// ATURAN 32 PIKsel DIHAPUS (2026-10-29): angka preset boleh sampai 3 desimal
const snap = (v: number) => Math.round(v * 1000) / 1000

// VERSI PIXEL (opsi C "campuran", permintaan user 2026-10-29)
// Satu objek = satu sprite hasil potongan langsung dari gambar referensi,
// jadi tampilannya persis referensi. Ukuran dunia (lebar/dalam) SAMA dengan
// versi EDIT supaya kedua versi bisa bertukar tempat tanpa mengubah tata
// letak ruangan.
// `zAwal` = tinggi duduk objek (khusus barang yang menempel dinding).
// ===========================================================================
export interface PresetPixel {
  id: string
  nama: string
  ket: string
  /** id aset di /aset/<sprite>.png */
  sprite: string
  lebar: number
  dalam: number
  zAwal: number
  pasang: 'lantai' | 'dinding-kanan' | 'dinding-kiri'
}

export const PRESETS_PIXEL: PresetPixel[] = [
  { id: 'meja-guru', nama: 'MEJA GURU', ket: 'pixel: meja panjang + laci terbuka',
    sprite: 'meja-guru', lebar: 4.91, dalam: 4.91, pasang: 'lantai',
    zAwal: 0 },
  { id: 'rak-buku', nama: 'RAK BUKU', ket: 'pixel: rak dua baris penuh buku',
    sprite: 'rak-buku', lebar: 2.62, dalam: 2.62, pasang: 'lantai',
    zAwal: 0 },
  { id: 'kursi-putar', nama: 'KURSI PUTAR', ket: 'pixel: kursi kerja + roda',
    sprite: 'kursi-putar', lebar: 1.7, dalam: 1.7, pasang: 'lantai',
    zAwal: 0 },
  { id: 'papan-tulis', nama: 'PAPAN TULIS', ket: 'pixel: papan putih beroda',
    sprite: 'papan-tulis', lebar: 3.03, dalam: 3.03, pasang: 'lantai',
    zAwal: 0 },
  { id: 'papan-gabus', nama: 'PAPAN GABUS', ket: 'pixel: papan gabus + catatan',
    sprite: 'papan-gabus', lebar: 1.45, dalam: 1.45, pasang: 'dinding-kanan',
    zAwal: 1.9 },
  { id: 'jendela', nama: 'JENDELA', ket: 'pixel: jendela + tirai + matahari',
    sprite: 'jendela', lebar: 3.57, dalam: 3.57, pasang: 'dinding-kanan',
    zAwal: 2.3 },
  { id: 'lampu-meja', nama: 'LAMPU MEJA', ket: 'pixel: lampu meja',
    sprite: 'lampu-meja', lebar: 1.03, dalam: 1.03, pasang: 'lantai',
    zAwal: 2.3 },
  { id: 'tanaman-pot', nama: 'TANAMAN POT', ket: 'pixel: pot + daun panjang',
    sprite: 'tanaman-pot', lebar: 1.63, dalam: 1.63, pasang: 'lantai',
    zAwal: 0 },
  { id: 'tempat-sampah', nama: 'TEMPAT SAMPAH', ket: 'pixel: tong + kertas remuk',
    sprite: 'tempat-sampah', lebar: 1.09, dalam: 1.09, pasang: 'lantai',
    zAwal: 0 },
  { id: 'laptop', nama: 'LAPTOP', ket: 'pixel: laptop terbuka',
    sprite: 'laptop', lebar: 1.57, dalam: 1.57, pasang: 'lantai',
    zAwal: 1.68 },
  { id: 'tumpukan-buku', nama: 'TUMPUKAN BUKU', ket: 'pixel: tiga buku menumpuk',
    sprite: 'tumpukan-buku', lebar: 0.95, dalam: 0.95, pasang: 'lantai',
    zAwal: 1.68 },
  { id: 'kalkulator', nama: 'KALKULATOR', ket: 'pixel: kalkulator',
    sprite: 'kalkulator', lebar: 0.88, dalam: 0.88, pasang: 'lantai',
    zAwal: 1.68 },
  { id: 'bingkai-foto', nama: 'BINGKAI FOTO', ket: 'pixel: bingkai di dinding',
    sprite: 'bingkai-foto', lebar: 0.51, dalam: 0.51, pasang: 'dinding-kanan',
    zAwal: 3.9 },
]

export function presetPixelOf(id: string): PresetPixel | undefined {
  return PRESETS_PIXEL.find(x => x.id === id)
}

/** objek VERSI PIXEL: satu objek berisi gambar referensi */
export function buatPixel(opts: {
  preset: PresetPixel
  e: number
  w: number
  z?: number
  grup: string
  nama: string
  urutanAwal: number
  idAwal: string
}): SceneObject[] {
  const { preset, grup, nama, urutanAwal, idAwal } = opts
  return [{
    id: `${idAwal}-1`,
    label: nama,
    pos: { e: snap(opts.e), w: snap(opts.w), z: snap(opts.z ?? preset.zAwal) },
    // footprint = kotak pembungkus TAMPILAN sprite: lebar gambar dihitung
    // sebagai (lebar+dalam)·HW, jadi (lebar+dalam) sudah mencakup ukuran gambar
    size: { e: ukuranSah(preset.lebar), w: ukuranSah(preset.dalam), z: 0.6 },
    style: 'wood',
    sprite: preset.sprite,
    preset: preset.id,
    app: null,
    layer: 'main' as const,
    grup,
    grupNama: nama,
    urutan: urutanAwal,
  }]
}

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
    ...(bag.profil ? { profil: bag.profil } : {}),
    ...(bag.anim ? { anim: bag.anim } : {}),
    ...(bag.tepi === false ? { tepi: false } : {}),
    preset: preset.id,
    app: null,
    layer: 'main' as const,
    grup,
    grupNama: nama,
    urutan: urutanAwal + i,
  }))
}
