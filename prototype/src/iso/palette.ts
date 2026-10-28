// Palet retro muted 32-bit — paket "linoleum-dado" (disepakati sementara;
// pilihan palet/style tambahan menyusul sesuai permintaan)
export const PAL = {
  void: '#0d0f14',

  // lantai linoleum checker teal-pudar x krem-abu
  floorA: '#647d78',
  floorB: '#a8a193',
  grout: '#4f5a56',
  skirtL: '#3f4a46',
  skirtR: '#4a5551',

  // dinding dado: bawah teal, rail kayu, atas krem
  wallUpB: '#9a9280',  // DB atas (sisi gelap)
  wallUpT: '#b3ab99',  // DT atas (sisi terang)
  wallLoB: '#48625d',  // DB bawah
  wallLoT: '#52706a',  // DT bawah
  railB: '#7a5236',
  railT: '#8a5c3c',
  trimB: '#354a46',    // plint
  trimT: '#3d5450',
  seam: '#2c3634',

  grid: 'rgba(255,255,255,0.30)',
  zone: 'rgba(217,160,91,0.55)',   // batas zona interaktif (mode edit)
  hud: '#cfd3e4',
} as const

// Material objek: 3 tone (top / left / right) sesuai arah cahaya jendela DT
export const MATERIALS: Record<string, { top: string; left: string; right: string }> = {
  wood:      { top: '#a9764f', left: '#8a5c3c', right: '#754c31' },
  'wood-dark': { top: '#8a5c3c', left: '#6e4a30', right: '#5c3d28' },
  metal:     { top: '#9aa1b2', left: '#767d8f', right: '#62687a' },
  paper:     { top: '#ded7c2', left: '#b8b2a0', right: '#a49e8c' },
  teal:      { top: '#5f8f8a', left: '#4a736f', right: '#3d5f5c' },
  cream:     { top: '#cfc8b4', left: '#aaa493', right: '#96907f' },
  amber:     { top: '#d9a05b', left: '#b07f3f', right: '#96692f' },
  slate:     { top: '#565d78', left: '#434a63', right: '#383e54' },
  crimson:   { top: '#a8574f', left: '#87453e', right: '#703a34' },
  sage:      { top: '#6f8f6a', left: '#597455', right: '#4a6147' },
}
export const MATERIAL_KEYS = Object.keys(MATERIALS)
