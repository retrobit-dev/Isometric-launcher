// ===========================================================================
// PALET RETRO — ENDESGA 32 (EDG32)
// ===========================================================================
// Permintaan user 2026-10-29: "untuk semuanya bisakah style nya dan palette
// warna nya dibuat lebih ke arah retro pixel art?" — pilihan user:
//   • teknik  : DITHERING (pola kotak-kotak) untuk transisi warna
//   • palet   : ENDESGA 32 (32 warna, gaya 16-bit)
//   • cakupan : SEMUA bagian (ruangan, objek, langit/cuaca)
//
// CATATAN PENTING: pilihan palet ini MEMBATALKAN aturan ronde 13
// ("untuk pallete warna gunakan referensi ini saja" = 342 warna). Sejak
// sekarang keluaran warna = 32 warna Endesga di bawah. Palet referensi lama
// tetap disimpan sebagai *niat desain* (grid 18 x 19 di palet-referensi.ts):
// tiap warna di sana DIPETAKAN ke warna Endesga terdekat, jadi nama material
// di palette.ts tidak perlu diubah dan file scene lama tetap terbaca.
//
// Kenapa 32 warna ini cocok untuk diorama hangat: keluarga cokelat/oranye/krem
// lengkap (8 nada), hijau daun 4 nada, biru-langit 6 nada + sian 3 nada, plus
// merah/ungu/pink sebagai aksen buku & bunga.
// ===========================================================================

/** 32 warna Endesga (EDG32), urut sesuai palet aslinya. */
export const PALET_RETRO: readonly string[] = [
  '#be4a2f', '#d77643', '#ead4aa', '#e4a672',
  '#b86f50', '#733e39', '#3e2731', '#a22633',
  '#e43b44', '#f77622', '#feae34', '#fee761',
  '#63c74d', '#3e8948', '#265c42', '#193c3e',
  '#124e89', '#0099db', '#2ce8f5', '#ffffff',
  '#c0cbdc', '#8b9bb4', '#5a6988', '#3a4466',
  '#262b44', '#181425', '#ff0044', '#68386c',
  '#b55088', '#f6757a', '#e8b796', '#c28569',
]

export const SEMUA_RETRO: readonly string[] = PALET_RETRO
const SET_RETRO = new Set(PALET_RETRO)

/**
 * TANGGA NADA (ramp) — dipakai `gelap()` / `terang()` supaya bayangan tetap
 * satu keluarga warna dan cuma bergeser 1 nada (ciri pixel-art), tidak
 * melompat ke warna lain. Tiap warna Endesga masuk tepat satu tangga, urut
 * dari GELAP ke TERANG.
 */
export const TANGGA: readonly (readonly string[])[] = [
  // cokelat -> krem (kayu, dinding, lantai, kertas)
  ['#3e2731', '#733e39', '#b86f50', '#c28569', '#e4a672', '#e8b796', '#ead4aa'],
  // merah (buku, kain, lampu)
  ['#a22633', '#e43b44', '#f6757a'],
  // oranye -> kuning (cahaya, matahari, lampu, terakota)
  ['#be4a2f', '#d77643', '#f77622', '#feae34', '#fee761'],
  // hijau (daun, papan tulis hijau, zaitun)
  ['#193c3e', '#265c42', '#3e8948', '#63c74d'],
  // biru -> putih (langit, kaca, logam, kertas putih)
  ['#181425', '#262b44', '#3a4466', '#5a6988', '#8b9bb4', '#c0cbdc', '#ffffff'],
  // sian (langit cerah, hujan, kaca jendela)
  ['#124e89', '#0099db', '#2ce8f5'],
  // ungu (aksen buku & bunga)
  ['#68386c', '#b55088'],
  // pink pekat (aksen)
  ['#ff0044'],
]

function rgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

/**
 * Jarak warna "redmean" (0..~765^2): lebih dekat ke persepsi mata daripada
 * RGB mentah, tapi tetap murni bilangan bulat sehingga renderer Python bisa
 * menghitung hasil yang PERSIS sama.
 */
export function jarakWarna(a: string, b: string): number {
  const [r1, g1, b1] = rgb(a)
  const [r2, g2, b2] = rgb(b)
  const rmean = (r1 + r2) / 2
  const dr = r1 - r2
  const dg = g1 - g2
  const db = b1 - b2
  return (2 + rmean / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rmean) / 256) * db * db
}

const cache = new Map<string, string>()

/**
 * Warna Endesga terdekat dari sembarang warna hex.
 * Warna yang SUDAH anggota palet dikembalikan apa adanya (tanpa pembulatan).
 */
export function keRetro(hex: string): string {
  const kunci = hex.toLowerCase()
  if (SET_RETRO.has(kunci)) return kunci
  const tersimpan = cache.get(kunci)
  if (tersimpan) return tersimpan
  if (!/^#[0-9a-f]{6}$/i.test(kunci)) return hex     // 'rgba(...)' dsb. dilewatkan
  let terbaik = PALET_RETRO[0]
  let jarak = Infinity
  for (const c of PALET_RETRO) {
    const d = jarakWarna(kunci, c)
    if (d < jarak) { jarak = d; terbaik = c }
  }
  cache.set(kunci, terbaik)
  return terbaik
}

/** true kalau warna ini anggota palet Endesga */
export function diRetro(hex: string): boolean {
  return SET_RETRO.has(hex.toLowerCase())
}

/**
 * Warna "paling gelap" saat sebuah tangga sudah habis (ujung bawah).
 * Palet Endesga tidak punya hitam murni — `#181425` adalah nada tergelapnya
 * (dipakai juga sebagai bayangan terdalam ruangan).
 */
export const GELAP_MAKS = '#181425'

/** posisi warna di tangga nada: indeks tangga (0..) dan tingkat (0..) */
export function tanggaDari(hex: string): { tangga: number; tingkat: number } {
  const c = keRetro(hex)
  for (let i = 0; i < TANGGA.length; i++) {
    const k = TANGGA[i].indexOf(c)
    if (k >= 0) return { tangga: i, tingkat: k }
  }
  return { tangga: 0, tingkat: 0 }
}

/**
 * Warna `n` tingkat LEBIH GELAP di tangga yang sama (mentok di ujung).
 * `n` boleh 0 (warna itu sendiri).
 */
export function lebihGelap(hex: string, n = 1): string {
  const { tangga, tingkat } = tanggaDari(hex)
  const i = tingkat - Math.max(0, Math.round(n))
  // ujung bawah tangga tercapai -> pakai nada tergelap palet, jangan diam di
  // tempat (kalau diam, "sisi teduh" jadi sama dengan "sisi cahaya")
  if (i < 0) return GELAP_MAKS
  return TANGGA[tangga][i]
}

/** Warna `n` tingkat LEBIH TERANG di tangga yang sama (mentok di ujung). */
export function lebihTerang(hex: string, n = 1): string {
  const { tangga, tingkat } = tanggaDari(hex)
  const i = Math.min(TANGGA[tangga].length - 1, tingkat + Math.max(0, Math.round(n)))
  return TANGGA[tangga][i]
}
