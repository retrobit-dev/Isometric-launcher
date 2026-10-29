// ===========================================================================
// TEMA "DIORAMA HANGAT" x PALET REFERENSI 51 WARNA — ronde 39 (2026-10-29)
// ===========================================================================
// Permintaan user: "Saya rasa masih terlihat terlalu modern, bisa buat seperti
// referensi untuk Style dan warnanya?" + dua gambar diorama pixel-art
// (rumah Tudor beratap bata, tanah mint, jalan batu krem, pohon hijau cerah).
//
// Jawaban user: palet BARU dari referensi · outline DIPAKAI lagi (ronde 19
// dicabut) · latar tetap HITAM OLED · dinding TUDOR (krem + balok kayu).
//
// Palet: 51 warna hasil ekstrak kedua gambar, disusun 10 tangga nada
// (`palet-retro.ts`). Palet Endesga 32 (ronde 38) tidak dipakai lagi.
//
// ATURAN GAYA:
//   1. Semua warna dari 51 warna palet; latar luar hitam OLED #000000.
//   2. Tiap material 3 nada satu tangga: atas > kanan (1 turun) >= kiri (2 turun).
//   3. Setiap balok diberi OUTLINE 1 px berwarna `tinta()` — versi gelap dari
//      warna isinya (bukan hitam rata), seperti referensi.
//   4. Peralihan nada memakai DITHERING Bayer 4x4 (iso/dither.ts).
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
  void: OLED,            // luar ruangan: HITAM OLED murni #000000 (permintaan user, tetap)

  // DINDING TUDOR (ronde 39): plester krem + balok kayu gelap
  wallB: '#dadab8',      // plester sisi teduh (DB/kiri)
  wallT: '#f7f2cd',      // plester sisi kena cahaya (DT/kanan)
  wallHi: '#fff9e3',     // sorot paling terang
  trimB: '#5f3d28',      // balok kayu (sisi teduh)
  trimT: '#8a5a3a',      // balok kayu (sisi cahaya)
  seam: '#391d0b',       // pertemuan dua dinding (sudut dalam)

  // LANTAI BATU KREM seperti jalan di referensi
  floorBase: '#dadab8',
  floorAlt: '#c5c7a4',
  floorC: '#f1e1bb',
  grout: '#8e8a6d',      // nat batu

  // TEPI SLAB = papan kayu
  skirtL: '#8a5a3a',
  skirtR: '#5f3d28',
  deckSeam: '#391d0b',
  deckLight: '#c99b6a',

  // BALOK & TIANG
  beam: '#5f3d28',
  beamTop: '#8a5a3a',
  beamDark: '#391d0b',
  post: '#8a5a3a',
  postLit: '#a8764f',
  peg: '#e4b98a',

  // --- lapisan bantu EDITOR (bukan karya: boleh semi-transparan) ---
  hud: '#f7f2cd',
  ao: 'rgba(43,26,18,0.42)',
  grid: 'rgba(142,138,109,0.45)',
  zone: 'rgba(201,221,65,0.90)',
  tinta: '#391d0b',
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
  wood: M('#c99b6a'),
  'wood-dark': M('#8a5a3a'),
  metal: M('#f0ce92'),            // kuningan hangat
  paper: M('#fff9e3'),
  teal: M('#a9f3f2'),             // kaca/potion (dingin terang)
  cream: M('#f1e1bb'),
  amber: M('#fdd792'),
  slate: M('#8e8a6d'),
  crimson: M('#ee734c'),
  sage: M('#7ad46f'),
  'night-wood': M('#a8764f'),
  board: M('#f7f2cd'),            // papan tulis
  cork: M('#c99b6a'),
  'metal-light': M('#fdd792'),
  curtain: M('#f1e1bb'),
  plant: M('#4cb45c'),
  terracotta: M('#ef9762'),
  'chair-dark': M('#452d1e'),     // kursi: kayu sangat gelap
  'lamp-amber': M('#fdd792'),
  'book-red': M('#fb836b'),
  'book-green': M('#a3ed75'),
  'book-blue': M('#66b6cf'),
  'paper-night': M('#fff9e3'),

  // --- palet pastel (pilihan pengguna; versi palet referensi) ---
  'pastel-mint': M3('#cef4e5', '#8dd8a5', '#70c297'),
  'pastel-peach': M3('#f0ce92', '#ef9762', '#d8894a'),
  'pastel-lavender': M3('#a9e0ea', '#66b6cf', '#3f7fa3'),   // lavender -> biru pucat
  'pastel-blue': M3('#a9e0ea', '#66b6cf', '#3f7fa3'),
  'pastel-butter': M3('#fdd792', '#f0ce92', '#ef9762'),
  'pastel-rose': M3('#fb836b', '#ee734c', '#c95b3f'),
  'pastel-sage': M3('#a3ed75', '#7ad46f', '#4cb45c'),
  'pastel-clay': M3('#e4b98a', '#c99b6a', '#a8764f'),

  // --- referensi ruang guru (nama dipakai katalog preset) ---
  'kayu-terakota': M('#c99b6a'),
  'kayu-tua': M('#8a5a3a'),
  'tirai-putih': M('#fff9e3'),
  'kaca-langit': M('#a9e0ea'),
  'kaca-terang': M('#fdd792'),
  'daun-sage': M('#7ad46f'),
  'daun-gelap': M('#4cb45c'),
  'buku-biru': M('#66b6cf'),
  'buku-lav': M('#70c297'),
  'buku-salmon': M('#fb836b'),
  'buku-krem': M('#f1e1bb'),
  'papan-krem': M('#f7f2cd'),
  'kertas-putih': M('#fff9e3'),
  'gabus-tanah': M('#c99b6a'),
  'buku-bata': M('#c95b3f'),
  'buku-zaitun': M('#c9dd41'),

  // --- material tema hangat ---
  jati: M('#8a5a3a'),
  'jati-muda': M('#a8764f'),
  walnut: M('#452d1e'),
  bata: M('#c95b3f'),
  lilin: M('#fdd792'),
  tembaga: M('#ef9762'),
  'kain-merah': M('#ee734c'),
  'kaca-jendela': M('#fdd792'),

  // --- katalog 2026-10-29 ---
  'papan-putih': M('#fff9e3'),
  perak: M('#dadab8'),
  'perak-tua': M('#c5c7a4'),
  'abu-tua': M3('#574d36', '#3d432a', '#2b1a12'),
  abu: M3('#8e8a6d', '#574d36', '#3d432a'),
  'kayu-meja': M('#e4b98a'),
  'kayu-tepi': M('#c99b6a'),
  'kayu-gelap': M('#8a5a3a'),
  'buku-gelap': M3('#452d1e', '#391d0b', '#2b1a12'),
  'buku-zaitun-tepi': M3('#566b32', '#3d432a', '#2b1a12'),
  'kusen-putih': M('#f7f2cd'),
  matahari: M('#fdd792'),
  'tirai-gorden': M('#f1e1bb'),
  'tirai-lipat': M('#dadab8'),
  // awan: putih RATA dengan perut abu-krem
  'pastel-awan': M3('#ffffff', '#f4fefb', '#f4fefb'),
  zaitun: M('#c9dd41'),
  'zaitun-tua': M3('#9aa84e', '#566b32', '#3d432a'),
  'krem-hangat': M('#f1e1bb'),
  'terakota-muda': M('#ef9762'),
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
  // ---- RONDE 39: LANTAI PAPAN + BATU seperti gambar referensi -------------
  // Papan kayu terang (sama dengan badan rumah di referensi) dengan nat batu
  // krem. Ini gaya lantai utama ruangan sekarang.
  'lantai-papan-batu': {
    pattern: 'papan',
    tones: ['#c99b6a', '#e4b98a', '#c99b6a'],
    grout: '#8a5a3a',
    skirtL: '#8a5a3a',
    skirtR: '#5f3d28',
    plank: 4,
  },
  // ubin terakota: tiga nada oranye + nat kayu tua
  'lantai-terakota': {
    pattern: 'ubin',
    tones: ['#ef9762', '#d8894a', '#c95b3f'],
    grout: '#5f3d28',
    skirtL: PAL.skirtL,
    skirtR: PAL.skirtR,
  },
  // batu krem: jalan setapak di gambar desa referensi
  'lantai-batu': {
    pattern: 'ubin',
    tones: ['#dadab8', '#c5c7a4', '#f1e1bb'],
    grout: '#8e8a6d',
    skirtL: PAL.skirtL,
    skirtR: PAL.skirtR,
  },
  // kayu jati hangat (papan panjang selang-seling)
  'lantai-kayu': {
    pattern: 'papan',
    tones: ['#c99b6a', '#e4b98a', '#8a5a3a'],
    grout: '#5f3d28',
    skirtL: PAL.skirtL,
    skirtR: PAL.skirtR,
    plank: 4,
    grain: '#5f3d28',
  },
  'lantai-kayu-terang': {
    pattern: 'papan',
    tones: ['#e4b98a', '#c99b6a', '#a8764f'],
    grout: '#8a5a3a',
    skirtL: '#c99b6a',
    skirtR: '#8a5a3a',
    plank: 4,
    grain: '#8a5a3a',
  },
  'lantai-kayu-gelap': {
    pattern: 'papan',
    tones: ['#8a5a3a', '#5f3d28', '#a8764f'],
    grout: '#391d0b',
    skirtL: '#5f3d28',
    skirtR: '#391d0b',
    plank: 4,
    grain: '#391d0b',
  },
  'lantai-ubin': {
    pattern: 'ubin',
    tones: [PAL.floorBase, PAL.floorAlt, PAL.floorC],
    grout: PAL.grout,
    skirtL: PAL.skirtL,
    skirtR: PAL.skirtR,
  },
  // --- palet pastel (versi 51 warna referensi) ---
  'lantai-pastel-krem': {
    pattern: 'papan',
    tones: ['#f1e1bb', '#e4b98a', '#c99b6a'],
    grout: '#8a5a3a', skirtL: '#c99b6a', skirtR: '#8a5a3a', plank: 4, grain: '#8a5a3a',
  },
  'lantai-pastel-sakura': {
    pattern: 'papan',
    tones: ['#fb836b', '#ee734c', '#c95b3f'],
    grout: '#833422', skirtL: '#c95b3f', skirtR: '#a8412b', plank: 4, grain: '#833422',
  },
  'lantai-pastel-mint': {
    pattern: 'papan',
    tones: ['#7ad46f', '#4cb45c', '#2fa56e'],
    grout: '#1c5e40', skirtL: '#4cb45c', skirtR: '#1c5e40', plank: 4, grain: '#1c5e40',
  },
  'lantai-pastel-lavender': {
    pattern: 'papan',
    tones: ['#a9e0ea', '#66b6cf', '#3f7fa3'],
    grout: '#2e4a63', skirtL: '#66b6cf', skirtR: '#2e4a63', plank: 4, grain: '#2e4a63',
  },
  'lantai-pastel-biru': {
    pattern: 'papan',
    tones: ['#a9e0ea', '#66b6cf', '#2b8fa8'],
    grout: '#2e4a63', skirtL: '#66b6cf', skirtR: '#2b8fa8', plank: 4, grain: '#2e4a63',
  },
  'lantai-pastel-ijo': {
    pattern: 'papan',
    tones: ['#a3ed75', '#7ad46f', '#4cb45c'],
    grout: '#1c5e40', skirtL: '#7ad46f', skirtR: '#1c5e40', plank: 4, grain: '#1c5e40',
  },
}
export const FLOOR_KEYS = Object.keys(FLOOR_MATERIALS)
export const FLOOR_DEFAULT = 'lantai-papan-batu'

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
  // ---- RONDE 39: DINDING TUDOR (permintaan user) ----
  // Plester krem (#f7f2cd kena cahaya, #dadab8 teduh) + rangka balok kayu
  // gelap (#5f3d28 / #452d1e) yang digambar `walls()` & `drawWallObjects()`.
  // RONDE 41 — gaya interior Pokémon NDS (plester rata + wainscot kayu).
  'dinding-nds': { kiri: '#f1e1bb', kanan: '#f7f2cd', trimKiri: '#8a5a3a', trimKanan: '#a8764f' },
  // nama lama dipertahankan agar scene/data lama tetap terbaca (gambar sama)
  'dinding-tudor': { kiri: '#f1e1bb', kanan: '#f7f2cd', trimKiri: '#8a5a3a', trimKanan: '#a8764f' },
  // tema lama
  'dinding-hangat': { kiri: '#f1e1bb', kanan: '#f7f2cd', trimKiri: PAL.trimB, trimKanan: PAL.trimT },
  'dinding-bata': { kiri: '#c95b3f', kanan: '#ee734c', trimKiri: '#833422', trimKanan: '#a8412b' },
  'dinding-kayu': { kiri: '#8a5a3a', kanan: '#a8764f', trimKiri: '#391d0b', trimKanan: '#5f3d28' },
  'dinding-krem': { kiri: '#e4b98a', kanan: '#f1e1bb', trimKiri: PAL.trimB, trimKanan: PAL.trimT },
  'dinding-teal': { kiri: '#1b865f', kanan: '#2fa56e', trimKiri: '#0f4f42', trimKanan: '#1c5e40' },
  'dinding-kertas': { kiri: '#c99b6a', kanan: '#e4b98a', trimKiri: PAL.trimB, trimKanan: PAL.trimT },
  'dinding-navy': { kiri: '#2e4a63', kanan: '#3f7fa3', trimKiri: '#1a3121', trimKanan: '#2e4a63' },
  // --- dinding pastel (versi 51 warna) ---
  'dinding-pastel-krem': { kiri: '#e4b98a', kanan: '#f1e1bb', trimKiri: '#a8764f', trimKanan: '#c99b6a' },
  'dinding-pastel-sakura': { kiri: '#ee734c', kanan: '#fb836b', trimKiri: '#a8412b', trimKanan: '#c95b3f' },
  'dinding-pastel-mint': { kiri: '#4cb45c', kanan: '#7ad46f', trimKiri: '#1c5e40', trimKanan: '#2f8a52' },
  'dinding-pastel-lavender': { kiri: '#66b6cf', kanan: '#a9e0ea', trimKiri: '#2e4a63', trimKanan: '#3f7fa3' },
  'dinding-pastel-biru': { kiri: '#3f7fa3', kanan: '#66b6cf', trimKiri: '#2e4a63', trimKanan: '#3f7fa3' },
  'dinding-pastel-kuning': { kiri: '#f0ce92', kanan: '#fdd792', trimKiri: '#d8894a', trimKanan: '#ef9762' },
}
export const WALL_KEYS = Object.keys(WALL_MATERIALS)
export const WALL_DEFAULT = 'dinding-nds'

/**
 * RONDE 39: apakah dinding ini memakai gaya TUDOR (plester krem + rangka balok
 * kayu)? Gaya bawaan (tanpa `style`) dan nama lama 'dinding-kiri'/'dinding-kanan'
 * juga dianggap Tudor, karena tema ruangan sekarang Tudor.
 */
export function isTudor(style: unknown): boolean {
  if (typeof style !== 'string' || !style) return true
  if (style === 'dinding-kiri' || style === 'dinding-kanan') return true
  return style === 'dinding-tudor'
}

// Semua style yang SAH untuk objek dinding: palet dinding dulu, lalu material balok.
export const WALL_STYLE_KEYS = [...WALL_KEYS, ...Object.keys(MATERIALS)]

// Style yang tidak dikenal TIDAK diam-diam jadi kayu: dipetakan ke PINK pekat
// (#ff0044, anggota palet) supaya kesalahan data langsung terlihat di layar.
export const UNKNOWN_STYLE = {
  top: '#fb836b',        // warna paling mencolok di 51 palet (penanda bug data)
  left: GELAP_MAKS,
  right: '#2b1a12',
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
