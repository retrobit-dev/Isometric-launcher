// UJI PULIHKAN — permintaan user 2026-10-29:
//   "buatkan fitur untuk mengembalikan objek yg hilang ketika refresh localhost"
//
//   cd prototype && node tests/run-pulihkan.mjs
//
// Yang diperiksa:
//   1. objek TIDAK lagi dibuang saat normalisasi hanya karena presetnya hilang
//      dari katalog (dulu inilah yang membuat objek lenyap setelah refresh);
//   2. kandidatPulihkan() menggabungkan penyimpanan browser + file server,
//      membuang duplikat, dan mengurutkan objek terbanyak lebih dulu;
//   3. simulasi skenario "refresh": scene di file lebih sedikit, salinan
//      browser masih lengkap -> kandidat teratas berisi objek yang hilang;
//   4. simpanDarurat() mengirim scene lewat sendBeacon saat halaman ditutup.
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const tmp = mkdtempSync(join(tmpdir(), 'isola-pulihkan-'))
let gagal = 0
const cek = (nama, lulus, detail = '') => {
  if (!lulus) gagal++
  console.log(`  ${lulus ? 'OK  ' : 'GAGAL'} ${nama}${detail ? ' — ' + detail : ''}`)
}

// --- localStorage tiruan -----------------------------------------------------
const simpanan = new Map()
globalThis.localStorage = {
  getItem: k => (simpanan.has(k) ? simpanan.get(k) : null),
  setItem: (k, v) => simpanan.set(k, String(v)),
  removeItem: k => simpanan.delete(k),
  clear: () => simpanan.clear(),
  key: i => [...simpanan.keys()][i] ?? null,
  get length() { return simpanan.size },
}

// --- payload scene -----------------------------------------------------------
const obj = (id, extra = {}) => ({
  id,
  label: id,
  pos: { e: 1, w: 1, z: 0 },
  size: { e: 1, w: 1, z: 1 },
  style: 'kayu-tepi',
  app: null,
  layer: 'main',
  urutan: 1,
  ...extra,
})
const sceneOf = (objs, iso) => ({
  version: 1,
  room: { e: 20, w: 20, wallZ: 9.5, palette: 'hangat' },
  objects: objs,
  meta: { locked: false, savedAt: null, updatedAt: iso },
})

const lengkap = sceneOf([obj('a'), obj('b'), obj('c'), obj('d'), obj('e')], '2026-10-29T06:00:00.000Z')
const sedikit = sceneOf([obj('a'), obj('b')], '2026-10-29T06:10:00.000Z')

try {
  const out = join(tmp, 'store.mjs')
  execFileSync('npx', ['esbuild', 'src/scene/store.ts', '--bundle', '--format=esm', '--platform=node',
    `--outfile=${out}`], { stdio: 'pipe' })
  const S = await import(pathToFileURL(out).href)

  console.log('1. objek bertanda preset lama TIDAK dibuang')
  const denganPresetLama = sceneOf([
    obj('kaca', { preset: 'jendela-lama-yang-sudah-dihapus' }),
    obj('balok'),
    obj('meja', { preset: 'meja-lama' }),
  ], '2026-10-29T06:00:00.000Z')
  const hasil = S.normalisasiScene(denganPresetLama)
  cek('ketiga objek tetap ada', hasil.objects.length === 3, `${hasil.objects.length} objek`)
  cek('penanda preset lama dibuang',
    hasil.objects.every(o => o.preset === undefined),
    hasil.objects.map(o => o.preset ?? '-').join(','))
  cek('geometri & gaya tidak berubah',
    hasil.objects.every(o => o.style === 'kayu-tepi' && o.size.e === 1))

  console.log('2. kandidatPulihkan menggabungkan browser + file server')
  simpanan.clear()
  // cadangan browser (paling lengkap) + draf yang lebih sedikit
  simpanan.set('isola-cadangan-v1', JSON.stringify(lengkap))
  simpanan.set('isola-draf-v1', JSON.stringify(sedikit))
  // isi file server dibuat BERBEDA supaya tidak dianggap duplikat
  const dariServer = sceneOf([obj('a'), obj('b'), obj('f')], '2026-10-29T05:00:00.000Z')
  const kandidat = await S.kandidatPulihkan({ berkas: async () => dariServer })
  cek('ada kandidat', kandidat.length > 0, `${kandidat.length} kandidat`)
  cek('kandidat terbanyak di urutan pertama', kandidat[0].n === 5, `${kandidat[0].n} objek`)
  cek('duplikat isi dibuang',
    new Set(kandidat.map(k => JSON.stringify(k.scene.objects))).size === kandidat.length)
  cek('file server yang isinya sama dengan draf tidak digandakan',
    kandidat.filter(k => k.sumber === 'file').length === 1)
  cek('kandidat file server ikut ditawarkan',
    kandidat.some(k => k.sumber === 'file'), kandidat.map(k => k.sumber).join(','))

  console.log('3. simulasi refresh: file lebih sedikit, salinan browser lengkap')
  const terbanyak = S.objekTerbanyakKandidat()
  cek('peringatan tahu ada salinan 5 objek', terbanyak === 5, String(terbanyak))
  cek('peringatan aktif karena scene sekarang cuma 2', terbanyak > 2)
  const terpilih = kandidat[0]
  cek('kandidat teratas memuat objek yang hilang (c,d,e)',
    ['c', 'd', 'e'].every(id => terpilih.scene.objects.some(o => o.id === id)))

  console.log('4. urutan: objek terbanyak dulu, lalu yang paling baru')
  simpanan.clear()
  const tua = sceneOf([obj('x'), obj('y'), obj('z')], '2026-10-28T01:00:00.000Z')
  const baru = sceneOf([obj('p'), obj('q'), obj('r')], '2026-10-29T09:00:00.000Z')
  simpanan.set('isola-cadangan-v1', JSON.stringify(tua))
  simpanan.set('isola-terkunci-v1', JSON.stringify(baru))
  const urut = await S.kandidatPulihkan({ berkas: async () => null })
  cek('jumlah objek sama -> yang lebih baru menang',
    urut[0].waktu > urut[1].waktu, `${new Date(urut[0].waktu).toISOString()} vs ${urut[1] ? new Date(urut[1].waktu).toISOString() : '-'}`)

  console.log('5. simpanDarurat memakai sendBeacon')
  let beacon = null
  globalThis.Blob = class { constructor(parts) { this.parts = parts } }
  Object.defineProperty(globalThis, 'navigator', {
    value: { sendBeacon: (url, blob) => { beacon = { url, blob }; return true } },
    configurable: true,
  })
  S.simpanDarurat(sedikit)
  cek('beacon dikirim ke /api/scene', !!beacon && String(beacon.url).includes('/api/scene'), beacon?.url)
  cek('isi beacon memuat objek', !!beacon && beacon.blob.parts[0].includes('"objects"'))
  beacon = null
  S.simpanDarurat({ ...sedikit, objects: [] })
  cek('scene kosong tidak dikirim (tidak menimpa file)', beacon === null)

  console.log('6. tanpa kandidat -> daftar kosong, bukan error')
  simpanan.clear()
  const kosong = await S.kandidatPulihkan({ berkas: async () => null })
  cek('daftar kosong', Array.isArray(kosong) && kosong.length === 0)
} catch (e) {
  gagal++
  console.log('  GAGAL uji error —', e.message)
} finally {
  rmSync(tmp, { recursive: true, force: true })
}

console.log(gagal === 0 ? '\nSEMUA UJI LULUS' : `\n${gagal} UJI GAGAL`)
process.exit(gagal === 0 ? 0 : 1)
