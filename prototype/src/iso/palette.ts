// Palet "malam-biru" — diekstrak dari gambar referensi user
// (Screenshot_20261028_203752.jpg): dinding navy datar, lantai ubin persegi
// biru-ungu dengan nat gelap, slab diorama sangat gelap.
// Warna dasar diambil langsung dari piksel referensi:
//   dinding #24304a · ubin #4e557d / #5b5a7c · nat ~#373a5e
export const PAL = {
  void: '#12131f',      // luar ruangan

  // dinding navy (kiri = sisi teduh, kanan = sisi cahaya — selisih halus)
  wallB: '#232e48',
  wallT: '#2a3552',
  trimB: '#5e4038',     // plint kayu (gelap, sisi teduh) — signature referensi
  trimT: '#7d5140',     // plint kayu (sisi cahaya)
  seam: '#161d31',      // pertemuan dua dinding

  // lantai ubin persegi (bukan papan) — 3 tone halus + nat gelap
  floorBase: '#4e557d',
  floorAlt: '#4a5178',
  floorC: '#565b86',
  grout: '#373a5e',
  skirtL: '#171a2b',    // tebal slab diorama
  skirtR: '#1d2134',

  grid: 'rgba(206,222,255,0.28)',
  zone: 'rgba(232,176,96,0.75)',
  hud: '#c3cdec',
} as const

// Material objek: 3 tone (top / left / right) sesuai arah cahaya lampu meja.
// 10 material dasar + 12 material hasil ekstraksi referensi malam-biru.
export const MATERIALS: Record<string, { top: string; left: string; right: string }> = {
  wood:         { top: '#a9764f', left: '#8a5c3c', right: '#754c31' },
  'wood-dark':  { top: '#8a5c3c', left: '#6e4a30', right: '#5c3d28' },
  metal:        { top: '#9aa1b2', left: '#767d8f', right: '#62687a' },
  paper:        { top: '#ded7c2', left: '#b8b2a0', right: '#a49e8c' },
  teal:         { top: '#5f8f8a', left: '#4a736f', right: '#3d5f5c' },
  cream:        { top: '#cfc8b4', left: '#aaa493', right: '#96907f' },
  amber:        { top: '#d9a05b', left: '#b07f3f', right: '#96692f' },
  slate:        { top: '#565d78', left: '#434a63', right: '#383e54' },
  crimson:      { top: '#a8574f', left: '#87453e', right: '#703a34' },
  sage:         { top: '#6f8f6a', left: '#597455', right: '#4a6147' },
  // --- hasil ekstraksi referensi malam-biru ---
  'night-wood': { top: '#c08552', left: '#8f5f3a', right: '#7a4f30' }, // meja & rak
  board:        { top: '#e8e4c9', left: '#c9c4b0', right: '#b5b09c' }, // papan tulis
  cork:         { top: '#b9895a', left: '#96693f', right: '#825836' }, // papan gabus
  'metal-light':{ top: '#a8aec9', left: '#8890ad', right: '#767e99' }, // rangka jendela/stand
  curtain:      { top: '#b9bdd9', left: '#9aa0c0', right: '#8890b0' }, // tirai
  plant:        { top: '#5f9e6a', left: '#4a7f55', right: '#3d6846' }, // daun
  terracotta:   { top: '#b06a4a', left: '#8f5339', right: '#7a4630' }, // pot
  'chair-dark': { top: '#3a3f52', left: '#2e3345', right: '#252a3a' }, // kursi
  'lamp-amber': { top: '#e8b060', left: '#c08c42', right: '#a5763a' }, // cahaya lampu
  'book-red':   { top: '#a05252', left: '#834242', right: '#6f3838' },
  'book-green': { top: '#5d7f63', left: '#4b6850', right: '#3f5744' },
  'book-blue':  { top: '#5a6f9e', left: '#485a82', right: '#3d4d6f' },
  'paper-night':{ top: '#d9d6c8', left: '#b3b0a2', right: '#9c998c' }, // kertas/kalender
}
// ---------------------------------------------------------------------------
// PALET LANTAI (dipakai objek ber-role 'lantai' lewat field `style`)
// pattern 'papan' = papan kayu 2x1 tile ditata selang-seling (running bond)
// pattern 'ubin'  = ubin persegi 1x1 tile
// ---------------------------------------------------------------------------
export interface FloorMat {
  pattern: 'ubin' | 'papan'
  tones: [string, string, string]
  grout: string
  skirtL: string
  skirtR: string
  /** panjang papan dalam tile (default 4) — papan panjang = kesan kayu */
  plank?: number
  /** warna serat kayu (grain) yang digambar tipis di atas papan */
  grain?: string
}

export const FLOOR_MATERIALS: Record<string, FloorMat> = {
  // kayu oak hangat — papan selang-seling (default lantai)
  'lantai-kayu': {
    pattern: 'papan',
    tones: ['#b98a58', '#b3824e', '#bf9060'],
    grout: '#8f6a44',
    skirtL: '#7a5530',
    skirtR: '#86603a',
    plank: 4,
    grain: '#a1743f',
  },
  // kayu terang — papan selang-seling
  'lantai-kayu-terang': {
    pattern: 'papan',
    tones: ['#d3a771', '#cb9d66', '#dab27c'],
    grout: '#a67c4c',
    skirtL: '#8a6238',
    skirtR: '#94683c',
    plank: 4,
    grain: '#bb8d58',
  },
  // kayu gelap — papan selang-seling
  'lantai-kayu-gelap': {
    pattern: 'papan',
    tones: ['#8a5c3c', '#815537', '#94633f'],
    grout: '#5f4029',
    skirtL: '#4a3222',
    skirtR: '#553a28',
    plank: 4,
    grain: '#6f482d',
  },
  // ubin persegi biru-ungu (palet malam-biru)
  'lantai-ubin': {
    pattern: 'ubin',
    tones: [PAL.floorBase, PAL.floorAlt, PAL.floorC],
    grout: PAL.grout,
    skirtL: PAL.skirtL,
    skirtR: PAL.skirtR,
  },
}
export const FLOOR_KEYS = Object.keys(FLOOR_MATERIALS)
export const FLOOR_DEFAULT = 'lantai-kayu'

export function floorMat(name: unknown): FloorMat {
  return (typeof name === 'string' && FLOOR_MATERIALS[name]) || FLOOR_MATERIALS[FLOOR_DEFAULT]
}

export const MATERIAL_KEYS = Object.keys(MATERIALS)

// Palet ruangan yang ditampilkan di panel PALET preview
export const ROOM_PALETTE_SWATCHES: { name: string; hex: string }[] = [
  { name: 'void', hex: PAL.void },
  { name: 'dinding-kiri', hex: PAL.wallB },
  { name: 'dinding-kanan', hex: PAL.wallT },
  { name: 'plint-kiri', hex: PAL.trimB },
  { name: 'plint-kanan', hex: PAL.trimT },
  { name: 'ubin-a', hex: PAL.floorBase },
  { name: 'ubin-b', hex: PAL.floorAlt },
  { name: 'ubin-c', hex: PAL.floorC },
  { name: 'nat-ubin', hex: PAL.grout },
  { name: 'slab-kiri', hex: PAL.skirtL },
  { name: 'slab-kanan', hex: PAL.skirtR },
]

// ---------------------------------------------------------------------------
// PALET DINDING (dipakai objek ber-role 'dinding' lewat field `style`)
// Sisi kiri (DB) selalu lebih teduh, sisi kanan (DT) kena cahaya — sama seperti
// palet ruangan. `trim` = plint kayu di kaki dinding.
// Objek dinding juga boleh memakai MATERIALS biasa (wood, metal, dst).
// ---------------------------------------------------------------------------
export interface WallMat {
  kiri: string   // muka dinding sisi teduh (DB)
  kanan: string  // muka dinding sisi cahaya (DT)
  trimKiri: string
  trimKanan: string
}

export const WALL_MATERIALS: Record<string, WallMat> = {
  'dinding-navy':   { kiri: PAL.wallB, kanan: PAL.wallT, trimKiri: PAL.trimB, trimKanan: PAL.trimT },
  'dinding-krem':   { kiri: '#c4b89c', kanan: '#d6cbb2', trimKiri: '#7a5530', trimKanan: '#86603a' },
  'dinding-kayu':   { kiri: '#6e4a30', kanan: '#8a5c3c', trimKiri: '#4a3222', trimKanan: '#553a28' },
  'dinding-teal':   { kiri: '#3d5f5c', kanan: '#4a736f', trimKiri: '#2a4442', trimKanan: '#33514e' },
  'dinding-bata':   { kiri: '#8f4f45', kanan: '#a35c50', trimKiri: '#5c312a', trimKanan: '#6b3a31' },
  'dinding-kertas': { kiri: '#a49e8c', kanan: '#b8b2a0', trimKiri: '#7a5530', trimKanan: '#86603a' },
}
export const WALL_KEYS = Object.keys(WALL_MATERIALS)
export const WALL_DEFAULT = 'dinding-navy'

// Semua style yang SAH untuk objek dinding: palet dinding dulu, lalu material balok.
export const WALL_STYLE_KEYS = [...WALL_KEYS, ...Object.keys(MATERIALS)]

// Style yang tidak dikenal TIDAK lagi diam-diam jadi kayu: dipetakan ke magenta
// supaya kesalahan data langsung terlihat di layar (bukan bug tersembunyi).
export const UNKNOWN_STYLE = { top: '#ff00ff', left: '#cc00cc', right: '#990099' }

/** Warna muka + plint dinding untuk sebuah style & sisi. */
export function wallColors(style: unknown, side: 'kiri' | 'kanan') {
  const kiri = side !== 'kanan'
  const name = typeof style === 'string' ? style : ''
  const wm = WALL_MATERIALS[name]
  if (wm) return { face: kiri ? wm.kiri : wm.kanan, trim: kiri ? wm.trimKiri : wm.trimKanan }
  const m = MATERIALS[name]
  if (m) return { face: kiri ? m.left : m.top, trim: m.right }
  // dinding lama tanpa style sah ('dinding-kiri' / 'dinding-kanan') -> navy acuan
  if (!name || name === 'dinding-kiri' || name === 'dinding-kanan') {
    return { face: kiri ? PAL.wallB : PAL.wallT, trim: kiri ? PAL.trimB : PAL.trimT }
  }
  return { face: UNKNOWN_STYLE.top, trim: UNKNOWN_STYLE.right }   // magenta = bug
}
