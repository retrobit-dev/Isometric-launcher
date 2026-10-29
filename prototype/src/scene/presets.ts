// KATALOG OBJEK (preset) — dibuat dari referensi user 2026-10-29
// (Screenshot_20261029_072237.jpg: ruang kerja guru isometrik pastel).
//
// Satu "objek" di katalog ini adalah KOMPOSISI beberapa bagian, karena
// renderer hanya mengenal balok / silinder / kerucut (+ lantai & dinding).
// Semua bagian masuk satu folder grup (grupNama = nama preset) sehingga bisa
// dipindah/diatur sebagai satu kesatuan di DAFTAR OBJEK, dan tiap bagian tetap
// bisa diubah sendiri-sendiri (warna, ukuran) bila perlu.
//
// ATURAN: semua angka kelipatan 0.1 (docs/01 §4). Tidak ada angka acak —
// semua bagian ditulis eksplisit supaya hasil di prototipe dan di APK identik
// (lihat docs/04-KONTRAK-RENDERER.md).
//
// 2026-10-29 (permintaan user): jumlah bagian DISEDERHANAKAN. Bagian yang dulu
// ditumpuk dari banyak balok kecil sekarang memakai silinder/kerucut, mis.
// rak buku 22 balok -> 9, lampu meja 5 -> 3, tanaman 7 -> 5, jendela 25 -> 19.

import type { SceneObject } from './types'

interface Bahan {
  e: number
  w: number
  z: number
  se: number
  sw: number
  sz: number
  style: string
  bentuk?: 'silinder' | 'kerucut'
  puncak?: number
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

const b = (e: number, w: number, z: number, se: number, sw: number, sz: number,
  style: string, bentuk?: 'silinder' | 'kerucut', puncak?: number): Bahan =>
  ({ e, w, z, se, sw, sz, style, ...(bentuk ? { bentuk } : {}), ...(puncak !== undefined ? { puncak } : {}) })

/** satu blok buku per rak (bukan puluhan buku kecil) supaya jumlah objek kecil */
const blokBuku = (e: number, w: number, z: number, lebar: number, style: string): Bahan =>
  b(e, w, z, lebar, 0.9, 0.9, style)

export const PRESETS: Preset[] = [
  // ------------------------------------------------------------------ MEJA --
  {
    id: 'meja-guru', nama: 'MEJA GURU',
    ket: 'meja kayu + laci berkas (4.6 × 2.2)',
    pasang: 'lantai', lebar: 4.6, dalam: 2.2,
    bagian: [
      b(0, 0, 2.2, 4.6, 2.2, 0.2, 'night-wood'),           // papan atas
      b(0.1, 0.1, 0, 0.2, 2.0, 2.2, 'wood-dark'),          // kaki kiri
      b(4.3, 0.1, 0, 0.2, 2.0, 2.2, 'wood-dark'),          // kaki kanan
      b(0.3, 0.1, 0.1, 4.0, 0.2, 2.0, 'wood'),             // sekat belakang
      b(1.4, 2.0, 1.5, 1.6, 0.2, 0.7, 'wood'),             // muka laci
      b(1.9, 2.15, 1.8, 0.6, 0.1, 0.1, 'metal-light'),     // gagang laci
      b(1.5, 1.75, 1.5, 0.9, 0.7, 0.6, 'book-red'),        // berkas di laci
    ],
  },
  // ----------------------------------------------------------------- KURSI --
  {
    id: 'kursi-putar', nama: 'KURSI PUTAR',
    ket: 'kursi kerja beroda (1.4 × 1.4)',
    pasang: 'lantai', lebar: 1.4, dalam: 1.4,
    bagian: [
      b(0.1, 0.1, 0, 1.2, 1.2, 0.2, 'chair-dark', 'silinder'), // kaki cakram
      b(0.55, 0.55, 0.2, 0.3, 0.3, 0.9, 'metal-light', 'silinder'), // tiang
      b(0.1, 0.1, 1.1, 1.2, 1.2, 0.2, 'chair-dark'),       // dudukan
      b(0.1, 0.1, 1.3, 1.2, 0.2, 1.2, 'chair-dark'),       // sandaran
      b(0.1, 0.1, 2.4, 1.2, 0.2, 0.1, 'slate'),            // bantalan atas
    ],
  },
  // -------------------------------------------------------------- RAK BUKU --
  {
    id: 'rak-buku', nama: 'RAK BUKU',
    ket: 'rak 3 tingkat + blok buku (3.0 × 1.0)',
    pasang: 'lantai', lebar: 3.0, dalam: 1.0,
    bagian: [
      b(0, 0, 0, 0.2, 1.0, 3.8, 'wood'),                   // dinding kiri
      b(2.8, 0, 0, 0.2, 1.0, 3.8, 'wood'),                 // dinding kanan
      b(0, 0, 3.6, 3.0, 1.0, 0.2, 'wood'),                 // atap
      b(0.2, 0, 1.2, 2.6, 1.0, 0.1, 'wood-dark'),          // rak 1
      b(0.2, 0, 2.4, 2.6, 1.0, 0.1, 'wood-dark'),          // rak 2
      blokBuku(0.3, 0.1, 0.2, 1.2, 'book-green'),
      blokBuku(1.6, 0.1, 0.2, 1.0, 'book-red'),
      blokBuku(0.3, 0.1, 1.3, 1.5, 'book-blue'),
      blokBuku(0.4, 0.1, 2.5, 2.0, 'book-green'),
    ],
  },
  // ------------------------------------------------------------ PAPAN TULIS --
  {
    id: 'papan-tulis', nama: 'PAPAN TULIS',
    ket: 'papan putih berkaki (4.4 × 1.0)',
    pasang: 'lantai', lebar: 4.4, dalam: 1.0,
    bagian: [
      b(0.45, 0.4, 0, 0.25, 0.25, 2.4, 'metal-light', 'silinder'),  // kaki kiri
      b(3.7, 0.4, 0, 0.25, 0.25, 2.4, 'metal-light', 'silinder'),   // kaki kanan
      b(0.25, 0.3, 0.1, 0.7, 0.5, 0.2, 'metal-light'),     // tapak kiri
      b(3.45, 0.3, 0.1, 0.7, 0.5, 0.2, 'metal-light'),     // tapak kanan
      b(0, 0.35, 2.2, 4.4, 0.2, 2.6, 'board'),             // papan putih
      b(0, 0.33, 2.1, 4.4, 0.1, 2.8, 'metal-light'),       // rangka
      b(0, 0.2, 2.4, 0.4, 0.3, 0.2, 'metal-light'),        // baki spidol
    ],
  },
  // ------------------------------------------------------------- PAPAN GABUS --
  {
    id: 'papan-gabus', nama: 'PAPAN GABUS',
    ket: 'papan gabus + catatan (3.0, dinding kiri)',
    pasang: 'dinding-kiri', lebar: 3.0, dalam: 0.2,
    bagian: [
      b(0, 0, 2.2, 3.0, 0.15, 2.2, 'cork'),                // papan
      b(0, 0, 2.1, 3.0, 0.2, 0.15, 'wood'),                // rangka bawah
      b(0, 0, 4.3, 3.0, 0.2, 0.15, 'wood'),                // rangka atas
      b(0, 0, 2.1, 0.15, 0.2, 2.4, 'wood'),                // rangka kiri
      b(2.85, 0, 2.1, 0.15, 0.2, 2.4, 'wood'),             // rangka kanan
      b(0.4, 0.15, 3.3, 0.7, 0.1, 0.9, 'paper-night'),     // catatan 1
      b(1.7, 0.15, 2.7, 0.7, 0.1, 0.9, 'paper-night'),     // catatan 2
    ],
  },
  // ---------------------------------------------------------------- JENDELA --
  {
    id: 'jendela', nama: 'JENDELA',
    ket: 'jendela 3×2 + tirai + batang (5.2, dinding kanan)',
    pasang: 'dinding-kanan', lebar: 5.2, dalam: 0.5,
    bagian: [
      // kusen luar (putih), tipis 0.14
      b(0.6, 0, 1.8, 4.0, 0.14, 0.2, 'board'),              // ambang bawah
      b(0.6, 0, 5.0, 4.0, 0.14, 0.2, 'board'),              // ambang atas
      b(0.6, 0, 1.8, 0.2, 0.14, 3.4, 'board'),              // kusen kiri
      b(4.4, 0, 1.8, 0.2, 0.14, 3.4, 'board'),              // kusen kanan
      // kaca: 2 pita (bawah = horizon lebih terang, atas = langit lebih biru)
      b(0.8, 0.02, 2.0, 3.6, 0.06, 1.44, 'pastel-blue'),
      b(0.8, 0.02, 3.56, 3.6, 0.06, 1.44, 'book-blue'),
      // matahari + awan
      b(3.44, 0.09, 4.32, 0.48, 0.05, 0.48, 'pastel-butter'),
      b(2.18, 0.09, 4.14, 0.72, 0.05, 0.22, 'paper'),
      b(0.92, 0.09, 3.10, 0.58, 0.05, 0.18, 'paper'),
      // palang kusen
      b(1.92, 0.07, 2.0, 0.12, 0.09, 3.0, 'board'),
      b(3.16, 0.07, 2.0, 0.12, 0.09, 3.0, 'board'),
      b(0.8, 0.07, 3.44, 3.6, 0.09, 0.12, 'board'),
      // ambang jendela
      b(0.45, 0.14, 1.58, 4.3, 0.28, 0.22, 'paper'),
      // tirai (menyempit di tengah) + tali
      b(0.12, 0.18, 3.45, 0.8, 0.12, 1.85, 'curtain'),
      b(0.2, 0.19, 1.7, 0.7, 0.11, 1.75, 'curtain'),
      b(4.28, 0.18, 3.45, 0.8, 0.12, 1.85, 'curtain'),
      b(4.3, 0.19, 1.7, 0.7, 0.11, 1.75, 'curtain'),
      b(0.34, 0.16, 3.28, 0.36, 0.16, 0.2, 'paper'),
      b(4.5, 0.16, 3.28, 0.36, 0.16, 0.2, 'paper'),
      // batang tirai (silinder) + 2 cincin
      b(0.05, 0.16, 5.34, 5.1, 0.14, 0.14, 'metal-light', 'silinder'),
      b(0.35, 0.14, 5.32, 0.12, 0.18, 0.18, 'board'),
      b(4.65, 0.14, 5.32, 0.12, 0.18, 0.18, 'board'),
    ],
  },
  // ------------------------------------------------------------ LAMPU MEJA --
  {
    id: 'lampu-meja', nama: 'LAMPU MEJA',
    ket: 'lampu belajar (1.0 × 1.0)',
    pasang: 'lantai', lebar: 1.0, dalam: 1.0,
    bagian: [
      b(0.1, 0.1, 0, 0.8, 0.8, 0.15, 'slate', 'silinder'),      // alas
      b(0.4, 0.4, 0.15, 0.2, 0.2, 1.6, 'metal-light', 'silinder'), // batang
      b(0.05, 0.05, 1.6, 0.9, 0.9, 0.7, 'chair-dark', 'kerucut', 0.45), // kap
    ],
  },
  // ------------------------------------------------------------------ TANAMAN --
  {
    id: 'tanaman-pot', nama: 'TANAMAN POT',
    ket: 'tanaman hias di pot terakota (1.4 × 1.4)',
    pasang: 'lantai', lebar: 1.4, dalam: 1.4,
    bagian: [
      b(0.3, 0.3, 0, 0.8, 0.8, 0.7, 'terracotta', 'kerucut', 1.15), // pot
      b(0.6, 0.6, 0.7, 0.15, 0.15, 1.3, 'plant', 'silinder'),      // batang
      b(0.3, 0.35, 1.3, 0.8, 0.7, 0.7, 'plant', 'kerucut', 0.2),   // daun bawah
      b(0.45, 0.5, 1.8, 0.6, 0.5, 0.6, 'plant', 'kerucut', 0.1),   // daun atas
    ],
  },
  // ------------------------------------------------------------ TEMPAT SAMPAH --
  {
    id: 'tempat-sampah', nama: 'TEMPAT SAMPAH',
    ket: 'keranjang sampah + kertas (1.2 × 1.2)',
    pasang: 'lantai', lebar: 1.2, dalam: 1.2,
    bagian: [
      b(0.1, 0.1, 0, 1.0, 1.0, 1.2, 'slate', 'kerucut', 1.1),  // badan (melebar ke atas)
      b(0.35, 0.35, 1.1, 0.3, 0.3, 0.2, 'paper'),              // kertas penyok
      b(0.6, 0.4, 1.1, 0.25, 0.25, 0.18, 'paper-night'),
    ],
  },
  // ------------------------------------------------------------------ LAPTOP --
  {
    id: 'laptop', nama: 'LAPTOP',
    ket: 'laptop terbuka (1.8 × 1.4)',
    pasang: 'lantai', lebar: 1.8, dalam: 1.4,
    bagian: [
      b(0, 0.2, 0, 1.8, 1.1, 0.1, 'metal'),                // badan bawah
      b(0.05, 0.3, 0.1, 1.7, 0.9, 0.05, 'slate'),          // papan tombol
      b(0.1, 0.05, 0.1, 1.6, 0.15, 1.1, 'metal-light'),    // layar
      b(0.2, 0.08, 0.25, 1.4, 0.05, 0.8, 'paper-night'),   // isi layar
    ],
  },
  // ------------------------------------------------------------ TUMPUKAN BUKU --
  {
    id: 'tumpukan-buku', nama: 'TUMPUKAN BUKU',
    ket: '3 buku bertumpuk (1.6 × 1.2)',
    pasang: 'lantai', lebar: 1.6, dalam: 1.2,
    bagian: [
      b(0, 0, 0, 1.6, 1.2, 0.2, 'book-red'),
      b(0.1, 0.1, 0.2, 1.4, 1.0, 0.2, 'paper-night'),
      b(0.05, 0.05, 0.4, 1.5, 1.1, 0.2, 'book-green'),
    ],
  },
  // -------------------------------------------------------------- KALKULATOR --
  {
    id: 'kalkulator', nama: 'KALKULATOR',
    ket: 'kalkulator meja (0.8 × 0.6)',
    pasang: 'lantai', lebar: 0.8, dalam: 0.6,
    bagian: [
      b(0, 0, 0, 0.8, 0.6, 0.15, 'slate'),
      b(0.05, 0.05, 0.15, 0.7, 0.3, 0.05, 'paper-night'),
    ],
  },
]

export function presetOf(id: string): Preset | undefined {
  return PRESETS.find(p => p.id === id)
}

const snap = (v: number) => Math.round(v * 10) / 10

/** total bagian semua preset (dipakai uji & ringkasan dokumen) */
export function jumlahBagian(): number {
  return PRESETS.reduce((n, p) => n + p.bagian.length, 0)
}

/**
 * Buat semua bagian untuk satu preset pada posisi (e, w, z).
 * Semua bagian memakai `grup` yang sama supaya tampil sebagai satu folder.
 */
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
      e: Math.max(0.1, snap(bag.se)),
      w: Math.max(0.1, snap(bag.sw)),
      z: Math.max(0.1, snap(bag.sz)),
    },
    style: bag.style,
    ...(bag.bentuk ? { bentuk: bag.bentuk } : {}),
    ...(bag.puncak !== undefined ? { puncak: bag.puncak } : {}),
    app: null,
    layer: 'main' as const,
    grup,
    grupNama: nama,
    urutan: urutanAwal + i,
  }))
}
