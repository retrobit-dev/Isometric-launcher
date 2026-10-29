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

/** beri animasi ke satu bagian */
const beranim = (x: Bahan, a: Animasi): Bahan => ({ ...x, anim: a })

/** satu buku berdiri di rak */
const buku = (e: number, z: number, tebal: number, tinggi: number, style: string, w = 0.2): Bahan =>
  b(e, w, z, tebal, 0.62, tinggi, style)

export const PRESETS: Preset[] = [
  // ============================================================== MEJA GURU ==
  // Referensi: meja kayu terakota panjang, laci di kanan (laci atas terbuka
  // berisi berkas), panel belakang, kaki kiri tunggal.
  {
    id: 'meja-guru', nama: 'MEJA GURU',
    ket: 'meja kayu + 2 laci + laci terbuka berisi berkas',
    pasang: 'lantai', lebar: 6.4, dalam: 3.5,
    bagian: [
      b(0, 0.6, 2.2, 6.4, 2.8, 0.16, 'kayu-terakota'),      // papan atas
      b(0, 0.54, 2.2, 6.4, 0.06, 0.16, 'kayu-tua'),         // bibir depan meja
      b(0, 3.34, 2.2, 6.4, 0.06, 0.16, 'kayu-tua'),         // bibir belakang
      b(0.1, 0.62, 0, 0.28, 2.7, 2.2, 'kayu-tua'),          // kaki kiri
      b(0.38, 0.62, 0.3, 4.1, 0.14, 1.9, 'kayu-tua'),       // panel belakang
      b(0.1, 0.62, 2.04, 4.4, 0.12, 0.16, 'kayu-tua'),      // apron depan bawah atas
      b(4.72, 1.0, 0, 1.52, 2.34, 2.2, 'kayu-terakota'),    // badan laci kanan
      b(4.78, 0.94, 1.34, 1.4, 0.08, 0.46, 'kayu-tua'),      // muka laci atas
      b(5.3, 0.88, 1.54, 0.36, 0.08, 0.06, 'metal-light'), // gagang laci atas
      b(4.78, 0.94, 0.62, 1.4, 0.08, 0.46, 'kayu-tua'),       // muka laci bawah
      b(5.3, 0.88, 0.8, 0.36, 0.08, 0.06, 'metal-light'), // gagang laci bawah
      // laci atas TERBUKA (menonjol ke depan, isinya berkas)
      b(4.78, 0.16, 1.02, 1.4, 0.8, 0.08, 'kayu-terakota'), // dasar laci
      b(4.78, 0.1, 1.02, 1.4, 0.08, 0.34, 'kayu-tua'),      // muka laci
      b(5.3, 0.04, 1.14, 0.36, 0.06, 0.05, 'metal-light'),   // gagang
      b(4.92, 0.24, 1.1, 0.06, 0.62, 0.38, 'buku-krem'),      // berkas 1
      b(5.16, 0.24, 1.1, 0.06, 0.62, 0.42, 'pastel-butter'), // berkas 2
      b(5.4, 0.24, 1.1, 0.06, 0.62, 0.38, 'buku-biru'),      // berkas 3
      b(5.64, 0.24, 1.1, 0.06, 0.62, 0.4, 'buku-krem'),    // berkas 4
    ],
  },

  // =============================================================== RAK BUKU ==
  // Referensi: rak 2 tingkat + 1 alas, kayu terakota, penuh buku berwarna.
  {
    id: 'rak-buku', nama: 'RAK BUKU',
    ket: 'rak 3 baris penuh buku warna-warni',
    pasang: 'lantai', lebar: 4.2, dalam: 1.0,
    bagian: [
      b(0, 0, 0, 0.18, 1.0, 4.4, 'kayu-tua'),               // sisi kiri
      b(4.02, 0, 0, 0.18, 1.0, 4.4, 'kayu-tua'),            // sisi kanan
      b(0, 0, 4.24, 4.2, 1.0, 0.16, 'kayu-terakota'),       // papan atas
      b(0.18, 0, 0, 3.84, 1.0, 0.14, 'kayu-terakota'),      // alas bawah
      b(0.18, 0, 1.46, 3.84, 1.0, 0.1, 'kayu-terakota'),    // rak tengah
      b(0.18, 0, 2.86, 3.84, 1.0, 0.1, 'kayu-terakota'),    // rak atas
      b(0.18, 0.04, 0.14, 3.84, 0.06, 4.1, 'kayu-tua'),     // panel belakang
      // ---- buku baris bawah (z 0.14) ----
      buku(0.24, 0.14, 0.24, 1.12, 'buku-biru'),
      buku(0.5, 0.14, 0.2, 1.24, 'buku-krem'),
      buku(0.72, 0.14, 0.28, 1.04, 'buku-salmon'),
      buku(1.02, 0.14, 0.2, 1.26, 'buku-lav'),
      buku(1.24, 0.14, 0.26, 1.1, 'daun-sage'),
      buku(1.52, 0.14, 0.22, 1.28, 'buku-krem'),
      buku(1.76, 0.14, 0.28, 1.06, 'buku-biru'),
      buku(2.06, 0.14, 0.2, 1.2, 'buku-salmon'),
      buku(2.28, 0.14, 0.26, 1.12, 'buku-lav'),
      buku(2.56, 0.14, 0.22, 1.26, 'buku-krem'),
      buku(2.8, 0.14, 0.28, 1.04, 'daun-sage'),
      buku(3.1, 0.14, 0.2, 1.18, 'buku-biru'),
      buku(3.32, 0.14, 0.26, 1.24, 'buku-salmon'),
      buku(3.6, 0.14, 0.22, 1.08, 'buku-lav'),
      buku(3.84, 0.14, 0.16, 1.2, 'buku-krem'),
      // ---- buku baris tengah (z 1.56) ----
      buku(0.24, 1.56, 0.26, 1.1, 'buku-krem'),
      buku(0.52, 1.56, 0.2, 1.22, 'buku-biru'),
      buku(0.74, 1.56, 0.28, 1.04, 'buku-lav'),
      buku(1.04, 1.56, 0.22, 1.24, 'buku-salmon'),
      buku(1.28, 1.56, 0.26, 1.08, 'buku-krem'),
      buku(1.56, 1.56, 0.2, 1.2, 'daun-sage'),
      buku(1.78, 1.56, 0.28, 1.12, 'buku-biru'),
      buku(2.08, 1.56, 0.22, 1.26, 'buku-lav'),
      buku(2.32, 1.56, 0.26, 1.02, 'buku-krem'),
      buku(2.6, 1.56, 0.2, 1.22, 'buku-salmon'),
      buku(2.82, 1.56, 0.28, 1.1, 'buku-biru'),
      buku(3.12, 1.56, 0.22, 1.24, 'daun-sage'),
      buku(3.36, 1.56, 0.26, 1.06, 'buku-krem'),
      buku(3.64, 1.56, 0.2, 1.2, 'buku-lav'),
      buku(3.86, 1.56, 0.14, 1.12, 'buku-salmon'),
      // ---- buku baris atas (z 2.96) ----
      buku(0.24, 2.96, 0.22, 1.1, 'buku-salmon'),
      buku(0.48, 2.96, 0.26, 1.22, 'buku-krem'),
      buku(0.76, 2.96, 0.2, 1.04, 'buku-biru'),
      buku(0.98, 2.96, 0.28, 1.24, 'buku-lav'),
      buku(1.28, 2.96, 0.22, 1.08, 'daun-sage'),
      buku(1.52, 2.96, 0.26, 1.2, 'buku-krem'),
      buku(1.8, 2.96, 0.2, 1.12, 'buku-salmon'),
      buku(2.02, 2.96, 0.28, 1.26, 'buku-biru'),
      buku(2.32, 2.96, 0.22, 1.02, 'buku-lav'),
      buku(2.56, 2.96, 0.26, 1.22, 'buku-krem'),
      buku(2.84, 2.96, 0.2, 1.1, 'daun-sage'),
      buku(3.06, 2.96, 0.28, 1.24, 'buku-salmon'),
      buku(3.36, 2.96, 0.22, 1.06, 'buku-biru'),
      buku(3.6, 2.96, 0.26, 1.2, 'buku-lav'),
      buku(3.88, 2.96, 0.12, 1.14, 'buku-krem'),
    ],
  },

  // ============================================================ KURSI PUTAR ==
  // Referensi: kursi kerja gelap, sandaran membulat, kaki bintang 5 + roda.
  {
    id: 'kursi-putar', nama: 'KURSI PUTAR',
    ket: 'kursi kerja gelap: sandaran tinggi, dudukan tebal, kaki bintang + roda',
    pasang: 'lantai', lebar: 2.0, dalam: 2.0,
    bagian: [
      // --- kaki bintang + roda ---
      b(0.25, 0.94, 0.07, 1.5, 0.12, 0.09, 'chair-dark'),        // lengan (e)
      b(0.94, 0.25, 0.07, 0.12, 1.5, 0.09, 'chair-dark'),        // lengan (w)
      b(0.24, 0.9, 0, 0.2, 0.2, 0.14, 'chair-dark', 'bola'),     // roda 1
      b(1.56, 0.9, 0, 0.2, 0.2, 0.14, 'chair-dark', 'bola'),     // roda 2
      b(0.9, 0.24, 0, 0.2, 0.2, 0.14, 'chair-dark', 'bola'),     // roda 3
      b(0.9, 1.56, 0, 0.2, 0.2, 0.14, 'chair-dark', 'bola'),     // roda 4
      b(0.9, 0.9, 0.05, 0.2, 0.2, 0.2, 'chair-dark', 'silinder'),// hub
      b(0.94, 0.94, 0.2, 0.12, 0.12, 0.44, 'chair-dark', 'silinder'), // tiang
      // --- dudukan tebal ---
      b(0.4, 0.36, 0.62, 1.2, 1.2, 0.22, 'chair-dark'),          // rangka dudukan
      b(0.44, 0.4, 0.84, 1.12, 1.12, 0.14, 'chair-dark'),        // bantalan
      // --- sandaran tinggi di sisi belakang ---
      b(0.86, 0.5, 0.8, 0.28, 0.14, 0.26, 'chair-dark'),         // penopang
      // sandaran: SILUET PROFIL dengan sudut atas membulat (bukan balok)
      {
        ...b(0.5, 0.3, 0.92, 1.0, 0.18, 1.12, 'chair-dark', 'profil'),
        profil: [
          [0.04, 0.0], [0.96, 0.0], [0.96, 0.84], [0.88, 0.95],
          [0.12, 0.95], [0.04, 0.84],
        ],
      },
    ],
  },

  // ============================================================ PAPAN TULIS ==
  // Referensi: papan putih krem, rangka metal, dudukan dua tiang + roda.
  {
    id: 'papan-tulis', nama: 'PAPAN TULIS',
    ket: 'papan putih krem beroda, rangka metal',
    pasang: 'lantai', lebar: 4.9, dalam: 1.5,
    bagian: [
      b(0.3, 0.62, 1.86, 4.3, 0.08, 2.6, 'papan-krem'),          // muka papan
      b(0.22, 0.56, 4.36, 4.46, 0.18, 0.14, 'metal-light'),      // rangka atas
      b(0.22, 0.56, 1.82, 4.46, 0.18, 0.14, 'metal-light'),      // rangka bawah
      b(0.22, 0.56, 1.82, 0.14, 0.18, 2.68, 'metal-light'),      // rangka kiri
      b(4.54, 0.56, 1.82, 0.14, 0.18, 2.68, 'metal-light'),      // rangka kanan
      b(0.14, 0.46, 1.68, 4.62, 0.3, 0.12, 'metal-light'),       // baki bawah
      b(0.55, 0.98, 0, 0.12, 0.12, 1.84, 'metal-light'),         // tiang kiri
      b(4.23, 0.98, 0, 0.12, 0.12, 1.84, 'metal-light'),         // tiang kanan
      b(0.5, 0.24, 0.12, 0.12, 1.16, 0.1, 'metal-light'),        // kaki kiri
      b(4.18, 0.24, 0.12, 0.12, 1.16, 0.1, 'metal-light'),       // kaki kanan
      b(0.46, 1.3, 0, 0.2, 0.2, 0.14, 'chair-dark', 'bola'),     // roda kiri
      b(4.14, 1.3, 0, 0.2, 0.2, 0.14, 'chair-dark', 'bola'),     // roda kanan
    ],
  },

  // ============================================================ PAPAN GABUS ==
  {
    id: 'papan-gabus', nama: 'PAPAN GABUS',
    ket: 'papan gabus + catatan kecil (tempel di dinding)',
    pasang: 'dinding-kanan', lebar: 2.9, dalam: 0.2,
    bagian: [
      b(0, 0, 2.02, 2.9, 0.16, 0.16, 'kayu-terakota'),      // rangka atas
      b(0, 0, 0, 2.9, 0.16, 0.16, 'kayu-terakota'),         // rangka bawah
      b(0, 0, 0.16, 0.16, 0.16, 1.86, 'kayu-terakota'),     // rangka kiri
      b(2.74, 0, 0.16, 0.16, 0.16, 1.86, 'kayu-terakota'),  // rangka kanan
      b(0.16, 0.02, 0.16, 2.58, 0.06, 1.86, 'gabus-tanah'), // permukaan gabus
      b(0.36, 0.0, 1.08, 0.5, 0.05, 0.62, 'kertas-putih'),  // catatan 1
      b(0.96, 0.0, 0.88, 0.6, 0.05, 0.76, 'kertas-putih'),  // catatan 2
      b(1.5, 0.0, 1.26, 0.42, 0.05, 0.5, 'kertas-putih'),   // catatan 3
      b(1.94, 0.0, 0.7, 0.56, 0.05, 0.68, 'kertas-putih'),  // catatan 4
      b(1.14, 0.0, 0.42, 0.34, 0.05, 0.32, 'kertas-putih'), // catatan 5
      b(0.55, 0.0, 1.44, 0.1, 0.05, 0.1, 'kaca-langit', 'bola'),   // peniti
      b(1.2, 0.0, 1.28, 0.1, 0.05, 0.1, 'kaca-langit', 'bola'),    // peniti
      b(1.66, 0.0, 1.42, 0.1, 0.05, 0.1, 'kaca-langit', 'bola'),   // peniti
      b(2.16, 0.0, 1.06, 0.1, 0.05, 0.1, 'kaca-langit', 'bola'),   // peniti
      b(1.26, 0.0, 0.72, 0.1, 0.05, 0.1, 'kaca-langit', 'bola'),   // peniti
    ],
  },

  // ================================================================ JENDELA ==
  // Referensi: kusen putih tebal, kaca kiri terang + kanan langit biru,
  // matahari & awan, ambang menonjol, tirai putih diikat, batang + cincin.
  {
    id: 'jendela', nama: 'JENDELA',
    ket: 'jendela putih 2 panel + langit + tirai diikat',
    pasang: 'dinding-kanan', lebar: 5.6, dalam: 0.7,
    bagian: [
      // kusen luar = KAYU (tema hangat: kusen putih dingin diganti jati)
      b(0, 0, 2.5, 0.34, 0.2, 4.9, 'kayu-tua'),
      b(5.26, 0, 2.5, 0.34, 0.2, 4.9, 'kayu-tua'),
      b(0, 0, 2.42, 5.6, 0.24, 0.34, 'kayu-tua'),
      b(0, 0, 7.02, 5.6, 0.24, 0.34, 'kayu-tua'),
      // kusen dalam (bilevel seperti referensi) — lebih terang dari kusen luar
      b(0.34, 0.02, 2.76, 0.14, 0.16, 4.26, 'krem-hangat'),
      b(5.12, 0.02, 2.76, 0.14, 0.16, 4.26, 'krem-hangat'),
      b(0.34, 0.02, 2.76, 4.92, 0.16, 0.14, 'krem-hangat'),
      b(0.34, 0.02, 6.88, 4.92, 0.16, 0.14, 'krem-hangat'),
      // kaca: kiri terang (pantulan), kanan langit biru
      b(0.42, 0.0, 2.92, 2.14, 0.06, 4.06, 'kaca-terang'),
      b(2.72, 0.0, 2.92, 2.3, 0.06, 4.06, 'kaca-langit'),
      b(2.56, 0.0, 2.92, 0.16, 0.14, 4.06, 'kayu-tua'),      // palang tengah
      // matahari + awan di panel kiri
      beranim(b(0.78, 0.04, 6.0, 0.62, 0.04, 0.62, 'pastel-butter', 'cakram'),
        { jenis: 'denyut', laju: 0.18, besar: 1, fase: 0 }),          // matahari
      b(0.86, 0.03, 5.86, 0.5, 0.04, 0.5, 'kertas-putih', 'cakram'),
      beranim(b(1.2, 0.03, 5.78, 0.6, 0.04, 0.6, 'kertas-putih', 'cakram'),
        { jenis: 'naik-turun', laju: 0.09, besar: 0.8, fase: 0.3 }),  // awan
      b(1.5, 0.03, 5.9, 0.44, 0.04, 0.44, 'kertas-putih', 'cakram'),
      // awan kecil di panel kanan
      b(3.9, 0.03, 3.9, 0.5, 0.04, 0.5, 'kertas-putih', 'cakram'),
      b(4.24, 0.03, 3.98, 0.42, 0.04, 0.42, 'kertas-putih', 'cakram'),
      // ambang jendela menonjol ke dalam ruangan
      b(0, 0.2, 2.34, 5.6, 0.5, 0.18, 'kayu-terakota'),
      b(0, 0.68, 2.26, 5.6, 0.06, 0.1, 'kayu-tua'),
      // TIRAI kiri (lebar di atas & bawah, menyempit di ikatan)
      beranim(b(0.0, 0.12, 5.0, 0.78, 0.14, 1.9, 'tirai-putih'),
        { jenis: 'ayun', laju: 0.13, besar: 0.7, fase: 0.1 }),        // tirai kiri
      b(0.18, 0.13, 4.5, 0.5, 0.13, 0.36, 'tirai-putih'),
      beranim(b(0.06, 0.12, 2.66, 0.66, 0.14, 1.86, 'tirai-putih'),
        { jenis: 'ayun', laju: 0.13, besar: 0.7, fase: 0.1 }),        // tirai kiri bawah
      b(0.3, 0.1, 4.42, 0.3, 0.16, 0.1, 'kertas-putih'),      // ikatan
      // TIRAI kanan
      beranim(b(4.82, 0.12, 5.0, 0.78, 0.14, 1.9, 'tirai-putih'),
        { jenis: 'ayun', laju: 0.13, besar: 0.7, fase: 0.6 }),        // tirai kanan
      b(5.12, 0.13, 4.5, 0.5, 0.13, 0.36, 'tirai-putih'),
      beranim(b(4.88, 0.12, 2.66, 0.66, 0.14, 1.86, 'tirai-putih'),
        { jenis: 'ayun', laju: 0.13, besar: 0.7, fase: 0.6 }),        // tirai kanan bawah
      b(4.98, 0.1, 4.42, 0.3, 0.16, 0.1, 'kertas-putih'),     // ikatan
      // batang tirai + ujung bola + cincin
      b(0.0, 0.09, 7.42, 5.6, 0.12, 0.12, 'kayu-tua', 'silinder'),
      b(0.0, 0.06, 7.38, 0.22, 0.18, 0.22, 'tembaga', 'bola'),
      b(5.38, 0.06, 7.38, 0.22, 0.18, 0.22, 'tembaga', 'bola'),
      b(0.34, 0.08, 7.36, 0.1, 0.14, 0.16, 'tirai-putih'),
      b(0.52, 0.08, 7.36, 0.1, 0.14, 0.16, 'tirai-putih'),
      b(0.7, 0.08, 7.36, 0.1, 0.14, 0.16, 'tirai-putih'),
      b(4.8, 0.08, 7.36, 0.1, 0.14, 0.16, 'tirai-putih'),
      b(4.98, 0.08, 7.36, 0.1, 0.14, 0.16, 'tirai-putih'),
      b(5.16, 0.08, 7.36, 0.1, 0.14, 0.16, 'tirai-putih'),
    ],
  },

  // ============================================================= LAMPU MEJA ==
  {
    id: 'lampu-meja', nama: 'LAMPU MEJA',
    ket: 'lampu meja gelap, kap membulat, bola lampu hangat',
    pasang: 'lantai', lebar: 1.2, dalam: 1.2,
    bagian: [
      b(0.1, 0.1, 0, 1.0, 1.0, 0.12, 'chair-dark', 'silinder'),   // alas bulat
      b(0.52, 0.52, 0.1, 0.18, 0.18, 1.28, 'chair-dark', 'silinder'), // tiang
      b(0.42, 0.42, 1.32, 0.38, 0.38, 0.2, 'chair-dark', 'silinder'), // sendi
      b(0.5, 0.5, 1.46, 0.16, 0.16, 0.34, 'chair-dark'),          // lengan atas
      b(0.12, 0.16, 1.62, 0.92, 0.92, 0.62, 'chair-dark', 'kerucut', 0.3), // kap
      beranim(b(0.4, 0.44, 1.58, 0.36, 0.36, 0.28, 'pastel-butter', 'bola'),
        { jenis: 'denyut', laju: 0.4, besar: 1.6, fase: 0 }),                 // bola lampu (berdenyut)
    ],
  },

  // ============================================================ TANAMAN POT ==
  {
    id: 'tanaman-pot', nama: 'TANAMAN POT',
    ket: 'pot terakota + 7 daun panjang',
    pasang: 'lantai', lebar: 1.9, dalam: 1.9,
    bagian: [
      b(0.18, 0.18, 0, 1.54, 1.54, 1.24, 'terracotta', 'kerucut', 1.22), // badan pot
      b(0.06, 0.06, 1.2, 1.78, 1.78, 0.22, 'terracotta', 'silinder'),    // bibir pot
      b(0.22, 0.22, 1.34, 1.46, 1.46, 0.1, 'wood-dark', 'silinder'),     // tanah
      beranim(b(0.94, 0.94, 1.4, 2.0, 0.42, 1.1, 'daun-sage', 'daun', undefined, 96),
        { jenis: 'ayun', laju: 0.22, besar: 1, fase: 0 }),
      beranim(b(0.94, 0.94, 1.4, 2.1, 0.42, 1.1, 'daun-gelap', 'daun', undefined, 74),
        { jenis: 'ayun', laju: 0.22, besar: 1, fase: 0.14 }),
      beranim(b(0.94, 0.94, 1.4, 1.9, 0.42, 1.1, 'daun-sage', 'daun', undefined, 118),
        { jenis: 'ayun', laju: 0.22, besar: 1, fase: 0.29 }),
      beranim(b(0.96, 0.96, 1.42, 1.6, 0.4, 1.0, 'daun-gelap', 'daun', undefined, 140),
        { jenis: 'ayun', laju: 0.22, besar: 1, fase: 0.43 }),
      beranim(b(0.96, 0.96, 1.42, 1.7, 0.4, 1.0, 'daun-sage', 'daun', undefined, 52),
        { jenis: 'ayun', laju: 0.22, besar: 1, fase: 0.57 }),
      beranim(b(1.0, 1.0, 1.46, 1.3, 0.38, 0.9, 'daun-gelap', 'daun', undefined, 166),
        { jenis: 'ayun', laju: 0.22, besar: 1, fase: 0.71 }),
      beranim(b(1.0, 1.0, 1.46, 1.35, 0.38, 0.9, 'daun-sage', 'daun', undefined, 26),
        { jenis: 'ayun', laju: 0.22, besar: 1, fase: 0.86 }),
    ],
  },

  // =========================================================== TEMPAT SAMPAH ==
  {
    id: 'tempat-sampah', nama: 'TEMPAT SAMPAH',
    ket: 'tong sampah gelap + 2 kertas remuk',
    pasang: 'lantai', lebar: 2.2, dalam: 1.4,
    bagian: [
      b(0.1, 0.1, 0, 1.0, 1.0, 1.32, 'slate', 'kerucut', 1.16),   // badan
      b(0.05, 0.05, 1.26, 1.1, 1.1, 0.14, 'metal', 'silinder'),   // bibir
      b(0.16, 0.16, 1.3, 0.88, 0.88, 0.08, 'chair-dark', 'silinder'), // lubang
      b(1.3, 0.16, 0, 0.3, 0.26, 0.22, 'kertas-putih', 'bola'),   // kertas remuk 1
      b(1.62, 0.4, 0, 0.24, 0.22, 0.2, 'kertas-putih', 'bola'),   // kertas remuk 2
    ],
  },

  // ================================================================= LAPTOP ==
  {
    id: 'laptop', nama: 'LAPTOP',
    ket: 'laptop terbuka: layar miring di belakang, papan tombol + trackpad',
    pasang: 'lantai', lebar: 2.0, dalam: 1.7,
    bagian: [
      b(0.05, 0.12, 0, 1.9, 1.46, 0.14, 'metal-light'),          // alas
      b(0.1, 0.1, 0, 1.8, 0.1, 0.06, 'metal'),                   // bibir belakang
      // LAYAR di sisi BELAKANG (w kecil) supaya tidak menutupi papan tombol
      b(0.1, 0.08, 0.14, 1.8, 0.12, 1.0, 'metal-light'),         // punggung layar
      b(0.18, 0.2, 0.22, 1.64, 0.05, 0.84, 'kertas-putih'),      // muka layar
      b(0.42, 0.24, 0.52, 0.5, 0.04, 0.4, 'kaca-terang', 'cakram'), // diagram bulat
      b(1.0, 0.24, 0.7, 0.56, 0.04, 0.1, 'slate'),               // garis diagram
      b(1.06, 0.24, 0.4, 0.44, 0.04, 0.08, 'slate'),             // garis diagram 2
      // papan tombol + trackpad (sisi depan)
      b(0.16, 0.5, 0.14, 1.68, 0.72, 0.05, 'slate'),             // papan tombol
      b(0.66, 1.3, 0.14, 0.62, 0.24, 0.05, 'metal'),             // trackpad
      b(0.06, 1.4, 0.14, 0.14, 0.1, 0.05, 'metal-light'),        // sudut depan kiri
    ],
  },

  // ========================================================= TUMPUKAN BUKU ==
  {
    id: 'tumpukan-buku', nama: 'TUMPUKAN BUKU',
    ket: '4 buku bertumpuk, warna berbeda',
    pasang: 'lantai', lebar: 1.5, dalam: 1.1,
    bagian: [
      b(0.06, 0.06, 0, 1.38, 1.0, 0.1, 'buku-biru'),          // sampul bawah
      b(0.1, 0.09, 0.1, 1.3, 0.94, 0.14, 'buku-krem'),        // halaman
      b(0.08, 0.05, 0.24, 1.34, 1.02, 0.08, 'buku-salmon'),   // sampul
      b(0.12, 0.08, 0.32, 1.26, 0.96, 0.16, 'buku-krem'),     // halaman
      b(0.1, 0.05, 0.48, 1.3, 1.0, 0.08, 'buku-lav'),         // sampul
      b(0.16, 0.1, 0.56, 1.18, 0.9, 0.16, 'buku-krem'),       // halaman
      b(0.14, 0.07, 0.72, 1.22, 0.94, 0.08, 'daun-sage'),     // sampul atas
    ],
  },

  // ============================================================ KALKULATOR ==
  {
    id: 'kalkulator', nama: 'KALKULATOR',
    ket: 'kalkulator gelap + 12 tombol + layar hijau',
    pasang: 'lantai', lebar: 1.2, dalam: 0.9,
    bagian: [
      b(0, 0, 0, 1.2, 0.9, 0.24, 'chair-dark'),                  // badan
      b(0.1, 0.1, 0.24, 1.0, 0.24, 0.05, 'daun-sage'),           // layar
      b(0.1, 0.42, 0.24, 0.16, 0.12, 0.05, 'slate'),             // tombol 1
      b(0.32, 0.42, 0.24, 0.16, 0.12, 0.05, 'slate'),            // tombol 2
      b(0.54, 0.42, 0.24, 0.16, 0.12, 0.05, 'slate'),            // tombol 3
      b(0.76, 0.42, 0.24, 0.16, 0.12, 0.05, 'slate'),            // tombol 4
      b(0.1, 0.58, 0.24, 0.16, 0.12, 0.05, 'slate'),             // tombol 5
      b(0.32, 0.58, 0.24, 0.16, 0.12, 0.05, 'slate'),            // tombol 6
      b(0.54, 0.58, 0.24, 0.16, 0.12, 0.05, 'slate'),            // tombol 7
      b(0.76, 0.58, 0.24, 0.16, 0.12, 0.05, 'slate'),            // tombol 8
      b(0.1, 0.74, 0.24, 0.16, 0.12, 0.05, 'slate'),             // tombol 9
      b(0.32, 0.74, 0.24, 0.16, 0.12, 0.05, 'slate'),            // tombol 10
      b(0.54, 0.74, 0.24, 0.16, 0.12, 0.05, 'slate'),            // tombol 11
      b(0.76, 0.74, 0.24, 0.16, 0.12, 0.05, 'amber'),            // tombol 12
    ],
  },

  // =========================================================== BINGKAI FOTO ==
  {
    id: 'bingkai-foto', nama: 'BINGKAI FOTO',
    ket: 'bingkai kayu + matte kertas (tempel di dinding)',
    pasang: 'dinding-kanan', lebar: 1.1, dalam: 0.16,
    bagian: [
      b(0, 0, 1.02, 1.1, 0.14, 0.14, 'kayu-terakota'),        // sisi atas
      b(0, 0, 0, 1.1, 0.14, 0.14, 'kayu-terakota'),           // sisi bawah
      b(0, 0, 0.14, 0.14, 0.14, 0.88, 'kayu-terakota'),       // sisi kiri
      b(0.96, 0, 0.14, 0.14, 0.14, 0.88, 'kayu-terakota'),    // sisi kanan
      b(0.14, 0.02, 0.14, 0.82, 0.06, 0.88, 'kertas-putih'),  // matte
      b(0.26, 0.0, 0.28, 0.58, 0.05, 0.6, 'gabus-tanah'),     // gambar dalam
    ],
  },
]

export function presetOf(id: string): Preset | undefined {
  return PRESETS.find(p => p.id === id)
}

// ATURAN 32 PIKsel DIHAPUS (2026-10-29): angka preset boleh sampai 3 desimal
const snap = (v: number) => Math.round(v * 1000) / 1000

/** total bagian semua preset (dipakai uji & ringkasan dokumen) */
export function jumlahBagian(): number {
  return PRESETS.reduce((n, p) => n + p.bagian.length, 0)
}

/**
 * Buat semua bagian untuk satu preset pada posisi (e, w, z).
 * Semua bagian memakai `grup` yang sama supaya tampil sebagai satu folder.
 */
// ===========================================================================
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
    zAwal: 2.3 },
  { id: 'tumpukan-buku', nama: 'TUMPUKAN BUKU', ket: 'pixel: tiga buku menumpuk',
    sprite: 'tumpukan-buku', lebar: 0.95, dalam: 0.95, pasang: 'lantai',
    zAwal: 2.3 },
  { id: 'kalkulator', nama: 'KALKULATOR', ket: 'pixel: kalkulator',
    sprite: 'kalkulator', lebar: 0.88, dalam: 0.88, pasang: 'lantai',
    zAwal: 2.3 },
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
    size: { e: Math.max(0.01, snap(preset.lebar)), w: Math.max(0.01, snap(preset.dalam)), z: 0.6 },
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
      e: Math.max(0.01, snap(bag.se)),
      w: Math.max(0.01, snap(bag.sw)),
      z: Math.max(0.01, snap(bag.sz)),
    },
    style: bag.style,
    ...(bag.bentuk ? { bentuk: bag.bentuk } : {}),
    ...(bag.puncak !== undefined ? { puncak: bag.puncak } : {}),
    ...(bag.miring !== undefined ? { miring: bag.miring } : {}),
    ...(bag.profil ? { profil: bag.profil } : {}),
    ...(bag.anim ? { anim: bag.anim } : {}),
    preset: preset.id,
    app: null,
    layer: 'main' as const,
    grup,
    grupNama: nama,
    urutan: urutanAwal + i,
  }))
}
