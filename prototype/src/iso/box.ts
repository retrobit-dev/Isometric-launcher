import { px, type P } from './space'
import { MATERIALS, UNKNOWN_STYLE } from './palette'
import type { SceneObject } from '../scene/types'

export interface Box { x0: number; y0: number; x1: number; y1: number }

// ---------------------------------------------------------------------------
// GARIS TEPI (outline) — permintaan user 2026-10-29 "identik dengan referensi".
// Gambar referensi memberi garis tipis lebih gelap di tepi setiap bidang.
// Warnanya diturunkan otomatis dari warna isi (dicampur ke arah tinta gelap),
// jadi tidak perlu menambah warna baru ke palet.
// ---------------------------------------------------------------------------
const INK = { r: 0x33, g: 0x2b, b: 0x3d }
const CAMPUR = 0.34        // 0 = tanpa garis, 1 = tinta penuh
const TEBAL_TEPI = 1       // piksel internal (×4 = 4 px di tablet)

function gelapkan(warna: string, f = CAMPUR): string {
  const m = /^#([0-9a-f]{6})$/i.exec(warna)
  if (!m) return warna
  const n = parseInt(m[1], 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  const mix = (a: number, b2: number) => Math.round(a + (b2 - a) * f)
  return `rgb(${mix(r, INK.r)},${mix(g, INK.g)},${mix(b, INK.b)})`
}

function poly(ctx: CanvasRenderingContext2D, pts: P[], color: string, garis = true) {
  ctx.fillStyle = color
  ctx.beginPath()
  pts.forEach((p, i) => {
    const x = Math.round(p.x)
    const y = Math.round(p.y)
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  })
  ctx.closePath()
  ctx.fill()
  if (!garis) return
  ctx.strokeStyle = gelapkan(color)
  ctx.lineWidth = TEBAL_TEPI
  ctx.lineJoin = 'round'
  ctx.stroke()
}

/** garis tepi untuk objek ini (bawaan ON, `tepi: false` mematikannya) */
function tepiOf(o: SceneObject): boolean {
  return o.tepi !== false
}

function colorsOf(o: SceneObject) {
  // style tak dikenal TIDAK lagi diam-diam jadi kayu: magenta supaya terlihat
  if (typeof o.style === 'string') return MATERIALS[o.style] ?? UNKNOWN_STYLE
  return o.style
}

// Footprint setelah rotasi: rotasi 90/270 derajat menukar panjang <-> lebar.
export function footprintOf(o: SceneObject): { se: number; sw: number } {
  const rot = o.rot ?? 0
  return rot % 2 === 1
    ? { se: o.size.w, sw: o.size.e }
    : { se: o.size.e, sw: o.size.w }
}

// Balok iso prosedural: sisi kiri-depan, kanan-depan, lalu atas.
// Semua sisi digambar penuh (siap untuk mode orbit 3D nanti).
export function drawBox(ctx: CanvasRenderingContext2D, o: SceneObject) {
  const { e, w, z } = o.pos
  const { se, sw } = footprintOf(o)
  const sz = o.size.z
  const c0 = colorsOf(o)
  // REFLEKSI objek = cermin: sisi kiri & kanan bertukar (arah cahaya terbalik)
  const c = o.refleksi ? { top: c0.top, left: c0.right, right: c0.left } : c0
  const t00 = px(e, w, z + sz)
  const t10 = px(e + se, w, z + sz)
  const t11 = px(e + se, w + sw, z + sz)
  const t01 = px(e, w + sw, z + sz)
  const b10 = px(e + se, w, z)
  const b11 = px(e + se, w + sw, z)
  const b01 = px(e, w + sw, z)
  const g = tepiOf(o)
  poly(ctx, [t01, t11, b11, b01], c.left, g)
  poly(ctx, [t10, t11, b11, b10], c.right, g)
  poly(ctx, [t00, t10, t11, t01], c.top, g)
}

// ---------------------------------------------------------------------------
// BENTUK SILINDER & KERUCUT (permintaan user 2026-10-29)
// Alas berbentuk elips di bidang e-w. Karena proyeksi isometrik, elips di
// dunia menjadi elips 2:1 di layar — titik-titiknya dihitung di dunia lalu
// diproyeksikan lewat px(), jadi hasilnya sama dengan renderer APK nanti
// (lihat docs/04-KONTRAK-RENDERER.md §4a).
// ---------------------------------------------------------------------------
const SEGMEN = 24

/** titik alas (z = pos.z) & titik atas (z + size.z) untuk silinder/kerucut */
function cincin(o: SceneObject) {
  const { e, w, z } = o.pos
  const { se, sw } = footprintOf(o)
  const ce = e + se / 2
  const cw = w + sw / 2
  const re = se / 2
  const rw = sw / 2
  const bawah: P[] = []
  const atas: P[] = []
  const sudut: number[] = []
  for (let i = 0; i < SEGMEN; i++) {
    const t = (i / SEGMEN) * Math.PI * 2
    const ee = ce + re * Math.cos(t)
    const ww = cw + rw * Math.sin(t)
    bawah.push(px(ee, ww, z))
    atas.push(px(ee, ww, z + o.size.z))
    sudut.push(t)
  }
  return { bawah, atas, sudut }
}

/** warna 3 tone yang sudah memperhitungkan `refleksi` */
function toneOf(o: SceneObject) {
  const c = colorsOf(o)
  return o.refleksi ? { top: c.top, left: c.right, right: c.left } : c
}

export function drawSilinder(ctx: CanvasRenderingContext2D, o: SceneObject) {
  const { bawah, atas, sudut } = cincin(o)
  const c = toneOf(o)
  // segmen digambar dari belakang ke depan supaya saling menutup dengan benar
  const seg = sudut.map((t, i) => {
    const j = (i + 1) % SEGMEN
    const tengahY = (bawah[i].y + bawah[j].y + atas[i].y + atas[j].y) / 4
    // normal keluar: +e (kanan layar) & -w (kanan layar) -> tone kanan
    const kanan = (Math.cos(t) + Math.cos(sudut[j])) - (Math.sin(t) + Math.sin(sudut[j]))
    return { i, j, tengahY, warna: kanan >= 0 ? c.right : c.left }
  }).sort((a, b) => a.tengahY - b.tengahY)
  const g = tepiOf(o)
  for (const s of seg) {
    poly(ctx, [bawah[s.i], bawah[s.j], atas[s.j], atas[s.i]], s.warna, false)
  }
  // tutup atas: elips penuh
  poly(ctx, atas, c.top, g)
  // sisi luar saja yang diberi garis: rusuk tegak tiap 6 segmen
  for (let i = 0; i < SEGMEN; i += 6) {
    ctx.strokeStyle = gelapkan(bawah[i] ? c.left : c.left)
    ctx.beginPath()
    ctx.moveTo(Math.round(atas[i].x), Math.round(atas[i].y))
    ctx.lineTo(Math.round(bawah[i].x), Math.round(bawah[i].y))
    ctx.stroke()
  }
}

export function drawKerucut(ctx: CanvasRenderingContext2D, o: SceneObject) {
  const { e, w, z } = o.pos
  const { se, sw } = footprintOf(o)
  const { bawah, sudut } = cincin(o)
  const ce = e + se / 2
  const cw = w + sw / 2
  const re = se / 2
  const rw = sw / 2
  // `puncak` = perbandingan jari-jari atas (0 = runcing, 1 = silinder,
  // >1 = melebar ke atas seperti pot bunga)
  const rasio = Math.max(0, o.puncak ?? 0)
  const atas: P[] = rasio === 0
    ? sudut.map(() => px(ce, cw, z + o.size.z))
    : sudut.map(t => px(ce + re * rasio * Math.cos(t), cw + rw * rasio * Math.sin(t), z + o.size.z))
  const c = toneOf(o)
  const seg = sudut.map((t, i) => {
    const j = (i + 1) % SEGMEN
    const tengahY = (bawah[i].y + bawah[j].y + atas[i].y + atas[j].y) / 4
    const kanan = (Math.cos(t) + Math.cos(sudut[j])) - (Math.sin(t) + Math.sin(sudut[j]))
    return { i, j, tengahY, warna: kanan >= 0 ? c.right : c.left }
  }).sort((a, b) => a.tengahY - b.tengahY)
  const g = tepiOf(o)
  for (const s of seg) {
    poly(ctx, [bawah[s.i], bawah[s.j], atas[s.j], atas[s.i]], s.warna, false)
  }
  if (rasio > 0) poly(ctx, atas, c.top, g)
  ctx.strokeStyle = gelapkan(c.left)
  ctx.beginPath()
  for (let i = 0; i < SEGMEN; i += 6) {
    ctx.moveTo(Math.round(atas[i].x), Math.round(atas[i].y))
    ctx.lineTo(Math.round(bawah[i].x), Math.round(bawah[i].y))
  }
  ctx.stroke()
}

/**
 * BOLA (permintaan user 2026-10-29): bulatan untuk matahari di kaca jendela,
 * daun, atau bola lampu. Jari-jari dunia = min(size.e, size.w, size.z) / 2.
 * Di layar bola tampak hampir bulat (skala proyeksi isometrik ±1.31 × HW),
 * jadi digambar sebagai lingkaran bertone 3 lapis (gelap → dasar → sorot).
 */
export function drawBola(ctx: CanvasRenderingContext2D, o: SceneObject) {
  const { e, w, z } = o.pos
  const { se, sw } = footprintOf(o)
  const r = Math.min(se, sw, o.size.z) / 2
  if (r <= 0) return
  const pusat = px(e + se / 2, w + sw / 2, z + o.size.z / 2)
  const HWpiksel = px(e + 1, w, z).x - px(e, w, z).x
  const R = r * HWpiksel * 1.31
  const c = toneOf(o)
  const bulat = (cx: number, cy: number, rad: number, warna: string) => {
    ctx.fillStyle = warna
    ctx.beginPath()
    ctx.arc(cx, cy, rad, 0, Math.PI * 2)
    ctx.fill()
  }
  bulat(pusat.x, pusat.y, R, c.right)                       // bayangan
  if (tepiOf(o)) {
    ctx.strokeStyle = gelapkan(c.right)
    ctx.lineWidth = TEBAL_TEPI
    ctx.beginPath()
    ctx.arc(Math.round(pusat.x), Math.round(pusat.y), Math.round(R), 0, Math.PI * 2)
    ctx.stroke()
  }
  bulat(pusat.x - R * 0.1, pusat.y - R * 0.1, R * 0.86, c.left)  // badan
  bulat(pusat.x - R * 0.3, pusat.y - R * 0.3, R * 0.5, c.top)    // sorot
}

/**
 * CAKRAM: bulatan DATAR yang menghadap ruangan (bidang e-z) — dipakai untuk
 * matahari di kaca jendela, jam dinding, atau hiasan bulat. Digambar dari 24
 * titik dunia lalu diproyeksikan, jadi bentuk elipsnya geometris benar.
 */
export function drawCakram(ctx: CanvasRenderingContext2D, o: SceneObject) {
  const { e, w, z } = o.pos
  const { se, sw } = footprintOf(o)
  const ce = e + se / 2
  const cw = w + sw / 2
  const cz = z + o.size.z / 2
  const re = se / 2
  const rz = o.size.z / 2
  const c = toneOf(o)
  const titik = (re2: number, rz2: number, de = 0, dz = 0) => {
    const out: P[] = []
    for (let i = 0; i < SEGMEN; i++) {
      const t = (i / SEGMEN) * Math.PI * 2
      out.push(px(ce + de + re2 * Math.cos(t), cw, cz + dz + rz2 * Math.sin(t)))
    }
    return out
  }
  const g = tepiOf(o)
  poly(ctx, titik(re, rz), c.left, g)
  poly(ctx, titik(re * 0.82, rz * 0.82, -re * 0.08, rz * 0.1), c.top, false)
  poly(ctx, titik(re * 0.34, rz * 0.34, -re * 0.3, rz * 0.3), c.right, false)
}

/**
 * DAUN (permintaan user 2026-10-29): lonjong berujung runcing di bidang e-z.
 * size.e = panjang, size.z = lebar, `miring` = sudut sumbu (derajat, 90 tegak).
 * Rumus lebar: setengah-lebar = (size.z/2) · sin(πs)^0.75 · (1 − 0.35s),
 * jadi pangkal & ujung runcing, bagian tengah paling lebar.
 */
export function drawDaun(ctx: CanvasRenderingContext2D, o: SceneObject) {
  // ANCHOR = pangkal daun di pos (e, w, z); daun tumbuh sepanjang `miring`.
  const P0 = o.pos
  const L = o.size.e            // panjang daun
  const Wd = o.size.z           // lebar daun
  if (L <= 0 || Wd <= 0) return
  const t = ((o.miring ?? 90) * Math.PI) / 180
  const ct = Math.cos(t)
  const st = Math.sin(t)
  const N = 16
  const c = toneOf(o)
  const g = tepiOf(o)
  // titik(s, skala): s = 0..1 sepanjang daun, skala = pengali lebar
  const titik = (s: number, skala: number): P => {
    const along = s * L
    const lebar = (Wd / 2) * Math.pow(Math.sin(Math.PI * s), 0.75) * (1 - 0.35 * s) * skala
    return px(P0.e + along * ct - lebar * st, P0.w + lebar * ct, P0.z + along * st)
  }
  const badan = (skala: number): P[] => {
    const kiri: P[] = []
    const kanan: P[] = []
    for (let i = 0; i <= N; i++) {
      const s = i / N
      kiri.push(titik(s, +1 * skala))
      kanan.push(titik(s, -1 * skala))
    }
    return [...kiri, ...kanan.reverse()]
  }
  poly(ctx, badan(1), c.left, g)
  // sorotan: bagian tengah daun lebih terang, digeser sedikit ke arah cahaya
  poly(ctx, badan(0.5).map(q => ({ x: q.x - 1, y: q.y - 1 })), c.top, false)
}

/** penggambar objek: pilih bentuk sesuai field `bentuk` */
export function drawObject(ctx: CanvasRenderingContext2D, o: SceneObject) {
  if (o.bentuk === 'silinder') return drawSilinder(ctx, o)
  if (o.bentuk === 'kerucut') return drawKerucut(ctx, o)
  if (o.bentuk === 'bola') return drawBola(ctx, o)
  if (o.bentuk === 'cakram') return drawCakram(ctx, o)
  if (o.bentuk === 'daun') return drawDaun(ctx, o)
  return drawBox(ctx, o)
}

export function bboxOf(o: SceneObject): Box {
  const { e, w, z } = o.pos
  const { se, sw } = footprintOf(o)
  const pts = [
    px(e, w, z + o.size.z), px(e + se, w, z + o.size.z),
    px(e + se, w + sw, z + o.size.z), px(e, w + sw, z + o.size.z),
    px(e + se, w, z), px(e + se, w + sw, z), px(e, w + sw, z),
  ]
  const xs = pts.map(p => p.x)
  const ys = pts.map(p => p.y)
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) }
}

// Kedalaman gambar: yang lebih dekat ke kamera (S) digambar terakhir
export function depthOf(o: SceneObject): number {
  const { se, sw } = footprintOf(o)
  return o.pos.e + se / 2 + o.pos.w + sw / 2
}

/**
 * Urutan gambar: `urutan` eksplisit (dari tombol NAIKKAN / TURUNKAN) menang;
 * yang belum punya `urutan` tetap memakai kedalaman isometrik. Nilai eksplisit
 * selalu dianggap di atas nilai otomatis, supaya objek baru (urutan terbesar)
 * benar-benar menimpa objek lama.
 */
export function sortedObjects(objects: SceneObject[]): SceneObject[] {
  return [...objects].sort((a, b) => {
    const ua = a.urutan
    const ub = b.urutan
    if (ua !== undefined && ub !== undefined) {
      if (ua !== ub) return ua - ub
      return depthOf(a) - depthOf(b)
    }
    if (ua !== undefined) return 1
    if (ub !== undefined) return -1
    return depthOf(a) - depthOf(b)
  })
}
