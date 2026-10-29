// UJI PARITAS LANGIT (web <-> Python)
//   cd prototype && node tests/run-paritas.mjs
//
// Latar belakang: langit dinamis punya DUA renderer —
//   • prototype/src/iso/langit.ts      (canvas, dipakai preview web & APK nanti)
//   • tools/render_scene.py            (PNG uji, cermin untuk renderer Kotlin)
// Sejak langit dibuat lebih realistis (2026-10-29) warnanya TIDAK lagi hanya
// 6 warna palet, tetapi 14 pita hasil CAMPURAN. Campuran itu dihitung di dua
// tempat, jadi bisa melenceng tanpa terlihat. Uji ini membandingkan angka
// keluaran keduanya: kalau berbeda walau 1 bit, PNG uji tidak lagi mewakili
// tampilan aplikasi.
//
// Yang dibandingkan:
//   1. campur(a, b, t)             <-> _campur(a, b, t)
//   2. pitaHalus(kendali, 14)      <-> _pita_halus(kendali, 14)
//   3. 14 pita tiap fase x cuaca   (5 fase x 5 cuaca = 25 kombinasi)
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const tmp = mkdtempSync(join(tmpdir(), 'isola-paritas-'))
let gagal = 0
const cek = (nama, lulus, detail = '') => {
  if (!lulus) gagal++
  console.log(`  ${lulus ? 'OK  ' : 'GAGAL'} ${nama}${detail ? ' — ' + detail : ''}`)
}

const FASE = ['fajar', 'pagi', 'siang', 'senja', 'malam']
const CUACA = ['cerah', 'berawan', 'gerimis', 'hujan', 'badai']

try {
  // --- 1. bungkus modul TypeScript ---
  const outTs = join(tmp, 'langit.mjs')
  execFileSync('npx', ['esbuild', 'src/iso/langit.ts', '--bundle', '--format=esm',
    '--platform=node', `--outfile=${outTs}`], { stdio: 'pipe' })
  const L = await import(pathToFileURL(outTs).href)

  // --- 2. ambil fungsi Python (tanpa menjalankan bagian gambar) ---
  const skrip = join(tmp, 'py.py')
  writeFileSync(skrip, `
import json, pathlib
src = pathlib.Path('/home/user/Isometric-launcher/tools/render_scene.py').read_text()
kepala = src.split("obj = scene['objects']")[0]
ns = {'__file__': '/home/user/Isometric-launcher/tools/render_scene.py', '__name__': 'rs'}
exec(compile(kepala, 'rs', 'exec'), ns)
hasil = {'campur': [], 'pita': {}, 'warna': {}}
for a, b, t in [('#000000','#ffffff',0), ('#000000','#ffffff',0.5),
                ('#4d89ff','#7eaafe',0.37), ('#fde8e7','#1a0000',0.82)]:
    hasil['campur'].append(ns['_campur'](a, b, t))
for f in ${JSON.stringify(FASE)}:
    pita, _, _, _ = ns['fase_warna'](f)
    hasil['pita'][f] = ns['_pita_halus'](pita, 14)
for c in ${JSON.stringify(CUACA)}:
    m = ns['efek_cuaca'](c)[4]
    hasil['warna'][c] = ns['_pita_halus'](m, 14) if m else None
print(json.dumps(hasil))
`, 'utf8')
  const PY = JSON.parse(execFileSync('python3', [skrip], { encoding: 'utf8' }))

  console.log('1. campur() — TS vs Python')
  const kasus = [
    ['#000000', '#ffffff', 0],
    ['#000000', '#ffffff', 0.5],
    ['#4d89ff', '#7eaafe', 0.37],
    ['#fde8e7', '#1a0000', 0.82],
  ]
  let campurSama = true
  const bedaCampur = []
  kasus.forEach(([a, b, t], i) => {
    const ts = L.campur(a, b, t)
    const py = PY.campur[i]
    if (ts !== py) { campurSama = false; bedaCampur.push(`${t}: ${ts} != ${py}`) }
  })
  cek('campur sama persis di 4 kasus', campurSama, bedaCampur.join(' | ') || 'termasuk 0 / 0,5 / 1')

  console.log('2. pitaHalus(14) tiap fase')
  let pitaSama = true
  const bedaPita = []
  for (const f of FASE) {
    const ts = L.pitaHalus(L.langitFase(f).pita, 14)
    const py = PY.pita[f]
    if (JSON.stringify(ts) !== JSON.stringify(py)) {
      pitaSama = false
      const i = ts.findIndex((h, k) => h !== py[k])
      bedaPita.push(`${f}@${i}: ${ts[i]} != ${py[i]}`)
    }
  }
  cek('14 pita x 5 fase identik', pitaSama, bedaPita.join(' | ') || '70 warna')

  console.log('3. langit mendung (gerimis / hujan / badai)')
  let mendungSama = true
  const bedaMendung = []
  for (const c of CUACA) {
    const m = L.efekCuaca(c).mendung
    const ts = m ? L.pitaHalus(m, 14) : null
    const py = PY.warna[c]
    if (JSON.stringify(ts) !== JSON.stringify(py)) {
      mendungSama = false
      bedaMendung.push(c)
    }
  }
  cek('pita mendung identik (null untuk cerah/berawan)', mendungSama, bedaMendung.join(',') || '3 x 14 warna')

  console.log('4. kendali tetap dari palet referensi')
  const R = await import(pathToFileURL(execFileSync('npx', ['esbuild', 'src/iso/palet-referensi.ts',
    '--bundle', '--format=esm', '--platform=node',
    `--outfile=${join(tmp, 'palet.mjs')}`], { stdio: 'pipe' }) && join(tmp, 'palet.mjs')).href)
  const palet = new Set(R.SEMUA)
  const kendaliSah = FASE.every(f => L.langitFase(f).pita.every(h => palet.has(h)))
  cek('6 warna kendali tiap fase ada di 342 warna palet', kendaliSah)
  const ujungSah = FASE.every(f => {
    const k = L.langitFase(f).pita
    const h = L.pitaHalus(k, 14)
    return h[0] === k[0] && h[13] === k[5]
  })
  cek('ujung gradasi = warna kendali (tidak ada warna asing)', ujungSah)
} catch (e) {
  gagal++
  console.log('  GAGAL uji error —', e.message)
} finally {
  rmSync(tmp, { recursive: true, force: true })
}

console.log(gagal === 0 ? '\nSEMUA UJI PARITAS LULUS' : `\n${gagal} UJI GAGAL`)
process.exit(gagal === 0 ? 0 : 1)
