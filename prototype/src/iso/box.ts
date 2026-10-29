import { px, type P } from './space'
import { MATERIALS, UNKNOWN_STYLE } from './palette'
import type { SceneObject } from '../scene/types'

export interface Box { x0: number; y0: number; x1: number; y1: number }

function poly(ctx: CanvasRenderingContext2D, pts: P[], color: string) {
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
  poly(ctx, [t01, t11, b11, b01], c.left)
  poly(ctx, [t10, t11, b11, b10], c.right)
  poly(ctx, [t00, t10, t11, t01], c.top)
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
