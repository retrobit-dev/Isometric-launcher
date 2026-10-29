// UJI TIRAI JENDELA — permintaan user 2026-10-29:
//   "bisakah tambahkan tirai di sisi kanan jendela"
//
//   cd prototype && node tests/run-tirai.mjs
//
// Yang diperiksa:
//   1. preset `jendela` sekarang punya 4 bagian tirai (3 jalur lipatan + keliman)
//      dan semuanya berada DI DALAM bukaan (e, w, z) — tidak menembus kusen;
//   2. migrasi menambahkan tirai pada JENDELA LAMA (scene sebelum fitur ini ada)
//      dengan koordinat absolut yang benar (ikut posisi kaca);
//   3. migrasi hanya sekali: tirai yang sengaja dihapus tidak muncul lagi;
//   4. jendela yang diputar / dicerminkan dilewati;
//   5. jendela yang dibuat BARU langsung punya tirai.
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const tmp = mkdtempSync(join(tmpdir(), 'isola-tirai-'))
let gagal = 0
const cek = (nama, lulus, detail = '') => {
  if (!lulus) gagal++
  console.log(`  ${lulus ? 'OK  ' : 'GAGAL'} ${nama}${detail ? ' — ' + detail : ''}`)
}
const bangun = (entri, nama) => {
  const out = join(tmp, nama)
  execFileSync('npx', ['esbuild', entri, '--bundle', '--format=esm', '--platform=node',
    `--outfile=${out}`], { stdio: 'pipe' })
  return import(pathToFileURL(out).href)
}

const kacaObjek = (extra = {}) => ({
  id: 'jendela-1',
  label: 'JENDELA 1',
  pos: { e: 12.26, w: 0.34, z: 2.46 },
  size: { e: 3.68, w: 0.05, z: 3.88 },
  style: 'kaca-langit',
  app: null,
  layer: 'main',
  urutan: 4,
  preset: 'jendela',
  grup: 'g-jendela',
  grupNama: 'JENDELA',
  langit: true,
  ...extra,
})
const sceneDengan = (objects, meta = {}) => ({
  version: 1,
  room: { e: 20, w: 20, wallZ: 9.5, palette: 'hangat' },
  objects,
  meta: { locked: false, savedAt: null, ...meta },
})

try {
  const P = await bangun('src/scene/presets.ts', 'presets.mjs')
  const T = await bangun('src/scene/tirai.ts', 'tirai.mjs')

  console.log('1. preset jendela punya tirai di sisi kanan')
  const jendela = P.PRESETS.find(p => p.id === 'jendela')
  const tirai = jendela.bagian.filter(b => b.tirai === true)
  cek('ada 4 bagian tirai (3 jalur + keliman)', tirai.length === 4, `${tirai.length} bagian`)
  cek('tirai berada di sisi KANAN bukaan',
    tirai.every(b => b.e >= 3.0), tirai.map(b => b.e).join(','))
  cek('tirai di dalam batas bukaan (e <= 4.2)',
    tirai.every(b => b.e + b.se <= 4.2 + 1e-9),
    tirai.map(b => (b.e + b.se).toFixed(2)).join(','))
  cek('tirai menggantung dari ambang atas sampai ambang bawah',
    tirai.filter(b => b.sz > 1).every(b => b.z === 2.2 && Math.abs(b.z + b.sz - 6.34) < 1e-9),
    tirai.filter(b => b.sz > 1).map(b => `${b.z}..${(b.z + b.sz).toFixed(2)}`).join(','))
  cek('tirai berada di depan kaca (w >= 0.30)',
    tirai.every(b => b.w >= 0.30), tirai.map(b => b.w).join(','))
  cek('kain tidak memakai garis tepi (bt)',
    tirai.every(b => b.tepi === false), tirai.map(b => String(b.tepi)).join(','))
  cek('warna kain dari palet (tirai-putih / lilin)',
    tirai.every(b => b.style === 'tirai-putih' || b.style === 'lilin'),
    tirai.map(b => b.style).join(','))
  cek('nada lipatan BERBEDA dari kain utama (supaya terlihat)',
    tirai.every(b => b.style === 'tirai-putih') === false)

  console.log('2. migrasi: jendela LAMA dapat tirai')
  const lama = sceneDengan([kacaObjek()])
  const hasil = T.migrasiTirai(lama)
  cek('4 objek tirai ditambahkan', hasil.ditambah === 4, `${hasil.ditambah}`)
  cek('jumlah objek 1 -> 5', hasil.scene.objects.length === 5)
  const t0 = hasil.scene.objects.find(o => o.id === 'g-jendela-tirai-1')
  cek('koordinat absolut ikut posisi kaca',
    !!t0 && t0.pos.e === 15.2 && t0.pos.z === 2.2 && Math.abs(t0.pos.w - 0.52) < 1e-9,
    t0 ? `e=${t0.pos.e} w=${t0.pos.w} z=${t0.pos.z}` : 'tidak ada')
  cek('tirai masuk folder jendela yang sama',
    hasil.scene.objects.filter(o => o.tirai).every(o => o.grup === 'g-jendela'))
  cek('tirai ditumpuk paling atas (urutan > kaca)',
    hasil.scene.objects.filter(o => o.tirai).every(o => (o.urutan ?? 0) > 4))
  cek('penanda meta.tiraiV1 dipasang', hasil.scene.meta?.tiraiV1 === true)

  console.log('3. migrasi hanya sekali')
  const lagi = T.migrasiTirai(hasil.scene)
  cek('panggilan kedua tidak menambah apa pun', lagi.ditambah === 0)
  cek('jumlah objek tetap 5', lagi.scene.objects.length === 5)

  console.log('4. tirai yang dihapus user TIDAK muncul lagi')
  const tanpaTirai = {
    ...hasil.scene,
    objects: hasil.scene.objects.filter(o => !o.tirai),
  }
  cek('setelah dihapus tinggal kaca', tanpaTirai.objects.length === 1)
  const ulang = T.migrasiTirai(tanpaTirai)
  cek('migrasi tidak menambahkan ulang', ulang.ditambah === 0 && ulang.scene.objects.length === 1)

  console.log('4b. tirai ganda (dari migrasi versi lama) dirapikan')
  // kejadian nyata: penanda meta.tiraiV1 sempat hilang -> tirai terpasang 2x
  const dobel = sceneDengan([
    kacaObjek(),
    { ...kacaObjek({ id: 't1', label: 'TIRAI 1', tirai: undefined, style: 'tirai-putih',
      pos: { e: 15.2, w: 0.52, z: 2.2 }, size: { e: 0.26, w: 0.1, z: 4.14 }, urutan: 5 }) },
    { ...kacaObjek({ id: 't1b', label: 'TIRAI 1', tirai: true, style: 'tirai-putih',
      pos: { e: 15.2, w: 0.52, z: 2.2 }, size: { e: 0.26, w: 0.1, z: 4.14 }, urutan: 9 }) },
  ])
  const rapi = T.migrasiTirai(dobel)
  const sisaTirai = rapi.scene.objects.filter(o => o.label === 'TIRAI 1')
  cek('duplikat tirai dibuang, sisa satu', sisaTirai.length === 1, `${sisaTirai.length}`)
  cek('yang disisakan tumpukan paling atas', sisaTirai[0]?.urutan === 9, String(sisaTirai[0]?.urutan))
  cek('jumlah yang dibuang dilaporkan', rapi.dibuang === 1, `${rapi.dibuang}`)

  console.log('4c. material kaca diganti user tetap dianggap jendela')
  const kacaDiganti = T.migrasiTirai(sceneDengan([
    kacaObjek({ style: 'kaca-terang', langit: undefined }),
  ]))
  cek('tirai tetap ditambahkan', kacaDiganti.ditambah === 4, `${kacaDiganti.ditambah}`)

  console.log('5. jendela diputar / dicerminkan dilewati')
  const diputar = T.migrasiTirai(sceneDengan([kacaObjek({ rotasi: 30 })]))
  cek('jendela diputar tidak ditambahi tirai', diputar.ditambah === 0)
  const dicermin = T.migrasiTirai(sceneDengan([kacaObjek({ refleksi: true })]))
  cek('jendela dicerminkan tidak ditambahi tirai', dicermin.ditambah === 0)

  console.log('6. jendela BARU langsung punya tirai')
  const baru = P.buatPreset({
    preset: jendela, e: 12, w: 0, z: 0,
    grup: 'g-baru', nama: 'JENDELA', urutanAwal: 10, idAwal: 'jendela-baru',
  })
  const tiraiBaru = baru.filter(o => o.tirai === true)
  cek('4 objek tirai ikut terbuat', tiraiBaru.length === 4, `${tiraiBaru.length}`)
  cek('objek tirai punya penanda & label',
    tiraiBaru.every(o => o.tirai === true && /^TIRAI/.test(o.label)),
    tiraiBaru.map(o => o.label).join(','))
  cek('preset tetap satu kesatuan grup',
    new Set(baru.map(o => o.grup)).size === 1)
} catch (e) {
  gagal++
  console.log('  GAGAL uji error —', e.message)
} finally {
  rmSync(tmp, { recursive: true, force: true })
}

console.log(gagal === 0 ? '\nSEMUA UJI LULUS' : `\n${gagal} UJI GAGAL`)
process.exit(gagal === 0 ? 0 : 1)
