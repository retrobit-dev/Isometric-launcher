// ===========================================================================
// PALET REFERENSI 51 WARNA — 2026-10-29 (ronde 39)
// ===========================================================================
// Permintaan user: "untuk semuanya bisakah style nya dan palette warna nya
// dibuat lebih ke arah retro pixel art?"  Pilihan user saat ditanya:
//   • ciri khas : DITHERING (pola kotak-kotak untuk peralihan warna)
//   • palet     : PALET BARU hasil ekstrak dua gambar referensi (51 warna)
//   • cakupan   : SEMUA bagian (ruangan, 4 preset objek, langit & cuaca)
//
// ⚠ ATURAN RONDE 13 DIBATALKAN OLEH USER DI RONDE 38.
//   Dulu: "untuk pallete warna gunakan referensi ini saja" = 342 warna dari
//   gambar referensi. Sekarang keluaran warna dibatasi ke 32 warna Endesga.
//
// PALET REFERENSI LAMA MASIH DIPAKAI, TAPI HANYA SEBAGAI "NIAT DESAIN":
//   Grid 18 x 19 di bawah (kolom = keluarga warna, baris = kecerahan) tetap
//   dipakai untuk memilih warna: `warna(kolom, tingkat)`. Bedanya, tiap sel
//   grid sekarang DIPETAKAN ke warna Endesga terdekat (`keRetro`), jadi
//   - nama material di palette.ts tidak perlu diubah,
//   - file scene lama tetap terbaca,
//   - dan tidak ada satu piksel pun di luar 32 warna.
//
// API LAMA DIPERTAHANKAN (warna, gelap, terang, kePalet, posisi, diPalet,
// SEMUA, OLED) supaya seluruh kode lain tidak perlu diubah.
//
// TANGGA NADA: `gelap()` / `terang()` TIDAK mencampur warna (campuran = warna
// di luar palet), tetapi menggeser 1..3 langkah di TANGGA WARNA palet Endesga
// (lihat palet-retro.ts). Peralihan antar dua nada digambar dengan DITHERING
// (lihat iso/dither.ts), bukan gradasi halus.
// ===========================================================================

import {
  GELAP_MAKS,
  PALET_RETRO,
  SEMUA_RETRO,
  TANGGA,
  diRetro,
  jarakWarna,
  keRetro,
  lebihGelap,
  lebihTerang,
  tanggaDari,
  tinta,
} from './palet-retro'

export {
  GELAP_MAKS,
  PALET_RETRO,
  SEMUA_RETRO,
  TANGGA,
  diRetro,
  jarakWarna,
  keRetro,
  lebihGelap,
  lebihTerang,
  tanggaDari,
  tinta,
}

/**
 * Grid desain 19 baris x 18 kolom dari gambar referensi ronde 13 (342 warna).
 * Kolom = hue, baris = kecerahan (1 paling terang -> 19 paling gelap).
 * Dipakai lewat `warna(kolom, tingkat)`; hasilnya sudah dibulatkan ke palet
 * Endesga.
 */
const GRID_342: readonly (readonly string[])[] = [
  ['#fde8e7', '#ffede6', '#fef8e8', '#fefeec', '#f8feeb', '#ecffeb', '#e8ffef', '#e5fff7', '#e7ffff', '#e6f7ff', '#e6eeff', '#e6e6fe', '#eee8ff', '#f9e9fc', '#fde9f9', '#fde7ee', '#ded1c9', '#eeeeee'],
  ['#ffccc8', '#feddcd', '#fdeecd', '#fffdd6', '#ecfdd4', '#d1fed2', '#ccffdd', '#cefeef', '#cdffff', '#cbefff', '#cbdeff', '#cccdfd', '#dfceff', '#f6cffa', '#fecef1', '#fccddd', '#dec5af', '#dddddd'],
  ['#feb5b3', '#feccb4', '#fde7b5', '#fcffbd', '#e5fdc5', '#b6ffb7', '#b4fecd', '#b4fee5', '#b3feff', '#b4e6ff', '#b2cbfd', '#b4b4fe', '#cbb5ff', '#f1b8fc', '#fbb9e8', '#fdb5cd', '#deba9d', '#cdcdcd'],
  ['#fe9a9a', '#febc9a', '#fedd97', '#fefea5', '#ddfe9e', '#a0fea1', '#9bfeba', '#9affdd', '#98fffe', '#9bdefd', '#9abbfe', '#9a99fd', '#bd99ff', '#e8a1fc', '#f99ee1', '#fe99bb', '#dfae86', '#bbbbbb'],
  ['#fd817f', '#fdaa82', '#fcd780', '#fefd8d', '#d3fc8e', '#89fe8f', '#80feac', '#80fed4', '#83fefe', '#81d6fb', '#7eaafe', '#8281fc', '#ae81ff', '#df8efb', '#f986db', '#fe81ad', '#dc9f6e', '#ababab'],
  ['#fd6766', '#fc9a67', '#ffcc66', '#fafe76', '#cbfc73', '#6afd68', '#6afe9b', '#65fecb', '#66feff', '#66cbfc', '#6599fe', '#6767fd', '#9b67fe', '#e16efb', '#f86fcf', '#fb689c', '#df9057', '#9a9a9a'],
  ['#ff4c4f', '#fd894c', '#fdc44f', '#fbff5a', '#c1fc66', '#57fd55', '#4ffd8a', '#4cffc7', '#4cffff', '#4fc3ff', '#4d89ff', '#4d4dfe', '#894fff', '#dc5afa', '#fb57ca', '#fc4e8a', '#c57946', '#898989'],
  ['#fe3336', '#fe7734', '#fdbb39', '#f8fe42', '#bbfb50', '#3cfe3f', '#36ff7a', '#33febb', '#34fefe', '#34baff', '#3377fe', '#3333fb', '#7a36fe', '#de3cfd', '#f83ec5', '#fc377a', '#c26420', '#787878'],
  ['#ff191b', '#fd671a', '#fbb31d', '#f7fe2b', '#b4f739', '#20fd1d', '#1dfe6a', '#19ffb1', '#1afefd', '#19b3fe', '#1965fe', '#181afb', '#671aff', '#d91df9', '#f824b7', '#fa1c69', '#aa5a1d', '#666666'],
  ['#fd0100', '#fe5501', '#fdaa08', '#f6fe1a', '#a1fa28', '#0efe0c', '#04fd58', '#01fead', '#02fdff', '#01aaff', '#0055fe', '#0102f9', '#5804ff', '#d90ffb', '#f710ad', '#f90556', '#964d19', '#565656'],
  ['#e70103', '#e64d05', '#e89903', '#dee617', '#9ae616', '#07e605', '#02e74f', '#02e899', '#02e6e6', '#0199e8', '#004de5', '#0100e4', '#4e02e6', '#cb0be5', '#e90e9b', '#e6054d', '#895c3b', '#4d4d4d'],
  ['#ca0100', '#cd4303', '#cc8905', '#c7cc12', '#83cd1b', '#0ace0a', '#06cd45', '#02cc86', '#01cdcd', '#0286d0', '#0143cb', '#0201cd', '#4503ce', '#ac0ccd', '#c90e8f', '#d00344', '#89542d', '#454545'],
  ['#b30203', '#b23c02', '#b57600', '#adb412', '#76b115', '#0bb40c', '#03b23f', '#00b477', '#01b4b3', '#0078b5', '#033bb5', '#0001b1', '#3c03b4', '#960bb1', '#b40b77', '#b5033d', '#894c20', '#3c3c3c'],
  ['#9a0000', '#983403', '#9a6603', '#959915', '#669915', '#0c9b0e', '#049835', '#039965', '#029899', '#016598', '#003398', '#020199', '#350398', '#870b97', '#970d68', '#970433', '#814218', '#343434'],
  ['#810100', '#812c02', '#7e5506', '#7e8114', '#568116', '#0e810f', '#02802e', '#018055', '#008181', '#02557f', '#002b81', '#02017f', '#2d0382', '#720a81', '#7c0a5b', '#81032b', '#6b3813', '#2b2b2b'],
  ['#670001', '#662202', '#664304', '#656710', '#436812', '#0b670a', '#036621', '#026644', '#026666', '#024466', '#012267', '#030165', '#240464', '#600666', '#640647', '#670221', '#66361f', '#222222'],
  ['#4e0000', '#4d1a00', '#4d3302', '#4d4d10', '#344e13', '#085006', '#014d1c', '#024d33', '#014c4f', '#02344f', '#001a4d', '#01004e', '#1e024f', '#4c0b50', '#4e0836', '#4e021a', '#4e2917', '#1a1a1a'],
  ['#320101', '#311102', '#332203', '#34340b', '#23380d', '#0a370c', '#033412', '#003422', '#013334', '#002231', '#021133', '#010032', '#120534', '#2f0933', '#330522', '#330211', '#341b10', '#111111'],
  ['#1a0000', '#1a0901', '#1c1002', '#1b1a07', '#151b0d', '#0b1e0c', '#031a07', '#021911', '#011a19', '#001119', '#00081a', '#010118', '#0a041d', '#180a1b', '#1b0511', '#1a0209', '#1a0b03', '#090909'],
]

/** Grid yang sama, setiap sel SUDAH dibulatkan ke palet Endesga 32. */
export const PALET_REF: readonly (readonly string[])[] = GRID_342.map(baris => baris.map(keRetro))

/** nama kolom hue 1..18 (kiri -> kanan) */
export const KOLOM: readonly string[] = [
  'oranye', 'jingga', 'kuning', 'limo', 'hijau', 'toska', 'sian', 'biru-langit',
  'biru', 'biru-ungu', 'ungu', 'magenta', 'merah-muda', 'rose', 'merah', 'bata',
  'cokelat', 'abu-abu',
]

export const TINGKAT = 19

/** latar di luar ruangan: HITAM OLED murni (permintaan user, tetap berlaku) */
export const OLED = '#000000'

/** warna(kolom 1..18, tingkat 1..19) -> warna Endesga */
export function warna(kolom: number, tingkat: number): string {
  // Jumlah kolom (18) BUKAN sama dengan jumlah tingkat (19) — batasi per dimensi.
  const k = Math.min(KOLOM.length, Math.max(1, Math.round(kolom))) - 1
  const t = Math.min(TINGKAT, Math.max(1, Math.round(tingkat))) - 1
  return PALET_REF[t][k]
}

/** 32 warna Endesga — SATU-SATUNYA warna yang boleh muncul di kanvas */
export const SEMUA: readonly string[] = SEMUA_RETRO

/**
 * Warna palet terdekat (jarak "redmean"). Warna yang sudah anggota palet
 * dikembalikan apa adanya.
 */
export const kePalet = keRetro

/**
 * Posisi warna di grid desain (kolom 1..18, tingkat 1..19). Dipakai untuk
 * dokumentasi & uji; nilai ini hanya "posisi desain", bukan indeks palet.
 */
export function posisi(hex: string): { kolom: number; tingkat: number } {
  const c = keRetro(hex)
  for (let t = 0; t < TINGKAT; t++) {
    const k = PALET_REF[t].indexOf(c)
    if (k >= 0) return { kolom: k + 1, tingkat: t + 1 }
  }
  return { kolom: 1, tingkat: 1 }
}

/** versi lebih GELAP: turun `n` langkah di tangga nada palet Endesga */
export function gelap(hex: string, n = 1): string {
  return lebihGelap(hex, n)
}

/** versi lebih TERANG: naik `n` langkah di tangga nada palet Endesga */
export function terang(hex: string, n = 1): string {
  return lebihTerang(hex, n)
}

/** true kalau warna ini anggota palet Endesga 32 */
export function diPalet(hex: string): boolean {
  return diRetro(hex)
}
