// UJI PARITAS LANGIT & PALET — TS (prototype) vs Python (renderer offline)
//   cd prototype && node tests/run-paritas.mjs
//
// Latar belakang: langit dinamis & palet punya DUA renderer —
//   • prototype/src/iso/langit.ts, palet-referensi.ts, palet-retro.ts (canvas)
//   • tools/render_scene.py                                        (PNG uji)
// Keduanya harus menghasilkan angka yang SAMA PERSIS, kalau tidak PNG uji
// tidak lagi mewakili layar.
//
// Ronde 38 (2026-10-29): gradasi campuran warna DIGANTI dithering. Yang diuji:
//   1. langitFase()        <-> fase_warna()        (6 pita + awan, 5 fase)
//   2. efekCuaca().mendung <-> efek_cuaca()[4]     (mendung 5 cuaca)
//   3. rencanaLangit()     <-> _rencana_langit()   (pita + 2 jalur dither)
//   4. gelap()/terang()    <-> gelap()/terang()    (tangga nada 51 warna)
//   5. kePalet()           <-> ke_palet()          (warna terdekat redmean)
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
const LUAR_PALET = ['#dd8b3f', '#f2c17b', '#a8541c', '#4d3a35', '#f7e6c4', '#8a9a4a', '#4c8f8a', '#123457']

try {
  // --- 1. bungkus modul TypeScript ---
  const outTs = join(tmp, 'langit.mjs')
  execFileSync('npx', ['esbuild', 'src/iso/langit.ts', '--bundle', '--format=esm',
    '--platform=node', `--outfile=${outTs}`], { stdio: 'pipe' })
  const L = await import(pathToFileURL(outTs).href)
  const outPal = join(tmp, 'palet.mjs')
  execFileSync('npx', ['esbuild', 'src/iso/palet-referensi.ts', '--bundle', '--format=esm',
    '--platform=node', `--outfile=${outPal}`], { stdio: 'pipe' })
  const R = await import(pathToFileURL(outPal).href)

  // --- 2. ambil fungsi Python (tanpa menjalankan bagian gambar) ---
  const skrip = join(tmp, 'py.py')
  writeFileSync(skrip, `
import json, pathlib
src = pathlib.Path('/home/user/Isometric-launcher/tools/render_scene.py').read_text()
kepala = src.split("obj = scene['objects']")[0]
ns = {'__file__': '/home/user/Isometric-launcher/tools/render_scene.py', '__name__': 'rs'}
exec(compile(kepala, 'rs', 'exec'), ns)
hasil = {'fase': {}, 'mendung': {}, 'rencana': {}, 'gelap': {}, 'terang': {}, 'palet': []}
for f in ${JSON.stringify(FASE)}:
    pita, benda, bintang, awan = ns['fase_warna'](f)
    hasil['fase'][f] = {'pita': pita, 'benda': benda, 'bintang': bintang, 'awan': awan,
                        'rencana': ns['_rencana_langit'](pita)}
for c in ${JSON.stringify(CUACA)}:
    m = ns['efek_cuaca'](c)[4]
    hasil['mendung'][c] = m
    hasil['rencana'][c] = ns['_rencana_langit'](m) if m else None
for c in ${JSON.stringify(R.SEMUA)}:
    hasil['gelap'][c] = [ns['gelap'](c, n) for n in (1, 2, 3)]
    hasil['terang'][c] = [ns['terang'](c, n) for n in (1, 2, 3)]
hasil['palet'] = [ns['ke_palet'](h) for h in ${JSON.stringify(LUAR_PALET)}]
print(json.dumps(hasil))
`, 'utf8')
  const PY = JSON.parse(execFileSync('python3', [skrip], { encoding: 'utf8' }))

  console.log('1. langitFase() — 5 fase x (6 pita + awan + benda)')
  let faseSama = true
  const bedaFase = []
  for (const f of FASE) {
    const ts = L.langitFase(f)
    const py = PY.fase[f]
    if (JSON.stringify(ts.pita) !== JSON.stringify(py.pita)
      || ts.benda !== py.benda || ts.bintang !== py.bintang || ts.awan !== py.awan) {
      faseSama = false
      bedaFase.push(f)
    }
  }
  cek('pita, benda, bintang, awan identik', faseSama, bedaFase.join(',') || '5 fase')

  console.log('2. efekCuaca().mendung — 3 cuaca berawan')
  let mendungSama = true
  const bedaMendung = []
  for (const c of CUACA) {
    const ts = L.efekCuaca(c).mendung
    const py = PY.mendung[c]
    if (JSON.stringify(ts) !== JSON.stringify(py)) { mendungSama = false; bedaMendung.push(c) }
  }
  cek('6 pita mendung identik (null untuk cerah/berawan)', mendungSama,
    bedaMendung.join(',') || '5 cuaca')

  console.log('3. rencanaLangit() — pita keras + jalur dither')
  let rencanaSama = true
  const bedaRencana = []
  const bentuk = (r) => JSON.stringify({ p: r.pita, d: r.dither.map(d => [d.v0, d.v1, d.a, d.b, d.level]) })
  for (const f of FASE) {
    const ts = L.rencanaLangit(L.langitFase(f).pita)
    const py = PY.fase[f].rencana
    const pyBentuk = { pita: py[0].map(([v0, v1, w]) => ({ v0, v1, warna: w })),
      dither: py[1].map(([v0, v1, a, b, level]) => ({ v0, v1, a, b, level })) }
    if (bentuk(ts) !== bentuk(pyBentuk)) { rencanaSama = false; bedaRencana.push(f) }
  }
  for (const c of CUACA) {
    const m = L.efekCuaca(c).mendung
    if (!m) continue
    const ts = L.rencanaLangit(m)
    const py = PY.rencana[c]
    const pyBentuk = { pita: py[0].map(([v0, v1, w]) => ({ v0, v1, warna: w })),
      dither: py[1].map(([v0, v1, a, b, level]) => ({ v0, v1, a, b, level })) }
    if (bentuk(ts) !== bentuk(pyBentuk)) { rencanaSama = false; bedaRencana.push('cuaca:' + c) }
  }
  cek('pita + 10 jalur dither identik (5 fase + 3 mendung)', rencanaSama,
    bedaRencana.join(',') || '8 rencana')

  console.log('4. tangga nada gelap()/terang()')
  let tanggaSama = true
  const bedaTangga = []
  for (const c of R.SEMUA) {
    const tsG = [1, 2, 3].map(n => R.gelap(c, n))
    const tsT = [1, 2, 3].map(n => R.terang(c, n))
    if (JSON.stringify(tsG) !== JSON.stringify(PY.gelap[c])) {
      tanggaSama = false; bedaTangga.push(`gelap ${c}`)
    }
    if (JSON.stringify(tsT) !== JSON.stringify(PY.terang[c])) {
      tanggaSama = false; bedaTangga.push(`terang ${c}`)
    }
  }
  cek('51 warna x 3 langkah x 2 arah identik', tanggaSama,
    bedaTangga.slice(0, 4).join(',') || `${R.SEMUA.length * 6} hasil`)

  console.log('5. pemetaan warna terdekat (redmean)')
  const tsPalet = LUAR_PALET.map(h => R.kePalet(h))
  cek('kePalet() = ke_palet()', JSON.stringify(tsPalet) === JSON.stringify(PY.palet),
    tsPalet.join(' '))
  cek('semua hasil pemetaan anggota palet', tsPalet.every(h => R.diPalet(h)))
} catch (e) {
  gagal++
  console.log('  GAGAL uji error —', e.message)
} finally {
  rmSync(tmp, { recursive: true, force: true })
}

console.log(gagal === 0 ? '\nSEMUA UJI PARITAS LULUS' : `\n${gagal} UJI GAGAL`)
process.exit(gagal === 0 ? 0 : 1)
