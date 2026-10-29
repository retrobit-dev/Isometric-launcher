// UJI PRESISI UKURAN 0,001 (permintaan user 2026-10-29)
//   cd prototype && node tests/run-ukuran.mjs
//
// Ukuran objek harus: (1) boleh sekecil 0,001 tile, (2) selalu kelipatan
// 0,001 setelah normalisasi, (3) tahan bolak-balik lewat JSON.
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const tmp = mkdtempSync(join(tmpdir(), 'isola-ukuran-'))
let gagal = 0
const cek = (nama, lulus, detail = '') => {
  if (!lulus) gagal++
  console.log(`  ${lulus ? 'OK  ' : 'GAGAL'} ${nama}${detail ? ' — ' + detail : ''}`)
}
const bangun = async (entri, nama) => {
  const out = join(tmp, nama)
  execFileSync('npx', ['esbuild', entri, '--bundle', '--format=esm', '--platform=node',
    `--outfile=${out}`], { stdio: 'pipe' })
  return import(pathToFileURL(out).href)
}

try {
  const T = await bangun('src/scene/types.ts', 'types.mjs')
  const S = await bangun('src/scene/store.ts', 'store.mjs')

  console.log('1. konstanta')
  cek('UKURAN_MIN = 0.001', T.UKURAN_MIN === 0.001, String(T.UKURAN_MIN))
  cek('GEOMETRI_DESIMAL = 3', T.GEOMETRI_DESIMAL === 3)

  console.log('2. ukuranSah()')
  cek('0.001 diterima apa adanya', T.ukuranSah(0.001) === 0.001, String(T.ukuranSah(0.001)))
  cek('0.037 tetap 0.037', T.ukuranSah(0.037) === 0.037, String(T.ukuranSah(0.037)))
  cek('0.0004 dibulatkan jadi 0.001', T.ukuranSah(0.0004) === 0.001, String(T.ukuranSah(0.0004)))
  cek('0 (nol) dinaikkan ke 0.001', T.ukuranSah(0) === 0.001, String(T.ukuranSah(0)))
  cek('negatif dinaikkan ke 0.001', T.ukuranSah(-3) === 0.001, String(T.ukuranSah(-3)))
  cek('1.23456 -> 1.235', T.ukuranSah(1.23456) === 1.235, String(T.ukuranSah(1.23456)))
  cek('bulatkan3 tidak menghasilkan -0', Object.is(T.bulatkan3(-0.0001), 0), String(T.bulatkan3(-0.0001)))

  console.log('3. normalisasi scene mempertahankan 0,001')
  const dasar = (size) => ({
    version: 1,
    room: { e: 20, w: 20, wallZ: 9.5 },
    objects: [{
      id: 'a', label: 'A', pos: { e: 1, w: 2, z: 3 }, size,
      style: 'kayu-terakota', app: null, layer: 'main',
    }],
    meta: { locked: false, savedAt: null },
  })
  const sc = S.normalisasiScene(dasar({ e: 0.037, w: 0.001, z: 0.5 }))
  const o = sc.objects[0]
  cek('e 0.037 bertahan', o.size.e === 0.037, String(o.size.e))
  cek('w 0.001 bertahan', o.size.w === 0.001, String(o.size.w))
  const sc2 = S.normalisasiScene(dasar({ e: 0, w: 0.0002, z: 0.0001 }))
  cek('ukuran terlalu kecil dinaikkan ke 0.001',
    sc2.objects[0].size.e === 0.001 && sc2.objects[0].size.w === 0.001 && sc2.objects[0].size.z === 0.001,
    JSON.stringify(sc2.objects[0].size))

  console.log('4. bolak-balik JSON')
  const teks = JSON.stringify(sc)
  const lagi = S.normalisasiScene(JSON.parse(teks))
  cek('ukuran sama setelah export/import',
    JSON.stringify(lagi.objects[0].size) === JSON.stringify(sc.objects[0].size),
    JSON.stringify(lagi.objects[0].size))

  console.log('5. katalog preset memakai aturan baru')
  const P = await bangun('src/scene/presets.ts', 'presets.mjs')
  const kecil = []
  for (const pr of P.PRESETS) for (const b of pr.bagian) {
    for (const v of [b.se, b.sw, b.sz]) if (v < 0.001 - 1e-9) kecil.push(`${pr.id}:${v}`)
    for (const v of [b.se, b.sw, b.sz]) {
      if (Math.abs(v * 1000 - Math.round(v * 1000)) > 1e-6 && v >= 0.001) {
        // 3 desimal; nilai lebih halus ditandai
        kecil.push(`${pr.id}:${v} (bukan kelipatan 0,001)`)
      }
    }
  }
  cek('semua bagian ≥ 0,001 dan kelipatan 0,001', kecil.length === 0, kecil.slice(0, 6).join(', '))
} finally {
  rmSync(tmp, { recursive: true, force: true })
}

console.log(gagal === 0 ? '\nSEMUA UJI UKURAN LULUS' : `\n${gagal} UJI GAGAL`)
process.exit(gagal === 0 ? 0 : 1)
