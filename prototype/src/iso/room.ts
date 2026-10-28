import { CAM, CY, HH, IH, IW, ROOM, ZH, px, type P } from './space'
import { PAL } from './palette'
import { drawBox, sortedObjects } from './box'
import type { SceneObject } from '../scene/types'

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

function line(ctx: CanvasRenderingContext2D, a: P, b: P, color: string, dash?: number[]) {
  ctx.strokeStyle = color
  ctx.lineWidth = 1
  ctx.setLineDash(dash ?? [])
  ctx.beginPath()
  ctx.moveTo(Math.round(a.x) + 0.5, Math.round(a.y) + 0.5)
  ctx.lineTo(Math.round(b.x) + 0.5, Math.round(b.y) + 0.5)
  ctx.stroke()
  ctx.setLineDash([])
}

// Buang anti-aliasing tepi: pixel-art tetap kotak & tajam
function crispify(ctx: CanvasRenderingContext2D) {
  const img = ctx.getImageData(0, 0, IW, IH)
  const d = img.data
  for (let i = 3; i < d.length; i += 4) d[i] = d[i] > 127 ? 255 : 0
  ctx.putImageData(img, 0, 0)
}

const DADO_Z = 0.18  // plint kayu tipis di dasar dinding (referensi ~6px @640)

function walls(ctx: CanvasRenderingContext2D) {
  const { E, W, WALL_Z } = ROOM
  // Dinding digambar sampai melewati tepi atas layar pada zoom/pan apa pun,
  // sehingga tidak ada ruang kosong di atas (permintaan user).
  // Tinggi fungsional untuk objek tetap WALL_Z; sisanya hanya visual.
  const zTop = Math.max(
    WALL_Z,
    Math.ceil((CY + (Math.max(E, W) - CAM.CE - CAM.CW) * HH) / ZH) + 1,
  )
  const T = 0.4 // (tidak dipakai: volume balok dibatalkan user) — disimpan utk referensi
  void T

  // sisi dalam dinding (bidang utama ruangan) — tanpa volume balok
  poly(ctx, [px(0, 0, zTop), px(0, W, zTop), px(0, W, 0), px(0, 0, 0)], PAL.wallB)
  poly(ctx, [px(0, 0, DADO_Z), px(0, W, DADO_Z), px(0, W, 0), px(0, 0, 0)], PAL.trimB)
  poly(ctx, [px(0, 0, zTop), px(E, 0, zTop), px(E, 0, 0), px(0, 0, 0)], PAL.wallT)
  poly(ctx, [px(0, 0, DADO_Z), px(E, 0, DADO_Z), px(E, 0, 0), px(0, 0, 0)], PAL.trimT)

  line(ctx, px(0, 0, 0), px(0, 0, zTop), PAL.seam)
}

function floor(ctx: CanvasRenderingContext2D) {
  const { E, W } = ROOM
  const tones = [PAL.floorBase, PAL.floorAlt, PAL.floorC]
  // Ubin PERSEGI 1x1 tile (gambar referensi: ubin persegi, bukan papan
  // selang-seling). Tiap ubin diberi tone halus agar lantai tidak datar.
  for (let w = 0; w < W; w++) {
    for (let e = 0; e < E; e++) {
      poly(ctx, [px(e, w), px(e + 1, w), px(e + 1, w + 1), px(e, w + 1)],
        tones[(e * 7 + w * 13) % 3])
    }
  }
  // nat: garis tipis setiap 1 tile ke dua arah (kisi diamond)
  for (let w = 0; w <= W; w++) line(ctx, px(0, w), px(E, w), PAL.grout)
  for (let e = 0; e <= E; e++) line(ctx, px(e, 0), px(e, W), PAL.grout)
  // slab alas tipis (volume balok dibatalkan user)
  const SK = 10
  const bL = px(0, W), sL = px(E, W), tR = px(E, 0)
  poly(ctx, [bL, sL, { x: sL.x, y: sL.y + SK }, { x: bL.x, y: bL.y + SK }], PAL.skirtL)
  poly(ctx, [tR, sL, { x: sL.x, y: sL.y + SK }, { x: tR.x, y: tR.y + SK }], PAL.skirtR)
}

function overlays(ctx: CanvasRenderingContext2D, grid: boolean, edit: boolean) {
  const { E, W } = ROOM
  if (grid) {
    for (let e = 0; e <= E; e++) line(ctx, px(e, 0), px(e, W), PAL.grid)
    for (let w = 0; w <= W; w++) line(ctx, px(0, w), px(E, w), PAL.grid)
    ctx.font = '7px monospace'
    ctx.fillStyle = PAL.hud
    const onScreen = (p: P) => p.x > -20 && p.x < IW + 20 && p.y > -10 && p.y < IH + 10
    ctx.textAlign = 'left'
    for (let e = 1; e <= E; e += 1) {
      const p = px(e, 0)
      if (onScreen(p)) ctx.fillText(String(e), p.x + 3, p.y + 9)
    }
    ctx.textAlign = 'right'
    for (let w = 1; w <= W; w += 1) {
      const p = px(0, w)
      if (onScreen(p)) ctx.fillText(String(w), p.x - 3, p.y + 9)
    }
    ctx.textAlign = 'center'
    ctx.fillText('DT', px(6, 0, 3.2).x, px(6, 0, 3.2).y)
    ctx.fillText('DB', px(0, 6, 3.2).x, px(0, 6, 3.2).y)
  }
  if (edit) {
    // batas zona: strip 1.5 tile menempel dinding = zona objek dinding/dekor
    // (docs/03 §3); objek interaktif/app hidup di t >= 1.5
    line(ctx, px(1.5, 0), px(1.5, W), PAL.zone, [3, 3])
    line(ctx, px(0, 1.5), px(E, 1.5), PAL.zone, [3, 3])
  }
}

export interface DrawOpts {
  grid: boolean
  edit: boolean
  objects: SceneObject[]
  selectedId: string | null
  refleksi: boolean
}

// Refleksi lantai: bayangan cermin objek di bawah bidang lantai,
// dipadatkan 60% dan samar (alpha 12%), dipotong persis ke bentuk lantai.
function drawReflections(ctx: CanvasRenderingContext2D, objects: SceneObject[]) {
  const { E, W } = ROOM
  ctx.save()
  ctx.beginPath()
  const f0 = px(0, 0), f1 = px(E, 0), f2 = px(E, W), f3 = px(0, W)
  ctx.moveTo(f0.x, f0.y)
  ctx.lineTo(f1.x, f1.y)
  ctx.lineTo(f2.x, f2.y)
  ctx.lineTo(f3.x, f3.y)
  ctx.closePath()
  ctx.clip()
  ctx.globalAlpha = 0.12
  const reflectable = objects.filter(x => (x.layer ?? 'main') !== 'underlay')
  for (const obj of sortedObjects(reflectable)) {
    const zh = obj.size.z * 0.6
    drawBox(ctx, {
      ...obj,
      pos: { ...obj.pos, z: -(obj.pos.z + zh) },
      size: { ...obj.size, z: zh },
    })
  }
  ctx.restore()
}

export function drawScene(ctx: CanvasRenderingContext2D, o: DrawOpts) {
  ctx.fillStyle = PAL.void
  ctx.fillRect(0, 0, IW, IH)

  walls(ctx)
  floor(ctx)
  overlays(ctx, o.grid, o.edit)

  // tiga lapis: underlay (bawah) -> main -> overlay (atas),
  // masing-masing tetap diurutkan kedalaman agar isometrik benar
  const layerOf = (x: SceneObject) => x.layer ?? 'main'
  for (const obj of sortedObjects(o.objects.filter(x => layerOf(x) === 'underlay'))) drawBox(ctx, obj)
  for (const obj of sortedObjects(o.objects.filter(x => layerOf(x) === 'main'))) drawBox(ctx, obj)
  for (const obj of sortedObjects(o.objects.filter(x => layerOf(x) === 'overlay'))) drawBox(ctx, obj)

  if (o.selectedId) {
    const sel = o.objects.find(x => x.id === o.selectedId)
    if (sel) {
      // sorot: garis dasar tile tempat objek berdiri
      const { e, w } = sel.pos
      const se = sel.size.e, sw = sel.size.w
      line(ctx, px(e, w), px(e + se, w), PAL.zone)
      line(ctx, px(e + se, w), px(e + se, w + sw), PAL.zone)
      line(ctx, px(e + se, w + sw), px(e, w + sw), PAL.zone)
      line(ctx, px(e, w + sw), px(e, w), PAL.zone)
    }
  }

  crispify(ctx)

  // refleksi digambar SETELAH crispify agar alpha samar tidak ikut ter-threshold
  if (o.refleksi) drawReflections(ctx, o.objects)
}
