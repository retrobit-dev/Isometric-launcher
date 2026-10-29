// ===========================================================================
// PALET REFERENSI — 2026-10-29
// Permintaan user: "untuk pallete warna gunakan referensi ini saja" + gambar
// COLOR PALETTE "Rainbow colors with brown and gray".
//
// Sumber: /tmp/arena-coding-uploads/5cd0814252f356b311635d5c6067e48d.jpg
// Kotak swatch dideteksi otomatis (18 kolom x 19 baris), lalu warna tiap kotak
// diambil dari MEDIAN piksel tengahnya (bukan rata-rata, supaya tepi JPEG yang
// bergradasi tidak menggeser warna). Hasil: **342 warna unik** — tidak ada satu
// pun yang dobel, jadi ini benar-benar palet referensi, bukan tafsiran.
//
// Tata letak grid:
//   - KOLOM 1..18 = keluarga warna (hue), kiri -> kanan:
//     oranye, jingga, kuning, limo, hijau, toska, sian, biru-langit, biru,
//     biru-ungu, ungu, magenta, merah-muda, rose, merah, bata,
//     COKELAT, ABU-ABU  (dua kolom terakhir = bagian "brown and gray" pada judul)
//   - BARIS 1..19 = tingkat kecerahan, ATAS paling terang -> BAWAH paling gelap.
//     Baris 1 hampir putih, baris 19 nyaris hitam. 19 tingkat ini memberi tangga
//     shading yang cukup halus untuk dinding, kayu, dan bayangan.
//
// ATURAN PAKAI (yang membuat tema konsisten):
//   1. Setiap warna yang keluar ke kanvas HARUS salah satu dari 342 warna ini.
//      Palet lama (tema "diorama hangat") tidak dibuang, tetapi SETIAP warnanya
//      dipetakan ke warna terdekat di palet ini lewat `kePalet()` (jarak CIE Lab,
//      bukan RGB mentah — mendekati cara mata melihat kemiripan).
//   2. Bayangan/sorotan TIDAK dicampur bebas. `gelap()` / `terang()` menaik-
//      turunkan satu kolom hue yang sama, jadi shading tetap di tangga palet
//      (19 tingkat) dan gaya jadinya cell-shading pixel-art.
//   3. Latar belakang memakai HITAM OLED murni `#000000` (permintaan user:
//      "latar belakang buat hitam oled saja") — piksel mati total di layar OLED.
// ===========================================================================

/** 19 baris x 18 kolom, diambil langsung dari gambar referensi. */
export const PALET_REF: readonly (readonly string[])[] = [
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

/** Nama kolom (keluarga hue) untuk pesan galat & dokumentasi. */
export const KOLOM: readonly string[] = [
  'oranye',
  'jingga',
  'kuning',
  'limo',
  'hijau',
  'toska',
  'sian',
  'biru-langit',
  'biru',
  'biru-ungu',
  'ungu',
  'magenta',
  'merah-muda',
  'rose',
  'merah',
  'bata',
  'cokelat',
  'abu-abu'
]

/** jumlah tingkat kecerahan per kolom */
export const TINGKAT = 19

/** latar belakang hitam OLED murni */
export const OLED = '#000000'

/** warna(kolom 1..18, tingkat 1..19) */
export function warna(kolom: number, tingkat: number): string {
  // CATATAN: jumlah kolom (18) BUKAN sama dengan jumlah tingkat (19) — dulu
  // keduanya dibatasi dengan TINGKAT, sehingga kolom cokelat/abu (17-18)
  // terlempar ke kolom 16 dan seluruh kayu jadi PINK. Batasi per dimensi.
  const k = Math.min(KOLOM.length, Math.max(1, Math.round(kolom))) - 1
  const t = Math.min(TINGKAT, Math.max(1, Math.round(tingkat))) - 1
  return PALET_REF[t][k]
}

/** semua 342 warna, urut baris lalu kolom */
export const SEMUA: readonly string[] = PALET_REF.flatMap(r => r)

const SEMUA_SET = new Set(SEMUA)

// ---------------------------------------------------------------------------
// PEMETAAN WARNA -> PALET
//
// Pendekatan "warna terdekat di ruang Lab" ternyata SALAH untuk palet ini:
// palet referensi disusun sebagai HUE x KECERAHAN, dan baris paling atas hampir
// putih. Akibatnya krem hangat (#f7e6c4) dipetakan ke putih-pink (kolom 1 baris
// 1), lalu bayangannya jadi salmon/pink — diorama berubah jadi merah muda.
//
// Jadi pemetaan dilakukan pada sumbu yang sama dengan susunan paletnya:
//   1. HUE  -> memilih KOLOM (keluarga warna)
//   2. KECERAHAN -> memilih BARIS (tingkat)
// Abu-abu (saturasi sangat rendah) masuk kolom 18 (abu-abu), krem/cokelat pudar
// masuk kolom 17 (cokelat) supaya tetap hangat dan tidak jadi pink.
// ---------------------------------------------------------------------------
function hsl(hex: string): { h: number; l: number; s: number } {
  const n = parseInt(hex.slice(1), 16)
  const r = ((n >> 16) & 255) / 255
  const g = ((n >> 8) & 255) / 255
  const b = (n & 255) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2
  const d = max - min
  if (d === 0) return { h: 0, l, s: 0 }
  const s = d / (1 - Math.abs(2 * l - 1))
  let h: number
  if (max === r) h = ((g - b) / d) % 6
  else if (max === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  h *= 60
  if (h < 0) h += 360
  return { h, l, s }
}

/** hue wakil tiap kolom: diambil dari baris ke-9 (paling pekat) */
const HUE_KOLOM = PALET_REF[8].map(c => hsl(c).h)
const KOLOM_ABU = 17 // indeks 0-based kolom 18 (abu-abu)
const KOLOM_COKELAT = 16 // indeks 0-based kolom 17 (cokelat)

const jarakHue = (a: number, b: number) => {
  const d = Math.abs(a - b) % 360
  return d > 180 ? 360 - d : d
}

const cache = new Map<string, string>()

/**
 * Warna palet terdekat: hue memilih kolom, kecerahan memilih baris.
 * Warna yang SUDAH ada di palet dikembalikan apa adanya.
 */
export function kePalet(hex: string): string {
  const kunci = hex.toLowerCase()
  if (SEMUA_SET.has(kunci)) return kunci
  const tersimpan = cache.get(kunci)
  if (tersimpan) return tersimpan
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return hex   // 'rgba(...)' dsb. dilewatkan

  const { h, l } = hsl(hex)
  const n = parseInt(hex.slice(1), 16)
  const maks = Math.max((n >> 16) & 255, (n >> 8) & 255, n & 255)
  const mini = Math.min((n >> 16) & 255, (n >> 8) & 255, n & 255)
  const kroma = (maks - mini) / 255        // 0 = netral, 1 = paling pekat

  // 1. pilih kolom
  let kolom: number
  if (kroma < 0.10) {
    kolom = KOLOM_ABU                       // netral: putih, abu, hitam
  } else if (jarakHue(h, 30) < 38 && kroma < 0.52) {
    kolom = KOLOM_COKELAT                   // krem / cokelat pudar tetap hangat
  } else {
    let terbaik = 0, jarak = Infinity
    for (let k = 0; k < 16; k++) {          // hanya 16 kolom pelangi
      const d = jarakHue(h, HUE_KOLOM[k])
      if (d < jarak) { jarak = d; terbaik = k }
    }
    kolom = terbaik
  }

  // 2. pilih baris: baris dengan kecerahan terdekat di kolom itu
  //    (kolom abu/cokelat kecerahnnya turun mulus dari baris 1 ke 19)
  let baris = 0, beda = Infinity
  for (let t = 0; t < TINGKAT; t++) {
    const dl = Math.abs(hsl(PALET_REF[t][kolom]).l - l)
    if (dl < beda) { beda = dl; baris = t }
  }

  const hasil = PALET_REF[baris][kolom]
  cache.set(kunci, hasil)
  return hasil
}

/** posisi sebuah warna di palet: kolom 1..18 dan tingkat 1..19 */
export function posisi(hex: string): { kolom: number; tingkat: number } {
  const c = kePalet(hex)
  for (let t = 0; t < TINGKAT; t++) {
    const k = PALET_REF[t].indexOf(c)
    if (k >= 0) return { kolom: k + 1, tingkat: t + 1 }
  }
  return { kolom: 1, tingkat: 1 }
}

/** kecerahan kasar 0..255 untuk menjaga arah shading */
function luma(hex: string): number {
  const n = parseInt(hex.slice(1), 16)
  return ((n >> 16) & 255) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114
}

/**
 * Versi lebih GELAP dari warna yang sama: turun `n` tingkat di kolom yang sama.
 * Tidak pernah mencampur warna, jadi hasilnya selalu salah satu dari 342 warna.
 * Kolom cokelat/abu kadang TIDAK turun kecerahannya di baris berikutnya (warna
 * bergeser hue), jadi langkah ditambah sampai benar-benar lebih gelap — kalau
 * tidak, "sisi teduh" bisa lebih terang dari "sisi cahaya".
 */
export function gelap(hex: string, n = 1): string {
  const p = posisi(hex)
  const dasar = luma(kePalet(hex))
  let t = p.tingkat + Math.max(0, Math.round(n))
  while (t < TINGKAT && luma(warna(p.kolom, t)) >= dasar) t++
  return warna(p.kolom, t)
}

/** Versi lebih TERANG: naik `n` tingkat di kolom yang sama (dijaga benar-benar lebih terang). */
export function terang(hex: string, n = 1): string {
  const p = posisi(hex)
  const dasar = luma(kePalet(hex))
  let t = p.tingkat - Math.max(0, Math.round(n))
  while (t > 1 && luma(warna(p.kolom, t)) <= dasar) t--
  return warna(p.kolom, t)
}

/** true kalau warna ini bagian dari palet referensi */
export function diPalet(hex: string): boolean {
  return SEMUA_SET.has(hex.toLowerCase())
}

