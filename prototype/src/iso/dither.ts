// ===========================================================================
// DITHERING — pola BAYER 4x4 (ciri pixel-art retro)
// ===========================================================================
// Permintaan user 2026-10-29: "style dan palette warna dibuat lebih ke arah
// retro pixel art" dengan ciri DITHERING dan palet ENDESGA 32.
//
// Cara kerja:
//   Palet Endesga cuma 32 warna, jadi gradasi tidak bisa dibuat dengan
//   mencampur warna (hasil campuran = warna di luar palet). Sebaliknya,
//   dibuat POLA KOTAK-KOTAK antara dua warna palet: makin besar `level`
//   (0..1), makin banyak piksel warna kedua. Mata membaca pola ini sebagai
//   nada antara — inilah yang dipakai game 16-bit untuk langit, dinding,
//   dan bayangan.
//
// Pola memakai matriks Bayer 4x4 (ambang 0..15). Satu SEL matriks digambar
// sebagai blok SKALA x SKALA piksel internal. Dengan SKALA = 2 ubin polanya
// 8x8 piksel internal -> 18x18 piksel di layar (kanvas diperbesar 2,25x).
// User ronde 38 meminta tekstur kotaknya LEBIH KASAR/LEBIH KELIHATAN, jadi
// SKALA dinaikkan dari 1 ke 2.
//
// Renderer offline (tools/render_scene.py) memakai matriks yang SAMA PERSIS,
// sehingga PNG uji = kanvas.
//
// Di lingkungan tanpa DOM (uji Node memakai ctx tiruan), pola diganti warna
// tunggal (level >= 0,5 -> warna kedua) supaya uji geometri/animasi tetap
// bisa dijalankan tanpa browser.
// ===========================================================================

/**
 * SKALA sel pola: 1 = satu sel = 1 piksel internal (halus), 2 = satu sel =
 * 2x2 piksel internal (kasar / lebih kelihatan). Ubah di sini + di
 * `tools/render_scene.py` (`SKALA_DITHER`) supaya dua renderer tetap sama.
 */
export const SKALA = 3

/** matriks ambang Bayer 4x4 (nilai 0..15) */
export const BAYER4: readonly (readonly number[])[] = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
]

/** ambang 0.5..15.5 untuk sebuah sel pola */
export function ambangBayer(x: number, y: number): number {
  const px = ((x % 4) + 4) % 4
  const py = ((y % 4) + 4) % 4
  return BAYER4[py][px] + 0.5
}

/** true kalau sel (x,y) memakai warna kedua pada `level` tertentu */
export function pikselB(x: number, y: number, level: number): boolean {
  return ambangBayer(x, y) < level * 16
}

type Pola = CanvasPattern | string

const simpanan = new WeakMap<CanvasRenderingContext2D, Map<string, Pola>>()

/** peta pola per context (kanvas berbeda = pola berbeda) */
function petaPola(ctx: CanvasRenderingContext2D): Map<string, Pola> | null {
  if (!ctx || !ctx.canvas || !ctx.canvas.ownerDocument) return null
  let peta = simpanan.get(ctx)
  if (!peta) { peta = new Map(); simpanan.set(ctx, peta) }
  return peta
}

/**
 * POLA DITHER siap pakai sebagai `fillStyle`: campuran warna `a` (dasar) dan
 * `b` (aksen) dengan `level` 0..1. Level dibulatkan ke 1/16 supaya polanya
 * sama di semua perangkat (dan mudah ditiru renderer Python).
 */
export function polaDither(
  ctx: CanvasRenderingContext2D,
  a: string,
  b: string,
  level: number,
): Pola {
  const t = Math.max(0, Math.min(1, level))
  if (t <= 0.001) return a
  if (t >= 0.999) return b
  const per = Math.round(t * 16)
  const peta = petaPola(ctx)
  if (!peta) return per >= 8 ? b : a          // tanpa DOM: warna tunggal
  const kunci = `${a}|${b}|${per}`
  const sudah = peta.get(kunci)
  if (sudah) return sudah

  const ubin = ctx.canvas.ownerDocument!.createElement('canvas')
  ubin.width = 4 * SKALA
  ubin.height = 4 * SKALA
  const u = ubin.getContext('2d')!
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      u.fillStyle = pikselB(x, y, per / 16) ? b : a
      u.fillRect(x * SKALA, y * SKALA, SKALA, SKALA)
    }
  }
  const pola = ctx.createPattern(ubin, 'repeat')!
  peta.set(kunci, pola)
  return pola
}

/**
 * POLA BAYANGAN (dither bertumpuk): `level` bagian piksel diisi `warna`,
 * sisanya TRANSPARAN. Dipakai untuk menggelapkan bidang yang sudah punya
 * warna sendiri (lantai berubin, muka dinding) tanpa perlu tahu warna dasar
 * tiap piksel — mis. bayangan ambient di kaki dinding.
 */
export function polaBayang(
  ctx: CanvasRenderingContext2D,
  warna: string,
  level: number,
): Pola {
  const t = Math.max(0, Math.min(1, level))
  if (t <= 0.001) return 'rgba(0,0,0,0)'
  if (t >= 0.999) return warna
  const per = Math.round(t * 16)
  const peta = petaPola(ctx)
  if (!peta) return 'rgba(0,0,0,0)'
  const kunci = `~${warna}|${per}`
  const sudah = peta.get(kunci)
  if (sudah) return sudah

  const ubin = ctx.canvas.ownerDocument!.createElement('canvas')
  ubin.width = 4 * SKALA
  ubin.height = 4 * SKALA
  const u = ubin.getContext('2d')!
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      if (!pikselB(x, y, per / 16)) continue
      u.fillStyle = warna
      u.fillRect(x * SKALA, y * SKALA, SKALA, SKALA)
    }
  }
  const pola = ctx.createPattern(ubin, 'repeat')!
  peta.set(kunci, pola)
  return pola
}

/**
 * TANGGA DITHER: daftar pola antara warna `atas` dan `bawah` sebanyak
 * `langkah` (dipakai untuk peralihan bertahap di bidang lebar).
 */
export function tanggaDither(
  ctx: CanvasRenderingContext2D,
  atas: string,
  bawah: string,
  langkah: number,
): Pola[] {
  const out: Pola[] = []
  const n = Math.max(1, Math.round(langkah))
  for (let i = 0; i < n; i++) out.push(polaDither(ctx, atas, bawah, (i + 1) / (n + 1)))
  return out
}
