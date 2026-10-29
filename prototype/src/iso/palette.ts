// ===========================================================================
// TEMA "DIORAMA HANGAT" — 2026-10-29
// Permintaan user: "saya ingin style dan gaya dan tema pixelnya seperti pada
// gambar referensi" (6d39f1fadb95515d53d2f48449d4c809.jpg — tiga diorama
// pixel-art: toko roti, toko ramuan, kedai).
//
// Warna di bawah DIAMBIL LANGSUNG dari piksel gambar itu (kuantisasi median-cut):
//   latar     #48100f            (marun-tua hangat, 27-37% luas gambar)
//   dinding   #f0c77f / #e08b3c  (persik kena cahaya / oranye teduh)
//   ubin      #e08838 #d4782c #c96c22 · nat #a4521a
//   kayu      #b56b2f → #8e4f21 → #6f3a14 → #4a210c
//   zaitun    #8a9a4a / #5e6d2e  (tanaman hias)
//   krem      #efc786            (kertas, kain, sorot cahaya)
//   merah     #b8412c            (pintu/kain pada referensi)
//
// ATURAN GAYA (yang membuat gambar terasa "diorama hangat"):
//   1. Semua warna berada di keluarga oranye–cokelat; TIDAK ADA biru/ungu.
//      Satu-satunya warna dingin: kaca jendela & potion (sangat sedikit).
//   2. Tiap bidang punya garis tepi gelap (outline) — lihat iso/box.ts.
//   3. Tiga nada per material: atas terang, kiri teduh, kanan sedang.
//   4. Lantai = ubin terakota besar; tepi slab = PAPAN KAYU (deck) dengan
//      sambungan vertikal, seperti tepi diorama pada referensi.
//   5. Dinding = persik + balok kayu gelap di atas (cornice) dan tiang di ujung.
//
// Catatan kompatibilitas: SEMUA nama style lama DIPERTAHANKAN (data scene.json
// pengguna memakai nama itu) — hanya warnanya yang digeser ke tema hangat.
// ===========================================================================

/** campur dua warna hex, t = 0..1 */
function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16)
  const pb = parseInt(b.slice(1), 16)
  const ch = (sh: number) =>
    Math.round((((pa >> sh) & 255) * (1 - t)) + (((pb >> sh) & 255) * t))
  return '#' + [16, 8, 0].map(sh => ch(sh).toString(16).padStart(2, '0')).join('')
}

/** gelapkan warna menuju cokelat-tua hangat (bukan hitam: bayangan tetap hangat) */
function shade(hex: string, f: number, toward = '#5a1e08'): string {
  return mix(hex, toward, 1 - f)
}

export const PAL = {
  void: '#48100f',      // luar ruangan (marun-tua hangat, sampled #48100f)
  voidGlow: '#5c1a10',  // pendar hangat di tengah void (opsional)

  // dinding: muka teduh (DB/kiri) dan muka kena cahaya (DT/kanan)
  wallB: '#dd8b3f',
  wallT: '#f2c17b',
  wallHi: '#faddab',    // sorot di bagian atas muka dinding
  trimB: '#8d4a1d',     // plint kayu (sisi teduh)
  trimT: '#a85f26',     // plint kayu (sisi cahaya)
  seam: '#5c2109',      // pertemuan dua dinding (sudut dalam)

  // lantai ubin terakota
  floorBase: '#d9822f',
  floorAlt: '#cf7727',
  floorC: '#e08c38',
  grout: '#a8541c',

  // tepi slab diorama (deck papan)
  skirtL: '#c07933',
  skirtR: '#9a5622',
  deckSeam: '#8f4a1b',  // sambungan papan pada tepi slab
  deckLight: '#d98f4a', // rim terang di bibir atas deck

  // balok kayu & tiang dinding (signature referensi)
  beam: '#7d4318',
  beamTop: '#a85f26',
  beamDark: '#4a210c',
  post: '#8d4a1d',
  postLit: '#b06a2c',
  peg: '#d9944a',

  // bayangan ambient di sudut dinding/lantai
  ao: 'rgba(74,33,12,0.42)',

  grid: 'rgba(255,214,170,0.30)',
  zone: 'rgba(255,196,110,0.90)',
  hud: '#f3d3a8',
} as const

export interface Mat { top: string; left: string; right: string }

/**
 * Material 3 nada dari satu warna atas. Bayangan digeser hangat (menuju
 * #5a1e08), jadi semua material tetap satu keluarga warna seperti referensi.
 */
function M(top: string): Mat {
  return { top, left: shade(top, 0.72), right: shade(top, 0.86) }
}

// ---------------------------------------------------------------------------
// MATERIAL OBJEK
// ---------------------------------------------------------------------------
export const MATERIALS: Record<string, Mat> = {
  // --- dasar (nama lama, kini bertema hangat) ---
  wood: M('#c07a3a'),
  'wood-dark': M('#9a5626'),
  metal: M('#c9a86b'),        // kuningan hangat, bukan abu dingin
  paper: M('#fbeccb'),
  teal: M('#4c8f8a'),         // satu-satunya nada dingin (potion/kaca)
  cream: M('#f7dfae'),
  amber: M('#e8a24a'),
  slate: M('#8a6142'),
  crimson: M('#b8412c'),
  sage: M('#8a9a4a'),
  'night-wood': M('#b06a2c'),
  board: M('#f2e7c4'),        // papan tulis
  cork: M('#c08a4e'),
  'metal-light': M('#d8bd8a'),
  curtain: M('#e8d8b8'),
  plant: M('#7d9440'),
  terracotta: M('#c96a2e'),
  'chair-dark': M('#4d3a35'), // kursi: arang hangat (kontras gelap di ruangan hangat)
  'lamp-amber': M('#f2b45c'),
  'book-red': M('#c0503a'),
  'book-green': M('#7f8f44'),
  'book-blue': M('#5f7f8a'),
  'paper-night': M('#f4e3bc'),

  // --- palet pastel (pilihan pengguna, TIDAK diubah) ---
  'pastel-mint': { top: '#bfe3d0', left: '#a5d4bc', right: '#8fc4aa' },
  'pastel-peach': { top: '#f6cfb8', left: '#e8b79c', right: '#d9a387' },
  'pastel-lavender': { top: '#d6cdeb', left: '#beb3db', right: '#a79bc9' },
  'pastel-blue': { top: '#c6dcf2', left: '#adcae6', right: '#95b6d6' },
  'pastel-butter': { top: '#f4e7b8', left: '#e6d79f', right: '#d4c489' },
  'pastel-rose': { top: '#f2c7cf', left: '#e2afb9', right: '#ce99a4' },
  'pastel-sage': { top: '#cfe0c4', left: '#b9cfac', right: '#a3be96' },
  'pastel-clay': { top: '#e7cdbb', left: '#d6b7a1', right: '#c2a08a' },

  // --- referensi ruang guru 2026-10-29 (nama dipakai katalog preset) ---
  'kayu-terakota': M('#cf8b52'),  // meja & laci
  'kayu-tua': M('#a35e2a'),       // rangka, kaki, bibir meja
  'tirai-putih': M('#f7e6c4'),    // tirai krem hangat
  'kaca-langit': M('#9fc4d4'),    // langit siang (dingin, sedikit saja)
  'kaca-terang': M('#f7d69c'),    // kaca kena cahaya matahari
  'daun-sage': M('#8a9a4a'),      // daun zaitun
  'daun-gelap': M('#6a7834'),
  'buku-biru': M('#577f7a'),
  'buku-lav': M('#9d6a56'),
  'buku-salmon': M('#cf8b5e'),
  'buku-krem': M('#f2ddae'),
  'papan-krem': M('#f7ecc8'),     // papan tulis putih hangat
  'kertas-putih': M('#fbeccb'),   // kertas (dulu putih dingin)
  'gabus-tanah': M('#c99259'),
  'buku-bata': M('#b04a2c'),
  'buku-zaitun': M('#7d8f3a'),    // papan gabus

  // --- material baru khusus tema hangat ---
  jati: M('#a8611f'),
  'jati-muda': M('#c47f38'),
  walnut: M('#7a3f14'),
  bata: M('#b0501f'),
  lilin: M('#f7cf8a'),
  tembaga: M('#b87a3c'),
  'kain-merah': M('#b8412c'),
  'kaca-jendela': M('#ffd9a0'),
  zaitun: M('#8a9a4a'),
  'zaitun-tua': M('#66762f'),
  'krem-hangat': M('#f7dfae'),
  'terakota-muda': M('#dd8b4a'),
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
  // ubin terakota besar — INI yang dipakai diorama referensi
  'lantai-terakota': {
    pattern: 'ubin',
    tones: ['#e08a3a', '#d47c2c', '#da8434'],
    grout: '#a8541c',
    skirtL: PAL.skirtL,
    skirtR: PAL.skirtR,
  },
  // kayu jati hangat (papan panjang selang-seling)
  'lantai-kayu': {
    pattern: 'papan',
    tones: ['#c07a3a', '#b87335', '#c8823f'],
    grout: '#96501e',
    skirtL: PAL.skirtL,
    skirtR: PAL.skirtR,
    plank: 4,
    grain: '#ab6a2e',
  },
  'lantai-kayu-terang': {
    pattern: 'papan',
    tones: ['#dd9a54', '#d6924c', '#e3a25c'],
    grout: '#ab6a2e',
    skirtL: '#cd8b46',
    skirtR: '#a8611f',
    plank: 4,
    grain: '#c8873f',
  },
  'lantai-kayu-gelap': {
    pattern: 'papan',
    tones: ['#a35e2a', '#9a5626', '#ac6730'],
    grout: '#7a3c12',
    skirtL: '#96501e',
    skirtR: '#6f3a14',
    plank: 4,
    grain: '#8a4a1f',
  },
  // ubin dahulu biru-ungu -> kini terakota (tema hangat)
  'lantai-ubin': {
    pattern: 'ubin',
    tones: [PAL.floorBase, PAL.floorAlt, PAL.floorC],
    grout: PAL.grout,
    skirtL: PAL.skirtL,
    skirtR: PAL.skirtR,
  },
  // --- palet pastel (pilihan pengguna, tidak diubah) ---
  'lantai-pastel-krem': {
    pattern: 'papan',
    tones: ['#f3e3c7', '#ebdaba', '#f7ebd3'],
    grout: '#d9c6a5', skirtL: '#c9b58f', skirtR: '#d5c29b', plank: 4, grain: '#e3d0ae',
  },
  'lantai-pastel-sakura': {
    pattern: 'papan',
    tones: ['#f6dcdd', '#f0d2d4', '#fbe6e7'],
    grout: '#dcc0c2', skirtL: '#cdaeb1', skirtR: '#d9bcc0', plank: 4, grain: '#e8cbce',
  },
  'lantai-pastel-mint': {
    pattern: 'papan',
    tones: ['#dcefe4', '#d3e8dc', '#e5f5ec'],
    grout: '#bfd6c9', skirtL: '#b0c8bb', skirtR: '#bcd4c7', plank: 4, grain: '#cbe3d6',
  },
  'lantai-pastel-lavender': {
    pattern: 'papan',
    tones: ['#e4def2', '#dbd4ec', '#ede8f8'],
    grout: '#c6bedc', skirtL: '#b7aecd', skirtR: '#c3bada', plank: 4, grain: '#d3cbe6',
  },
  'lantai-pastel-biru': {
    pattern: 'papan',
    tones: ['#dce8f5', '#d3e1f0', '#e6f0fa'],
    grout: '#bfd0e2', skirtL: '#b0c2d6', skirtR: '#bccfe2', plank: 4, grain: '#cbdaea',
  },
  'lantai-pastel-ijo': {
    pattern: 'papan',
    tones: ['#e0edd8', '#d6e5ce', '#eaf4e3'],
    grout: '#c2d2b8', skirtL: '#b3c4a8', skirtR: '#bfd1b4', plank: 4, grain: '#d0dfc6',
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
  // tema utama: dinding persik + plint jati (samakan dengan referensi)
  'dinding-hangat': { kiri: PAL.wallB, kanan: PAL.wallT, trimKiri: PAL.trimB, trimKanan: PAL.trimT },
  'dinding-bata': { kiri: '#a8492a', kanan: '#c05a30', trimKiri: '#6f2a12', trimKanan: '#7d3316' },
  'dinding-kayu': { kiri: '#8d4a1d', kanan: '#a85f26', trimKiri: '#5c2109', trimKanan: '#6e3413' },
  'dinding-krem': { kiri: '#e8c48a', kanan: '#f4dcae', trimKiri: PAL.trimB, trimKanan: PAL.trimT },
  'dinding-teal': { kiri: '#3d5f5c', kanan: '#4c8f8a', trimKiri: '#2a4442', trimKanan: '#33514e' },
  'dinding-kertas': { kiri: '#c9a86b', kanan: '#ddc08a', trimKiri: PAL.trimB, trimKanan: PAL.trimT },
  // nama lama dipertahankan agar data lama tetap sah (warnanya kini hangat)
  'dinding-navy': { kiri: PAL.wallB, kanan: PAL.wallT, trimKiri: PAL.trimB, trimKanan: PAL.trimT },
  // --- dinding pastel (pilihan pengguna, tidak diubah) ---
  'dinding-pastel-krem': { kiri: '#e8decb', kanan: '#f1e9da', trimKiri: '#c9b79b', trimKanan: '#d6c5a9' },
  'dinding-pastel-sakura': { kiri: '#ead3d6', kanan: '#f4e1e3', trimKiri: '#cdb2b6', trimKanan: '#d9c2c5' },
  'dinding-pastel-mint': { kiri: '#d6e7dd', kanan: '#e3f0e8', trimKiri: '#b6cbbf', trimKanan: '#c3d7cb' },
  'dinding-pastel-lavender': { kiri: '#ddd6ec', kanan: '#eae4f6', trimKiri: '#bcb3d0', trimKanan: '#c9c1dd' },
  'dinding-pastel-biru': { kiri: '#d6e2f0', kanan: '#e4edf8', trimKiri: '#b6c4d6', trimKanan: '#c3d1e2' },
  'dinding-pastel-kuning': { kiri: '#f0e4c2', kanan: '#f8efd6', trimKiri: '#d4c49b', trimKanan: '#e0d2ac' },
}
export const WALL_KEYS = Object.keys(WALL_MATERIALS)
export const WALL_DEFAULT = 'dinding-hangat'

// Semua style yang SAH untuk objek dinding: palet dinding dulu, lalu material balok.
export const WALL_STYLE_KEYS = [...WALL_KEYS, ...Object.keys(MATERIALS)]

// Style yang tidak dikenal TIDAK diam-diam jadi kayu: dipetakan ke magenta
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
  // dinding lama tanpa style sah ('dinding-kiri' / 'dinding-kanan') -> tema hangat
  if (!name || name === 'dinding-kiri' || name === 'dinding-kanan') {
    return { face: kiri ? PAL.wallB : PAL.wallT, trim: kiri ? PAL.trimB : PAL.trimT }
  }
  return { face: UNKNOWN_STYLE.top, trim: UNKNOWN_STYLE.right }   // magenta = bug
}

export { mix as mixWarna, shade as gelapkanWarna }
