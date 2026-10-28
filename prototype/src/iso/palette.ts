// Palet "kayu-nude" — dinding nude cerah + lantai kayu oak hangat.
// (Material objek tetap menyimpan hasil ekstraksi referensi malam-biru.)
export const PAL = {
  void: '#1a1512',

  // dinding nude cerah (kiri sedikit lebih gelap = sisi teduh)
  wallB: '#c6b4a2',
  wallT: '#d9c7b3',
  trimB: '#a08d7c',   // plint
  trimT: '#af9c8b',
  seam: '#93816f',    // pertemuan dua dinding

  // lantai papan kayu oak: 3 tone staggered + nat cokelat
  floorBase: '#b08050',
  floorAlt: '#a87a4c',
  floorC: '#b98756',
  grout: '#8a6238',
  skirtL: '#7a5530',     // tebal slab diorama
  skirtR: '#86603a',

  grid: 'rgba(255,255,255,0.30)',
  zone: 'rgba(160,107,58,0.65)',
  hud: '#3d3428',
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
export const MATERIAL_KEYS = Object.keys(MATERIALS)

// Palet ruangan yang ditampilkan di panel PALET preview
export const ROOM_PALETTE_SWATCHES: { name: string; hex: string }[] = [
  { name: 'void', hex: PAL.void },
  { name: 'dinding-kiri', hex: PAL.wallB },
  { name: 'dinding-kanan', hex: PAL.wallT },
  { name: 'plint-kiri', hex: PAL.trimB },
  { name: 'plint-kanan', hex: PAL.trimT },
  { name: 'kayu-a', hex: PAL.floorBase },
  { name: 'kayu-b', hex: PAL.floorAlt },
  { name: 'kayu-c', hex: PAL.floorC },
  { name: 'nat-kayu', hex: PAL.grout },
  { name: 'slab-kiri', hex: PAL.skirtL },
  { name: 'slab-kanan', hex: PAL.skirtR },
]
