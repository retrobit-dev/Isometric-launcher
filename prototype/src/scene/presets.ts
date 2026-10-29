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
  /** siluet bebas untuk bentuk 'profil' — [u, z] 0..1 */
  profil?: [number, number][]
  anim?: Animasi
  /** false = tanpa garis tepi (dipakai untuk lipatan kain supaya halus) */
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

/** beri animasi ke satu bagian */
const beranim = (x: Bahan, a: Animasi): Bahan => ({ ...x, anim: a })

/** katalog objek — objek buatan sendiri, ditulis satu per satu. */
export const PRESETS: Preset[] = [
  // ================================================================ JENDELA ==
  // Objek pertama buatan sendiri (ronde 18) — tema diorama hangat aplikasi:
  // kusen KAYU hangat (kayu terang + kayu gelap), satu kaca langit besar,
  // palang silang kayu, matahari & awan, tirai kain diikat, batang gorden kayu.
  // Dipasang di DINDING KANAN (DT) seperti pada gambar referensi.
  //
  // Arah: kamera melihat dari +e/+w, jadi tebal jendela tumbuh ke +w (dari
  // permukaan dinding ke dalam ruangan). Ambang 2,06 (≈1,0 m) dan puncak kusen
  // 6,60 (≈3,3 m) — proporsi tinggi seperti jendela ruang kerja di referensi.
  {
    id: 'jendela', nama: 'JENDELA',
    ket: 'kusen kayu hangat, kaca langit + palang silang, tirai kain diikat',
    pasang: 'dinding-kanan', lebar: 4.2, dalam: 0.66,
    bagian: [
      // --- kusen kayu (tebal 0,26 supaya tidak jadi garis tipis) ---
      b(0.00, 0.04, 2.20, 0.26, 0.30, 4.40, 'kayu-tepi'),    // tiang kiri
      b(3.94, 0.04, 2.20, 0.26, 0.30, 4.40, 'kayu-tepi'),    // tiang kanan
      b(0.00, 0.04, 6.34, 4.20, 0.30, 0.26, 'kayu-tepi'),    // ambang atas
      b(0.00, 0.04, 2.20, 4.20, 0.30, 0.26, 'kayu-tepi'),    // ambang bawah
      bt(0.00, 0.30, 2.18, 0.10, 0.06, 4.44, 'kayu-gelap'),  // garis bayang kiri
      bt(4.10, 0.30, 2.18, 0.10, 0.06, 4.44, 'kayu-gelap'),  // garis bayang kanan
      // --- satu kaca langit besar + isi langit ---
      b(0.26, 0.12, 2.46, 3.68, 0.05, 3.88, 'kaca-langit'),
      b(0.98, 0.19, 5.14, 0.74, 0.03, 0.74, 'matahari', 'cakram'),
      bt(1.06, 0.19, 3.40, 0.94, 0.03, 0.28, 'pastel-awan'),
      bt(1.34, 0.19, 3.62, 0.54, 0.03, 0.22, 'pastel-awan'),
      bt(2.42, 0.19, 4.86, 0.84, 0.03, 0.26, 'pastel-awan'),
      // --- palang silang kayu di depan kaca ---
      b(2.02, 0.18, 2.46, 0.18, 0.08, 3.88, 'kayu-meja'),    // palang tegak
      b(0.26, 0.18, 4.28, 3.68, 0.08, 0.18, 'kayu-meja'),    // palang melintang
      // --- ambang bawah menjorok ke ruangan ---
      b(0.00, 0.00, 2.06, 4.20, 0.40, 0.14, 'kayu-tepi'),    // papan ambang
      b(0.00, 0.03, 2.00, 4.20, 0.34, 0.06, 'kayu-gelap'),   // bibir ambang
      // --- batang gorden kayu + ujung bulat + cincin ---
      b(0.00, 0.36, 6.66, 4.20, 0.10, 0.10, 'kayu-gelap'),
      b(0.00, 0.38, 6.58, 0.20, 0.14, 0.24, 'kayu-tepi', 'bola'),
      b(4.00, 0.38, 6.58, 0.20, 0.14, 0.24, 'kayu-tepi', 'bola'),
      b(0.34, 0.36, 6.58, 0.10, 0.10, 0.12, 'kayu-tepi', 'silinder'),
      b(2.06, 0.36, 6.58, 0.10, 0.10, 0.12, 'kayu-tepi', 'silinder'),
      b(3.78, 0.36, 6.58, 0.10, 0.10, 0.12, 'kayu-tepi', 'silinder'),
      // --- tirai kain (kiri) — kain krem hangat, lipatan tanpa garis tepi ---
      b(0.02, 0.38, 1.86, 0.74, 0.22, 4.74, 'tirai-putih'),  // panel kain
      bt(0.08, 0.60, 1.86, 0.15, 0.05, 4.74, 'buku-krem'),   // lipatan 1
      bt(0.40, 0.60, 1.86, 0.15, 0.05, 4.74, 'buku-krem'),   // lipatan 2
      bt(0.02, 0.58, 2.94, 0.74, 0.08, 0.20, 'kayu-tepi'),   // ikatan tirai
      // --- tirai kain (kanan) ---
      b(3.44, 0.38, 1.86, 0.74, 0.22, 4.74, 'tirai-putih'),
      bt(3.50, 0.60, 1.86, 0.15, 0.05, 4.74, 'buku-krem'),
      bt(3.82, 0.60, 1.86, 0.15, 0.05, 4.74, 'buku-krem'),
      bt(3.44, 0.58, 2.94, 0.74, 0.08, 0.20, 'kayu-tepi'),
    ],
  },

]

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

// Alat bantu di atas dipakai saat menambah objek baru; `b`/`bt`/`bp`/`beranim`
// sengaja tetap ada walau katalog kosong supaya penulisan preset berikutnya
// tidak perlu mengubah kontrak file ini.
export type { Bahan, Bentuk }
