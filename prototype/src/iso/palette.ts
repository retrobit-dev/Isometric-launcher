// ===========================================================================
// TEMA "DIORAMA HANGAT" x PALET RETRO ENDESGA 32 — ronde 38 (2026-10-29)
// ===========================================================================
// Permintaan user: "untuk semuanya bisakah style nya dan palette warna nya
// dibuat lebih ke arah retro pixel art?"  Pilihan user saat ditanya:
//   ciri = DITHERING · palet = ENDESGA 32 · cakupan = SEMUA bagian.
//
// Jadi file ini sekarang DITULIS LANGSUNG dalam 32 warna Endesga (bukan lagi
// hasil pembulatan 342 warna ronde 13 — pembulatan otomatis membuat banyak
// nada melebur jadi satu warna, ruangan jadi rata). Nama material TIDAK
// berubah supaya data scene/preset pengguna tetap sah.
//
// ATURAN GAYA (yang membuat gambar terasa retro 16-bit):
//   1. Keluarga warna tetap hangat (oranye–cokelat–krem); biru/ungu hanya
//      untuk langit, kaca, dan aksen buku. Latar luar = HITAM OLED #000000.
//   2. Tiap material punya TIGA nada dari SATU tangga warna Endesga:
//      atas paling terang, lalu turun 1 langkah (kanan), turun 2 langkah (kiri)
//      — cell-shading, bukan gradasi.
//   3. Peralihan warna (lantai, dinding, langit) memakai DITHERING 4x4
//      (iso/dither.ts), bukan campuran warna: campuran akan menghasilkan warna
//      di luar 32 palet.
//   4. Tanpa outline objek (permintaan ronde 19, masih berlaku).
// ===========================================================================

import { OLED, gelap as gelapPalet, kePalet as Q } from './palet-referensi'
import { GELAP_MAKS, keRetro } from './palet-retro'

/** campur dua warna hex, t = 0..1 (dipakai untuk warna UI/overlay saja) */
function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16)
  const pb = parseInt(b.slice(1), 16)
  const ch = (sh: number) =>
    Math.round((((pa >> sh) & 255) * (1 - t)) + (((pb >> sh) & 255) * t))
  return '#' + [16, 8, 0].map(sh => ch(sh).toString(16).padStart(2, '0')).join('')
}

/**
 * "Gelapkan" versi retro: turun beberapa LANGKAH TANGGA warna Endesga.
 * Tidak mencampur warna, jadi hasilnya selalu salah satu dari 32 warna.
 * f = 1 -> tanpa perubahan; f makin kecil -> makin banyak langkah turun.
 */
function shade(hex: string, f: number): string {
  return gelapPalet(Q(hex), Math.max(1, Math.round((1 - f) * 4)))
}

export const PAL = {
  void: OLED,            // luar ruangan: HITAM OLED murni #000000 (permintaan user 2026-10-29)
  voidGlow: OLED,        // tidak dipakai lagi: OLED butuh hitam rata, bukan pendar

  // dinding: muka teduh (DB/kiri) dan muka kena cahaya (DT/kanan)
  wallB: '#b86f50',      // cokelat hangat (sisi teduh)
  wallT: '#e4a672',      // tan kena cahaya (sisi terang)
  wallHi: '#ead4aa',     // sorot krem di bagian atas muka dinding
  trimB: '#733e39',      // plint kayu (sisi teduh)
  trimT: '#b86f50',      // plint kayu (sisi cahaya)
  seam: '#3e2731',       // pertemuan dua dinding (sudut dalam)

  floorBase: '#d77643',  // ubin terakota (nada utama)
  floorAlt: '#b86f50',   // ubin selang (nada teduh)
  floorC: '#c28569',     // ubin selang (nada terang)
  grout: '#733e39',      // nat ubin

  skirtL: '#733e39',     // tepi slab = deck papan (sisi teduh)
  skirtR: '#3e2731',     // deck papan (sisi paling teduh)
  deckSeam: '#3e2731',   // sambungan papan pada tepi slab
  deckLight: '#e4a672',  // rim terang di bibir atas deck

  beam: '#733e39',       // balok kayu gelap (cornice)
  beamTop: '#b86f50',    // bibir balok kena cahaya
  beamDark: '#3e2731',   // bayangan di bawah balok
  post: '#b86f50',       // tiang kayu
  postLit: '#e4a672',    // tiang kena cahaya
  peg: '#e8b796',        // pasak bulat

  // --- lapisan bantu EDITOR (bukan karya: boleh semi-transparan) ---
  hud: '#ead4aa',
  ao: 'rgba(24,20,37,0.42)',
  grid: 'rgba(139,155,180,0.35)',
  zone: 'rgba(254,231,97,0.90)',
  tinta: '#3e2731',
} as const

export interface Mat { top: string; left: string; right: string }

/**
 * Material 3 nada dari satu warna atas. Nada diturunkan DARI tangga warna
 * Endesga (`lebihGelap`), jadi urutannya DIJAMIN atas > kanan > kiri.
 */
function M(top: string): Mat {
  const t = keRetro(top)
  const right = gelapPalet(t, 1)
  const left = gelapPalet(right, 1)
  return { top: t, left, right }
}

/** material dengan tiga nada pilihan sendiri (untuk aksen/pastel) */
function M3(top: string, right: string, left: string): Mat {
  return { top: keRetro(top), right: keRetro(right), left: keRetro(left) }
}

// ---------------------------------------------------------------------------
// MATERIAL OBJEK — 74 nama (nama lama DIPERTAHANKAN; warnanya retro Endesga)
// ---------------------------------------------------------------------------
export const MATERIALS: Record<string, Mat> = {
  // --- dasar ---
  wood: M('#c28569'),
  'wood-dark': M('#b86f50'),
  metal: M('#feae34'),            // kuningan (oranye tua -> kuning)
  paper: M('#ead4aa'),
  teal: M('#2ce8f5'),             // satu-satunya nada dingin terang (kaca/potion)
  cream: M('#e8b796'),
  amber: M('#feae34'),
  slate: M('#733e39'),
  crimson: M('#e43b44'),
  sage: M('#3e8948'),
  'night-wood': M('#b86f50'),
  board: M('#ead4aa'),            // papan tulis
  cork: M('#c28569'),
  'metal-light': M('#fee761'),
  curtain: M('#e8b796'),
  plant: M('#3e8948'),
  terracotta: M('#d77643'),
  'chair-dark': M('#3a4466'),     // kursi: biru-arang gelap (kontras di ruangan hangat)
  'lamp-amber': M('#fee761'),
  'book-red': M('#f6757a'),
  'book-green': M('#63c74d'),
  'book-blue': M('#5a6988'),
  'paper-night': M('#ead4aa'),

  // --- palet pastel (pilihan pengguna; kini versi retro-nya) ---
  'pastel-mint': M3('#c0cbdc', '#8b9bb4', '#5a6988'),
  'pastel-peach': M3('#e8b796', '#e4a672', '#c28569'),
  'pastel-lavender': M3('#b55088', '#68386c', '#3a4466'),
  'pastel-blue': M3('#c0cbdc', '#8b9bb4', '#5a6988'),
  'pastel-butter': M3('#fee761', '#feae34', '#f77622'),
  'pastel-rose': M3('#f6757a', '#e43b44', '#a22633'),
  'pastel-sage': M3('#63c74d', '#3e8948', '#265c42'),
  'pastel-clay': M3('#e4a672', '#c28569', '#b86f50'),

  // --- referensi ruang guru (nama dipakai katalog preset) ---
  'kayu-terakota': M('#d77643'),
  'kayu-tua': M('#b86f50'),
  'tirai-putih': M('#ead4aa'),
  'kaca-langit': M('#c0cbdc'),
  'kaca-terang': M('#fee761'),
  'daun-sage': M('#63c74d'),
  'daun-gelap': M('#3e8948'),
  'buku-biru': M('#0099db'),
  'buku-lav': M('#b55088'),
  'buku-salmon': M('#f6757a'),
  'buku-krem': M('#ead4aa'),
  'papan-krem': M('#ead4aa'),
  'kertas-putih': M('#ffffff'),
  'gabus-tanah': M('#d77643'),
  'buku-bata': M('#e43b44'),
  'buku-zaitun': M('#3e8948'),

  // --- material tema hangat ---
  jati: M('#b86f50'),
  'jati-muda': M('#c28569'),
  walnut: M('#733e39'),
  bata: M('#d77643'),
  lilin: M('#fee761'),
  tembaga: M('#d77643'),
  'kain-merah': M('#e43b44'),
  'kaca-jendela': M('#fee761'),

  // --- katalog 2026-10-29 ---
  'papan-putih': M('#ffffff'),
  perak: M('#c0cbdc'),
  'perak-tua': M('#8b9bb4'),
  'abu-tua': M('#3a4466'),
  abu: M('#5a6988'),
  'kayu-meja': M('#e4a672'),
  'kayu-tepi': M('#c28569'),
  'kayu-gelap': M('#b86f50'),
  'buku-gelap': M('#3a4466'),
  'buku-zaitun-tepi': M('#265c42'),
  'kusen-putih': M('#ffffff'),
  matahari: M('#fee761'),
  'tirai-gorden': M('#e8b796'),
  'tirai-lipat': M('#c28569'),
  // awan: putih RATA dengan perut abu-terang (tanpa tangga 3 nada)
  'pastel-awan': M3('#ffffff', '#c0cbdc', '#c0cbdc'),
  zaitun: M('#3e8948'),
  'zaitun-tua': M('#265c42'),
  'krem-hangat': M('#e8b796'),
  'terakota-muda': M('#d77643'),
}

// ---------------------------------------------------------------------------
// PALET LANTAI (objek ber-role 'lantai' memakai field `style`)
// pattern 'papan' = papan kayu panjang · 'ubin' = ubin persegi 1x1 tile
// ---------------------------------------------------------------------------
export interface FloorMat {
  pattern: 'ubin' | 'papan'
  tones: [string, string, string]
  grout: string
  skirtL: string
  skirtR: string
  plank?: number
  grain?: string
}

export const FLOOR_MATERIALS: Record<string, FloorMat> = {
  // ubin terakota: tiga nada oranye + nat cokelat tua
  'lantai-terakota': {
    pattern: 'ubin',
    tones: ['#d77643', '#be4a2f', '#c28569'],
    grout: '#733e39',
    skirtL: PAL.skirtL,
    skirtR: PAL.skirtR,
  },
  // kayu jati hangat (papan panjang selang-seling)
  'lantai-kayu': {
    pattern: 'papan',
    tones: ['#b86f50', '#c28569', '#733e39'],
    grout: '#3e2731',
    skirtL: PAL.skirtL,
    skirtR: PAL.skirtR,
    plank: 4,
    grain: '#3e2731',
  },
  'lantai-kayu-terang': {
    pattern: 'papan',
    tones: ['#e4a672', '#c28569', '#e8b796'],
    grout: '#b86f50',
    skirtL: '#c28569',
    skirtR: '#733e39',
    plank: 4,
    grain: '#b86f50',
  },
  'lantai-kayu-gelap': {
    pattern: 'papan',
    tones: ['#733e39', '#3e2731', '#b86f50'],
    grout: '#181425',
    skirtL: '#3e2731',
    skirtR: '#181425',
    plank: 4,
    grain: '#3e2731',
  },
  'lantai-ubin': {
    pattern: 'ubin',
    tones: [PAL.floorBase, PAL.floorAlt, PAL.floorC],
    grout: PAL.grout,
    skirtL: PAL.skirtL,
    skirtR: PAL.skirtR,
  },
  // --- palet pastel (versi retro Endesga) ---
  'lantai-pastel-krem': {
    pattern: 'papan',
    tones: ['#ead4aa', '#e8b796', '#e4a672'],
    grout: '#c28569', skirtL: '#d77643', skirtR: '#b86f50', plank: 4, grain: '#c28569',
  },
  'lantai-pastel-sakura': {
    pattern: 'papan',
    tones: ['#f6757a', '#e43b44', '#b55088'],
    grout: '#a22633', skirtL: '#e43b44', skirtR: '#a22633', plank: 4, grain: '#a22633',
  },
  'lantai-pastel-mint': {
    pattern: 'papan',
    tones: ['#63c74d', '#3e8948', '#8b9bb4'],
    grout: '#265c42', skirtL: '#3e8948', skirtR: '#265c42', plank: 4, grain: '#265c42',
  },
  'lantai-pastel-lavender': {
    pattern: 'papan',
    tones: ['#b55088', '#68386c', '#8b9bb4'],
    grout: '#3a4466', skirtL: '#68386c', skirtR: '#3a4466', plank: 4, grain: '#3a4466',
  },
  'lantai-pastel-biru': {
    pattern: 'papan',
    tones: ['#c0cbdc', '#8b9bb4', '#5a6988'],
    grout: '#3a4466', skirtL: '#8b9bb4', skirtR: '#5a6988', plank: 4, grain: '#5a6988',
  },
  'lantai-pastel-ijo': {
    pattern: 'papan',
    tones: ['#63c74d', '#3e8948', '#265c42'],
    grout: '#193c3e', skirtL: '#3e8948', skirtR: '#265c42', plank: 4, grain: '#265c42',
  },
}
export const FLOOR_KEYS = Object.keys(FLOOR_MATERIALS)
export const FLOOR_DEFAULT = 'lantai-terakota'

export function floorMat(name: unknown): FloorMat {
  return (typeof name === 'string' && FLOOR_MATERIALS[name]) || FLOOR_MATERIALS[FLOOR_DEFAULT]
}

export const MATERIAL_KEYS = Object.keys(MATERIALS)

// Palet ruangan yang ditampilkan di panel PALET preview
export const ROOM_PALETTE_SWATCHES: { name: string; hex: string }[] = [
  { name: 'void', hex: PAL.void },
  { name: 'dinding-teduh', hex: PAL.wallB },
  { name: 'dinding-cahaya', hex: PAL.wallT },
  { name: 'sorot-dinding', hex: PAL.wallHi },
  { name: 'plint-teduh', hex: PAL.trimB },
  { name: 'plint-cahaya', hex: PAL.trimT },
  { name: 'ubin-a', hex: PAL.floorBase },
  { name: 'ubin-b', hex: PAL.floorAlt },
  { name: 'ubin-c', hex: PAL.floorC },
  { name: 'nat-ubin', hex: PAL.grout },
  { name: 'deck-cahaya', hex: PAL.skirtL },
  { name: 'deck-teduh', hex: PAL.skirtR },
  { name: 'balok-atas', hex: PAL.beam },
  { name: 'tiang', hex: PAL.post },
]

// ---------------------------------------------------------------------------
// PALET DINDING (objek ber-role 'dinding' lewat field `style`)
// `kiri` = muka teduh (DB), `kanan` = muka kena cahaya (DT).
// ---------------------------------------------------------------------------
export interface WallMat {
  kiri: string
  kanan: string
  trimKiri: string
  trimKanan: string
}

export const WALL_MATERIALS: Record<string, WallMat> = {
  // tema utama: dinding tan hangat + plint jati
  'dinding-hangat': { kiri: PAL.wallB, kanan: PAL.wallT, trimKiri: PAL.trimB, trimKanan: PAL.trimT },
  'dinding-bata': { kiri: '#be4a2f', kanan: '#d77643', trimKiri: '#733e39', trimKanan: '#a22633' },
  'dinding-kayu': { kiri: '#733e39', kanan: '#b86f50', trimKiri: '#3e2731', trimKanan: '#733e39' },
  'dinding-krem': { kiri: '#e4a672', kanan: '#ead4aa', trimKiri: PAL.trimB, trimKanan: PAL.trimT },
  'dinding-teal': { kiri: '#265c42', kanan: '#3e8948', trimKiri: '#193c3e', trimKanan: '#265c42' },
  'dinding-kertas': { kiri: '#c28569', kanan: '#e8b796', trimKiri: PAL.trimB, trimKanan: PAL.trimT },
  // nama lama dipertahankan agar data lama tetap sah
  'dinding-navy': { kiri: '#3a4466', kanan: '#5a6988', trimKiri: '#262b44', trimKanan: '#3a4466' },
  // --- dinding pastel (versi retro) ---
  'dinding-pastel-krem': { kiri: '#e4a672', kanan: '#ead4aa', trimKiri: '#b86f50', trimKanan: '#c28569' },
  'dinding-pastel-sakura': { kiri: '#e43b44', kanan: '#f6757a', trimKiri: '#a22633', trimKanan: '#e43b44' },
  'dinding-pastel-mint': { kiri: '#3e8948', kanan: '#63c74d', trimKiri: '#265c42', trimKanan: '#3e8948' },
  'dinding-pastel-lavender': { kiri: '#68386c', kanan: '#b55088', trimKiri: '#3a4466', trimKanan: '#68386c' },
  'dinding-pastel-biru': { kiri: '#8b9bb4', kanan: '#c0cbdc', trimKiri: '#5a6988', trimKanan: '#8b9bb4' },
  'dinding-pastel-kuning': { kiri: '#feae34', kanan: '#fee761', trimKiri: '#d77643', trimKanan: '#f77622' },
}
export const WALL_KEYS = Object.keys(WALL_MATERIALS)
export const WALL_DEFAULT = 'dinding-hangat'

// Semua style yang SAH untuk objek dinding: palet dinding dulu, lalu material balok.
export const WALL_STYLE_KEYS = [...WALL_KEYS, ...Object.keys(MATERIALS)]

// Style yang tidak dikenal TIDAK diam-diam jadi kayu: dipetakan ke PINK pekat
// (#ff0044, anggota palet) supaya kesalahan data langsung terlihat di layar.
export const UNKNOWN_STYLE = {
  top: '#ff0044',
  left: GELAP_MAKS,
  right: '#68386c',
}

/** Warna muka + plint dinding untuk sebuah style & sisi. */
export function wallColors(style: unknown, side: 'kiri' | 'kanan') {
  const kiri = side !== 'kanan'
  const name = typeof style === 'string' ? style : ''
  const wm = WALL_MATERIALS[name]
  if (wm) return { face: kiri ? wm.kiri : wm.kanan, trim: kiri ? wm.trimKiri : wm.trimKanan }
  const m = MATERIALS[name]
  if (m) return { face: kiri ? m.left : m.top, trim: m.right }
  // dinding lama tanpa style sah ('dinding-kiri' / 'dinding-kanan') -> tema hangat
  if (!name || name === 'dinding-kiri' || name === 'dinding-kanan') {
    return { face: kiri ? PAL.wallB : PAL.wallT, trim: kiri ? PAL.trimB : PAL.trimT }
  }
  return { face: UNKNOWN_STYLE.top, trim: UNKNOWN_STYLE.right }   // pink = bug
}

export { keRetro as keRetroWarna, mix as mixWarna, shade as gelapkanWarna }
