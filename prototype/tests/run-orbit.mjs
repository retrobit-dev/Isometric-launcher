// UJI ORBIT KAMERA 15° (docs/06-ORBIT-15.md)
//   cd prototype && node tests/run-orbit.mjs
//
// Yang diuji (semuanya fungsi murni, tanpa browser):
//   1. proyeksi <-> invers tetap konsisten di SETIAP sudut 15°
//   2. sudut selalu dinormalkan ke 0..345 kelipatan 15
//   3. fitToScene menaruh seluruh isi scene di dalam kanvas, di sudut mana pun
//   4. pada 0/90/180/270, hasilnya tetap grid isometrik 2:1 yang bersih
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const tmp = mkdtempSync(join(tmpdir(), 'isola-orbit-'))
let gagal = 0
const cek = (nama, lulus, detail = '') => {
  if (!lulus) gagal++
  console.log(`  ${lulus ? 'OK  ' : 'GAGAL'} ${nama}${detail ? ' — ' + detail : ''}`)
}

try {
  const out = join(tmp, 'space.mjs')
  execFileSync('npx', ['esbuild', 'src/iso/space.ts', '--bundle', '--format=esm',
    '--platform=node', `--outfile=${out}`], { stdio: 'pipe' })
  const S = await import(pathToFileURL(out).href)

  console.log('1. normalisasi sudut (kelipatan 15)')
  cek('15° tetap 15', S.normalYaw(15) === 15)
  cek('27.345 dibulatkan ke 30', S.normalYaw(27.345) === 30, String(S.normalYaw(27.345)))
  cek('370° -> 15', S.normalYaw(370) === 15, String(S.normalYaw(370)))
  cek('-15° -> 345', S.normalYaw(-15) === 345, String(S.normalYaw(-15)))
  cek('7° dibulatkan ke 0', S.normalYaw(7) === 0)
  cek('23° dibulatkan ke 30', S.normalYaw(23) === 30)
  S.putarKamera(1)
  cek('putarKamera(1) dari 0 -> 15', S.yawValue() === 15, String(S.yawValue()))
  S.setYaw(90)
  cek('yawBersih() di 90', S.yawBersih() === true)
  S.setYaw(45)
  cek('yawBersih() di 45 = false', S.yawBersih() === false)

  console.log('2. proyeksi <-> invers konsisten di semua sudut')
  let maksGalat = 0
  for (let y = 0; y < 360; y += 15) {
    S.setYaw(y)
    for (const [e, w] of [[0, 0], [3.25, 7.5], [19.9, 0.1], [10, 10], [-2.5, 4.75]]) {
      const p = S.px(e, w)
      const balik = S.unpx(p.x, p.y)
      maksGalat = Math.max(maksGalat, Math.abs(balik.e - e), Math.abs(balik.w - w))
    }
  }
  cek('galat putar-balik < 1e-6 tile', maksGalat < 1e-6, `maks ${maksGalat.toExponential(2)}`)

  console.log('3. di 0/90/180/270 tetap grid 2:1')
  for (const y of [0, 90, 180, 270]) {
    S.setYaw(y)
    const a = S.px(0, 0)
    const b = S.px(1, 0)
    const dx = Math.abs(b.x - a.x)
    const dy = Math.abs(b.y - a.y)
    // pada sudut bersih, satu langkah tile selalu bergerak 1:0,5
    const rasio = dy / Math.max(1e-9, dx)
    cek(`yaw ${y}: langkah tile 2:1`, Math.abs(rasio - 0.5) < 1e-6, `rasio ${rasio.toFixed(4)}`)
  }

  console.log('4. fitToScene menaruh isi di dalam kanvas')
  const kamar = [
    { pos: { e: 0, w: 0, z: 0 }, size: { e: 20, w: 20, z: 0.2 } },
    { pos: { e: 0, w: 0, z: 0 }, size: { e: 0.2, w: 20, z: 9.5 } },
    { pos: { e: 0, w: 0, z: 0 }, size: { e: 20, w: 0.2, z: 9.5 } },
    { pos: { e: 8, w: 1.4, z: 0 }, size: { e: 4, w: 3, z: 2.4 } },
  ]
  let keluarTerburuk = 0
  for (let y = 0; y < 360; y += 15) {
    S.setYaw(y)
    S.fitToScene(kamar)
    for (const o of kamar) {
      for (const ee of [o.pos.e, o.pos.e + o.size.e]) {
        for (const ww of [o.pos.w, o.pos.w + o.size.w]) {
          for (const zz of [o.pos.z, o.pos.z + o.size.z]) {
            const p = S.px(ee, ww, zz)
            keluarTerburuk = Math.max(
              keluarTerburuk,
              -p.x, p.x - S.IW, -p.y, p.y - S.IH,
            )
          }
        }
      }
    }
  }
  // fitToScene memakai margin 5% -> isi boleh masuk sampai ~28 px dari tepi
  const batas = ((1 - 0.95) / 2) * Math.min(S.IW, S.IH) + 1
  cek('semua sudut 15°: isi tetap di dalam bingkai (margin 5%)', keluarTerburuk <= batas,
    `maks keluar ${keluarTerburuk.toFixed(1)} px (batas ${batas.toFixed(1)})`)
  console.log('5. REFRESH = acuan ×1 di (0,0)')
  // tombol REFRESH memanggil setYaw(0) + resetView(): zoom 1, pusat (0,0)
  S.setZoom(2.5); S.setCenter(12, -7); S.setYaw(45)
  S.setYaw(0); S.resetView()
  cek('zoom kembali ×1', S.zoomValue() === 1, String(S.zoomValue()))
  cek('pusat kamera (0,0)', S.CAM.CE === 0 && S.CAM.CW === 0, `${S.CAM.CE}, ${S.CAM.CW}`)
  cek('sudut kembali 0°', S.yawValue() === 0, String(S.yawValue()))
  // bukti tombol lama memang tidak berubah: fit diulang = hasil sama, sedangkan
  // resetView menghasilkan komposisi lain (zoom bukan hasil fit).
  const kubus = [{ pos: { e: -8, w: -8, z: 0 }, size: { e: 16, w: 16, z: 6 } }]
  S.setYaw(0); S.fitToScene(kubus)
  const qFit = S.zoomValue()
  S.resetView()
  cek('zoom acuan ×1 berbeda dari zoom hasil fit (dulu REFRESH = fit, jadi tampak tak berfungsi)',
    S.zoomValue() === 1 && qFit !== 1, `fit ×${qFit} vs acuan ×1`)
} finally {
  rmSync(tmp, { recursive: true, force: true })
}

console.log(gagal === 0 ? '\nSEMUA UJI ORBIT LULUS' : `\n${gagal} UJI GAGAL`)
process.exit(gagal === 0 ? 0 : 1)
