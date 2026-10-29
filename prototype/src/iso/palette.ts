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

import { OLED, gelap as gelapPalet, kePalet as Q, terang as terangPalet } from './palet-referensi'

/** campur dua warna hex, t = 0..1 */
function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16)
  const pb = parseInt(b.slice(1), 16)
  const ch = (sh: number) =>
    Math.round((((pa >> sh) & 255) * (1 - t)) + (((pb >> sh) & 255) * t))
  return '#' + [16, 8, 0].map(sh => ch(sh).toString(16).padStart(2, '0')).join('')
}

/**
 * "Gelapkan" versi 2026-10-29: BUKAN campur warna lagi, tetapi turun beberapa
 * tingkat di KOLOM HUE yang sama pada palet referensi (lihat palet-referensi.ts).
 * Jadi hasilnya selalu salah satu dari 192 warna referensi — tidak ada warna
 * campuran di luar palet, dan shading-nya bergaya cell-shading.
 * f = 1 -> tanpa perubahan; f makin kecil -> makin banyak tingkat turun.
 */
function shade(hex: string, f: number): string {
  return gelapPalet(Q(hex), Math.max(1, Math.round((1 - f) * 6)))
}

export const PAL = {
  void: OLED,            // luar ruangan: HITAM OLED murni #000000 (permintaan user 2026-10-29)
  voidGlow: OLED,        // tidak dipakai lagi: OLED butuh hitam rata, bukan pendar

  // dinding: muka teduh (DB/kiri) dan muka kena cahaya (DT/kanan)
  wallB: Q('#c26420'),
  wallT: Q('#dc9f6e'),
  wallHi: Q('#ded1c9'),    // sorot di bagian atas muka dinding
  trimB: Q('#814218'),     // plint kayu (sisi teduh)
  trimT: Q('#895c3b'),     // plint kayu (sisi cahaya)
  seam: Q('#4e2917'),      // pertemuan dua dinding (sudut dalam)

  // lantai ubin terakota
  floorBase: Q('#aa5a1d'),
  floorAlt: Q('#964d19'),
  floorC: Q('#c26420'),
  grout: Q('#894c20'),

  // tepi slab diorama (deck papan)
  skirtL: Q('#c57946'),
  skirtR: Q('#895c3b'),
  deckSeam: Q('#89542d'),  // sambungan papan pada tepi slab
  deckLight: Q('#df9057'), // rim terang di bibir atas deck

  // balok kayu & tiang dinding (signature referensi)
  beam: Q('#6b3813'),
  beamTop: Q('#964d19'),
  beamDark: Q('#4e2917'),
  post: Q('#89542d'),
  postLit: Q('#c26420'),
  peg: Q('#fc9a67'),

  // bayangan ambient di sudut dinding/lantai
  ao: 'rgba(74,33,12,0.42)',

  grid: 'rgba(255,214,170,0.30)',
  zone: 'rgba(255,196,110,0.90)',
  hud: Q('#ded1c9'),
  tinta: '#341b10',      // garis tepi (kolom cokelat baris 18) — dipakai juga renderer offline
} as const

export interface Mat { top: string; left: string; right: string }

/**
 * Material 3 nada dari satu warna atas. Bayangan digeser hangat (menuju
 * #5a1e08), jadi semua material tetap satu keluarga warna seperti referensi.
 */
function M(top: string): Mat {
  const t = Q(top)
  // URUTAN NADA DIJAMIN: atas > kanan > kiri. "kiri" diturunkan DARI "kanan",
  // bukan dihitung sendiri dari atas — kalau tidak, kolom cokelat bisa membuat
  // sisi teduh justru lebih terang dari sisi cahaya.
  const right = gelapPalet(t, 1)
  const left = gelapPalet(right, 1)
  return { top: t, left, right }
}

// ---------------------------------------------------------------------------
// MATERIAL OBJEK
// ---------------------------------------------------------------------------
export const MATERIALS: Record<string, Mat> = {
  // --- dasar (nama lama, kini bertema hangat) ---
  wood: M(Q('#c07a3a')),
  'wood-dark': M(Q('#9a5626')),
  metal: M(Q('#c9a86b')),        // kuningan hangat, bukan abu dingin
  paper: M(Q('#fbeccb')),
  teal: M(Q('#4c8f8a')),         // satu-satunya nada dingin (potion/kaca)
  cream: M(Q('#f7dfae')),
  amber: M(Q('#e8a24a')),
  slate: M(Q('#8a6142')),
  crimson: M(Q('#b8412c')),
  sage: M(Q('#8a9a4a')),
  'night-wood': M(Q('#b06a2c')),
  board: M(Q('#f2e7c4')),        // papan tulis
  cork: M(Q('#c08a4e')),
  'metal-light': M(Q('#d8bd8a')),
  curtain: M(Q('#e8d8b8')),
  plant: M(Q('#7d9440')),
  terracotta: M(Q('#c96a2e')),
  'chair-dark': M(Q('#4d3a35')), // kursi: arang hangat (kontras gelap di ruangan hangat)
  'lamp-amber': M(Q('#f2b45c')),
  'book-red': M(Q('#c0503a')),
  'book-green': M(Q('#7f8f44')),
  'book-blue': M(Q('#5f7f8a')),
  'paper-night': M(Q('#f4e3bc')),

  // --- palet pastel (pilihan pengguna, TIDAK diubah) ---
  'pastel-mint': { top: Q('#bfe3d0'), left: Q('#a5d4bc'), right: Q('#8fc4aa') },
  'pastel-peach': { top: Q('#f6cfb8'), left: Q('#e8b79c'), right: Q('#d9a387') },
  'pastel-lavender': { top: Q('#d6cdeb'), left: Q('#beb3db'), right: Q('#a79bc9') },
  'pastel-blue': { top: Q('#c6dcf2'), left: Q('#adcae6'), right: Q('#95b6d6') },
  'pastel-butter': { top: Q('#f4e7b8'), left: Q('#e6d79f'), right: Q('#d4c489') },
  'pastel-rose': { top: Q('#f2c7cf'), left: Q('#e2afb9'), right: Q('#ce99a4') },
  'pastel-sage': { top: Q('#cfe0c4'), left: Q('#b9cfac'), right: Q('#a3be96') },
  'pastel-clay': { top: Q('#e7cdbb'), left: Q('#d6b7a1'), right: Q('#c2a08a') },

  // --- referensi ruang guru 2026-10-29 (nama dipakai katalog preset) ---
  'kayu-terakota': M(Q('#cf8b52')),  // meja & laci
  'kayu-tua': M(Q('#a35e2a')),       // rangka, kaki, bibir meja
  'tirai-putih': M(Q('#f7e6c4')),    // tirai krem hangat
  'kaca-langit': M(Q('#9fc4d4')),    // langit siang (dingin, sedikit saja)
  'kaca-terang': M(Q('#f7d69c')),    // kaca kena cahaya matahari
  'daun-sage': M(Q('#8a9a4a')),      // daun zaitun
  'daun-gelap': M(Q('#6a7834')),
  'buku-biru': M(Q('#577f7a')),
  'buku-lav': M(Q('#9d6a56')),
  'buku-salmon': M(Q('#cf8b5e')),
  'buku-krem': M(Q('#f2ddae')),
  'papan-krem': M(Q('#f7ecc8')),     // papan tulis putih hangat
  'kertas-putih': M(Q('#fbeccb')),   // kertas (dulu putih dingin)
  'gabus-tanah': M(Q('#c99259')),
  'buku-bata': M(Q('#b04a2c')),
  'buku-zaitun': M(Q('#7d8f3a')),    // papan gabus

  // --- material baru khusus tema hangat ---
  jati: M(Q('#a8611f')),
  'jati-muda': M(Q('#c47f38')),
  walnut: M(Q('#7a3f14')),
  bata: M(Q('#b0501f')),
  lilin: M(Q('#f7cf8a')),
  tembaga: M(Q('#b87a3c')),
  'kain-merah': M(Q('#b8412c')),
  'kaca-jendela': M(Q('#ffd9a0')),
  // --- JENDELA (permintaan user 2026-10-29: "buatkan objek jendela seperti
  // pada gambar"): kusen/ambang/batang gorden/tirai PUTIH, langit biru,
  // matahari kuning pucat. Tetap dari palet referensi: #eeeeee = kolom abu-abu
  // baris 1, #fde7b5 = kolom kuning baris 3.
  'kusen-putih': M('#eeeeee'),
  'matahari': M('#fde7b5'),
  // tirai gorden: putih keabu-abuan, sedikit lebih gelap dari kusen supaya
  // lipatan & bayangannya terbaca (kalau sama putihnya, tirai menempel jadi
  // satu bidang dengan kusen)
  'tirai-gorden': M('#dddddd'),
  // lipatan tirai: satu tingkat lebih gelap dari tirai (#cdcdcd) supaya
  // gorden tidak tampak sebagai papan rata
  'tirai-lipat': M('#bbbbbb'),
  // awan: putih RATA (tanpa shading) supaya tetap putih di atas langit biru;
  // nama berawalan 'pastel-' = sengaja tidak mengikuti urutan nada 3 lapis
  'pastel-awan': { top: '#eeeeee', left: '#eeeeee', right: '#dddddd' },
  zaitun: M(Q('#8a9a4a')),
  'zaitun-tua': M(Q('#66762f')),
  'krem-hangat': M(Q('#f7dfae')),
  'terakota-muda': M(Q('#dd8b4a')),
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
  // 2026-10-29 — SEMUA nada lantai diambil dari TANGGA COKELAT / ABU palet
  // referensi (kolom 17-18), bukan campuran warna sendiri. Ubin terakota =
  // baris 7/8/9, grout baris 13, bibir papan baris 7 & 11.
  'lantai-terakota': {
    pattern: 'ubin',
    tones: ['#c57946', '#c26420', '#aa5a1d'],
    grout: '#894c20',
    skirtL: PAL.skirtL,
    skirtR: PAL.skirtR,
  },
  // kayu jati hangat (papan panjang selang-seling)
  'lantai-kayu': {
    pattern: 'papan',
    tones: ['#c26420', '#aa5a1d', '#c57946'],
    grout: '#814218',
    skirtL: PAL.skirtL,
    skirtR: PAL.skirtR,
    plank: 4,
    grain: '#89542d',
  },
  'lantai-kayu-terang': {
    pattern: 'papan',
    tones: ['#dc9f6e', '#c57946', '#df9057'],
    grout: '#aa5a1d',
    skirtL: '#c57946',
    skirtR: '#895c3b',
    plank: 4,
    grain: '#c26420',
  },
  'lantai-kayu-gelap': {
    pattern: 'papan',
    tones: ['#964d19', '#814218', '#aa5a1d'],
    grout: '#66361f',
    skirtL: '#895c3b',
    skirtR: '#6b3813',
    plank: 4,
    grain: '#894c20',
  },
  // ubin dahulu biru-ungu -> kini terakota (tema hangat)
  'lantai-ubin': {
    pattern: 'ubin',
    tones: [PAL.floorBase, PAL.floorAlt, PAL.floorC],
    grout: PAL.grout,
    skirtL: PAL.skirtL,
    skirtR: PAL.skirtR,
  },
  // --- palet pastel (pilihan pengguna) -> dipetakan ke kolom abu/kuning muda ---
  'lantai-pastel-krem': {
    pattern: 'papan',
    tones: ['#ded1c9', '#dec5af', '#deba9d'],
    grout: '#c26420', skirtL: '#df9057', skirtR: '#dc9f6e', plank: 4, grain: '#deba9d',
  },
  'lantai-pastel-sakura': {
    pattern: 'papan',
    tones: ['#fde8e7', '#ffccc8', '#feb5b3'],
    grout: '#fe9a9a', skirtL: '#fd817f', skirtR: '#fd6766', plank: 4, grain: '#ffccc8',
  },
  'lantai-pastel-mint': {
    pattern: 'papan',
    tones: ['#e8ffef', '#e5fff7', '#cefeef'],
    grout: '#b4fee5', skirtL: '#9affdd', skirtR: '#80fed4', plank: 4, grain: '#cdffff',
  },
  'lantai-pastel-lavender': {
    pattern: 'papan',
    tones: ['#eee8ff', '#dfceff', '#cbb5ff'],
    grout: '#b4b4fe', skirtL: '#9a99fd', skirtR: '#bd99ff', plank: 4, grain: '#dfceff',
  },
  'lantai-pastel-biru': {
    pattern: 'papan',
    tones: ['#e6eeff', '#cbdeff', '#b2cbfd'],
    grout: '#9abbfe', skirtL: '#7eaafe', skirtR: '#9bdefd', plank: 4, grain: '#cbdeff',
  },
  'lantai-pastel-ijo': {
    pattern: 'papan',
    tones: ['#ecffeb', '#d1fed2', '#b6ffb7'],
    grout: '#89fe8f', skirtL: '#6afd68', skirtR: '#a0fea1', plank: 4, grain: '#d1fed2',
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
  'dinding-bata': { kiri: Q('#a8492a'), kanan: Q('#c05a30'), trimKiri: Q('#6f2a12'), trimKanan: Q('#7d3316') },
  'dinding-kayu': { kiri: Q('#8d4a1d'), kanan: Q('#a85f26'), trimKiri: Q('#5c2109'), trimKanan: Q('#6e3413') },
  'dinding-krem': { kiri: Q('#e8c48a'), kanan: Q('#f4dcae'), trimKiri: PAL.trimB, trimKanan: PAL.trimT },
  'dinding-teal': { kiri: Q('#3d5f5c'), kanan: Q('#4c8f8a'), trimKiri: Q('#2a4442'), trimKanan: Q('#33514e') },
  'dinding-kertas': { kiri: Q('#c9a86b'), kanan: Q('#ddc08a'), trimKiri: PAL.trimB, trimKanan: PAL.trimT },
  // nama lama dipertahankan agar data lama tetap sah (warnanya kini hangat)
  'dinding-navy': { kiri: PAL.wallB, kanan: PAL.wallT, trimKiri: PAL.trimB, trimKanan: PAL.trimT },
  // --- dinding pastel (pilihan pengguna, tidak diubah) ---
  'dinding-pastel-krem': { kiri: Q('#e8decb'), kanan: Q('#f1e9da'), trimKiri: Q('#c9b79b'), trimKanan: Q('#d6c5a9') },
  'dinding-pastel-sakura': { kiri: Q('#ead3d6'), kanan: Q('#f4e1e3'), trimKiri: Q('#cdb2b6'), trimKanan: Q('#d9c2c5') },
  'dinding-pastel-mint': { kiri: Q('#d6e7dd'), kanan: Q('#e3f0e8'), trimKiri: Q('#b6cbbf'), trimKanan: Q('#c3d7cb') },
  'dinding-pastel-lavender': { kiri: Q('#ddd6ec'), kanan: Q('#eae4f6'), trimKiri: Q('#bcb3d0'), trimKanan: Q('#c9c1dd') },
  'dinding-pastel-biru': { kiri: Q('#d6e2f0'), kanan: Q('#e4edf8'), trimKiri: Q('#b6c4d6'), trimKanan: Q('#c3d1e2') },
  'dinding-pastel-kuning': { kiri: Q('#f0e4c2'), kanan: Q('#f8efd6'), trimKiri: Q('#d4c49b'), trimKanan: Q('#e0d2ac') },
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
