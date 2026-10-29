// KATALOG OBJEK (preset) — dibuat dari referensi user 2026-10-29
// (Screenshot_20261029_072237.jpg: ruang kerja guru isometrik pastel).
//
// Satu "objek" di katalog ini sebenarnya KOMPOSISI beberapa balok (bagian),
// karena renderer hanya mengenal balok + lantai/dinding. Semua bagian masuk
// satu folder grup (grupNama = nama preset) sehingga bisa dipindah/diatur
// sebagai satu kesatuan di DAFTAR OBJEK, dan tiap bagian tetap bisa diubah
// sendiri-sendiri (warna, ukuran) bila perlu.
//
// ATURAN: semua angka kelipatan 0.1 (docs/01 §4). Tidak ada angka acak —
// semua bagian ditulis eksplisit supaya hasil di prototipe dan di APK identik
// (lihat docs/04-KONTRAK-RENDERER.md).

import type { SceneObject } from './types'

export interface PresetBagian {
  /** posisi sudut belakang-kiri-bawah bagian, relatif terhadap titik pasang */
  e: number
  w: number
  z: number
  se: number
  sw: number
  sz: number
  style: string
}

export type PresetPasang = 'lantai' | 'dinding-kanan' | 'dinding-kiri'

export interface Preset {
  id: string
  nama: string
  ket: string
  pasang: PresetPasang
  /** lebar (e) & dalam (w) total, untuk penempatan otomatis */
  lebar: number
  dalam: number
  bagian: PresetBagian[]
}

const b = (e: number, w: number, z: number, se: number, sw: number, sz: number, style: string): PresetBagian =>
  ({ e, w, z, se, sw, sz, style })

// --- potongan yang dipakai berulang ---
const bukuBaris = (e0: number, w0: number, z0: number, n: number, warna: string[]): PresetBagian[] =>
  Array.from({ length: n }, (_, i) => b(
    e0 + i * 0.2, w0, z0, 0.18, 0.9, 0.9 + (i % 3) * 0.1, warna[i % warna.length],
  ))

const kertas = (e: number, w: number, z: number, style = 'paper-night'): PresetBagian =>
  b(e, w, z, 0.6, 0.1, 0.8, style)

export const PRESETS: Preset[] = [
  // ------------------------------------------------------------------ MEJA --
  {
    id: 'meja-guru', nama: 'MEJA GURU',
    ket: 'meja kayu + laci berkas (4.6 × 2.2)',
    pasang: 'lantai', lebar: 4.6, dalam: 2.2,
    bagian: [
      b(0, 0, 2.2, 4.6, 2.2, 0.2, 'night-wood'),          // papan atas
      b(0.1, 0.1, 0, 0.2, 2.0, 2.2, 'wood-dark'),          // kaki kiri
      b(4.3, 0.1, 0, 0.2, 2.0, 2.2, 'wood-dark'),          // kaki kanan
      b(0.3, 0.1, 0.1, 4.0, 0.2, 2.0, 'wood'),             // sekat belakang
      b(1.4, 2.0, 1.5, 1.6, 0.2, 0.7, 'wood'),             // muka laci
      b(1.9, 2.15, 1.8, 0.6, 0.1, 0.1, 'metal-light'),     // gagang laci
      b(1.5, 1.75, 1.5, 0.5, 0.7, 0.6, 'book-red'),        // berkas di laci
      b(2.1, 1.75, 1.5, 0.5, 0.7, 0.6, 'book-green'),
    ],
  },
  // ----------------------------------------------------------------- KURSI --
  {
    id: 'kursi-putar', nama: 'KURSI PUTAR',
    ket: 'kursi kerja beroda (1.4 × 1.4)',
    pasang: 'lantai', lebar: 1.4, dalam: 1.4,
    bagian: [
      b(0.1, 0.1, 0, 1.2, 0.2, 0.2, 'chair-dark'),         // kaki depan-belakang
      b(0.1, 0.1, 0, 0.2, 1.2, 0.2, 'chair-dark'),         // kaki samping
      b(0.6, 0.6, 0.2, 0.2, 0.2, 0.9, 'metal-light'),      // tiang
      b(0.1, 0.1, 1.1, 1.2, 1.2, 0.2, 'chair-dark'),       // dudukan
      b(0.1, 0.1, 1.3, 1.2, 0.2, 1.2, 'chair-dark'),       // sandaran
      b(0.1, 0.1, 2.4, 1.2, 0.2, 0.1, 'slate'),            // bantalan atas
    ],
  },
  // -------------------------------------------------------------- RAK BUKU --
  {
    id: 'rak-buku', nama: 'RAK BUKU',
    ket: 'rak 3 tingkat + buku warna (3.0 × 1.0)',
    pasang: 'lantai', lebar: 3.0, dalam: 1.0,
    bagian: [
      b(0, 0, 0, 0.2, 1.0, 3.8, 'wood'),                   // dinding kiri
      b(2.8, 0, 0, 0.2, 1.0, 3.8, 'wood'),                 // dinding kanan
      b(0, 0, 3.6, 3.0, 1.0, 0.2, 'wood'),                 // atap
      b(0, 0, 0.1, 3.0, 0.1, 0.2, 'wood-dark'),            // alas
      b(0.2, 0, 1.2, 2.6, 1.0, 0.1, 'wood-dark'),          // rak 1
      b(0.2, 0, 2.4, 2.6, 1.0, 0.1, 'wood-dark'),          // rak 2
      ...bukuBaris(0.3, 0.1, 0.3, 6, ['book-red', 'book-green', 'book-blue', 'paper-night']),
      ...bukuBaris(0.3, 0.1, 1.3, 6, ['book-blue', 'book-red', 'book-green']),
      ...bukuBaris(0.3, 0.1, 2.5, 5, ['book-green', 'paper-night', 'book-red']),
    ],
  },
  // ------------------------------------------------------------ PAPAN TULIS --
  {
    id: 'papan-tulis', nama: 'PAPAN TULIS',
    ket: 'papan putih berkaki (4.4 × 1.0)',
    pasang: 'lantai', lebar: 4.4, dalam: 1.0,
    bagian: [
      b(0.5, 0.4, 0, 0.2, 0.2, 2.4, 'metal-light'),        // kaki kiri
      b(3.7, 0.4, 0, 0.2, 0.2, 2.4, 'metal-light'),        // kaki kanan
      b(0.4, 0.3, 0.1, 0.4, 0.5, 0.2, 'metal-light'),      // tapak kiri
      b(3.6, 0.3, 0.1, 0.4, 0.5, 0.2, 'metal-light'),      // tapak kanan
      b(0, 0.35, 2.2, 4.4, 0.2, 2.6, 'board'),             // papan putih
      b(0, 0.33, 2.1, 4.4, 0.1, 0.2, 'metal-light'),       // rangka bawah
      b(0, 0.33, 4.7, 4.4, 0.1, 0.2, 'metal-light'),       // rangka atas
      b(0, 0.33, 2.1, 0.15, 0.1, 2.8, 'metal-light'),      // rangka kiri
      b(4.25, 0.33, 2.1, 0.15, 0.1, 2.8, 'metal-light'),   // rangka kanan
    ],
  },
  // ------------------------------------------------------------- PAPAN GABUS --
  {
    id: 'papan-gabus', nama: 'PAPAN GABUS',
    ket: 'papan gabus + catatan (3.0, dipasang di dinding)',
    pasang: 'dinding-kiri', lebar: 3.0, dalam: 0.2,
    bagian: [
      b(0, 0, 2.2, 3.0, 0.15, 2.2, 'cork'),                // papan
      b(0, 0, 2.1, 3.0, 0.2, 0.15, 'wood'),                // rangka bawah
      b(0, 0, 4.3, 3.0, 0.2, 0.15, 'wood'),                // rangka atas
      b(0, 0, 2.1, 0.15, 0.2, 2.4, 'wood'),                // rangka kiri
      b(2.85, 0, 2.1, 0.15, 0.2, 2.4, 'wood'),             // rangka kanan
      kertas(0.3, 0.15, 3.4),
      kertas(1.0, 0.15, 2.8),
      kertas(1.9, 0.15, 3.6),
    ],
  },
  // ---------------------------------------------------------------- JENDELA --
  {
    id: 'jendela', nama: 'JENDELA',
    ket: 'jendela + tirai + kusen (4.6, dipasang di dinding)',
    pasang: 'dinding-kanan', lebar: 4.6, dalam: 0.4,
    bagian: [
      // kaca biru langit (2 tone vertikal, meniru langit di referensi)
      b(0.5, 0.1, 2.0, 3.6, 0.1, 1.6, 'pastel-blue'),
      b(0.5, 0.1, 3.6, 3.6, 0.1, 1.4, 'paper-night'),
      // kusen
      b(0.5, 0, 1.8, 3.6, 0.2, 0.2, 'paper'),              // ambang bawah
      b(0.5, 0, 5.0, 3.6, 0.2, 0.2, 'paper'),              // ambang atas
      b(0.5, 0, 1.8, 0.2, 0.2, 3.4, 'paper'),              // kusen kiri
      b(3.9, 0, 1.8, 0.2, 0.2, 3.4, 'paper'),              // kusen kanan
      b(2.2, 0, 2.0, 0.2, 0.15, 3.0, 'paper'),             // palang tengah
      // tirai kiri & kanan
      b(0.2, 0.12, 1.8, 0.6, 0.1, 3.4, 'curtain'),
      b(3.8, 0.12, 1.8, 0.6, 0.1, 3.4, 'curtain'),
      // batang tirai
      b(0, 0.05, 5.2, 4.6, 0.15, 0.15, 'metal-light'),
    ],
  },
  // ------------------------------------------------------------ LAMPU MEJA --
  {
    id: 'lampu-meja', nama: 'LAMPU MEJA',
    ket: 'lampu belajar (1.0 × 1.0)',
    pasang: 'lantai', lebar: 1.0, dalam: 1.0,
    bagian: [
      b(0.1, 0.1, 0, 0.8, 0.8, 0.15, 'slate'),             // alas
      b(0.4, 0.4, 0.15, 0.2, 0.2, 1.5, 'metal-light'),     // batang
      b(0.2, 0.4, 1.6, 0.8, 0.2, 0.2, 'metal-light'),      // lengan
      b(0.1, 0.3, 1.7, 0.9, 0.5, 0.5, 'chair-dark'),       // kap lampu
      b(0.2, 0.35, 1.65, 0.7, 0.4, 0.1, 'lamp-amber'),     // cahaya
    ],
  },
  // ------------------------------------------------------------------ TANAMAN --
  {
    id: 'tanaman-pot', nama: 'TANAMAN POT',
    ket: 'tanaman hias di pot terakota (1.4 × 1.4)',
    pasang: 'lantai', lebar: 1.4, dalam: 1.4,
    bagian: [
      b(0.3, 0.3, 0, 0.8, 0.8, 0.7, 'terracotta'),         // pot
      b(0.4, 0.4, 0.65, 0.6, 0.6, 0.1, 'wood-dark'),       // tanah
      b(0.6, 0.6, 0.7, 0.15, 0.15, 1.5, 'plant'),          // batang
      b(0.35, 0.45, 1.4, 0.5, 0.3, 0.5, 'plant'),          // daun kiri
      b(0.75, 0.35, 1.7, 0.45, 0.3, 0.5, 'plant'),         // daun kanan
      b(0.55, 0.25, 2.0, 0.3, 0.4, 0.4, 'plant'),          // daun belakang
      b(0.6, 0.7, 1.2, 0.3, 0.4, 0.4, 'plant'),            // daun depan
    ],
  },
  // ------------------------------------------------------------ TEMPAT SAMPAH --
  {
    id: 'tempat-sampah', nama: 'TEMPAT SAMPAH',
    ket: 'keranjang sampah + kertas (1.2 × 1.2)',
    pasang: 'lantai', lebar: 1.2, dalam: 1.2,
    bagian: [
      b(0.1, 0.1, 0, 1.0, 1.0, 1.2, 'slate'),              // badan
      b(0.05, 0.05, 1.2, 1.1, 1.1, 0.1, 'metal'),          // bibir
      b(0.3, 0.3, 1.15, 0.3, 0.3, 0.2, 'paper'),           // kertas penyok
      b(0.6, 0.4, 1.15, 0.25, 0.25, 0.18, 'paper-night'),
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
      b(0.2, 0.1, 0.1, 1.3, 0.2, 0.05, 'slate'),           // sandaran tangan
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
      b(0, 0, 0, 1.6, 1.2, 0.15, 'book-red'),
      b(0.1, 0.1, 0.15, 1.4, 1.0, 0.15, 'paper-night'),
      b(0, 0.05, 0.3, 1.5, 1.1, 0.15, 'book-green'),
      b(0.1, 0.15, 0.45, 1.3, 0.9, 0.15, 'paper-night'),
      b(0.05, 0.1, 0.6, 1.4, 1.0, 0.15, 'book-blue'),
    ],
  },
  // -------------------------------------------------------------- KALKULATOR --
  {
    id: 'kalkulator', nama: 'KALKULATOR',
    ket: 'kalkulator meja (0.8 × 0.6)',
    pasang: 'lantai', lebar: 0.8, dalam: 0.6,
    bagian: [
      b(0, 0, 0, 0.8, 0.6, 0.15, 'slate'),
      b(0.05, 0.05, 0.15, 0.7, 0.2, 0.05, 'paper-night'),  // layar
      b(0.05, 0.3, 0.15, 0.7, 0.25, 0.05, 'metal'),        // tombol
    ],
  },
]

export function presetOf(id: string): Preset | undefined {
  return PRESETS.find(p => p.id === id)
}

const snap = (v: number) => Math.round(v * 10) / 10

/**
 * Buat semua balok untuk satu preset pada posisi (e, w, z).
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
    pos: {
      e: snap(e0 + bag.e),
      w: snap(w0 + bag.w),
      z: snap(z0 + bag.z),
    },
    size: {
      e: Math.max(0.1, snap(bag.se)),
      w: Math.max(0.1, snap(bag.sw)),
      z: Math.max(0.1, snap(bag.sz)),
    },
    style: bag.style,
    app: null,
    layer: 'main' as const,
    grup,
    grupNama: nama,
    urutan: urutanAwal + i,
  }))
}
