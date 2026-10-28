// Palet retro muted 32-bit (menunggu kesepakatan)
export const PAL = {
  void: '#14161f',        // latar di luar ruangan

  wallB: '#4d5470',       // Dinding Barat (kiri, lebih gelap)
  wallT: '#5d6484',       // Dinding Timur (kanan, lebih terang)
  wallBTop: '#5a6180',    // garis atas dinding B
  wallTTop: '#6b7292',    // garis atas dinding T
  trimB: '#3d4359',       // plint (baseboard) dinding B
  trimT: '#4a5069',       // plint dinding T
  seam: '#343a50',        // garis pertemuan dua dinding

  floorA: '#7b719b',      // tile lantai A (lavender pudar)
  floorB: '#867ba6',      // tile lantai B
  grout: '#655c85',       // nat antar tile
  skirtL: '#4e4670',      // tepi lantai sisi kiri-depan
  skirtR: '#5b5380',      // tepi lantai sisi kanan-depan

  grid: 'rgba(255,255,255,0.30)', // overlay grid (mode debug)
  hud: '#cfd3e4',
} as const
