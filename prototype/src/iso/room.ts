import { IH, IW, ROOM, px, type P } from './space'
import { PAL } from './palette'

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

function line(ctx: CanvasRenderingContext2D, a: P, b: P, color: string) {
  ctx.strokeStyle = color
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(Math.round(a.x) + 0.5, Math.round(a.y) + 0.5)
  ctx.lineTo(Math.round(b.x) + 0.5, Math.round(b.y) + 0.5)
  ctx.stroke()
}

// Buang anti-aliasing di tepi: alpha > 50% jadi solid, selain itu transparan.
// Ini yang membuat hasilnya terlihat pixel-art tajam, bukan vektor halus.
function crispify(ctx: CanvasRenderingContext2D) {
  const img = ctx.getImageData(0, 0, IW, IH)
  const d = img.data
  for (let i = 3; i < d.length; i += 4) d[i] = d[i] > 127 ? 255 : 0
  ctx.putImageData(img, 0, 0)
}

// SHELL RUANGAN SAJA: lantai + 2 dinding + plint + tepi.
// Objek & animasi menyusul setelah shell disepakati.
export function drawShell(ctx: CanvasRenderingContext2D, grid: boolean) {
  const { E, W, WALL_Z } = ROOM

  ctx.fillStyle = PAL.void
  ctx.fillRect(0, 0, IW, IH)

  // --- LANTAI: tile checker 2 warna ---
  for (let e = 0; e < E; e++) {
    for (let w = 0; w < W; w++) {
      poly(ctx, [px(e, w), px(e + 1, w), px(e + 1, w + 1), px(e, w + 1)],
        (e + w) % 2 === 0 ? PAL.floorA : PAL.floorB)
    }
  }
  // nat tile
  for (let e = 0; e <= E; e++) line(ctx, px(e, 0), px(e, W), PAL.grout)
  for (let w = 0; w <= W; w++) line(ctx, px(0, w), px(E, w), PAL.grout)

  // --- TEPI LANTAI (ketebalan papan, sisi depan/kamera) ---
  const SK = 5
  const bL = px(0, W), sL = px(E, W), tR = px(E, 0)
  poly(ctx, [bL, sL, { x: sL.x, y: sL.y + SK }, { x: bL.x, y: bL.y + SK }], PAL.skirtL)
  poly(ctx, [tR, sL, { x: sL.x, y: sL.y + SK }, { x: tR.x, y: tR.y + SK }], PAL.skirtR)

  // --- DINDING BARAT (kiri) ---
  poly(ctx, [px(0, 0, WALL_Z), px(0, W, WALL_Z), px(0, W, 0), px(0, 0, 0)], PAL.wallB)
  poly(ctx, [px(0, 0, 0.4), px(0, W, 0.4), px(0, W, 0), px(0, 0, 0)], PAL.trimB)
  line(ctx, px(0, 0, WALL_Z), px(0, W, WALL_Z), PAL.wallBTop)

  // --- DINDING TIMUR (kanan) ---
  poly(ctx, [px(0, 0, WALL_Z), px(E, 0, WALL_Z), px(E, 0, 0), px(0, 0, 0)], PAL.wallT)
  poly(ctx, [px(0, 0, 0.4), px(E, 0, 0.4), px(E, 0, 0), px(0, 0, 0)], PAL.trimT)
  line(ctx, px(0, 0, WALL_Z), px(E, 0, WALL_Z), PAL.wallTTop)

  // garis pertemuan dua dinding di pojok U
  line(ctx, px(0, 0, 0), px(0, 0, WALL_Z), PAL.seam)

  // --- OVERLAY GRID (tombol G) + label arah ---
  if (grid) {
    for (let e = 0; e <= E; e++) line(ctx, px(e, 0), px(e, W), PAL.grid)
    for (let w = 0; w <= W; w++) line(ctx, px(0, w), px(E, w), PAL.grid)
    ctx.font = '8px monospace'
    ctx.fillStyle = PAL.hud
    ctx.textAlign = 'center'
    ctx.fillText('U', px(0, 0).x, px(0, 0).y - 6)
    ctx.fillText('T', px(E, 0).x + 10, px(E, 0).y + 3)
    ctx.fillText('S', px(E, W).x, px(E, W).y + 14)
    ctx.fillText('B', px(0, W).x - 10, px(0, W).y + 3)
    ctx.fillText('DT', px(E * 0.62, 0, 3).x, px(E * 0.62, 0, 3).y)
    ctx.fillText('DB', px(0, W * 0.62, 3).x, px(0, W * 0.62, 3).y)
  }

  crispify(ctx)
}
